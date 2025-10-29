// 스크롤 시 요소가 나타나는 애니메이션

// 기본 설정
const revealOffset = 100; // 요소가 뷰포트에 들어오기 전 100px 위치에서 트리거
const revealSpeed = 'smooth'; // 'smooth' 또는 'fast'

// 요소 감지 함수
function isInViewport(element, offset = 0) {
    const elementTop = element.getBoundingClientRect().top;
    const elementBottom = element.getBoundingClientRect().bottom;
    const viewportHeight = window.innerHeight;
    
    return (
        (elementTop < viewportHeight - offset) &&
        (elementBottom > offset)
    );
}

// 초기 상태 설정
function initScrollReveal() {
    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-up');
    elements.forEach(element => {
        element.classList.add('scroll-hidden');
    });
}

// 스크롤 이벤트 처리
function handleScroll() {
    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-up');
    
    elements.forEach(element => {
        if (!element.classList.contains('scroll-visible') && isInViewport(element, revealOffset)) {
            // 약간의 딜레이를 주어 순차적으로 나타나게 함
            const delay = parseInt(element.dataset.delay) || 0;
            
            setTimeout(() => {
                element.classList.remove('scroll-hidden');
                element.classList.add('scroll-visible');
            }, delay);
        }
    });
}

// IntersectionObserver를 사용한 최적화된 버전
function initIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const delay = parseInt(element.dataset.delay) || 0;
                
                setTimeout(() => {
                    element.classList.remove('scroll-hidden');
                    element.classList.add('scroll-visible');
                }, delay);
                
                // 한 번만 실행되도록 unobserve
                observer.unobserve(element);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: `0px 0px -${revealOffset}px 0px`
    });
    
    // 관찰 대상 요소들
    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-up');
    elements.forEach(element => {
        element.classList.add('scroll-hidden');
        observer.observe(element);
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // IntersectionObserver 지원 여부 확인
    if ('IntersectionObserver' in window) {
        initIntersectionObserver();
    } else {
        // Fallback: 기본 스크롤 이벤트 사용
        initScrollReveal();
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // 초기 로드 시 한 번 실행
    }
});

// 리사이즈 이벤트 최적화
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        handleScroll();
    }, 250);
});

