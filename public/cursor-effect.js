// 은하수 꼬리 커서 효과
document.addEventListener('DOMContentLoaded', function() {
    // 커서 메인 생성
    const cursor = document.createElement('div');
    cursor.classList.add('cursor-glow');
    document.body.appendChild(cursor);
    
    // 꼬리 생성 (15개의 별 파티클)
    const trails = [];
    const trailCount = 15;
    
    for (let i = 0; i < trailCount; i++) {
        const trail = document.createElement('div');
        trail.classList.add('star-trail');
        document.body.appendChild(trail);
        trails.push({
            element: trail,
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0
        });
    }
    
    let mouseX = 0;
    let mouseY = 0;
    
    // 마우스 이동 추적
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // 메인 커서 위치
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });
    
    // 부드러운 애니메이션
    function animate() {
        trails.forEach((trail, index) => {
            if (index === 0) {
                // 첫 번째 파티클은 마우스 위치를 따라감
                trail.targetX = mouseX;
                trail.targetY = mouseY;
            } else {
                // 이전 파티클의 위치를 따라감
                const prevTrail = trails[index - 1];
                trail.targetX = prevTrail.x;
                trail.targetY = prevTrail.y;
            }
            
            // 부드러운 이동 (더 부드러운 느낌)
            trail.x += (trail.targetX - trail.x) * 0.25;
            trail.y += (trail.targetY - trail.y) * 0.25;
            
            // 파티클 위치 업데이트
            trail.element.style.left = trail.x + 'px';
            trail.element.style.top = trail.y + 'px';
            
            // 거리에 따라 크기와 투명도 조절
            const distance = Math.sqrt(
                Math.pow(trail.x - mouseX, 2) + 
                Math.pow(trail.y - mouseY, 2)
            );
            
            const opacity = Math.max(0, 0.9 - (index * 0.12));
            const scale = 1 - (index * 0.15);
            
            trail.element.style.opacity = opacity;
            trail.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
            
            // 각도 계산 (마우스 방향에 따라 회전)
            if (index > 0) {
                const prevTrail = trails[index - 1];
                const angle = Math.atan2(trail.y - prevTrail.y, trail.x - prevTrail.x) * 180 / Math.PI;
                trail.element.style.rotation = `${angle}deg`;
            }
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // 클릭 효과
    document.addEventListener('mousedown', () => {
        cursor.classList.add('clicked');
        // 클릭 시 폭발 효과
        trails.forEach(trail => {
            trail.element.classList.add('clicked');
        });
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('clicked');
        trails.forEach(trail => {
            trail.element.classList.remove('clicked');
        });
    });
    
    // 기본 커서 숨기기
    document.body.style.cursor = 'none';
});


