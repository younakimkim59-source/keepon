// ===== 전역 변수 =====
let currentFamilyCode = '';
let gifts = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPlatformFilter = 'all';
let notificationCooldown = {}; // 중복 알림 방지

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

const modalTitle = document.getElementById('modalTitle');
const platformInput = document.getElementById('platform');
const brandInput = document.getElementById('brand');
const productNameInput = document.getElementById('productName');
const amountInput = document.getElementById('amount');
const expiryDateInput = document.getElementById('expiryDate');
const memoInput = document.getElementById('memo');
const statusInput = document.getElementById('status');
const platformSelectFilter = document.getElementById('platformSelect');

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', async () => {
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
});

async function checkLogin() {
    // Firebase 사용자 확인
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
        const user = JSON.parse(userStr);
        
        try {
            // Firestore에서 가족 코드 가져오기
            if (window.db && window.FirebaseFirestore) {
                const userDocRef = window.FirebaseFirestore.doc(window.db, 'users', user.uid);
                const userDoc = await window.FirebaseFirestore.getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    if (userData.familyCode) {
                        currentFamilyCode = userData.familyCode;
                        displayFamilyCode.textContent = currentFamilyCode;
                        localStorage.setItem('familyCode', currentFamilyCode);
                    }
                }
            }
        } catch (error) {
            console.error('사용자 정보 불러오기 실패:', error);
            // Fallback
            const savedCode = localStorage.getItem('familyCode');
            if (savedCode) {
                currentFamilyCode = savedCode;
                displayFamilyCode.textContent = savedCode;
            }
        }
        
        loadGifts();
    } else {
        // 가족 멤버로 입장한 경우
        const savedCode = localStorage.getItem('familyCode');
        if (savedCode) {
            currentFamilyCode = savedCode;
            displayFamilyCode.textContent = savedCode;
            loadGifts();
        } else {
            // 로그인되지 않았으면 로그인 페이지로 리다이렉트
            window.location.href = 'index.html';
        }
    }
}

// 가족 코드 복사 함수
function copyFamilyCode() {
    if (currentFamilyCode) {
        const userStr = localStorage.getItem('user');
        let message = `가족 코드: ${currentFamilyCode}`;
        
        if (userStr) {
            const user = JSON.parse(userStr);
            message = `가족 코드: ${currentFamilyCode}\n가족 코드 주인 이메일: ${user.email}`;
        }
        
        navigator.clipboard.writeText(currentFamilyCode).then(() => {
            alert(`✅ 가족 코드가 복사되었습니다!\n\n${message}\n\n가족들에게 이 정보를 공유하세요.`);
        }).catch(() => {
            alert(`가족 코드를 수동으로 복사하세요:\n\n${message}`);
        });
    }
}

function bindEvents() {
    // 로그아웃
    logoutBtn.addEventListener('click', handleLogout);
    
    // 검색 및 필터
    searchInput.addEventListener('input', handleSearch);
    platformSelectFilter.addEventListener('change', handlePlatformFilter);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            displayGifts();
        });
    });
    
    // 모달
    addGiftBtn.addEventListener('click', openAddModal);
    closeModal.addEventListener('click', closeModalWindow);
    cancelBtn.addEventListener('click', closeModalWindow);
    giftForm.addEventListener('submit', handleSubmit);
    
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
function loadGifts() {
    const storedGifts = localStorage.getItem(`gifts_${currentFamilyCode}`);
    gifts = storedGifts ? JSON.parse(storedGifts) : [];
    updateStats();
    checkExpiryDates();
    displayGifts();
}

function saveGifts() {
    localStorage.setItem(`gifts_${currentFamilyCode}`, JSON.stringify(gifts));
    updateStats();
    checkExpiryDates();
    displayGifts();
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
    
    platformInput.value = gift.platform || '';
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

function handleSubmit(e) {
    e.preventDefault();
    
    const editIndex = giftForm.dataset.editIndex;
    
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
    
    if (!platformInput.value) {
        alert('플랫폼을 선택해주세요.');
        return;
    }
    
    const gift = {
        id: editIndex === '' ? Date.now() : gifts[parseInt(editIndex)].id,
        platform: platformInput.value,
        brand: brand,
        productName: productName,
        amount: amount,
        expiryDate: expiryDateInput.value,
        barcode: document.getElementById('barcode').value.trim(),
        memo: memoInput.value.trim(),
        status: statusInput.value,
        createdAt: editIndex === '' ? new Date().toISOString() : gifts[parseInt(editIndex)].createdAt
    };
    
    if (editIndex === '') {
        // 추가
        gifts.push(gift);
    } else {
        // 수정
        gifts[parseInt(editIndex)] = gift;
    }
    
    saveGifts();
    closeModalWindow();
}

function deleteGift(index) {
    if (confirm('이 기프트콘을 삭제하시겠습니까?')) {
        gifts.splice(index, 1);
        saveGifts();
    }
}

// ===== 표시 기능 =====
function handlePlatformFilter(e) {
    currentPlatformFilter = e.target.value;
    displayGifts();
}

function displayGifts() {
    let filteredGifts = [...gifts];
    
    // 검색 필터
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filteredGifts = filteredGifts.filter(gift => 
            gift.brand.toLowerCase().includes(searchLower) ||
            gift.productName.toLowerCase().includes(searchLower) ||
            (gift.platform && gift.platform.toLowerCase().includes(searchLower))
        );
    }
    
    // 플랫폼 필터
    if (currentPlatformFilter !== 'all') {
        filteredGifts = filteredGifts.filter(gift => gift.platform === currentPlatformFilter);
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
                JsBarcode(svg, barcodeValue, {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    margin: 10,
                    background: "#ffffff",
                    lineColor: "#000000"
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
    const platformColor = getPlatformColor(gift.platform);
    
    card.className = `gift-card ${cardClass}`;
    card.innerHTML = `
        <div class="gift-header">
            <span class="gift-badge ${badgeClass}">${badgeText}</span>
            <div class="gift-actions">
                <button onclick="openEditModal(${index})" title="수정">✏️</button>
                <button onclick="deleteGift(${index})" title="삭제">🗑️</button>
            </div>
        </div>
        <div class="gift-platform" style="background: ${platformColor.bg}; color: ${platformColor.text};">
            ${escapeHtml(gift.platform || '기타')}
        </div>
        <div class="gift-brand">${escapeHtml(gift.brand)}</div>
        <div class="gift-product">${escapeHtml(gift.productName)}</div>
        <div class="gift-price">${formatCurrency(gift.amount)}원</div>
        <div class="gift-expiry">
            🕒 만료일: ${formatDate(gift.expiryDate)} 
            ${daysLeft >= 0 ? `(D-${daysLeft})` : '(만료됨)'}
        </div>
        ${gift.barcode ? `<div class="gift-barcode"><div class="barcode-label">🔖 바코드</div><svg class="barcode-svg" data-barcode="${escapeHtml(gift.barcode)}"></svg></div>` : ''}
        ${gift.memo ? `<div class="gift-memo">${escapeHtml(gift.memo)}</div>` : ''}
    `;
    
    return card;
}

function getPlatformColor(platform) {
    const colors = {
        '카카오톡 선물하기': { bg: 'rgba(255, 232, 18, 0.15)', text: '#FEE500' },
        '네이버페이': { bg: 'rgba(3, 199, 90, 0.15)', text: '#03C75A' },
        '토스': { bg: 'rgba(51, 112, 255, 0.15)', text: '#3370FF' },
        '배달의민족': { bg: 'rgba(255, 235, 59, 0.15)', text: '#FF6B35' },
        '요기요': { bg: 'rgba(255, 87, 34, 0.15)', text: '#FF5722' },
        '컬리': { bg: 'rgba(103, 58, 183, 0.15)', text: '#673AB7' },
        '마켓컬리': { bg: 'rgba(103, 58, 183, 0.15)', text: '#673AB7' },
        'SSG': { bg: 'rgba(25, 118, 210, 0.15)', text: '#1976D2' },
        '이마트몰': { bg: 'rgba(76, 175, 80, 0.15)', text: '#4CAF50' },
        '신세계몰': { bg: 'rgba(244, 67, 54, 0.15)', text: '#F44336' },
        '쿠팡': { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308' },
        '11번가': { bg: 'rgba(33, 150, 243, 0.15)', text: '#2196F3' },
        'G마켓': { bg: 'rgba(233, 30, 99, 0.15)', text: '#E91E63' },
        '옥션': { bg: 'rgba(156, 39, 176, 0.15)', text: '#9C27B0' }
    };
    
    return colors[platform] || { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF' };
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

function checkExpiryDates() {
    const today = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    
    gifts.forEach(gift => {
        if (gift.expiryDate < today && gift.status === 'active') {
            gift.status = 'expired';
            hasChanges = true;
        }
    });
    
    // 변경사항이 있을 때만 저장 및 업데이트
    if (hasChanges) {
        localStorage.setItem(`gifts_${currentFamilyCode}`, JSON.stringify(gifts));
        updateStats();
        displayGifts();
    }
}

// ===== 통계 =====
function updateStats() {
    const totalGifts = gifts.length;
    const expiringGifts = gifts.filter(g => isExpiring(g.expiryDate)).length;
    const totalValue = gifts.reduce((sum, gift) => {
        if (gift.status === 'expired' || gift.status === 'used') return sum;
        return sum + (gift.amount || 0);
    }, 0);
    
    // 사용 중인 플랫폼 개수 계산
    const platforms = new Set(gifts.map(g => g.platform).filter(p => p));
    
    document.getElementById('totalGifts').textContent = totalGifts;
    document.getElementById('expiringGifts').textContent = expiringGifts;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalPlatforms').textContent = platforms.size;
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

// 전역 함수로 노출
window.openEditModal = openEditModal;
window.deleteGift = deleteGift;

