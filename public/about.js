// About 페이지 JavaScript

// 뒤로 가기 버튼
const backBtn = document.getElementById('backBtn');

if (backBtn) {
    backBtn.addEventListener('click', () => {
        // 이전 페이지가 있으면 뒤로 가기, 없으면 대시보드로
        if (document.referrer && document.referrer.includes(window.location.host)) {
            window.history.back();
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}


