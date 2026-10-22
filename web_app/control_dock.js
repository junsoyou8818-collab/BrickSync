/* 아이콘 모드 하단 컨트롤 버튼 (허브 연결 · 실행 · 정지 · 자이로)
 *   상단 오른쪽에 모여 있던 버튼들을 코딩 공간 가운데 아래로 옮긴다. (설정 버튼은 상단에 그대로 둔다)
 *   기존 버튼들은 화면에서만 숨기고 그대로 두며, 새 버튼은 그 버튼을 대신 눌러 주고 상태만 따라간다.
 *   → 허브 연결/실행/정지/탑승(자이로) 동작 코드는 하나도 바꾸지 않는다.
 */
(function () {
    'use strict';
    if (window.__bsControlDock) return;
    window.__bsControlDock = true;

    var CSS = [
        /* 기존 상단 버튼은 숨김 (코드는 그대로 남겨 두고 새 버튼이 대신 누른다) */
        '#hubStatusIndicator, #connBtn, .top-actions .run-btn, .top-actions .stop-btn, #vehicle-mount-btn { display: none !important; }',
        '.main-layout > .bs-dock { position: absolute; left: calc((100% - var(--vp-right, 0px) - var(--vp-w, 0px)) / 2); bottom: var(--dock-bottom, 64px); transform: translateX(-50%) scale(var(--dock-s, 1)); transform-origin: 50% 100%; transition: left .28s ease, transform .28s ease; z-index: 30; display: flex; gap: 27px; align-items: center; padding: 0; background: none; }',
        '.bs-dock .hb { position: relative; width: 114px; height: 114px; border: 0; background: none; cursor: pointer; padding: 0; transition: transform .08s ease; -webkit-tap-highlight-color: transparent; }',
        '.bs-dock .hb:active { transform: translateY(4px); }',
        '.bs-dock .hb:focus-visible { outline: 3px solid #a5b1d7; outline-offset: 5px; border-radius: 36px; }',
        /* 허브 연결: 흰 바탕 + 노란 띠. 윗면 하이라이트 + 아랫면 음영 + 두께(단) 로 입체감 */
        '.bs-dock .hub .plate { position: absolute; inset: 0; border-radius: 33px; background: linear-gradient(#ffffff 0, #f3f1ec 74%, #ffd650 74%, #ffc93a 100%); box-shadow: inset 0 3px 2px rgba(255,255,255,1), inset 0 -5px 0 rgba(160,110,0,.22), 0 5px 0 #d6b64c, 0 12px 18px rgba(43,27,77,.2); }',
        '.bs-dock .hub:active .plate { box-shadow: inset 0 3px 2px rgba(255,255,255,1), inset 0 -5px 0 rgba(160,110,0,.22), 0 1px 0 #d6b64c, 0 5px 9px rgba(43,27,77,.2); }',
        '.bs-dock .hub svg { position: absolute; left: 50%; top: 37%; transform: translate(-50%, -50%); width: 69px; height: 69px; filter: drop-shadow(0 1px 0 rgba(255,255,255,.95)); }',
        '.bs-dock .hub svg path { fill: none; stroke: #a6a3b7; stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; transition: stroke .3s ease; }',
        '.bs-dock .hub.on svg path { stroke: #2f9be3; }',
        /* 실행: 연두 삼각형 (다른 버튼과 같은 크기), 입체 */
        '.bs-dock .run svg { position: absolute; left: 50%; top: 50%; width: 161px; height: 161px; margin: -80px 0 0 -83px; overflow: visible; }',
        '.bs-dock .run .glow-full, .bs-dock .run .glow-move { opacity: 0; transition: opacity .25s; }',
        '.bs-dock .run.on .glow-full { opacity: .9; }',
        '.bs-dock .run.on .glow-move { opacity: 1; animation: bsDockOrbit 1.8s linear infinite; }',
        '@keyframes bsDockOrbit { to { stroke-dashoffset: -100; } }',
        /* 정지: 빨간 원 */
        '.bs-dock .stop .disc { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: linear-gradient(#f4564e, #dc3a33); box-shadow: inset 0 3px 2px rgba(255,255,255,.55), inset 0 -5px 0 rgba(110,0,0,.24), 0 5px 0 #a52a25, 0 12px 18px rgba(43,27,77,.2); }',
        '.bs-dock .stop:active .disc { box-shadow: inset 0 3px 2px rgba(255,255,255,.55), inset 0 -5px 0 rgba(110,0,0,.24), 0 1px 0 #a52a25, 0 5px 9px rgba(43,27,77,.2); }',
        '.bs-dock .stop .disc::after { content: ""; position: absolute; inset: 0; border-radius: 50%; opacity: 0; background: linear-gradient(110deg, transparent 0, rgba(255,170,60,0) 25%, rgba(255,180,70,.95) 50%, rgba(255,60,50,0) 75%, transparent 100%); background-size: 260% 100%; background-position: -130% 0; }',
        '.bs-dock .stop.fire .disc::after { opacity: 1; animation: bsDockSweep .8s ease-out forwards; }',
        '@keyframes bsDockSweep { from { background-position: -130% 0; } to { background-position: 130% 0; } }',
        '.bs-dock .stop .bar { position: absolute; left: 50%; top: 50%; width: 60px; height: 20px; margin: -10px 0 0 -30px; border-radius: 10px; background: linear-gradient(#ffffff, #ececec); box-shadow: 0 2px 0 rgba(120,0,0,.38), inset 0 -2px 0 rgba(0,0,0,.08); }',
        /* 자이로: 꺼짐=회색 테두리, 켜짐=하늘색 한 가지 */
        '.bs-dock .gyro svg { position: absolute; left: 50%; top: 50%; width: 122px; height: 122px; margin: -61px 0 0 -61px; overflow: visible; filter: drop-shadow(0 7px 7px rgba(43,27,77,.18)); }',
        '.bs-dock .gyro .ring { fill: none; stroke: #8b8b8b; stroke-width: 9; transition: stroke .3s; }',
        '.bs-dock .gyro.on .ring { stroke: #38bdf8; }',
        /* 상단 오른쪽 설정 버튼: 왼쪽의 홈 버튼과 같은 모양 (파란 테두리 알약형 + 입체감) */
        '.top-actions #settings-menu-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-width: 138px; padding: 7px 22px; border-radius: 30px; background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0284c7; color: #0284c7; font-weight: 800; font-size: 1.02rem; white-space: nowrap; cursor: pointer; transition: all .15s ease; box-shadow: inset 0 2px 4px rgba(255,255,255,.9), 0 3px 0 #0284c7, 0 5px 12px rgba(2,132,199,.18); }',
        '.top-actions #settings-menu-btn i { color: #0284c7; font-size: 1.3rem; }',
        '.top-actions #settings-menu-btn:hover { background: linear-gradient(180deg, #ffffff 0%, #bae6fd 100%); transform: translateY(-1px); box-shadow: inset 0 2px 4px rgba(255,255,255,1), 0 4px 0 #0284c7, 0 7px 14px rgba(2,132,199,.25); }',
        '.top-actions #settings-menu-btn:active { transform: translateY(2px); box-shadow: inset 0 2px 4px rgba(0,0,0,.1), 0 1px 0 #0284c7, 0 2px 4px rgba(2,132,199,.1); }',
        'html.bs-ko .top-actions #settings-menu-btn span { letter-spacing: .3em; margin-right: -.3em; }',
        /* 설정 버튼과 미션 도전하기 버튼은 크기를 똑같이 맞춘다 */
        '.top-actions #settings-menu-btn, .btn-go-mission { box-sizing: border-box; width: 168px; height: 42px; padding: 0 16px; font-size: 1.02rem; line-height: 1; gap: 10px; justify-content: center; align-items: center; }',
        '.top-actions #settings-menu-btn i, .btn-go-mission i { font-size: 1.25rem; line-height: 1; }',
        /* ---- 안내 애니메이션 1: 코딩 화면에 들어왔는데 허브가 연결되지 않았을 때 — 화면을 살짝 어둡게 하고 허브 버튼에 물결과 말풍선 ---- */
        '.main-layout > .bs-hint-ov { position: absolute; inset: 0; z-index: 25; background: rgba(43,27,77,.42); opacity: 0; transition: opacity .35s ease; cursor: pointer; }',
        '.main-layout > .bs-hint-ov.in { opacity: 1; }',
        '.bs-dock.hinting .run, .bs-dock.hinting .stop, .bs-dock.hinting .gyro { opacity: .35; transition: opacity .35s ease; }',
        '.bs-dock .hub.hint::before, .bs-dock .hub.hint::after { content: ""; position: absolute; inset: -4px; border-radius: 40px; border: 5px solid #ffc93a; opacity: 0; animation: bsPing 1.7s ease-out infinite; pointer-events: none; }',
        '.bs-dock .hub.hint::after { animation-delay: .85s; }',
        '@keyframes bsPing { 0% { transform: scale(.92); opacity: .95; } 70% { opacity: .25; } 100% { transform: scale(1.38); opacity: 0; } }',
        '.bs-dock .hub .bs-bubble { position: absolute; left: 50%; bottom: calc(100% + 26px); transform: translateX(-50%); z-index: 3; width: max-content; max-width: 400px; word-break: keep-all; padding: 16px 40px 16px 20px; border-radius: 18px; background: #fff; color: #2b1b4d; font-size: 1.15rem; font-weight: 800; line-height: 1.4; text-align: center; box-shadow: 0 10px 26px rgba(43,27,77,.3); animation: bsBubble .45s cubic-bezier(.2,1.4,.4,1) both; }',
        '.bs-dock .hub .bs-bubble::after { content: ""; position: absolute; left: 50%; top: 100%; margin-left: -12px; border: 12px solid transparent; border-top-color: #fff; border-bottom: 0; }',
        '.bs-dock .hub .bs-bubble .x { position: absolute; right: 8px; top: 8px; width: 26px; height: 26px; border: 0; border-radius: 50%; background: transparent; color: #7a7396; font-size: 1.1rem; line-height: 26px; cursor: pointer; padding: 0; }',
        '.bs-dock .hub .bs-bubble .x:hover { background: #eef0fa; color: #2b1b4d; }',
        '@keyframes bsBubble { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.92); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }',
        /* ---- 안내 애니메이션 2: 미션 블록을 100% 연결했을 때 — 실행 버튼 둘레로 물결이 퍼진다 ---- */
        '.bs-dock .run.nudge::before, .bs-dock .run.nudge::after { content: ""; position: absolute; left: 50%; top: 50%; width: 124px; height: 124px; margin: -62px 0 0 -65px; border-radius: 50%; border: 7px solid #4fb82a; box-shadow: 0 0 14px rgba(107,202,64,.55); opacity: 0; animation: bsRunPing 1.7s ease-out infinite; pointer-events: none; }',
        '.bs-dock .run.nudge::after { border-color: #8fe05f; animation-delay: .85s; }',
        '@keyframes bsRunPing { 0% { transform: scale(.7); opacity: .95; } 70% { opacity: .3; } 100% { transform: scale(1.5); opacity: 0; } }',
        '@media (prefers-reduced-motion: reduce) { .bs-dock .hub.hint::before, .bs-dock .hub.hint::after, .bs-dock .run.nudge::before, .bs-dock .run.nudge::after { animation: none; opacity: .8; transform: scale(1.15); } }',
        '@media (max-width: 760px) { .bs-dock .hb { width: 84px; height: 84px; } .main-layout > .bs-dock { gap: 16px; } }'
    ].join('\n');

    var BTP = 'M6.5 7.2 17 17.4 12 22V2l5 4.6L6.5 16.8';
    var BT = '<svg viewBox="0 0 24 24"><path d="' + BTP + '"/></svg>';
    var TRI = 'M30 22 30 78 82 50Z';
    var PLAY = '<svg viewBox="0 0 100 100">' +
        '<path class="glow-full" pathLength="100" d="' + TRI + '" fill="none" stroke="url(#bsGRing)" stroke-width="27" stroke-linejoin="round" style="filter:url(#bsGlow)"/>' +
        '<path class="glow-move" pathLength="100" d="' + TRI + '" fill="none" stroke="#8fdcff" stroke-width="22" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="13 87" style="filter:url(#bsGlow)"/>' +
        '<path d="' + TRI + '" fill="rgba(43,27,77,.22)" stroke="rgba(43,27,77,.22)" stroke-width="15" stroke-linejoin="round" transform="translate(0,9)" style="filter:blur(3px)"/>' +
        '<path d="' + TRI + '" fill="#4a9a30" stroke="#4a9a30" stroke-width="15" stroke-linejoin="round" transform="translate(0,4.5)"/>' +
        '<path d="' + TRI + '" fill="url(#bsGGreen)" stroke="url(#bsGGreen)" stroke-width="15" stroke-linejoin="round"/>' +
        '<path d="' + TRI + '" fill="url(#bsGHi)" stroke="url(#bsGHi)" stroke-width="15" stroke-linejoin="round"/>' +
        '<path d="' + TRI + '" fill="url(#bsGSh)" stroke="url(#bsGSh)" stroke-width="15" stroke-linejoin="round"/></svg>';
    var GYRO = '<svg viewBox="0 0 80 80">' +
        '<circle cx="40" cy="44" r="36.5" fill="#b4b4c4"/>' +
        '<circle cx="40" cy="40" r="35" fill="#fff"/>' +
        '<circle class="ring" cx="40" cy="40" r="33"/>' +
        '<circle cx="40" cy="40" r="26" fill="#f6b3ff"/>' +
        '<g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M40 16v6M40 58v6M16 40h6M58 40h6"/></g>' +
        '<g transform="rotate(45 40 40)"><path d="M40 14 47 40H33Z" fill="#ff2a85"/><path d="M40 66 33 40H47Z" fill="#1475ff"/></g>' +
        '<circle cx="40" cy="40" r="4.2" fill="#111"/></svg>';
    var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
        '<linearGradient id="bsGGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#98e866"/><stop offset="1" stop-color="#6bca40"/></linearGradient>' +
        '<linearGradient id="bsGHi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="bsGSh" x1="0" y1="0" x2="1" y2="1"><stop offset=".5" stop-color="#003c00" stop-opacity="0"/><stop offset="1" stop-color="#003c00" stop-opacity=".26"/></linearGradient>' +
        '<linearGradient id="bsGRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36c7f2"/><stop offset=".5" stop-color="#5b7cf5"/><stop offset="1" stop-color="#a65cf0"/></linearGradient>' +
        '<filter id="bsGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '</defs></svg>';

    var LABELS = {
        ko: { hub: '허브 연결', run: '실행', stop: '정지', gyro: '자이로 (탑승/하차)' },
        en: { hub: 'Connect Hub', run: 'Run', stop: 'Stop', gyro: 'Gyro (Board / Get off)' }
    };
    function lang() { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }

    function build() {
        var top = document.querySelector('.top-actions');
        var layout = document.querySelector('.main-layout');
        if (!top || !layout || layout.querySelector('.bs-dock')) return;
        var conn = document.getElementById('connBtn');
        var run = top.querySelector('.run-btn');
        var stop = top.querySelector('.stop-btn');
        var mount = document.getElementById('vehicle-mount-btn');
        var hubDot = document.getElementById('hubStatusDot');
        var hubTxt = document.getElementById('hubStatusText');
        var mountDot = document.getElementById('vehicleMountDot');
        if (!conn || !run || !stop) return;                       // 예상한 구조가 아니면 아무것도 바꾸지 않는다

        var st = document.createElement('style'); st.id = 'bs-control-dock-css'; st.textContent = CSS; document.head.appendChild(st);

        // 자이로(탑승) 버튼은 2단원과 4단원에서만 보인다
        var unit = ''; try { unit = new URLSearchParams(location.search).get('unit') || ''; } catch (e) { }
        var withGyro = !!mount && (unit === '2' || unit === '4');

        var dock = document.createElement('div');
        dock.className = 'bs-dock';
        dock.innerHTML = DEFS +
            '<button type="button" class="hb hub"><span class="plate"></span>' + BT + '</button>' +
            '<button type="button" class="hb run">' + PLAY + '</button>' +
            '<button type="button" class="hb stop"><span class="disc"></span><span class="bar"></span></button>' +
            (withGyro ? '<button type="button" class="hb gyro">' + GYRO + '</button>' : '');
        layout.appendChild(dock);

        // 보이는 코딩 공간이 좁아지면(Verse 창이 열렸을 때 등) 버튼 묶음이 휴지통과 겹치지 않게 같은 비율로 줄인다
        function fitDock() {
            var cs = layout.style;
            var free = layout.clientWidth - (parseFloat(cs.getPropertyValue('--vp-right')) || 0) - (parseFloat(cs.getPropertyValue('--vp-w')) || 0);
            var w = dock.offsetWidth || 1;
            var s = Math.max(0.5, Math.min(1, (free - 200) / w));
            dock.style.setProperty('--dock-s', String(Math.round(s * 100) / 100));
        }
        try { new MutationObserver(fitDock).observe(layout, { attributes: true, attributeFilter: ['style'] }); } catch (e) { }
        try { new ResizeObserver(fitDock).observe(layout); } catch (e) { }
        window.addEventListener('resize', fitDock);

        // 워드 모드처럼 오른쪽에 블록 보관함이 있으면 그만큼을 뺀 공간의 가운데에 놓는다 (Verse 창이 열린 폭은 verse_panel.js 가 --vp-w 로 알려 준다)
        var pal = layout.querySelector('.wpal');
        if (pal) {
            dock.style.setProperty('--dock-bottom', '40px');          // 워드 모드는 지금 높이 그대로
            var setRight = function () { layout.style.setProperty('--vp-right', pal.offsetWidth + 'px'); };
            setRight(); fitDock(); window.addEventListener('resize', setRight);
            try { new ResizeObserver(setRight).observe(pal); } catch (e) { }
        }

        var bHub = dock.querySelector('.hub'), bRun = dock.querySelector('.run'), bStop = dock.querySelector('.stop'), bGyro = dock.querySelector('.gyro');

        function labels() {
            var L = LABELS[lang()];
            [[bHub, L.hub], [bRun, L.run], [bStop, L.stop], [bGyro, L.gyro]].forEach(function (x) { if (x[0]) { x[0].title = x[1]; x[0].setAttribute('aria-label', x[1]); } });
        }
        labels();
        window.addEventListener('bricksync-language-changed', labels);
        // 한국어일 때만 '설 정'처럼 글자 사이를 살짝 띄운다
        function langClass() { document.documentElement.classList.toggle('bs-ko', lang() === 'ko'); }
        langClass();
        window.addEventListener('bricksync-language-changed', langClass);

        // 눌렀을 때: 기존 버튼을 대신 누른다
        bHub.addEventListener('click', function () { conn.click(); });
        bRun.addEventListener('click', function () { run.click(); });
        bStop.addEventListener('click', function () {
            stop.click();
            bStop.classList.remove('fire'); void bStop.offsetWidth; bStop.classList.add('fire');
            setTimeout(function () { bStop.classList.remove('fire'); }, 900);
        });
        if (bGyro) bGyro.addEventListener('click', function () { mount.click(); });

        // 상태 따라가기
        function hubConnected() {
            var bg = (hubDot && hubDot.style.background) || '';
            return /59,\s*130,\s*246|16,\s*185,\s*129|#3b82f6|#10b981/i.test(bg);       // 파랑(블루투스) / 초록(USB) = 연결됨
        }
        function syncHub() { bHub.classList.toggle('on', hubConnected()); }
        function syncRun() { bRun.classList.toggle('on', run.classList.contains('is-running')); }
        function syncGyro() {
            if (!bGyro) return;
            var bg = (mountDot && mountDot.style.background) || '';
            bGyro.classList.toggle('on', /16,\s*185,\s*129|#10b981/i.test(bg));         // 초록 = 탑승 중(자이로 켜짐)
        }
        try {
            if (hubDot) new MutationObserver(syncHub).observe(hubDot, { attributes: true, attributeFilter: ['style'] });
            if (hubTxt) new MutationObserver(syncHub).observe(hubTxt, { childList: true, characterData: true, subtree: true });
            new MutationObserver(syncRun).observe(run, { attributes: true, attributeFilter: ['class'] });
            if (mountDot) new MutationObserver(syncGyro).observe(mountDot, { attributes: true, attributeFilter: ['style'] });
        } catch (e) { }
        syncHub(); syncRun(); syncGyro();

        /* ---- 안내 1: 허브 연결 유도 ---- */
        var HINT = { ko: '허브를 연결하려면 이 버튼을 누르세요', en: 'Press this button to connect your hub' };
        var hintOv = null, hintBub = null, hintTimer = null;
        function hideHubHint() {
            clearTimeout(hintTimer);
            if (!hintOv) return;
            var ov = hintOv, bub = hintBub; hintOv = null; hintBub = null;
            bHub.classList.remove('hint'); dock.classList.remove('hinting');
            ov.classList.remove('in');
            if (bub && bub.parentNode) bub.parentNode.removeChild(bub);
            setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
            document.removeEventListener('keydown', onHintKey, true);
        }
        function onHintKey(e) { if (e.key === 'Escape') hideHubHint(); }
        function showHubHint() {
            if (hintOv || hubConnected()) return;
            hintOv = document.createElement('div'); hintOv.className = 'bs-hint-ov';
            layout.appendChild(hintOv);
            hintBub = document.createElement('div'); hintBub.className = 'bs-bubble';
            hintBub.innerHTML = '<span class="t"></span><button type="button" class="x" aria-label="close">\u00d7</button>';
            hintBub.querySelector('.t').textContent = HINT[lang()];
            hintBub.querySelector('.x').addEventListener('click', function (e) { e.stopPropagation(); hideHubHint(); });
            bHub.appendChild(hintBub);
            bHub.classList.add('hint'); dock.classList.add('hinting');
            requestAnimationFrame(function () { if (hintOv) hintOv.classList.add('in'); });
            hintOv.addEventListener('click', hideHubHint);
            document.addEventListener('keydown', onHintKey, true);
            hintTimer = setTimeout(hideHubHint, 7000);
        }
        bHub.addEventListener('click', hideHubHint);
        window.addEventListener('bricksync-language-changed', function () { if (hintBub) hintBub.querySelector('.t').textContent = HINT[lang()]; });
        var oldSyncHub = syncHub;
        syncHub = function () { oldSyncHub(); if (hubConnected()) hideHubHint(); };
        try {
            if (hubDot) new MutationObserver(syncHub).observe(hubDot, { attributes: true, attributeFilter: ['style'] });
        } catch (e) { }
        // 화면이 자리 잡은 뒤(허브 연결 상태가 반영된 뒤)에도 연결이 안 돼 있으면 보여 준다
        setTimeout(function () { if (!document.hidden) showHubHint(); }, 1100);

        /* ---- 안내 2: 미션 블록 100% 연결 → 실행 유도 ---- */
        function missionDone() { var m = document.getElementById('m-progress'); return !!(m && m.dataset && m.dataset.completed === 'true'); }
        function syncNudge() { bRun.classList.toggle('nudge', missionDone() && !run.classList.contains('is-running')); }
        setInterval(syncNudge, 500);
        bRun.addEventListener('click', function () { bRun.classList.remove('nudge'); });
        try { new MutationObserver(syncNudge).observe(run, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();
