// ===== 전역 변수 =====
let currentFamilyCode = '';
let gifts = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPlatformFilter = 'all';
let notificationCooldown = {}; // 중복 알림 방지

// ===== 유틸리티 함수 =====
function generateFamilyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ===== DOM 요소 =====
const displayFamilyCode = document.getElementById('displayFamilyCode');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addGiftBtn = document.getElementById('addGiftBtn');
const giftModal = document.getElementById('giftModal');
const giftForm = document.getElementById('giftForm');
const giftList = document.getElementById('giftList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');

const modalTitle = document.getElementById('modalTitle');
const brandInput = document.getElementById('brand');
const productNameInput = document.getElementById('productName');
const amountInput = document.getElementById('amount');
const expiryDateInput = document.getElementById('expiryDate');
const memoInput = document.getElementById('memo');
const statusInput = document.getElementById('status');

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', async () => {
    // Firebase Auth가 준비될 때까지 대기 (dashboard.html에서 제공)
    if (window.waitForAuthUser) {
        await window.waitForAuthUser;
    }
    await checkLogin();
    bindEvents();
    checkNotifications();
    
    // 뒤로 가기 버튼 숨기기
    if (backBtn) {
        backBtn.style.display = 'none';
    }
    
    // 코드 복사 버튼
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyFamilyCode);
    }
    if (copyInviteBtn) {
        copyInviteBtn.addEventListener('click', copyInviteLink);
    }
});

async function checkLogin() {
    // 가족 코드로 로그인한 경우 체크
    const loginMethod = localStorage.getItem('loginMethod');
    const familyCode = localStorage.getItem('familyCode');
    
    if (loginMethod === 'familyCode' && familyCode) {
        console.log('가족 코드 로그인:', familyCode);
        currentFamilyCode = familyCode;
        displayFamilyCode.textContent = familyCode;
        await loadGifts();
        return;
    }
    
    // Firebase 사용자 확인 (구글 로그인)
    let userStr = localStorage.getItem('user');
    
    // localStorage에 사용자 정보가 없으면 Firebase Auth에서 조회
    if (!userStr && window.waitForAuthUser) {
        const authUser = await window.waitForAuthUser;
        if (authUser) {
            const minimal = { uid: authUser.uid, email: authUser.email, displayName: authUser.displayName };
            localStorage.setItem('user', JSON.stringify(minimal));
            userStr = JSON.stringify(minimal);
        }
    }
    
    if (userStr) {
        const user = JSON.parse(userStr);
        console.log('로그인된 사용자:', user.uid);
        
        try {
            // Firestore에서 가족 코드 가져오기
            if (window.db && window.FirebaseFirestore) {
                const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', user.uid);
                console.log('사용자 문서 조회 중:', user.uid);
                const userDoc = await window.FirebaseFirestore.getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log('사용자 데이터:', userData);
                    
                    if (userData.familyCode) {
                        currentFamilyCode = userData.familyCode;
                        displayFamilyCode.textContent = currentFamilyCode;
                        localStorage.setItem('familyCode', currentFamilyCode);
                        console.log('가족 코드 로드됨:', currentFamilyCode);
                    } else {
                        console.log('가족 코드가 없음 - 초대를 통해 가입하셔야 합니다');
                        alert('가족 코드가 없습니다. 초대 링크를 통해 가입해주세요.');
                        window.location.href = 'index.html';
                        return;
                    }
                } else {
                    console.log('사용자 문서가 존재하지 않음');
                    // 사용자 문서가 없으면 생성
                    const newCode = generateFamilyCode();
                    await window.FirebaseFirestore.setDoc(userDocRef, { 
                        familyCode: newCode, 
                        isCodeOwner: true,
                        email: user.email,
                        displayName: user.displayName || user.email
                    });
                    currentFamilyCode = newCode;
                    displayFamilyCode.textContent = currentFamilyCode;
                    localStorage.setItem('familyCode', currentFamilyCode);
                    console.log('새 사용자 문서 및 가족 코드 생성됨:', currentFamilyCode);
                }
            }
        } catch (error) {
            console.error('사용자 정보 불러오기 실패:', error);
            // Fallback
            const savedCode = localStorage.getItem('familyCode');
            if (savedCode) {
                currentFamilyCode = savedCode;
                displayFamilyCode.textContent = savedCode;
                console.log('Fallback으로 가족 코드 사용:', currentFamilyCode);
            }
        }
        
        await loadGifts();
    } else {
        // 로그인되지 않았으면 로그인 페이지로 리다이렉트
        window.location.href = 'index.html';
    }
}

// 가족 코드 복사 함수
async function copyFamilyCode() {
    if (currentFamilyCode) {
        const userStr = localStorage.getItem('user');
        let message = `가족 코드: ${currentFamilyCode}`;
        
        if (userStr) {
            const user = JSON.parse(userStr);
            
            // 가족코드 소유자인지 확인
            try {
                const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', user.uid);
                const userDoc = await window.FirebaseFirestore.getDoc(userDocRef);
                const userData = userDoc.data();
                
                // 소유자만 이메일 포함
                if (userData && userData.isCodeOwner === true) {
                    message = `가족 코드: ${currentFamilyCode}\n가족 코드 주인 이메일: ${user.email}`;
                } else {
                    message = `가족 코드: ${currentFamilyCode}\n\n※ 초대 링크를 통해서만 가입 가능합니다.`;
                }
            } catch (error) {
                console.error('사용자 권한 확인 실패:', error);
                message = `가족 코드: ${currentFamilyCode}\n\n※ 초대 링크를 통해서만 가입 가능합니다.`;
            }
        }
        
        navigator.clipboard.writeText(currentFamilyCode).then(() => {
            alert(`✅ 가족 코드가 복사되었습니다!\n\n${message}\n\n가족들에게 이 정보를 공유하세요.`);
        }).catch(() => {
            alert(`가족 코드를 수동으로 복사하세요:\n\n${message}`);
        });
    }
}

// 초대 링크 복사
async function copyInviteLink() {
    // Firebase Auth의 현재 사용자 확인 (Firestore 규칙은 Auth 사용자를 기반으로 함)
    if (!window.auth || !window.auth.currentUser) {
        alert('로그인 후 사용하세요. (Firebase Auth 상태 확인 필요)');
        return;
    }
    
    const authUser = window.auth.currentUser;
    console.log('초대 링크 생성 시작...');
    console.log('Firebase Auth 사용자:', { uid: authUser.uid, email: authUser.email });
    
    try {
        const userStr = localStorage.getItem('user');
        let user;
        if (userStr) {
            user = JSON.parse(userStr);
        } else {
            // localStorage에 없으면 Auth 사용자 정보 사용
            user = {
                uid: authUser.uid,
                email: authUser.email,
                displayName: authUser.displayName,
                photoURL: authUser.photoURL
            };
        }
        
        // 가족 코드 확보
        if (!currentFamilyCode) {
            console.log('가족 코드 없음, Firestore에서 조회 중...');
            const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', user.uid);
            const snap = await window.FirebaseFirestore.getDoc(userDocRef);
            if (snap.exists() && snap.data().familyCode) {
                currentFamilyCode = snap.data().familyCode;
                displayFamilyCode.textContent = currentFamilyCode;
                localStorage.setItem('familyCode', currentFamilyCode);
            } else {
                alert('가족 코드를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
        }
        
        if (!currentFamilyCode) {
            alert('가족 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        
        // 가족코드 소유자 확인
        console.log('가족코드 소유자 확인 중...');
        const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', user.uid);
        const userDoc = await window.FirebaseFirestore.getDoc(userDocRef);
        const userData = userDoc.data();
        console.log('사용자 데이터:', userData);
        
        if (!userData || userData.isCodeOwner !== true) {
            alert('❌ 초대 권한이 없습니다.\n\n초대 링크는 가족코드 소유자만 생성할 수 있습니다.');
            return;
        }
        
        // 가족 멤버 수 확인
        console.log('가족 멤버 수 확인 중...');
        const familyMembersQuery = window.FirebaseFirestore.query(
            window.FirebaseFirestore.collection(window.db, 'users'),
            window.FirebaseFirestore.where('familyCode', '==', currentFamilyCode)
        );
        const membersSnapshot = await window.FirebaseFirestore.getDocs(familyMembersQuery);
        const memberCount = membersSnapshot.size;
        console.log(`현재 가족 멤버 수: ${memberCount}명`);
        
        if (memberCount >= 20) {
            alert(`❌ 가족 멤버가 가득 찼습니다.\n\n현재 멤버 수: ${memberCount}명\n최대 멤버 수: 20명\n\n초대하려면 기존 멤버를 제거해주세요.`);
            return;
        }
        
        // 초대 토큰 생성 및 저장
        console.log('초대 토큰 생성 중...');
        const token = generateInviteToken();
        const inviteRef = window.FirebaseFirestore.doc(window.db, 'invites', token);
        
        // 만료 시간 설정 (7일 후)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // Firestore 규칙에서 request.auth.uid를 사용하므로 authUser.uid를 사용
        const inviteData = {
            token: token,
            ownerUid: authUser.uid, // Firebase Auth의 UID 사용 (규칙 검사용)
            ownerEmail: authUser.email || user.email,
            familyCode: currentFamilyCode,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            maxUses: 20, // 최대 사용 횟수 20회로 제한
            usedCount: 0
        };
        
        console.log('초대 데이터 저장 시도:', inviteData);
        console.log('저장 경로: invites/' + token);
        console.log('Firebase Auth UID:', authUser.uid);
        console.log('ownerUid 설정:', inviteData.ownerUid);
        console.log('UID 일치 여부:', inviteData.ownerUid === authUser.uid);
        
        // Firebase Auth 토큰 새로고침 (만료된 토큰 방지)
        try {
            await authUser.getIdToken(true); // force refresh
            console.log('✅ Firebase Auth 토큰 확인 완료');
        } catch (tokenError) {
            console.error('토큰 새로고침 실패:', tokenError);
            throw new Error('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        }
        
        // Firestore 규칙 디버깅을 위한 추가 로깅
        console.log('=== Firestore 규칙 디버깅 ===');
        console.log('request.auth.uid:', authUser.uid);
        console.log('request.resource.data.ownerUid:', inviteData.ownerUid);
        console.log('UID 일치 여부:', authUser.uid === inviteData.ownerUid);
        console.log('Firestore 앱:', window.db);
        console.log('Firebase Auth 앱:', window.auth);
        console.log('인증 상태:', authUser ? '인증됨' : '인증 안됨');
        console.log('토큰 유효성:', authUser ? '유효' : '무효');
        
        // Firebase Auth 토큰 확인
        try {
            const token = await authUser.getIdToken();
            console.log('Firebase Auth 토큰 존재:', !!token);
        } catch (tokenError) {
            console.error('토큰 확인 실패:', tokenError);
        }
        
        // Firestore에 저장 시도
        console.log('Firestore 저장 시작...');
        console.log('저장할 데이터:', inviteData);
        console.log('저장 경로:', `invites/${token}`);
        await window.FirebaseFirestore.setDoc(inviteRef, inviteData);
        console.log('✅ 초대 데이터 저장 성공!');
        
        const link = `${window.location.origin}/login.html?invite=${token}`;
        console.log('생성된 초대 링크:', link);
        await navigator.clipboard.writeText(link);
        alert(`✅ 초대 링크가 복사되었습니다!\n\n${link}\n\n⏰ 유효기간: 7일\n👥 사용 가능 횟수: 20회\n\n현재 가족 멤버: ${memberCount}/20명`);
    } catch (e) {
        console.error('초대 링크 생성 실패:', e);
        console.error('에러 상세:', {
            message: e.message,
            code: e.code,
            stack: e.stack
        });
        
        // 에러 타입에 따라 구체적인 메시지 표시
        let errorMessage = '초대 링크 생성에 실패했습니다.\n\n';
        
        if (e.code === 'permission-denied') {
            errorMessage += '❌ 권한이 없습니다.\n\nFirestore 보안 규칙을 확인해주세요.';
        } else if (e.code === 'unavailable') {
            errorMessage += '⚠️ 네트워크 오류가 발생했습니다.\n\n인터넷 연결을 확인하고 다시 시도해주세요.';
        } else if (e.message) {
            errorMessage += `에러: ${e.message}`;
        } else {
            errorMessage += '잠시 후 다시 시도해주세요.';
        }
        
        errorMessage += '\n\n문제가 계속되면 콘솔(F12)의 에러 메시지를 확인해주세요.';
        alert(errorMessage);
    }
}

function generateInviteToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
}

function bindEvents() {
    // 로그아웃
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // 검색 및 필터
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                displayGifts();
            });
        });
    }
    
    // 모달
    if (addGiftBtn) addGiftBtn.addEventListener('click', openAddModal);
    if (closeModal) closeModal.addEventListener('click', closeModalWindow);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalWindow);
    if (giftForm) giftForm.addEventListener('submit', handleSubmit);
    
    // 바코드 실시간 미리보기
    const barcodeInput = document.getElementById('barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value) {
                renderBarcodePreview(value);
            } else {
                const modalBarcode = document.getElementById('modal-barcode');
                if (modalBarcode) {
                    modalBarcode.style.display = 'none';
                    modalBarcode.innerHTML = '';
                }
            }
        });
    }
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === giftModal) {
            closeModalWindow();
        }
    });
}

// ===== 뒤로 가기 기능 =====
function handleBack() {
    // 이전 페이지가 있으면 브라우저 뒤로가기
    if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
    } else {
        // 이전 페이지가 없으면 Login 페이지로 이동
        window.location.href = 'login.html';
    }
}

// ===== 로그아웃 기능 =====
function handleLogout() {
    if (confirm('가족 지갑에서 로그아웃하시겠습니까?')) {
        localStorage.removeItem('familyCode');
        // 로그인 페이지로 리다이렉트
        window.location.href = 'login.html';
    }
}


// ===== CRUD 기능 =====
async function loadGifts() {
    if (!currentFamilyCode) {
        console.log('가족 코드가 없어서 기프트콘을 로드할 수 없습니다');
        return;
    }
    
    // 로그인 방식 확인
    const loginMethod = localStorage.getItem('loginMethod');
    const authUser = window.auth?.currentUser;
    
    // 가족 코드 로그인 사용자는 Firestore 없이 localStorage만 사용
    if (loginMethod === 'familyCode') {
        console.log('가족 코드 로그인: localStorage만 사용');
        const storedGifts = localStorage.getItem(`gifts_${currentFamilyCode}`);
        gifts = storedGifts ? JSON.parse(storedGifts) : [];
        console.log('localStorage에서 기프트콘 로드:', gifts.length);
        updateStats();
        checkExpiryDates();
        displayGifts();
        return;
    }
    
    // Firebase Auth 인증 상태 확인 (구글 로그인)
    if (!window.auth || !authUser) {
        console.error('Firebase Auth 사용자가 없습니다. 로그인 상태를 확인하세요.');
        if (window.waitForAuthUser) {
            const authUser = await window.waitForAuthUser;
            if (!authUser) {
                console.error('인증된 사용자를 찾을 수 없습니다.');
                return;
            }
        } else {
            return;
        }
    }
    
    console.log('기프트콘 로드 시작, 가족 코드:', currentFamilyCode, '사용자:', authUser?.uid);
    
    try {
        // 사용자의 familyCode가 현재 가족 코드와 일치하는지 확인
        if (authUser) {
            const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', authUser.uid);
            const userDoc = await window.FirebaseFirestore.getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.familyCode !== currentFamilyCode) {
                    console.error('사용자의 가족 코드가 일치하지 않습니다:', userData.familyCode, 'vs', currentFamilyCode);
                    alert('가족 코드가 일치하지 않습니다. 다시 로그인해주세요.');
                    window.location.href = 'index.html';
                    return;
                }
            }
        }
        
        // Firestore에서 실시간으로 기프트콘 로드
        const giftsRef = window.FirebaseFirestore.collection(window.db, 'families', currentFamilyCode, 'gifts');
        const q = window.FirebaseFirestore.query(giftsRef, window.FirebaseFirestore.orderBy('createdAt', 'desc'));
        
        console.log('Firestore 쿼리 실행 중...');
        window.FirebaseFirestore.onSnapshot(q, async (snapshot) => {
            console.log('기프트콘 스냅샷 수신, 문서 수:', snapshot.size);
            console.log('스냅샷 오류:', snapshot.metadata.fromCache ? '캐시에서' : '서버에서');
            gifts = [];
            snapshot.forEach((doc) => {
                console.log('기프트콘 문서:', doc.id, doc.data());
                gifts.push({ id: doc.id, ...doc.data() });
            });
            console.log('로드된 기프트콘 수:', gifts.length);
            updateStats();
            await checkExpiryDates();
            displayGifts();
        }, (error) => {
            console.error('기프트콘 리스너 오류:', error);
            console.error('오류 코드:', error.code);
            console.error('오류 메시지:', error.message);
            
            // 권한 오류인 경우 더 자세한 정보 제공
            if (error.code === 'permission-denied') {
                console.error('⚠️ Firestore 보안 규칙 오류');
                console.error('현재 사용자 UID:', authUser?.uid);
                console.error('가족 코드:', currentFamilyCode);
                console.error('Firestore 보안 규칙을 확인하고 Firebase Console에서 배포했는지 확인하세요.');
            }
        });
    } catch (error) {
        console.error('기프트콘 로드 실패:', error);
        // Fallback to localStorage
        const storedGifts = localStorage.getItem(`gifts_${currentFamilyCode}`);
        gifts = storedGifts ? JSON.parse(storedGifts) : [];
        console.log('localStorage에서 기프트콘 로드:', gifts.length);
        updateStats();
        checkExpiryDates();
        displayGifts();
    }
}


function openAddModal() {
    modalTitle.textContent = '기프트콘 추가';
    giftForm.reset();
    giftForm.dataset.editIndex = '';
    giftModal.style.display = 'block';
    
    // 기본 날짜 설정 (오늘부터 1년 후)
    const today = new Date();
    const maxDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    expiryDateInput.min = today.toISOString().split('T')[0];
    expiryDateInput.max = maxDate.toISOString().split('T')[0];
}

function openEditModal(index) {
    const gift = gifts[index];
    modalTitle.textContent = '기프트콘 수정';
    giftForm.dataset.editIndex = index;
    
    brandInput.value = gift.brand;
    productNameInput.value = gift.productName;
    amountInput.value = gift.amount;
    expiryDateInput.value = gift.expiryDate;
    document.getElementById('barcode').value = gift.barcode || '';
    memoInput.value = gift.memo || '';
    statusInput.value = gift.status;
    
    giftModal.style.display = 'block';
    
    // 바코드 미리보기 렌더링
    setTimeout(() => {
        renderModalBarcode(gift.barcode);
    }, 100);
}

function renderModalBarcode(barcodeValue) {
    if (!barcodeValue) return;
    
    const modalBarcode = document.getElementById('modal-barcode');
    if (modalBarcode) {
        modalBarcode.innerHTML = '';
        const svg = document.createElement('svg');
        svg.id = 'preview-barcode';
        svg.style.width = '100%';
        svg.style.height = 'auto';
        modalBarcode.appendChild(svg);
        modalBarcode.style.display = 'block';
        
        try {
            JsBarcode('#preview-barcode', barcodeValue, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14,
                margin: 15,
                background: "#ffffff",
                lineColor: "#000000"
            });
        } catch (e) {
            console.error('Barcode preview failed:', e);
        }
    }
}

function renderBarcodePreview(barcodeValue) {
    const modalBarcode = document.getElementById('modal-barcode');
    if (modalBarcode) {
        modalBarcode.innerHTML = '';
        const svg = document.createElement('svg');
        svg.id = 'live-barcode';
        svg.style.width = '100%';
        svg.style.height = 'auto';
        modalBarcode.appendChild(svg);
        modalBarcode.style.display = 'block';
        
        try {
            JsBarcode('#live-barcode', barcodeValue, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14,
                margin: 15,
                background: "#ffffff",
                lineColor: "#000000"
            });
        } catch (e) {
            console.error('Live barcode preview failed:', e);
        }
    }
}

function closeModalWindow() {
    giftModal.style.display = 'none';
    giftForm.reset();
    
    // 바코드 미리보기 숨기기
    const modalBarcode = document.getElementById('modal-barcode');
    if (modalBarcode) {
        modalBarcode.style.display = 'none';
        modalBarcode.innerHTML = '';
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const editIndex = giftForm.dataset.editIndex;
    const loginMethod = localStorage.getItem('loginMethod');
    
    // 데이터 검증
    const brand = brandInput.value.trim();
    const productName = productNameInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (!brand || !productName) {
        alert('브랜드명과 상품명은 필수입니다.');
        return;
    }
    
    if (amount <= 0) {
        alert('금액은 0보다 커야 합니다.');
        return;
    }
    
    const gift = {
        brand: brand,
        productName: productName,
        amount: amount,
        expiryDate: expiryDateInput.value,
        barcode: document.getElementById('barcode').value.trim(),
        memo: memoInput.value.trim(),
        status: statusInput.value,
        createdAt: editIndex === '' ? new Date().toISOString() : gifts[parseInt(editIndex)].createdAt,
        updatedAt: new Date().toISOString()
    };
    
    try {
        // 가족 코드 로그인 사용자는 localStorage만 사용
        if (loginMethod === 'familyCode') {
            if (editIndex === '') {
                // localStorage에 추가
                gift.id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                gifts.push(gift);
            } else {
                // localStorage에서 수정
                const index = parseInt(editIndex);
                gift.id = gifts[index].id;
                gifts[index] = gift;
            }
            
            localStorage.setItem(`gifts_${currentFamilyCode}`, JSON.stringify(gifts));
            console.log('localStorage에 기프트콘 저장 완료');
            
            updateStats();
            checkExpiryDates();
            displayGifts();
            closeModalWindow();
            return;
        }
        
        // 구글 로그인 사용자는 Firestore 사용
        if (editIndex === '') {
            // Firestore에 추가
            const giftsRef = window.FirebaseFirestore.collection(window.db, 'families', currentFamilyCode, 'gifts');
            const docRef = await window.FirebaseFirestore.addDoc(giftsRef, gift);
            console.log('기프트콘 추가 완료:', docRef.id);
        } else {
            // Firestore에서 수정
            const giftId = gifts[parseInt(editIndex)].id;
            const giftRef = window.FirebaseFirestore.doc(window.db, 'families', currentFamilyCode, 'gifts', giftId);
            await window.FirebaseFirestore.updateDoc(giftRef, gift);
            console.log('기프트콘 수정 완료:', giftId);
        }
        
        closeModalWindow();
    } catch (error) {
        console.error('기프트콘 저장 실패:', error);
        alert('기프트콘 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
}

async function deleteGift(index) {
    if (confirm('이 기프트콘을 삭제하시겠습니까?')) {
        const loginMethod = localStorage.getItem('loginMethod');
        
        try {
            const giftId = gifts[index].id;
            
            // 가족 코드 로그인 사용자는 localStorage만 사용
            if (loginMethod === 'familyCode') {
                gifts.splice(index, 1);
                localStorage.setItem(`gifts_${currentFamilyCode}`, JSON.stringify(gifts));
                console.log('localStorage에서 기프트콘 삭제 완료');
                updateStats();
                checkExpiryDates();
                displayGifts();
                return;
            }
            
            // 구글 로그인 사용자는 Firestore 사용
            const giftRef = window.FirebaseFirestore.doc(window.db, 'families', currentFamilyCode, 'gifts', giftId);
            await window.FirebaseFirestore.deleteDoc(giftRef);
            console.log('기프트콘 삭제 완료:', giftId);
        } catch (error) {
            console.error('기프트콘 삭제 실패:', error);
            alert('기프트콘 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    }
}

// ===== 표시 기능 =====
function displayGifts() {
    let filteredGifts = [...gifts];
    
    // 검색 필터
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filteredGifts = filteredGifts.filter(gift => 
            gift.brand.toLowerCase().includes(searchLower) ||
            gift.productName.toLowerCase().includes(searchLower)
        );
    }
    
    // 상태 필터
    if (currentFilter !== 'all') {
        filteredGifts = filteredGifts.filter(gift => {
            if (currentFilter === 'active') return gift.status === 'active';
            if (currentFilter === 'expiring') return isExpiring(gift.expiryDate);
            if (currentFilter === 'expired') return isExpired(gift.expiryDate);
            return true;
        });
    }
    
    // 유효기간 순으로 정렬
    filteredGifts.sort((a, b) => {
        const dateA = new Date(a.expiryDate);
        const dateB = new Date(b.expiryDate);
        if (a.status === 'expired' && b.status !== 'expired') return 1;
        if (a.status !== 'expired' && b.status === 'expired') return -1;
        return dateA - dateB;
    });
    
    if (filteredGifts.length === 0) {
        giftList.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        giftList.style.display = 'grid';
        emptyState.style.display = 'none';
        renderGifts(filteredGifts);
    }
}

function renderGifts(giftsToRender) {
    giftList.innerHTML = '';
    
    giftsToRender.forEach((gift, index) => {
        const actualIndex = gifts.indexOf(gift);
        const card = createGiftCard(gift, actualIndex);
        giftList.appendChild(card);
    });
    
    // 바코드 렌더링
    renderBarcodes();
}

function renderBarcodes() {
    const barcodeElements = document.querySelectorAll('.barcode-svg');
    barcodeElements.forEach(svg => {
        const barcodeValue = svg.getAttribute('data-barcode');
        if (barcodeValue) {
            try {
                // SVG 크기 고정
                svg.style.width = '100%';
                svg.style.height = '50px';
                svg.style.maxWidth = '200px';
                svg.style.display = 'block';
                
                JsBarcode(svg, barcodeValue, {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    margin: 10,
                    background: "#ffffff",
                    lineColor: "#000000",
                    // 바코드 크기 완전 통일을 위한 추가 설정
                    textAlign: "center",
                    textPosition: "bottom",
                    textMargin: 5
                });
            } catch (e) {
                console.error('Barcode generation failed:', e);
            }
        }
    });
}

function createGiftCard(gift, index) {
    const card = document.createElement('div');
    const daysLeft = getDaysLeft(gift.expiryDate);
    const cardClass = getCardClass(daysLeft, gift.status);
    const badgeText = getBadgeText(daysLeft, gift.status);
    const badgeClass = getBadgeClass(daysLeft, gift.status);
    
    card.className = `gift-card ${cardClass}`;
    card.innerHTML = `
        <div class="gift-header">
            <span class="gift-badge ${badgeClass}">${badgeText}</span>
            <div class="gift-actions">
                <button onclick="openEditModal(${index})" title="수정">✏️</button>
                <button onclick="deleteGift(${index})" title="삭제">🗑️</button>
            </div>
        </div>
        <div class="gift-brand">${escapeHtml(gift.brand)}</div>
        <div class="gift-product">${escapeHtml(gift.productName)}</div>
        <div class="gift-price">${formatCurrency(gift.amount)}원</div>
        <div class="gift-expiry">
            🕒 만료일: ${formatDate(gift.expiryDate)} 
            ${daysLeft >= 0 ? `(D-${daysLeft})` : '(만료됨)'}
        </div>
        ${gift.barcode ? `<div class="gift-barcode" data-barcode="${escapeHtml(gift.barcode)}" data-brand="${escapeHtml(gift.brand)}" data-product="${escapeHtml(gift.productName)}" title="클릭하여 바코드 확대" onclick="console.log('바코드 클릭됨!'); openBarcodeModal('${escapeHtml(gift.barcode)}', '${escapeHtml(gift.brand)}', '${escapeHtml(gift.productName)}')"><div class="barcode-label">🔖 바코드</div><svg class="barcode-svg" data-barcode="${escapeHtml(gift.barcode)}"></svg></div>` : ''}
        ${gift.memo ? `<div class="gift-memo">${escapeHtml(gift.memo)}</div>` : ''}
    `;
    
    return card;
}


function getCardClass(daysLeft, status) {
    if (status === 'expired' || status === 'used') return 'expired';
    if (daysLeft <= 0) return 'expired';
    if (daysLeft <= 1) return 'danger';
    if (daysLeft <= 3) return 'warning';
    return '';
}

function getBadgeText(daysLeft, status) {
    if (status === 'used') return '사용완료';
    if (status === 'expired' || daysLeft < 0) return '만료됨';
    if (daysLeft <= 1) return 'D-1 ⚠️';
    if (daysLeft <= 3) return 'D-' + daysLeft;
    return '사용가능';
}

function getBadgeClass(daysLeft, status) {
    if (status === 'used' || status === 'expired' || daysLeft < 0) return 'expired';
    if (daysLeft <= 1) return 'danger';
    if (daysLeft <= 3) return 'warning';
    return '';
}

function getDaysLeft(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isExpiring(expiryDate) {
    const daysLeft = getDaysLeft(expiryDate);
    return daysLeft > 0 && daysLeft <= 3;
}

function isExpired(expiryDate) {
    const daysLeft = getDaysLeft(expiryDate);
    return daysLeft < 0;
}

async function checkExpiryDates() {
    const today = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    
    for (const gift of gifts) {
        if (gift.expiryDate < today && gift.status === 'active') {
            try {
                const giftRef = window.FirebaseFirestore.doc(window.db, 'families', currentFamilyCode, 'gifts', gift.id);
                await window.FirebaseFirestore.updateDoc(giftRef, { status: 'expired' });
                gift.status = 'expired';
                hasChanges = true;
            } catch (error) {
                console.error('만료 상태 업데이트 실패:', error);
            }
        }
    }
    
    // 변경사항이 있을 때만 UI 업데이트
    if (hasChanges) {
        updateStats();
        displayGifts();
    }
}

// ===== 통계 =====
function updateStats() {
    const totalGifts = gifts.length;
    const expiringGifts = gifts.filter(g => isExpiring(g.expiryDate)).length;
    const availableGifts = gifts.filter(g => g.status === 'active').length;
    const expiredGifts = gifts.filter(g => g.status === 'expired').length;
    
    document.getElementById('totalGifts').textContent = totalGifts;
    document.getElementById('expiringGifts').textContent = expiringGifts;
    
    // PC용 추가 통계
    const availableElement = document.getElementById('availableGifts');
    const expiredElement = document.getElementById('expiredGifts');
    if (availableElement) availableElement.textContent = availableGifts;
    if (expiredElement) expiredElement.textContent = expiredGifts;
}

// ===== 검색 기능 =====
function handleSearch(e) {
    currentSearch = e.target.value;
    displayGifts();
}

// ===== 알림 기능 =====
function checkNotifications() {
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // 매 분마다 체크
    setInterval(() => {
        if (gifts.length === 0) return;
        
        gifts.forEach(gift => {
            const daysLeft = getDaysLeft(gift.expiryDate);
            
            // D-1 알림 (1일 이내)
            if (daysLeft === 1 && gift.status === 'active') {
                showNotification(
                    `🎁 ${gift.brand} - ${gift.productName}`,
                    `내일 만료됩니다! (${formatCurrency(gift.amount)}원)`
                );
            }
            
            // D-0 알림 (당일 만료)
            if (daysLeft === 0 && gift.status === 'active') {
                showNotification(
                    `⚠️ ${gift.brand} - ${gift.productName}`,
                    `오늘 만료됩니다! 지금 바로 사용하세요 (${formatCurrency(gift.amount)}원)`
                );
            }
        });
    }, 60000); // 1분마다 체크
    
    // 페이지 로드 시 체크
    if (gifts.length > 0) {
        gifts.forEach(gift => {
            const daysLeft = getDaysLeft(gift.expiryDate);
            if (daysLeft <= 1 && gift.status === 'active') {
                setTimeout(() => {
                    showNotification(
                        `🎁 ${gift.brand} - ${gift.productName}`,
                        `${daysLeft === 0 ? '오늘' : `${daysLeft}일 후`} 만료 예정`
                    );
                }, 2000);
            }
        });
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notificationKey = `${title}_${body}`;
        
        // 중복 알림 방지 (같은 알림은 1시간 내에 한 번만)
        if (notificationCooldown[notificationKey]) {
            const lastShown = notificationCooldown[notificationKey];
            if (Date.now() - lastShown < 3600000) { // 1시간
                return;
            }
        }
        
        new Notification(title, {
            body: body,
            icon: '🎁',
            badge: '🎁'
        });
        
        notificationCooldown[notificationKey] = Date.now();
    }
}

// ===== 유틸리티 함수 =====
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function formatCurrency(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 바코드 확대 모달 열기
function openBarcodeModal(barcodeValue, brand = '', productName = '') {
    console.log('openBarcodeModal 호출됨:', { barcodeValue, brand, productName });
    
    const modal = document.getElementById('barcodeModal');
    const modalInfo = document.getElementById('barcodeModalInfo');
    const modalBarcode = document.getElementById('barcodeModalBarcode');
    
    console.log('모달 요소들:', { modal, modalInfo, modalBarcode });
    
    if (!modal || !modalBarcode) {
        console.error('모달 요소를 찾을 수 없습니다');
        return;
    }
    
    // 기프트콘 정보 표시
    if (brand && productName) {
        modalInfo.innerHTML = `<strong style="font-size: 18px; color: #333;">${escapeHtml(brand)}</strong><br><span style="font-size: 14px;">${escapeHtml(productName)}</span>`;
    } else {
        modalInfo.innerHTML = '';
    }
    
    // 바코드 렌더링 (큰 사이즈)
    modalBarcode.innerHTML = '';
    // 먼저 모달을 표시해 부모의 레이아웃이 계산되도록 함
    modal.style.display = 'block';
    modal.style.zIndex = '99999';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    
    // SVG는 반드시 SVG 네임스페이스로 생성해야 렌더링됩니다 (createElementNS)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'large-barcode';
    // 명시적인 크기 속성 설정 (JsBarcode가 크기를 계산할 수 있도록)
    svg.setAttribute('width', '800');
    svg.setAttribute('height', '200');
    svg.style.width = '100%';
    svg.style.height = '200px';
    svg.style.maxWidth = '800px';
    svg.style.display = 'block';
    svg.style.visibility = 'visible';
    svg.style.opacity = '1';
    svg.style.backgroundColor = 'white';
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    modalBarcode.appendChild(svg);
    
    // 모달이 완전히 렌더링된 후 바코드 생성 (더 긴 지연 시간)
    setTimeout(() => {
        requestAnimationFrame(() => {
        try {
            console.log('바코드 생성 시도:', barcodeValue);
            // 생성한 SVG 요소에 직접 렌더링
            JsBarcode(svg, barcodeValue, {
                format: "CODE128",
                width: 4,
                height: 200,
                displayValue: true,
                fontSize: 24,
                margin: 30,
                background: "#ffffff",
                lineColor: "#000000"
            });
            console.log('바코드 생성 성공');
            
            // 렌더링 후 SVG 크기 재확인
            setTimeout(() => {
                const rect = svg.getBoundingClientRect();
                console.log('SVG 실제 크기:', {
                    width: rect.width,
                    height: rect.height,
                    visible: rect.width > 0 && rect.height > 0
                });
                
                if (rect.width === 0 || rect.height === 0) {
                    console.error('SVG가 렌더링되지 않음! 재시도 중...');
                    // 재시도: SVG를 다시 생성
                    const newSvg = document.createElement('svg');
                    newSvg.id = 'large-barcode-retry';
                    newSvg.style.width = '100%';
                    newSvg.style.height = '200px';
                    newSvg.style.maxWidth = '800px';
                    newSvg.style.display = 'block';
                    modalBarcode.innerHTML = '';
                    modalBarcode.appendChild(newSvg);
                    
                    setTimeout(() => {
                        JsBarcode(newSvg, barcodeValue, {
                            format: "CODE128",
                            width: 4,
                            height: 200,
                            displayValue: true,
                            fontSize: 24,
                            margin: 30,
                            background: "#ffffff",
                            lineColor: "#000000"
                        });
                    }, 50);
                }
            }, 100);
        } catch (e) {
            console.error('Large barcode generation failed:', e);
            modalBarcode.innerHTML = `<div style="padding: 20px; text-align: center; color: #666;">
                <p>바코드 생성 실패</p>
                <p style="font-size: 12px; color: #999;">${e.message}</p>
            </div>`;
        }
        });
    }, 200); // 모달이 완전히 렌더링될 때까지 200ms 대기
    
    // (이미 위에서 표시됨)
    // 바코드 컨테이너 강제 표시
    modalBarcode.style.display = 'flex';
    modalBarcode.style.visibility = 'visible';
    modalBarcode.style.opacity = '1';
    modalBarcode.style.minHeight = '200px';
    modalBarcode.style.backgroundColor = 'white';
    modalBarcode.style.border = '2px solid #ddd';
    modalBarcode.style.borderRadius = '8px';
    modalBarcode.style.padding = '20px';
    modalBarcode.style.justifyContent = 'center';
    modalBarcode.style.alignItems = 'center';
    
    console.log('모달 표시 설정 완료:', modal.style.display);
    console.log('모달 요소 스타일:', {
        display: modal.style.display,
        visibility: modal.style.visibility,
        zIndex: modal.style.zIndex,
        position: modal.style.position
    });
    
    // 모달이 실제로 보이는지 확인
    setTimeout(() => {
        const rect = modal.getBoundingClientRect();
        console.log('모달 위치 및 크기:', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
        });
    }, 100);
}

// 바코드 모달 닫기
function closeBarcodeModal() {
    const modal = document.getElementById('barcodeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 바코드 모달 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    const closeBarcodeModalBtn = document.getElementById('closeBarcodeModal');
    const barcodeModal = document.getElementById('barcodeModal');
    
    if (closeBarcodeModalBtn) {
        closeBarcodeModalBtn.addEventListener('click', closeBarcodeModal);
    }
    
    // 모달 외부 클릭 시 닫기
    if (barcodeModal) {
        barcodeModal.addEventListener('click', (e) => {
            if (e.target === barcodeModal) {
                closeBarcodeModal();
            }
        });
    }
    
    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const barcodeModal = document.getElementById('barcodeModal');
            if (barcodeModal && barcodeModal.style.display === 'block') {
                closeBarcodeModal();
            }
        }
    });
});

// 전역 함수로 노출
window.openEditModal = openEditModal;
window.deleteGift = deleteGift;
window.openBarcodeModal = openBarcodeModal;

