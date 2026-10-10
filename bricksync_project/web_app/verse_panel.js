/* BrickSync Verse 코드 창
 *  - 작업 공간 오른쪽에 접었다 펴는 코드 창. 블록을 만지면서 같이 공부할 수 있다.
 *  - 블록 위에 마우스를 올리면 그 블록에 대응하는 Verse 코드 줄에 배경 박스가 쳐지고,
 *    코드 줄에 마우스를 올리면 해당 블록이 표시된다.
 *  - 코드는 선택/복사할 수 있다 (줄 번호는 선택되지 않는다).
 *
 *  VersePanel.mount({
 *      host:      패널을 붙일 요소 (position: relative 인 작업 공간 묶음)
 *      rightPx:   오른쪽에서 띄울 거리 (워드 모드는 블록 보관함 폭)
 *      root:      블록들이 들어 있는 요소 (마우스 올리기를 듣는 곳)
 *      getProgram: () => VerseGen 입력
 *      idFromTarget: (요소) => 블록 id | null
 *      getBlockEl: (id) => 블록 요소 | null
 *      watch:     (refresh) => void   // 블록이 바뀔 때 refresh 를 부르도록 연결
 *  })
 */
(function () {
    'use strict';

    var lang = function () { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } };
    var T = function (ko, en) { return lang() === 'en' ? en : ko; };

    var CSS = '' +
        '.vp-tab{position:absolute;top:50%;right:0;transform:translateY(-50%);z-index:60;border:none;cursor:pointer;font-family:inherit;' +
        'background:#1e293b;color:#7dd3fc;font-weight:800;font-size:13px;letter-spacing:.5px;padding:14px 8px;border-radius:12px 0 0 12px;' +
        'writing-mode:vertical-rl;text-orientation:mixed;box-shadow:-3px 3px 10px rgba(0,0,0,.25);transition:right .28s ease,background .2s}' +
        '.vp-tab:hover{background:#0f172a}.vp-tab i{margin-bottom:6px;font-size:13px}' +
        '.vp-panel{position:absolute;top:0;bottom:0;z-index:55;width:min(780px,64vw);background:#1e1e1e;color:#d4d4d4;display:flex;flex-direction:column;' +
        'box-shadow:-8px 0 24px rgba(0,0,0,.28);transform:translateX(105%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s;font-family:Consolas,"Cascadia Mono","D2Coding",monospace}' +
        '.vp-panel.open{transform:translateX(0);visibility:visible;transition:transform .28s ease,visibility 0s}' +
        '.vp-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#252526;border-bottom:1px solid #333;flex-shrink:0}' +
        '.vp-file{flex:1;min-width:0;font-size:13px;color:#cccccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:"Noto Sans KR",sans-serif;font-weight:700}' +
        '.vp-file b{color:#7dd3fc;font-weight:800}' +
        '.vp-btn{border:none;cursor:pointer;font-family:"Noto Sans KR",sans-serif;font-weight:800;font-size:12px;color:#fff;background:#0e639c;padding:6px 12px;border-radius:6px}' +
        '.vp-btn:hover{background:#1177bb}.vp-btn.ghost{background:transparent;color:#aaa;font-size:16px;padding:2px 8px}.vp-btn.ghost:hover{color:#fff;background:#333}' +
        '.vp-hint{padding:6px 12px;font-size:11.5px;color:#9cdcfe;background:#202a33;border-bottom:1px solid #2d3a45;font-family:"Noto Sans KR",sans-serif;flex-shrink:0}' +
        '.vp-code{flex:1;overflow:auto;padding:8px 0;font-size:13px;line-height:1.55;user-select:text;-webkit-user-select:text;cursor:text;counter-reset:vl}' +
        '.vl{white-space:pre;padding:0 14px 0 0;min-height:1.55em;position:relative}' +
        '.vl::before{counter-increment:vl;content:counter(vl);display:inline-block;width:42px;padding-right:12px;text-align:right;color:#6e7681;user-select:none;-webkit-user-select:none}' +
        '.vl.on{background:rgba(56,189,248,.26);box-shadow:inset 3px 0 0 #38bdf8}' +
        '.vl.on::before{color:#7dd3fc}' +
        '.vc{color:#6a9955}.vk{color:#569cd6}.vt{color:#4ec9b0}.vs{color:#ce9178}.vn{color:#b5cea8}.vf{color:#dcdcaa}' +
        '.bs-verse-hl{outline:4px solid #38bdf8 !important;outline-offset:3px;border-radius:10px;position:relative;z-index:30}' +
        '.trash-area{transition:right .28s ease}' +
        '@media (max-width:760px){.vp-panel{width:92vw}}';

    var KEYWORDS = /^(using|class|if|else|then|for|loop|break|return|set|var|spawn|and|or|not|true|false|array|block|defer|in)$/;
    var TYPES = /^(void|float|int|string|logic|color|char|creative_device|creative_prop|customizable_light_device|audio_player_device|vector3|rotation|suspends|decides|transacts|override|editable)$/;

    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // 한 줄을 색칠한다 (주석은 # 뒤, 글자는 "...", 숫자, 키워드, 함수 호출)
    function colorize(line) {
        var inStr = false, q = '', cut = -1;
        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);
            if (inStr) { if (ch === '\\') i++; else if (ch === q) inStr = false; }
            else if (ch === '"' || ch === "'") { inStr = true; q = ch; }
            else if (ch === '#') { cut = i; break; }
        }
        var code = cut >= 0 ? line.slice(0, cut) : line, comment = cut >= 0 ? line.slice(cut) : '';
        var html = esc(code).replace(/("(?:\\.|[^"\\])*"|'[^']*'|\b\d+(?:\.\d+)?\b|[A-Za-z_][A-Za-z0-9_]*(?:\()?)/g, function (m) {
            if (m.charAt(0) === '"' || m.charAt(0) === "'") return '<span class="vs">' + m + '</span>';
            if (/^\d/.test(m)) return '<span class="vn">' + m + '</span>';
            var call = m.charAt(m.length - 1) === '(', w = call ? m.slice(0, -1) : m;
            if (KEYWORDS.test(w)) return '<span class="vk">' + w + '</span>' + (call ? '(' : '');
            if (TYPES.test(w)) return '<span class="vt">' + w + '</span>' + (call ? '(' : '');
            if (call) return '<span class="vf">' + w + '</span>(';
            return m;
        });
        if (comment) html += '<span class="vc">' + esc(comment) + '</span>';
        return html;
    }

    function mount(opt) {
        if (document.getElementById('versePanel')) return null;
        var st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);

        var host = opt.host;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        var right = opt.rightPx || 0;

        var panel = document.createElement('div');
        panel.id = 'versePanel';
        panel.className = 'vp-panel';
        panel.style.right = right + 'px';
        panel.style.maxWidth = 'calc(100% - ' + (right + 44) + 'px)';
        panel.innerHTML =
            '<div class="vp-head"><div class="vp-file"><b>&lt;/&gt;</b> <span id="vpTitle"></span></div>' +
            '<button class="vp-btn" id="vpCopy" type="button"></button><button class="vp-btn ghost" id="vpClose" type="button" title="">✕</button></div>' +
            '<div class="vp-hint" id="vpHint"></div>' +
            '<div class="vp-code" id="vpCode"></div>';
        host.appendChild(panel);

        var tab = document.createElement('button');
        tab.className = 'vp-tab';
        tab.type = 'button';
        tab.innerHTML = '<i class="fas fa-code"></i> Verse';
        tab.style.right = right + 'px';
        host.appendChild(tab);

        // Verse 창이 열리면 코딩 공간이 그만큼 줄어든 것으로 보고, 휴지통과 하단 버튼 묶음을 줄어든 공간에 맞춰 옮긴다
        var trash = host.querySelector('.trash-area');
        var trashBase = trash ? (parseFloat(getComputedStyle(trash).right) || 0) : 0;
        function shiftWithPanel() {
            var w = panel.classList.contains('open') ? panel.offsetWidth : 0;
            host.style.setProperty('--vp-w', w + 'px');
            if (trash) trash.style.right = (trashBase + w) + 'px';
        }

        var codeEl = panel.querySelector('#vpCode');
        var current = { lines: [], text: '' };
        var litIds = '';

        // 패널 위에서의 마우스/휠/키 입력이 작업 공간(이동, 확대, 선택 상자)으로 새지 않게 막는다
        ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'click', 'dblclick', 'contextmenu'].forEach(function (ev) {
            panel.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
        });

        function labels() {
            panel.querySelector('#vpTitle').textContent = 'BrickSync.verse  —  UEFN';
            panel.querySelector('#vpCopy').textContent = T('코드 복사', 'Copy code');
            panel.querySelector('#vpClose').title = T('접기', 'Collapse');
            panel.querySelector('#vpHint').textContent = T('블록 위에 마우스를 올리면 대응하는 코드 줄이 표시돼요. 코드를 드래그해서 선택할 수도 있어요.', 'Hover a block to see its matching lines. You can also select the code with the mouse.');
            tab.title = T('Verse 코드 보기', 'Show Verse code');
        }

        function render() {
            var prog;
            try { prog = opt.getProgram(); } catch (e) { return; }
            try { current = window.VerseGen.generate(prog); } catch (e) { console.error('[Verse] 변환 오류', e); return; }
            var html = current.lines.map(function (l, i) {
                return '<div class="vl" data-i="' + i + '" data-r=" ' + l.r.join(' ') + ' ">' + (l.t === '' ? ' ' : colorize(l.t)) + '</div>';
            }).join('');
            codeEl.innerHTML = html;
            litIds = '';
        }

        var timer = null;
        function refresh() { clearTimeout(timer); timer = setTimeout(render, 120); }

        function setOpen(on) {
            panel.classList.toggle('open', on);
            shiftWithPanel();
            tab.style.right = on ? (right + panel.offsetWidth) + 'px' : right + 'px';
            try { localStorage.setItem('bricksync_verse_open', on ? '1' : '0'); } catch (e) { }
            if (on) render();
        }
        tab.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
        panel.querySelector('#vpClose').addEventListener('click', function () { setOpen(false); });
        window.addEventListener('resize', function () { if (panel.classList.contains('open')) tab.style.right = (right + panel.offsetWidth) + 'px'; shiftWithPanel(); });

        // 복사
        panel.querySelector('#vpCopy').addEventListener('click', function () {
            var btn = this, text = current.text;
            var done = function () { var old = btn.textContent; btn.textContent = T('복사됨 ✓', 'Copied ✓'); setTimeout(function () { btn.textContent = T('코드 복사', 'Copy code'); }, 1500); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
            else fallback();
            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); done(); } catch (e) { }
                ta.remove();
            }
        });

        /* ---- 블록 → 코드 ---- */
        function light(id) {
            if (id === litIds) return;
            litIds = id || '';
            var first = null;
            Array.prototype.forEach.call(codeEl.children, function (ln) {
                var on = !!id && ln.getAttribute('data-r').indexOf(' ' + id + ' ') >= 0;
                ln.classList.toggle('on', on);
                if (on && !first) first = ln;
            });
            if (first && panel.classList.contains('open')) {
                var top = first.offsetTop, view = codeEl.scrollTop, h = codeEl.clientHeight;
                if (top < view + 20 || top > view + h - 60) codeEl.scrollTo({ top: Math.max(0, top - h / 3), behavior: 'smooth' });
            }
        }
        opt.root.addEventListener('mouseover', function (e) {
            if (!panel.classList.contains('open')) return;
            var id = opt.idFromTarget(e.target);
            light(id);
        });
        opt.root.addEventListener('mouseleave', function () { light(null); });

        /* ---- 코드 → 블록 ---- */
        var hlEl = null;
        function unhl() { if (hlEl) { hlEl.classList.remove('bs-verse-hl'); hlEl = null; } }
        codeEl.addEventListener('mouseover', function (e) {
            var ln = e.target.closest('.vl');
            if (!ln) return;
            var ids = ln.getAttribute('data-r').trim().split(/\s+/).filter(Boolean);
            unhl();
            if (!ids.length) return;
            var el = opt.getBlockEl(ids[0]);
            if (el) { hlEl = el; el.classList.add('bs-verse-hl'); }
            Array.prototype.forEach.call(codeEl.children, function (x) { x.classList.toggle('on', x === ln); });
        });
        codeEl.addEventListener('mouseleave', function () {
            unhl();
            Array.prototype.forEach.call(codeEl.children, function (x) { x.classList.remove('on'); });
            litIds = '';
        });

        labels();
        window.addEventListener('bricksync-language-changed', function () { labels(); render(); });
        if (opt.watch) opt.watch(refresh);

        var wasOpen = false;
        try { wasOpen = localStorage.getItem('bricksync_verse_open') === '1'; } catch (e) { }
        render();
        if (wasOpen) setOpen(true);

        return { refresh: refresh, open: function () { setOpen(true); }, close: function () { setOpen(false); }, panel: panel };
    }

    window.VersePanel = { mount: mount };
})();
