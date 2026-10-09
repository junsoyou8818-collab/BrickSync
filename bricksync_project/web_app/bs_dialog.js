/* BrickSync 앱 디자인 안내/확인 창 (브라우저 기본 confirm / alert 대신 사용)
 *   await bsConfirm({ title, msg, yes, no, danger })  → 확인이면 true, 취소/바깥 클릭/Esc 면 false
 *   await bsAlert({ title, msg, ok, kind, code })     → 확인을 누르면 끝남. kind: 'success' | 'error' | 'info'
 *   code 를 주면 눈에 띄는 코드 상자와 [복사] 버튼이 함께 나온다.
 */
(function () {
    'use strict';
    if (window.bsConfirm && window.bsAlert) return;

    var CSS = [
        '.bsd-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(43,27,77,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:bsdFade .15s ease}',
        '.bsd-card{width:min(420px,92vw);border-radius:26px;padding:28px 26px 22px;text-align:center;color:#2b1b4d;background:#fff;border:1.5px solid #cfe9f2;box-shadow:0 24px 60px rgba(43,27,77,.3);font-family:"Noto Sans KR","Outfit",sans-serif;animation:bsdPop .18s cubic-bezier(.2,1.3,.4,1)}',
        '.bsd-ic{width:58px;height:58px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center}',
        '.bsd-ic svg{width:28px;height:28px}',
        '.bsd-ic.ask{background:#ede9fe;color:#6c1f86}.bsd-ic.danger{background:#fde8ec;color:#e11d48}',
        '.bsd-ic.success{background:#e8f4f2;color:#2f7a4d}.bsd-ic.error{background:#fde8ec;color:#e11d48}.bsd-ic.info{background:#e2f5f9;color:#3a6fa0}',
        '.bsd-t{font-size:1.15rem;font-weight:900;line-height:1.45;margin-bottom:6px;word-break:keep-all}',
        '.bsd-m{font-size:.95rem;color:#5b5478;line-height:1.6;margin-bottom:6px;word-break:keep-all;white-space:pre-line}',
        '.bsd-code{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 0 8px;padding:12px 14px;background:#e2f5f9;border:1.5px solid #cfe9f2;border-radius:14px}',
        '.bsd-code b{font-family:"Outfit",monospace;font-size:1.6rem;font-weight:900;letter-spacing:2px;color:#6c1f86;user-select:all}',
        '.bsd-copy{border:none;cursor:pointer;border-radius:10px;padding:7px 14px;font-family:inherit;font-size:.9rem;font-weight:800;background:#a5b1d7;color:#2b1b4d}',
        '.bsd-copy:hover{background:#8f9cc9}',
        '.bsd-row{display:flex;gap:10px;justify-content:center;margin-top:18px}',
        '.bsd-b{flex:1;max-width:160px;border:none;cursor:pointer;border-radius:14px;padding:12px 10px;font-family:inherit;font-size:.98rem;font-weight:800;transition:transform .08s}',
        '.bsd-b:active{transform:translateY(2px)}',
        '.bsd-no{background:#fff;color:#4b4570;border:1.5px solid #cfe9f2}.bsd-no:hover{background:#f6fbfe}',
        '.bsd-yes{background:#6c1f86;color:#fff;box-shadow:0 4px 0 #4a1360}.bsd-yes:active{box-shadow:0 1px 0 #4a1360}',
        '.bsd-yes.danger{background:#e11d48;box-shadow:0 4px 0 #9f1239}.bsd-yes.danger:active{box-shadow:0 1px 0 #9f1239}',
        '.bsd-b:focus-visible{outline:3px solid #a5b1d7;outline-offset:2px}',
        '@keyframes bsdFade{from{opacity:0}to{opacity:1}}',
        '@keyframes bsdPop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}'
    ].join('\n');

    var ICONS = {
        ask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9a3 3 0 1 1 4.2 2.75c-.8.4-1.2 1-1.2 1.75"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>',
        danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5v7"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>',
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12.8l4.2 4.2L18.5 8"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></svg>'
    };
    ICONS.error = ICONS.danger;

    function lang() { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
    function ensureCss() {
        if (document.getElementById('bsd-style')) return;
        var s = document.createElement('style'); s.id = 'bsd-style'; s.textContent = CSS; document.head.appendChild(s);
    }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

    function open(opt, withCancel) {
        return new Promise(function (resolve) {
            ensureCss();
            var en = lang() === 'en';
            var kind = opt.kind || (withCancel ? (opt.danger ? 'danger' : 'ask') : 'info');
            var ov = el('div', 'bsd-ov'), card = el('div', 'bsd-card');
            card.setAttribute('role', withCancel ? 'alertdialog' : 'dialog');
            var ic = el('div', 'bsd-ic ' + kind); ic.innerHTML = ICONS[kind] || ICONS.info;
            card.appendChild(ic);
            card.appendChild(el('div', 'bsd-t', opt.title || ''));
            if (opt.msg) card.appendChild(el('div', 'bsd-m', opt.msg));
            if (opt.code) {
                var box = el('div', 'bsd-code'), cv = el('b', '', opt.code), cp = el('button', 'bsd-copy', en ? 'Copy' : '복사');
                cp.type = 'button';
                cp.onclick = function () {
                    function done() { cp.textContent = en ? 'Copied' : '복사됨'; }
                    try { navigator.clipboard.writeText(String(opt.code)).then(done, done); } catch (e) { done(); }
                };
                box.appendChild(cv); box.appendChild(cp); card.appendChild(box);
            }
            var row = el('div', 'bsd-row'), no = null;
            if (withCancel) { no = el('button', 'bsd-b bsd-no', opt.no || (en ? 'Cancel' : '취소')); no.type = 'button'; row.appendChild(no); }
            var yes = el('button', 'bsd-b bsd-yes' + (opt.danger ? ' danger' : ''), withCancel ? (opt.yes || (en ? 'OK' : '확인')) : (opt.ok || (en ? 'OK' : '확인')));
            yes.type = 'button'; row.appendChild(yes);
            card.appendChild(row); ov.appendChild(card); document.body.appendChild(ov);
            function done(v) { document.removeEventListener('keydown', key, true); ov.remove(); resolve(v); }
            function key(e) {
                if (e.key === 'Escape') { e.preventDefault(); done(false); }
                else if (e.key === 'Enter' && document.activeElement !== no) { e.preventDefault(); done(true); }
            }
            document.addEventListener('keydown', key, true);
            if (no) no.onclick = function () { done(false); };
            yes.onclick = function () { done(true); };
            ov.addEventListener('mousedown', function (e) { if (e.target === ov) done(!withCancel); });
            (withCancel && opt.danger && no ? no : yes).focus();
        });
    }

    window.bsConfirm = function (opt) { return open(opt || {}, true); };
    window.bsAlert = function (opt) { return open(opt || {}, false).then(function () { return undefined; }); };
})();
