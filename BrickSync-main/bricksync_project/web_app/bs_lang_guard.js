/* 언어가 바뀌어 보이는 현상 방지
 *   영어 모드(localStorage bricksync_lang = 'en')에서 페이지를 옮기면, 새 페이지의 글자는 처음에 한글로 적혀 있다가
 *   페이지가 열린 뒤 settings.js 가 영어로 바꾼다. 그 사이(0.2~0.3초)에 한글이 보이지 않도록,
 *   번역이 끝날 때까지 본문만 숨겼다가(배경색은 그대로) 끝나면 보여 준다.
 *   - settings.js 가 번역을 마치고 'bs-lang-ready' 신호를 보내면 즉시 보인다.
 *   - 신호가 오지 않아도 0.8초 뒤에는 무조건 보인다 (화면이 멈추는 일이 없게).
 *   - 한국어 모드에서는 아무것도 하지 않는다.
 *   모든 페이지의 <head> 맨 앞에서 불러야 한다.
 */
(function () {
    'use strict';
    try { if (localStorage.getItem('bricksync_lang') !== 'en') return; } catch (e) { return; }
    var h = document.documentElement;
    if (h.classList.contains('bs-lang-wait')) return;
    h.classList.add('bs-lang-wait');
    var st = document.createElement('style');
    st.id = 'bs-lang-wait-style';
    st.textContent = 'html.bs-lang-wait body{opacity:0 !important}';
    (document.head || h).appendChild(st);
    var done = false;
    function reveal() {
        if (done) return;
        done = true;
        h.classList.remove('bs-lang-wait');
        window.removeEventListener('bs-lang-ready', reveal);
        if (st.parentNode) st.parentNode.removeChild(st);
    }
    window.addEventListener('bs-lang-ready', reveal);
    setTimeout(reveal, 800);
})();
