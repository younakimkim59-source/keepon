// Firebase 초기화 설정
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase 구성 정보 (실제 프로젝트 정보로 교체 필요)
const firebaseConfig = {
    apiKey: "AIzaSyC8dNohFcINgfc60c_NMr7R7d4i3gb5yTk",
  authDomain: "newnew-a0dec.firebaseapp.com",
  projectId: "newnew-a0dec",
  storageBucket: "newnew-a0dec.firebasestorage.app",
  messagingSenderId: "143901720991",
  appId: "1:143901720991:web:e2f0cc71d182508e883daa",
  measurementId: "G-4PL9KRT445"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

