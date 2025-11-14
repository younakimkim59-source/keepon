// ===== 로그인 페이지 JavaScript =====

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

// 팝업이 막히거나 인앱브라우저(disallowed_useragent)일 때 리다이렉트로 대체
async function signInWithGoogleEnsuringAuth() {
    // 리다이렉트 결과 처리(리다이렉트에서 돌아온 직후)
    try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
            return redirectResult.user;
        }
    } catch (e) {
        // ignore
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (e) {
        const msg = (e && (e.code || e.message || '')) + '';
        // 인앱 브라우저 또는 팝업 차단 등
        if (msg.includes('disallowed_useragent') || msg.includes('popup') || msg.includes('blocked') || msg.includes('browser')) {
            await signInWithRedirect(auth, googleProvider);
            // 이후 흐름은 리다이렉트 복귀 시 getRedirectResult에서 처리됨
            return null;
        }
        throw e;
    }
}

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

// 초대 토큰 생성
function generateInviteToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// URL에서 초대 토큰 파싱
function getInviteTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
}

const inviteTokenInUrl = getInviteTokenFromUrl();

// 초대 링크가 있으면 자동으로 모달 표시
if (inviteTokenInUrl) {
    // 페이지 로드 후 모달 표시
    setTimeout(() => {
        openInviteModal();
    }, 500);
}

// 구글 로그인
googleLoginBtn.addEventListener('click', async () => {
    try {
        showToast('구글 로그인 중...', 'info');
        const user = await signInWithGoogleEnsuringAuth();
        if (!user) return; // redirect 진행됨
        
        console.log('구글 로그인 성공:', user);
        
        // Firestore에 사용자 정보 저장
        const { getFirestore, doc, setDoc, getDoc, collection, setDoc: setDocAlias } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
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
            // 초대 토큰 생성 및 저장 (기본 10회 사용 가능)
            const inviteToken = generateInviteToken();
            const inviteRef = doc(collection(db, 'invites'), inviteToken);
            await setDocAlias(inviteRef, {
                token: inviteToken,
                ownerUid: user.uid,
                ownerEmail: user.email,
                familyCode: familyCode,
                createdAt: new Date().toISOString(),
                maxUses: 10,
                usedCount: 0
            });

            const link = `${window.location.origin}/login.html?invite=${inviteToken}`;
            try { await navigator.clipboard.writeText(link); } catch (_) {}
            alert(`회원가입 완료!\n\n가족코드: ${familyCode}\n초대 링크: ${link}`);
            showToast('초대 링크가 복사되었습니다. 가족에게 공유하세요!', 'success');
        } else {
            // 기존 사용자 - 업데이트
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: new Date().toISOString()
            }, { merge: true });
            // 기존 사용자에 가족코드가 없다면 생성/보완
            let existingCode = userDoc.data()?.familyCode;
            if (!existingCode) {
                existingCode = generateFamilyCode();
                await setDoc(userDocRef, { familyCode: existingCode, isCodeOwner: true }, { merge: true });
            }
            try { await navigator.clipboard.writeText(existingCode); } catch (_) {}
            showToast(`가족코드: ${existingCode} (복사됨)`, 'success');
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
        const user = await signInWithGoogleEnsuringAuth();
        if (!user) return; // redirect 진행됨
        
        // Firestore에 사용자 정보 저장
        const { getFirestore, doc, setDoc, getDoc, collection, setDoc: setDocAlias } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
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
            // 초대 토큰 생성 및 저장 (기본 10회 사용 가능)
            const inviteToken = generateInviteToken();
            const inviteRef = doc(collection(db, 'invites'), inviteToken);
            await setDocAlias(inviteRef, {
                token: inviteToken,
                ownerUid: user.uid,
                ownerEmail: user.email,
                familyCode: familyCode,
                createdAt: new Date().toISOString(),
                maxUses: 10,
                usedCount: 0
            });

            const link = `${window.location.origin}/login.html?invite=${inviteToken}`;
            try { await navigator.clipboard.writeText(link); } catch (_) {}
            alert(`회원가입 완료!\n\n가족코드: ${familyCode}\n초대 링크: ${link}`);
            showToast('초대 링크가 복사되었습니다. 가족에게 공유하세요!', 'success');
        } else {
            showToast('이미 회원가입된 계정입니다. 로그인합니다.', 'success');
            // 기존 사용자에 가족코드가 없다면 생성/보완
            let existingCode = userDoc.data()?.familyCode;
            if (!existingCode) {
                existingCode = generateFamilyCode();
                await setDoc(userDocRef, { familyCode: existingCode, isCodeOwner: true }, { merge: true });
            }
            try { await navigator.clipboard.writeText(existingCode); } catch (_) {}
            showToast(`가족코드: ${existingCode} (복사됨)`, 'success');
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

// 초대 모달 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    const inviteModal = document.getElementById('inviteModal');
    const closeInviteModal = document.getElementById('closeInviteModal');
    const acceptInviteBtn = document.getElementById('acceptInviteBtn');
    const declineInviteBtn = document.getElementById('declineInviteBtn');
    
    if (closeInviteModal) {
        closeInviteModal.addEventListener('click', () => {
            inviteModal.style.display = 'none';
        });
    }
    
    if (declineInviteBtn) {
        declineInviteBtn.addEventListener('click', () => {
            inviteModal.style.display = 'none';
        });
    }
    
    if (acceptInviteBtn) {
        acceptInviteBtn.addEventListener('click', async () => {
            await handleInviteAccept(() => {
                inviteModal.style.display = 'none';
            });
        });
    }
    
    // 모달 외부 클릭 시 닫기
    if (inviteModal) {
        inviteModal.addEventListener('click', (e) => {
            if (e.target === inviteModal) {
                inviteModal.style.display = 'none';
            }
        });
    }
});

// 초대 수락 모달 열기
async function openInviteModal() {
    const inviteModal = document.getElementById('inviteModal');
    const ownerEmailSpan = document.getElementById('inviteOwnerEmail');
    const familyCodeSpan = document.getElementById('inviteFamilyCode');
    
    try {
        console.log('초대 토큰:', inviteTokenInUrl);
        
        // 초대 정보 가져오기
        const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(app);
        const inviteRef = doc(db, 'invites', inviteTokenInUrl);
        
        console.log('초대 문서 참조:', inviteRef.path);
        
        const inviteSnap = await getDoc(inviteRef);
        console.log('초대 문서 존재 여부:', inviteSnap.exists());
        
        if (inviteSnap.exists()) {
            const inviteData = inviteSnap.data();
            console.log('초대 데이터:', inviteData);
            
            ownerEmailSpan.textContent = inviteData.ownerEmail || '-';
            familyCodeSpan.textContent = inviteData.familyCode || '-';
            inviteModal.style.display = 'block';
        } else {
            console.log('초대 문서가 존재하지 않음');
            showToast('유효하지 않은 초대 링크입니다.', 'error');
        }
    } catch (error) {
        console.error('초대 정보 로드 실패:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        showToast(`초대 정보를 불러올 수 없습니다: ${error.message}`, 'error');
    }
}

function openFamilyCodeModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    
    const form = document.createElement('div');
    form.style.cssText = 'background:white;padding:30px;border-radius:12px;width:90%;max-width:400px;';
    if (!inviteTokenInUrl) {
        form.innerHTML = `
            <h3 style="margin:0 0 12px;color:#333;">가족 지갑 입장</h3>
            <p style="margin:0 0 16px;color:#666;font-size:14px;line-height:1.5;">초대 링크를 통해서만 입장할 수 있습니다. 가족에게 초대 링크를 요청해주세요.</p>
            <div style="display:flex;gap:10px;">
                <button id="cancelCode" style="flex:1;padding:12px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;">닫기</button>
            </div>
        `;
    } else {
        form.innerHTML = `
            <h3 style="margin:0 0 20px;color:#333;">초대 수락</h3>
            <p style="margin:0 0 16px;color:#666;font-size:14px;">초대 링크를 통해 가족 지갑에 입장합니다.</p>
            <div style="display:flex;gap:10px;">
                <button id="acceptInvite" style="flex:1;padding:12px;background:#00C9A7;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">입장</button>
                <button id="cancelCode" style="flex:1;padding:12px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;">취소</button>
            </div>
        `;
    }
    
    modal.appendChild(form);
    document.body.appendChild(modal);
    
    const closeModal = () => document.body.removeChild(modal);
    
    modal.querySelector('#cancelCode').addEventListener('click', closeModal);
    const accept = modal.querySelector('#acceptInvite');
    if (accept) {
        accept.addEventListener('click', async () => {
            await handleInviteAccept(closeModal);
        });
    }
}

async function handleInviteAccept(closeModal) {
    if (!inviteTokenInUrl) {
        showToast('초대 링크가 필요합니다.', 'error');
        return;
    }
    try {
        // 초대 수락 전 로그인 보장 (규칙 강화 대비)
        if (!auth.currentUser) {
            showToast('구글 로그인 중...', 'info');
            const user = await signInWithGoogleEnsuringAuth();
            if (!user) return; // redirect 진행됨
        }
        showToast('초대 확인 중...', 'info');
        const { getFirestore, doc, getDoc, setDoc, updateDoc, increment, query, collection, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(app);
        const inviteRef = doc(db, 'invites', inviteTokenInUrl);
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) {
            showToast('유효하지 않은 초대 링크입니다.', 'error');
            return;
        }
        const invite = inviteSnap.data();
        
        // 만료 시간 체크
        if (invite.expiresAt) {
            const expiresAt = new Date(invite.expiresAt);
            const now = new Date();
            if (now > expiresAt) {
                showToast('초대 링크가 만료되었습니다.', 'error');
                return;
            }
        }
        
        // 사용 횟수 체크
        if (typeof invite.maxUses === 'number' && typeof invite.usedCount === 'number' && invite.usedCount >= invite.maxUses) {
            showToast('초대 링크 사용 횟수가 초과되었습니다.', 'error');
            return;
        }
        
        // 가족 멤버 수 확인 (최대 10명)
        const familyMembersQuery = query(
            collection(db, 'users'),
            where('familyCode', '==', invite.familyCode)
        );
        const membersSnapshot = await getDocs(familyMembersQuery);
        const memberCount = membersSnapshot.size;
        
        if (memberCount >= 10) {
            showToast('가족 멤버가 가득 찼습니다. (최대 10명)', 'error');
            return;
        }

        // 소유자 이메일 조회(표시/저장용)
        let ownerEmail = invite.ownerEmail;
        if (!ownerEmail) {
            const ownerRef = doc(db, 'users', invite.ownerUid);
            const ownerSnap = await getDoc(ownerRef);
            ownerEmail = ownerSnap.exists() ? (ownerSnap.data().email || '') : '';
        }

        // 사용자 문서 생성 또는 업데이트 (초대 링크 사용자도 users 문서 필요)
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL,
            familyCode: invite.familyCode,
            isCodeOwner: false, // 초대받은 사용자는 소유자가 아님
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        }, { merge: true });

        // 로컬 저장 후 대시보드로 이동
        localStorage.setItem('familyCode', invite.familyCode);
        if (ownerEmail) localStorage.setItem('familyOwnerEmail', ownerEmail);
        localStorage.setItem('isFamilyMember', 'true');

        // 사용 횟수 증가
        try {
            await updateDoc(inviteRef, { usedCount: increment(1) });
        } catch (_) {
            // updateDoc 실패 시 setDoc merge 시도
            await setDoc(inviteRef, { usedCount: (invite.usedCount || 0) + 1 }, { merge: true });
        }

        showToast('가족 지갑에 입장합니다...', 'success');
        closeModal();
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (error) {
        console.error('초대 수락 에러:', error);
        showToast('초대 처리 중 오류가 발생했습니다.', 'error');
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
