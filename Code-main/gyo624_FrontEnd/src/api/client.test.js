import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, clearSession, establishSession, request, resource, refreshToken, onSessionExpired, listAll } from '../integration/http-client.js';
import { assertUser, blocksGate, hasWarnings, safeDetails } from './model.js';
const originalFetch = globalThis.fetch;
const memory = new Map();
globalThis.sessionStorage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key)
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json'
  }
});
beforeEach(() => {
  clearSession();
  memory.clear();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
describe('API contract transport', () => {
  it('sends server IDs, bearer token, request ID, stable idempotency key and unwraps envelopes', async () => {
    establishSession({
      accessToken: 'access',
      refreshToken: 'refresh'
    });
    globalThis.fetch = async (path, options) => {
      assert.equal(path, '/api/v1/classes/class-id/observations/bulk');
      assert.equal(options.headers.Authorization, 'Bearer access');
      assert.match(options.headers['X-Request-Id'], /^[0-9a-f-]{36}$/);
      assert.equal(options.headers['Idempotency-Key'], 'stable');
      assert.deepEqual(JSON.parse(options.body), {
        items: [{
          studentId: 'server-id',
          content: '관찰'
        }]
      });
      return json({
        data: {
          count: 1
        },
        meta: {
          requestId: 'response-id'
        }
      });
    };
    assert.equal((await request('/classes/class-id/observations/bulk', {
      method: 'POST',
      body: {
        items: [{
          studentId: 'server-id',
          content: '관찰'
        }]
      },
      idempotencyKey: 'stable'
    })).data.count, 1);
  });
  it('public auth does not send an existing bearer token or refresh bad credentials', async () => {
    establishSession({
      accessToken: 'old',
      refreshToken: 'refresh'
    });
    let calls = 0;
    globalThis.fetch = async (_, options) => {
      calls++;
      assert.equal(options.headers.Authorization, undefined);
      return json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '로그인 오류'
        }
      }, 401);
    };
    await assert.rejects(request('/auth/login', {
      method: 'POST',
      public: true,
      body: {}
    }), {
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
    assert.equal(calls, 1);
  });
  it('refreshes concurrent expired requests once and retries with the new token and same idempotency key', async () => {
    establishSession({
      accessToken: 'old',
      refreshToken: 'refresh'
    });
    let refreshes = 0;
    globalThis.fetch = async (path, options) => {
      if (path.endsWith('/auth/refresh')) {
        refreshes++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return json({
          data: {
            accessToken: 'new',
            refreshToken: 'rotated'
          }
        });
      }
      if (options.headers.Authorization === 'Bearer old') return json({
        error: {
          code: 'TOKEN_EXPIRED'
        }
      }, 401);
      assert.equal(options.headers.Authorization, 'Bearer new');
      assert.equal(options.headers['Idempotency-Key'], 'stable');
      return json({
        data: []
      });
    };
    await Promise.all([request('/notifications', {
      idempotencyKey: 'stable'
    }), request('/classes', {
      idempotencyKey: 'stable'
    })]);
    assert.equal(refreshes, 1);
    assert.equal(refreshToken(), 'rotated');
  });
  it('clears the session when refresh is rejected', async () => {
    establishSession({
      accessToken: 'old',
      refreshToken: 'refresh'
    });
    let expired = 0;
    const unsubscribe = onSessionExpired(() => expired++);
    globalThis.fetch = async () => json({
      error: {
        message: '로그인 만료'
      }
    }, 401);
    await assert.rejects(request('/me'), {
      status: 401
    });
    assert.equal(refreshToken(), '');
    assert.equal(expired, 1);
    unsubscribe();
  });
  it('does not retry mutation network errors or mask 409 field details', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new TypeError('offline');
    };
    await assert.rejects(request('/record-items/a', {
      method: 'PATCH',
      body: {
        version: 2
      }
    }), ApiError);
    assert.equal(calls, 1);
    globalThis.fetch = async () => json({
      error: {
        code: 'VERSION_CONFLICT',
        message: '수정 충돌',
        fields: [{
          field: 'version',
          reason: '최신 버전 3'
        }]
      }
    }, 409);
    await assert.rejects(request('/record-items/a', {
      method: 'PATCH',
      body: {
        version: 2
      }
    }), error => error.code === 'VERSION_CONFLICT' && error.fields[0].field === 'version');
  });
  it('handles 204 and empty 202, and preserves multipart boundaries', async () => {
    globalThis.fetch = async () => new Response(null, {
      status: 204
    });
    assert.equal((await request('/notifications/a', {
      method: 'DELETE'
    })).data, null);
    globalThis.fetch = async () => new Response(null, {
      status: 202
    });
    assert.equal((await request('/auth/password/forgot', {
      public: true,
      method: 'POST'
    })).data, null);
    const form = new FormData();
    form.append('file', new Blob(['data']), 'test.csv');
    globalThis.fetch = async (_, options) => {
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.body, form);
      return json({
        data: {
          valid: true
        }
      });
    };
    await request('/admin/rosters/import/validate', {
      method: 'POST',
      body: form
    });
  });
  it('discards a protected response from a logged-out session', async () => {
    establishSession({
      accessToken: 'old',
      refreshToken: 'refresh'
    });
    let deliver;
    globalThis.fetch = () => new Promise(resolve => {
      deliver = resolve;
    });
    const pending = request('/students/a');
    clearSession();
    deliver(json({
      data: {
        name: 'previous user'
      }
    }));
    await assert.rejects(pending, {
      name: 'AbortError'
    });
  });
  it('loads every timetable page without losing entries after the first page', async () => {
    globalThis.fetch = async path => {
      const page = new URL(path, 'http://local').searchParams.get('page');
      return json({
        data: [{
          id: `entry-${page}`
        }],
        meta: {
          totalPages: 2
        }
      });
    };
    assert.deepEqual((await listAll('/timetables?classId=a')).data.map(item => item.id), ['entry-1', 'entry-2']);
  });
  it('encodes timezone offsets and keeps one-based pagination', () => {
    const path = resource('/admin/audit-logs', {
      page: 1,
      size: 20,
      from: '2026-10-26T00:00:00+09:00',
      ignored: ''
    });
    assert.match(path, /%2B09%3A00/);
    assert.match(path, /page=1&size=20/);
    assert.ok(!path.includes('ignored'));
  });
});
describe('Server authority and gate rules', () => {
  it('rejects unknown roles and accepts only the server account role', () => {
    assert.throws(() => assertUser({
      id: 'a',
      role: '관리자'
    }));
    assert.equal(assertUser({
      id: 'a',
      role: 'ADMIN'
    }).role, 'ADMIN');
  });
  it('blocks missing/failed checks and errors even when the summary claims PASS', () => {
    assert.equal(!!blocksGate(null), true);
    assert.equal(!!blocksGate({}), true);
    assert.equal(!!blocksGate({
      status: 'UNKNOWN'
    }), true);
    assert.equal(!!blocksGate({
      status: 'FAIL'
    }), true);
    assert.equal(!!blocksGate({
      status: 'PASS',
      issues: [{
        severity: 'ERROR'
      }]
    }), true);
    assert.equal(!!blocksGate({
      status: 'PASS',
      summary: {
        errorCount: 1
      }
    }), true);
    assert.equal(!!blocksGate({
      status: 'PASS',
      issues: []
    }), false);
    assert.equal(!!hasWarnings({
      status: 'WARNING',
      issues: []
    }), true);
  });
  it('does not expose secrets in generic server previews', () => {
    assert.deepEqual(safeDetails({
      title: '확인',
      nested: {
        accessToken: 'secret',
        password: 'secret',
        count: 2
      }
    }), {
      title: '확인',
      nested: {
        count: 2
      }
    });
  });
});
