import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { LocalError } from '../data/local-store.js'

function readConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new LocalError('Firebase 연결 정보가 없어요. 프로젝트 설정을 확인해 주세요.')
  }
  return config
}

export function getFirebase() {
  const config = readConfig()
  const app = getApps().find(item => item.options.projectId === config.projectId) || initializeApp(config)
  const auth = getAuth(app)
  auth.languageCode = 'ko'
  return { app, auth, db: getFirestore(app) }
}
