import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { getFirebase } from '../lib/firebase.js'
import {
  curriculumDocId,
  emptyPolicy,
  mergeCurricula,
  normalizePolicy,
  validateCurriculumInput,
  validatePolicyInput,
  validateStandardInput,
  validateSubjectInput,
} from '../lib/setek.js'
import { LocalError } from './local-store.js'

function fail(error, fallback = '교과세특 자료를 처리하지 못했어요.') {
  if (error instanceof LocalError) throw error
  if (error?.code === 'permission-denied') throw new LocalError('이 자료를 보거나 바꿀 권한이 없어요. 로그인과 Firestore 규칙을 확인해 주세요.', 403, error.code)
  throw new LocalError(error?.message || fallback, 400, error?.code || '')
}

async function currentProfile() {
  let firebase
  try {
    firebase = getFirebase()
  } catch (error) {
    fail(error)
  }
  const user = firebase.auth.currentUser
  if (!user) throw new LocalError('로그인해 주세요.', 401)
  const snap = await getDoc(doc(firebase.db, 'users', user.uid))
  if (!snap.exists() || snap.data().status !== 'ACTIVE') throw new LocalError('다시 로그인해 주세요.', 401)
  return { id: user.uid, role: snap.data().role, db: firebase.db }
}

async function requireAdmin() {
  const profile = await currentProfile()
  if (profile.role !== 'ADMIN') throw new LocalError('관리자만 자료를 등록할 수 있어요.', 403)
  return profile
}

function mapDoc(snap) {
  return { id: snap.id, ...snap.data() }
}

export async function listCurricula() {
  try {
    const { db } = await currentProfile()
    const snap = await getDocs(collection(db, 'setekCurricula'))
    return mergeCurricula(snap.docs.map(mapDoc))
  } catch (error) {
    fail(error)
  }
}

export async function saveCurriculum(input) {
  try {
    const profile = await requireAdmin()
    const existing = await listCurricula()
    const message = validateCurriculumInput(input, existing)
    if (message) throw new LocalError(message)
    const id = curriculumDocId(Number(input.year))
    const now = new Date().toISOString()
    const record = { name: String(input.name).trim(), year: Number(input.year), createdBy: profile.id, createdAt: now, updatedAt: now }
    await setDoc(doc(profile.db, 'setekCurricula', id), record)
    return { id, ...record, source: 'custom' }
  } catch (error) {
    fail(error)
  }
}

export async function deleteCurriculum(id) {
  try {
    const profile = await requireAdmin()
    if (id === '2015' || id === '2022') throw new LocalError('기본 교육과정은 삭제할 수 없어요.')
    const subjects = await listSubjects(id)
    if (subjects.length) throw new LocalError('과목이 남아 있어 교육과정을 삭제할 수 없어요. 과목을 먼저 삭제해 주세요.')
    await deleteDoc(doc(profile.db, 'setekCurricula', id))
  } catch (error) {
    fail(error)
  }
}

export async function listSubjects(curriculumId, schoolLevel = '') {
  try {
    const { db } = await currentProfile()
    const snap = await getDocs(query(collection(db, 'setekSubjects'), where('curriculumId', '==', curriculumId)))
    return snap.docs.map(mapDoc)
      .filter(item => !schoolLevel || item.schoolLevel === schoolLevel)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'))
  } catch (error) {
    fail(error)
  }
}

export async function saveSubject(input) {
  try {
    const profile = await requireAdmin()
    const existing = await listSubjects(input.curriculumId, input.schoolLevel)
    const message = validateSubjectInput(input, existing)
    if (message) throw new LocalError(message)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const record = {
      curriculumId: input.curriculumId,
      schoolLevel: input.schoolLevel,
      name: String(input.name).trim(),
      subjectType: input.subjectType,
      createdBy: profile.id,
      createdAt: now,
      updatedAt: now,
    }
    await setDoc(doc(profile.db, 'setekSubjects', id), record)
    return { id, ...record }
  } catch (error) {
    fail(error)
  }
}

async function standardsOf(db, subjectId) {
  const snap = await getDocs(query(collection(db, 'setekStandards'), where('subjectId', '==', subjectId)))
  return snap.docs.map(mapDoc).sort((a, b) => String(a.code).localeCompare(String(b.code), 'ko'))
}

export async function listStandards(subjectId) {
  try {
    const { db } = await currentProfile()
    return await standardsOf(db, subjectId)
  } catch (error) {
    fail(error)
  }
}

export async function saveStandard(input) {
  try {
    const profile = await requireAdmin()
    const existing = await standardsOf(profile.db, input.subjectId)
    const message = validateStandardInput(input, existing)
    if (message) throw new LocalError(message)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const record = {
      subjectId: input.subjectId,
      code: String(input.code).trim(),
      category: String(input.category || '').trim(),
      content: String(input.content).trim(),
      source: String(input.source).trim(),
      sourceUrl: String(input.sourceUrl || '').trim(),
      createdBy: profile.id,
      createdAt: now,
      updatedAt: now,
    }
    await setDoc(doc(profile.db, 'setekStandards', id), record)
    return { id, ...record }
  } catch (error) {
    fail(error)
  }
}

export async function deleteStandard(id) {
  try {
    const profile = await requireAdmin()
    await deleteDoc(doc(profile.db, 'setekStandards', id))
  } catch (error) {
    fail(error)
  }
}

export async function deleteSubject(id) {
  try {
    const profile = await requireAdmin()
    const standards = await standardsOf(profile.db, id)
    const docs = [...standards.map(item => doc(profile.db, 'setekStandards', item.id)), doc(profile.db, 'setekSubjects', id)]
    for (let index = 0; index < docs.length; index += 400) {
      const batch = writeBatch(profile.db)
      docs.slice(index, index + 400).forEach(ref => batch.delete(ref))
      await batch.commit()
    }
  } catch (error) {
    fail(error)
  }
}

export async function getPolicy() {
  try {
    const { db } = await currentProfile()
    const snap = await getDoc(doc(db, 'meta', 'setekPolicy'))
    return normalizePolicy(snap.exists() ? snap.data() : emptyPolicy())
  } catch (error) {
    fail(error)
  }
}

export async function savePolicy(input) {
  try {
    const profile = await requireAdmin()
    const message = validatePolicyInput(input)
    if (message) throw new LocalError(message)
    const policy = normalizePolicy(input)
    const record = { ...policy, updatedAt: new Date().toISOString(), updatedBy: profile.id }
    await setDoc(doc(profile.db, 'meta', 'setekPolicy'), record)
    return policy
  } catch (error) {
    fail(error)
  }
}

export async function listDrafts() {
  try {
    const profile = await currentProfile()
    const snap = await getDocs(collection(profile.db, 'users', profile.id, 'setekDrafts'))
    return snap.docs.map(mapDoc).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  } catch (error) {
    fail(error)
  }
}

export async function saveDraft(record, id = '') {
  try {
    const profile = await currentProfile()
    const draftId = id || crypto.randomUUID()
    await setDoc(doc(profile.db, 'users', profile.id, 'setekDrafts', draftId), record)
    return { id: draftId, ...record }
  } catch (error) {
    fail(error)
  }
}

export async function deleteDraft(id) {
  try {
    const profile = await currentProfile()
    await deleteDoc(doc(profile.db, 'users', profile.id, 'setekDrafts', id))
  } catch (error) {
    fail(error)
  }
}
