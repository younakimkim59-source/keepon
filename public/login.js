// ===== 로그인 페이지 JavaScript =====

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyC8dNohFcINgfc60c_NMr7R7d4i3gb5yTk",
    authDomain: "newnew-a0dec.firebaseapp.com",
    projectId: "newnew-a0dec",
    storageBucket: "newnew-a0dec.firebasestorage.app",
    messagingSenderId: "143901720991",
    appId: "1:143901720991:web:e2f0cc71d182508e883daa",
    measurementId: "G-4PL9KRT445"
};

// Firebase 초기화 (중복 방지)
let app, auth, googleProvider;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    // 이미 초기화된 경우
    app = initializeApp(firebaseConfig, 'secondary');
}
auth = getAuth(app);
googleProvider = new GoogleAuthProvider();

// 버튼 가져오기
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignUpBtn = document.getElementById('googleSignUpBtn');
const familyCodeBtn = document.getElementById('familyCodeBtn');

// 토스트 메시지 표시 함수
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast-message show toast-${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 가족 코드 생성 함수
function generateFamilyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 구글 로그인
googleLoginBtn.addEventListener('click', async () => {
    try {
        showToast('구글 로그인 중...', 'info');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log('구글 로그인 성공:', user);
        
        // Firestore에 사용자 정보 저장
        const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(app);
        
        // 사용자 문서가 있는지 확인
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            // 신규 사용자 - 가족 코드 생성
            const familyCode = generateFamilyCode();
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                familyCode: familyCode,
                isCodeOwner: true,
                createdAt: new Date().toISOString()
            });
            showToast('회원가입 완료! 가족 코드가 생성되었습니다.', 'success');
        } else {
            // 기존 사용자 - 업데이트
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: new Date().toISOString()
            }, { merge: true });
            showToast('로그인 성공!', 'success');
        }
        
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('구글 로그인 에러:', error);
        let errorMsg = '로그인에 실패했습니다.';
        if (error.code === 'auth/unauthorized-domain') {
            errorMsg = '도메인이 허용되지 않았습니다.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMsg = '로그인 창이 닫혔습니다.';
        } else if (error.message) {
            errorMsg = `에러: ${error.message}`;
        }
        alert(`❌ 로그인 실패!\n\n에러 코드: ${error.code || 'unknown'}\n메시지: ${error.message || errorMsg}`);
        showToast(errorMsg, 'error');
    }
});

// 구글 회원가입
googleSignUpBtn.addEventListener('click', async () => {
    try {
        showToast('구글 회원가입 중...', 'info');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Firestore에 사용자 정보 저장
        const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(app);
        
        // 사용자 문서 확인
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            // 신규 회원가입 - 가족 코드 생성
            const familyCode = generateFamilyCode();
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                familyCode: familyCode,
                isCodeOwner: true,
                createdAt: new Date().toISOString()
            });
            showToast('회원가입 완료! 가족 코드가 생성되었습니다.', 'success');
        } else {
            showToast('이미 회원가입된 계정입니다. 로그인합니다.', 'success');
        }
        
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('구글 회원가입 에러:', error);
        let errorMsg = '회원가입에 실패했습니다.';
        if (error.code === 'auth/unauthorized-domain') {
            errorMsg = '도메인이 허용되지 않았습니다.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMsg = '회원가입 창이 닫혔습니다.';
        } else if (error.message) {
            errorMsg = `에러: ${error.message}`;
        }
        alert(`❌ 회원가입 실패!\n\n에러 코드: ${error.code || 'unknown'}\n메시지: ${error.message || errorMsg}`);
        showToast(errorMsg, 'error');
    }
});

// 가족코드 입력
familyCodeBtn.addEventListener('click', () => {
    openFamilyCodeModal();
});

function openFamilyCodeModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    
    const form = document.createElement('div');
    form.style.cssText = 'background:white;padding:30px;border-radius:12px;width:90%;max-width:400px;';
    form.innerHTML = `
        <h3 style="margin:0 0 20px;color:#333;">가족 지갑 입장</h3>
        <input type="text" id="familyCodeInput" placeholder="가족 코드 (6자)" maxlength="6" 
               style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:16px;text-transform:uppercase;margin-bottom:10px;">
        <input type="email" id="ownerEmailInput" placeholder="가족 코드 주인 이메일" 
               style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:20px;">
        <div style="display:flex;gap:10px;">
            <button id="submitCode" style="flex:1;padding:12px;background:#00C9A7;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">입장</button>
            <button id="cancelCode" style="flex:1;padding:12px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;">취소</button>
        </div>
    `;
    
    modal.appendChild(form);
    document.body.appendChild(modal);
    
    const closeModal = () => document.body.removeChild(modal);
    
    modal.querySelector('#cancelCode').addEventListener('click', closeModal);
    modal.querySelector('#submitCode').addEventListener('click', async () => {
        await handleFamilyCodeSubmit(modal);
    });
}

async function handleFamilyCodeSubmit(modal) {
    const code = modal.querySelector('#familyCodeInput').value.trim().toUpperCase();
    const ownerEmail = modal.querySelector('#ownerEmailInput').value.trim();
    
    if (!code || code.length < 6) {
        showToast('가족 코드는 6자여야 합니다.', 'warning');
        return;
    }
    
    if (!ownerEmail) {
        showToast('가족 코드 주인의 이메일을 입력해주세요.', 'warning');
        return;
    }
    
    try {
        showToast('가족 코드 확인 중...', 'info');
        
        // Firestore에서 가족 코드 확인
        const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(app);
        
        const q = query(collection(db, 'users'), where('familyCode', '==', code));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // 이메일 확인
            if (userData.email.toLowerCase() !== ownerEmail.toLowerCase()) {
                showToast('이메일이 일치하지 않습니다.', 'error');
                return;
            }
            
            // 가족 지갑 입장 정보 저장
            localStorage.setItem('familyCode', code);
            localStorage.setItem('familyOwnerEmail', ownerEmail);
            localStorage.setItem('isFamilyMember', 'true');
            
            showToast('가족 지갑에 입장합니다...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showToast('유효하지 않은 가족 코드입니다.', 'error');
        }
    } catch (error) {
        console.error('가족 코드 확인 에러:', error);
        showToast('가족 코드 확인 중 오류가 발생했습니다.', 'error');
    }
}

// 이미 로그인되어 있으면 자동으로 대시보드로 이동
// 주석 처리: 회원가입 페이지가 항상 보이도록
/*
const savedUser = localStorage.getItem('user');
const savedCode = localStorage.getItem('familyCode');
if (savedUser || savedCode) {
    window.location.href = 'dashboard.html';
}
*/
