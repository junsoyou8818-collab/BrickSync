/* 화면 비율 기준
 *   수업용 15.6인치 노트북(화면 폭 1536px)에서 크롬 67%로 볼 때 가장 보기 좋아서, 그 모습을 "기본"으로 삼는다.
 *   = 화면 폭 2290px 기준으로 맞춘 디자인. 모니터 화면 폭이 그보다 좁으면 그만큼 줄여서 같은 모습으로 보이게 한다. 넓으면(27인치 등) 그대로 둔다. 브라우저 확대·축소(Ctrl +/-)는 그 위에 그대로 적용된다.
 *   - app.html(허브 연결을 유지하는 바깥 틀)은 자기 안의 화면 크기 조절 엔진(adjustIframeScale)이 같은 기준을 쓴다.
 *   - 그 밖에 바깥 틀 없이 단독으로 열리는 화면(인트로, 로그인, 교사·학부모 화면)은 이 파일이 html 에 zoom 을 건다.
 *   - 틀 안쪽 화면(iframe)에서는 아무것도 하지 않는다. 바깥 배율이 그대로 따라온다.
 *   - 끄기: localStorage.bricksync_ui_scale = 'off' / 직접 지정: 숫자(예: 0.8). 지우면 자동.
 *   CSS 에서 100vh 같은 값은 calc(100vh / var(--bs-z, 1)) 로 써야 zoom 에 맞게 화면을 채운다.
 */
(function () {
    'use strict';
    window.BS_BASE_WIDTH = 2290;
    window.bsUiScale = function () {
        try {
            var o = localStorage.getItem('bricksync_ui_scale');
            if (o === 'off') return 1;
            if (o && +o > 0) return Math.min(2, Math.max(0.3, +o));
        } catch (e) { }
        // 기준은 "모니터 화면 폭"이다 (브라우저 확대·축소와 무관). 그래서 크롬에서 Ctrl +/- 로 확대·축소하면 그대로 따라 변한다.
        // 노트북(화면 폭 1536) → 약 0.67, 27인치(2560) → 1(그대로). 창을 좁게 줄여도 안쪽이 1500px 아래로 좁아지지는 않게 한다.
        var sw = window.screen && window.screen.width || window.innerWidth;
        if (sw < 1000) return 1;
        var zs = Math.min(1, Math.max(0.55, sw / window.BS_BASE_WIDTH));
        var zi = window.innerWidth / 1500;
        var z = Math.max(0.4, Math.min(zs, zi));
        return z >= 0.999 ? 1 : z;
    };
    if (window.top !== window) return;
    if (document.documentElement.hasAttribute('data-bs-own-scale')) return;
    function apply() {
        var z = window.bsUiScale();
        var s = document.documentElement.style;
        s.zoom = z === 1 ? '' : String(z);
        s.setProperty('--bs-z', String(z));
    }
    apply();
    window.addEventListener('resize', apply);
})();
