import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { ALL_RECORD_TYPES, sanitizeRecordTypes } from '../api/model.js'
import { getFirebase } from '../lib/firebase.js'
import { LocalError } from './local-store.js'

const INVITE_TTL = 7 * 24 * 60 * 60 * 1000
const authMessages = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 일치하지 않아요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 일치하지 않아요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 일치하지 않아요.',
  'auth/email-already-in-use': '이미 등록된 이메일이에요.',
  'auth/invalid-email': '이메일을 확인해 주세요.',
  'auth/weak-password': '비밀번호를 8자 이상 입력해 주세요.',
  'auth/too-many-requests': '시도가 많아요. 잠시 후 다시 시도해 주세요.',
  'permission-denied': '계정 권한을 확인해 주세요.',
}

const fail = (error, fallback = '계정 요청을 처리하지 못했어요.') => {
  const message = authMessages[error?.code] || error?.message || fallback
  throw new LocalError(message, error?.code?.startsWith('auth/') ? 401 : 400, error?.code || '')
}
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new LocalError(message, status)
}
const emailOf = value => String(value || '').trim().toLowerCase()
const result = data => ({ data, meta: {} })
const cleanTypes = value => {
  const types = sanitizeRecordTypes(value) ?? [...ALL_RECORD_TYPES]
  requireValue(types.length, '작성할 생기부 유형을 하나 이상 선택해 주세요.')
  return types
}
const pageOf = (values, q) => {
  const size = Math.max(1, Math.min(100, Number(q.get('size')) || 20))
  const number = Math.max(1, Number(q.get('page')) || 1)
  return {
    data: values.slice((number - 1) * size, number * size),
    meta: { totalElements: values.length, totalPages: Math.max(1, Math.ceil(values.length / size)), page: number },
  }
}

function services() {
  try {
    return getFirebase()
  } catch (error) {
    fail(error)
  }
}

function profileFrom(id, data, school) {
  return {
    id,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
    onboardingCompleted: data.onboardingCompleted !== false,
    phone: data.phone || '',
    classIds: data.classIds || [],
    recordTypes: data.recordTypes || [...ALL_RECORD_TYPES],
    preferences: data.preferences || { notificationEmail: true, notificationInApp: true },
    invitationId: data.invitationId || '',
    school,
  }
}

export function createAccountGateway({ getSchool }) {
  const waitForUser = () => new Promise(resolve => {
    const { auth } = services()
    const stop = onAuthStateChanged(auth, user => {
      stop()
      resolve(user)
    }, () => resolve(null))
  })

  async function school() {
    return (await getSchool()) || { name: '' }
  }

  async function readProfile(uid) {
    const { db } = services()
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return profileFrom(snap.id, snap.data(), await school())
  }

  async function activeProfile() {
    const { auth } = services()
    const current = auth.currentUser
    requireValue(current, '로그인해 주세요.', 401)
    const profile = await readProfile(current.uid)
    requireValue(profile?.status === 'ACTIVE', '다시 로그인해 주세요.', 401)
    return profile
  }

  async function requireAdmin() {
    const profile = await activeProfile()
    requireValue(profile.role === 'ADMIN', '관리자만 이용할 수 있어요.', 403)
    return profile
  }

  async function writeProfile(uid, data) {
    const { db } = services()
    await setDoc(doc(db, 'users', uid), data)
  }

  async function listUsers() {
    const { db } = services()
    const snap = await getDocs(collection(db, 'users'))
    const currentSchool = await school()
    return snap.docs.map(item => profileFrom(item.id, item.data(), currentSchool))
  }

  async function listInvitations() {
    const { db } = services()
    const snap = await getDocs(collection(db, 'invitations'))
    return snap.docs.map(item => ({ id: item.id, ...item.data() }))
  }

  async function emailTaken(email, ignoreId = '') {
    const { db } = services()
    const users = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
    if (!users.empty) return true
    const invites = await getDocs(query(collection(db, 'invitations'), where('email', '==', email)))
    return invites.docs.some(item => item.id !== ignoreId && item.data().accepted === false)
  }

  async function syncDirectory(syncAccounts) {
    const profile = await activeProfile()
    if (profile.role === 'ADMIN') {
      await syncAccounts({ users: await listUsers(), invitations: await listInvitations() })
    } else {
      await syncAccounts({ users: [profile] })
    }
    return profile
  }

  async function openInvite(token) {
    const { db } = services()
    const snap = await getDoc(doc(db, 'invitations', token))
    requireValue(snap.exists() && snap.data().accepted === false, '유효한 초대 링크를 확인해 주세요.')
    const invite = { id: snap.id, ...snap.data() }
    requireValue(!invite.expiresAt || Date.parse(invite.expiresAt) > Date.now(), '초대 링크가 만료됐어요. 관리자에게 다시 요청해 주세요.')
    return invite
  }

  async function createInvites(inputs, ignoreId = '') {
    const { db } = services()
    const currentSchool = await school()
    const created = []
    for (const input of inputs) {
      const email = emailOf(input.email)
      requireValue(email.includes('@'), '이메일을 확인해 주세요.')
      requireValue(!(await emailTaken(email, ignoreId)), '이미 등록된 이메일이에요.')
      const token = crypto.randomUUID()
      const invite = {
        email,
        name: String(input.name || '').trim(),
        role: input.role === 'ADMIN' ? 'ADMIN' : 'TEACHER',
        classIds: Array.isArray(input.classIds) ? input.classIds : [],
        recordTypes: cleanTypes(input.recordTypes),
        accepted: false,
        schoolName: currentSchool.name || '',
        expiresAt: new Date(Date.now() + INVITE_TTL).toISOString(),
        createdAt: new Date().toISOString(),
      }
      requireValue(invite.name, '이름을 입력해 주세요.')
      await setDoc(doc(db, 'invitations', token), invite)
      created.push({ email, invitationId: token, invitationUrl: `/#/invite?token=${token}`, expiresAt: invite.expiresAt })
    }
    return created
  }

  async function handle(path, { method = 'GET', body = {} } = {}) {
    const url = new URL(path, 'http://local.invalid')
    const p = url.pathname
    const parts = p.split('/').filter(Boolean)
    const q = url.searchParams
    try {
      if (p === '/auth/bootstrap' && method === 'GET') {
        const { db } = services()
        const snap = await getDoc(doc(db, 'meta', 'bootstrap'))
        return result({ required: !snap.exists() })
      }
      if (p === '/auth/bootstrap') {
        const { auth, db } = services()
        requireValue(!(await getDoc(doc(db, 'meta', 'bootstrap'))).exists(), '이미 학교 관리자 계정이 있어요. 로그인해 주세요.')
        const email = emailOf(body.email)
        const name = String(body.name || '').trim()
        requireValue(name && email.includes('@'), '이름과 이메일을 확인해 주세요.')
        requireValue(body.password?.length >= 8 && body.password === body.passwordConfirmation, '비밀번호를 8자 이상 입력하고 확인란을 맞춰 주세요.')
        const credential = await createUserWithEmailAndPassword(auth, email, body.password)
        const profile = {
          email,
          name,
          role: 'ADMIN',
          status: 'ACTIVE',
          onboardingCompleted: true,
          phone: '',
          classIds: [],
          recordTypes: [...ALL_RECORD_TYPES],
          preferences: { notificationEmail: true, notificationInApp: true },
        }
        await writeProfile(credential.user.uid, profile)
        await setDoc(doc(db, 'meta', 'bootstrap'), { adminUid: credential.user.uid, createdAt: serverTimestamp() })
        return result({ accessToken: credential.user.uid, refreshToken: credential.user.uid })
      }
      if (p === '/auth/login') {
        const { auth } = services()
        const credential = await signInWithEmailAndPassword(auth, emailOf(body.email), body.password || '')
        const profile = await readProfile(credential.user.uid)
        if (!profile || profile.status !== 'ACTIVE') {
          await signOut(auth)
          throw new LocalError('이메일 또는 비밀번호가 일치하지 않아요.', 401)
        }
        return result({ accessToken: credential.user.uid, refreshToken: credential.user.uid })
      }
      if (p === '/auth/refresh') {
        const { auth } = services()
        const user = await waitForUser()
        if (!user) throw new LocalError('다시 로그인해 주세요.', 401)
        const profile = await readProfile(user.uid)
        if (!profile || profile.status !== 'ACTIVE') {
          await signOut(auth)
          throw new LocalError('다시 로그인해 주세요.', 401)
        }
        return result({ accessToken: user.uid, refreshToken: user.uid })
      }
      if (p === '/auth/logout') {
        const { auth } = services()
        await signOut(auth)
        return result(null)
      }
      if (p === '/auth/password/forgot') {
        const { auth } = services()
        requireValue(emailOf(body.email).includes('@'), '이메일을 확인해 주세요.')
        await sendPasswordResetEmail(auth, emailOf(body.email))
        return result({ sent: true, message: '등록된 이메일이면 비밀번호 재설정 메일을 보냈어요.' })
      }
      if (p.startsWith('/auth/password/reset/')) throw new LocalError('비밀번호 재설정은 이메일로 도착한 링크에서 이어져요.')
      if (parts[0] === 'invitations') {
        const invite = await openInvite(parts[1])
        if (method === 'GET') return result({ email: invite.email, schoolName: invite.schoolName, name: invite.name })
        requireValue(body.password?.length >= 8 && body.password === body.passwordConfirmation, '비밀번호를 8자 이상 입력하고 확인란을 맞춰 주세요.')
        requireValue(String(body.name || '').trim() && body.termsAgreed, '이름과 이용약관 동의를 확인해 주세요.')
        const { auth, db } = services()
        const credential = await createUserWithEmailAndPassword(auth, invite.email, body.password)
        await writeProfile(credential.user.uid, {
          email: invite.email,
          name: String(body.name).trim(),
          role: invite.role === 'ADMIN' ? 'ADMIN' : 'TEACHER',
          status: 'ACTIVE',
          onboardingCompleted: false,
          phone: '',
          classIds: invite.classIds || [],
          recordTypes: invite.recordTypes?.length ? invite.recordTypes : [...ALL_RECORD_TYPES],
          preferences: { notificationEmail: true, notificationInApp: true },
          invitationId: invite.id,
        })
        await updateDoc(doc(db, 'invitations', invite.id), { accepted: true, acceptedAt: new Date().toISOString() })
        await signOut(auth)
        return result({ accepted: true })
      }
      if (p === '/me') return result(await activeProfile())
      if (p === '/onboarding' || p === '/onboarding/complete' || p.startsWith('/settings/profile') || p.startsWith('/settings/notifications') || p === '/settings/password/change' || p.startsWith('/admin/teachers')) {
        const profile = p.startsWith('/admin/teachers') ? await requireAdmin() : await activeProfile()
        const { auth, db } = services()
        const ref = doc(db, 'users', profile.id)
        if (p === '/onboarding' && method === 'GET') return result({ profile: { displayName: profile.name, phone: profile.phone }, preferences: profile.preferences })
        if (p === '/onboarding') {
          const next = { name: String(body.profile?.displayName || '').trim(), phone: body.profile?.phone || '', preferences: body.preferences || {} }
          requireValue(next.name, '이름을 입력해 주세요.')
          await updateDoc(ref, next)
          return result({ ...profile, ...next })
        }
        if (p === '/onboarding/complete') {
          await updateDoc(ref, { onboardingCompleted: true })
          return result({ ...profile, onboardingCompleted: true })
        }
        if (p === '/settings/profile') {
          if (method === 'GET') return result({ name: profile.name, phone: profile.phone })
          const name = String(body.name || '').trim()
          requireValue(name, '이름을 입력해 주세요.')
          await updateDoc(ref, { name, phone: body.phone || '' })
          return result({ name, phone: body.phone || '' })
        }
        if (p === '/settings/notifications') {
          if (method === 'GET') return result(profile.preferences)
          const preferences = { notificationEmail: !!body.notificationEmail, notificationInApp: !!body.notificationInApp }
          await updateDoc(ref, { preferences })
          return result(preferences)
        }
        if (p === '/settings/password/change') {
          const current = auth.currentUser
          requireValue(current, '다시 로그인해 주세요.', 401)
          requireValue(body.newPassword?.length >= 8 && body.newPassword === body.passwordConfirmation, '새 비밀번호를 확인해 주세요.')
          const credential = EmailAuthProvider.credential(current.email, body.currentPassword || '')
          await reauthenticateWithCredential(current, credential)
          await updatePassword(current, body.newPassword)
          await signOut(auth)
          return result({ changed: true })
        }
        if (parts[2] === 'invitations') {
          if (parts[4] === 'resend') {
            const invites = await listInvitations()
            const currentInvite = invites.find(item => item.id === parts[3] && item.accepted === false)
            requireValue(currentInvite, '유효한 초대 링크를 확인해 주세요.', 404)
            const [created] = await createInvites([currentInvite], currentInvite.id)
            await updateDoc(doc(db, 'invitations', currentInvite.id), { accepted: true, replaced: true })
            return result(created)
          }
          const inputs = parts[3] === 'bulk' ? body.invitations : [body]
          requireValue(Array.isArray(inputs) && inputs.length, '초대할 교사를 입력해 주세요.')
          const created = await createInvites(inputs)
          return result(parts[3] === 'bulk' ? { invitations: created } : created[0])
        }
        if (!parts[2]) {
          const keyword = (q.get('keyword') || '').trim().toLowerCase()
          const users = await listUsers()
          const invites = (await listInvitations()).filter(item => item.accepted === false).map(item => ({
            id: item.id,
            invitationId: item.id,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'INVITED',
            classIds: item.classIds || [],
            recordTypes: item.recordTypes || [],
          }))
          const rows = [...users, ...invites].filter(item => !keyword || `${item.name} ${item.email}`.toLowerCase().includes(keyword))
          return pageOf(rows, q)
        }
        const users = await listUsers()
        const teacher = users.find(item => item.id === parts[2])
        requireValue(teacher, '항목을 찾을 수 없어요.', 404)
        if (method === 'GET') return result(teacher)
        if (parts[3] === 'status' || method === 'DELETE' || method === 'PATCH') {
          requireValue(teacher.id !== profile.id, '자신의 관리자 권한은 유지해야 해요.')
          const status = method === 'DELETE' ? 'INACTIVE' : parts[3] === 'status' ? body.status : teacher.status
          if (parts[3] === 'status' || method === 'DELETE') {
            requireValue(['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status), '계정 상태를 확인해 주세요.')
            await updateDoc(doc(db, 'users', teacher.id), { status })
            return result({ ...teacher, status })
          }
          const next = {
            name: String(body.name || teacher.name).trim(),
            role: body.role === 'ADMIN' ? 'ADMIN' : 'TEACHER',
            classIds: Array.isArray(body.classIds) ? body.classIds : teacher.classIds,
            recordTypes: body.recordTypes !== undefined ? cleanTypes(body.recordTypes) : teacher.recordTypes,
          }
          requireValue(next.name, '이름을 입력해 주세요.')
          await updateDoc(doc(db, 'users', teacher.id), next)
          return result({ ...teacher, ...next })
        }
      }
      return null
    } catch (error) {
      if (error instanceof LocalError) throw error
      fail(error)
    }
  }

  return { handle, waitForUser, readProfile, syncDirectory }
}
