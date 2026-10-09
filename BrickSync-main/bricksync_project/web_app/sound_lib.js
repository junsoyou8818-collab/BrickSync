/* BrickSync 내 소리 라이브러리 (녹음 · 자르기 · 볼륨 · 높낮이)
 * 워드 블록 모드와 아이콘 블록 모드가 함께 쓴다.
 *   - 녹음한 소리는 이 브라우저(IndexedDB)에만 저장한다. 값은 'rec:<id>' 문자열로 블록에 들어간다.
 *   - SoundLib.play(값, {vol, pan, pitch}) -> 재생이 끝나면 resolve 되는 Promise
 *   - SoundLib.openStudio() -> 녹음/편집 창
 * 소리는 브라우저에서만 재생된다 (허브에는 스피커가 없고 포트나이트로도 전달되지 않는다).
 */
(function () {
    'use strict';
    var DB_NAME = 'bricksync_sounds', STORE = 'sounds', MAX_SEC = 10;
    var items = [];            // [{id,name,start,end,gain,semi,dur,blob}]
    var listeners = [];
    var bufCache = {};         // id -> AudioBuffer
    var memOnly = false;       // IndexedDB 를 쓸 수 없을 때(비공개 창 등) 메모리에만 보관
    var audioCtx = null, active = [];

    function lang() { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
    function T(ko, en) { return lang() === 'en' ? en : ko; }
    function ac() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { audioCtx = null; }
        return audioCtx;
    }
    function dispName(it) { return it.name || T('내 소리 ' + it.num, 'My sound ' + it.num); }
    function freeNum(except) {
        var used = {}; items.forEach(function (x) { if (x !== except && x.num) used[x.num] = 1; });
        for (var n = 1; n < 100; n++) if (!used[n]) return n;
        return 99;
    }
    function sortItems() { items.sort(function (a, b) { return (a.num || 0) - (b.num || 0); }); }
    // 블록 위의 소리 표시(마이크 + 번호)를 최신 번호로 맞춘다
    function labelHtml(it) { return '<i class="fas fa-microphone" style="font-size:0.8em"></i> ' + (it ? it.num : '?'); }
    function refreshParams() {
        try {
            Array.prototype.forEach.call(document.querySelectorAll('[data-val^="rec:"]'), function (e) {
                if (e.classList.contains('sl-keep')) return;
                var it = find(e.getAttribute('data-val'));
                if (e.classList.contains('block-param') || e.classList.contains('param')) { e.innerHTML = labelHtml(it); e.title = it ? dispName(it) : ''; }
            });
        } catch (x) { }
    }
    function emit() {
        refreshParams(); listeners.slice().forEach(function (f) { try { f(items.slice()); } catch (e) { } }); }

    /* ---------- IndexedDB ---------- */
    var dbp = null;
    function db() {
        if (dbp) return dbp;
        dbp = new Promise(function (res, rej) {
            try {
                var r = indexedDB.open(DB_NAME, 1);
                r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
                r.onsuccess = function () { res(r.result); };
                r.onerror = function () { rej(r.error); };
            } catch (e) { rej(e); }
        });
        return dbp;
    }
    function tx(mode, fn) {
        return db().then(function (d) {
            return new Promise(function (res, rej) {
                var t = d.transaction(STORE, mode), out = fn(t.objectStore(STORE));
                t.oncomplete = function () { res(out && out.result); };
                t.onerror = t.onabort = function () { rej(t.error); };
            });
        });
    }
    function persist(it) { if (memOnly) return Promise.resolve(); return tx('readwrite', function (s) { return s.put(it); }).catch(function () { memOnly = true; }); }
    function unpersist(id) { if (memOnly) return Promise.resolve(); return tx('readwrite', function (s) { return s.delete(id); }).catch(function () { }); }

    var ready = db().then(function () {
        return tx('readonly', function (s) { return s.getAll(); });
    }).then(function (all) {
        items = (all || []).sort(function (a, b) { return a.created - b.created; });
        items.forEach(function (it) { if (!it.num) { it.num = freeNum(); persist(it); } });
        sortItems(); emit();
    }).catch(function () { memOnly = true; });

    /* ---------- 변환 ---------- */
    function encodeWav(buf) {      // AudioBuffer -> 16bit 모노 WAV Blob
        var n = buf.length, ch = buf.numberOfChannels, mono = new Float32Array(n);
        for (var c = 0; c < ch; c++) { var d = buf.getChannelData(c); for (var i = 0; i < n; i++) mono[i] += d[i] / ch; }
        var sr = buf.sampleRate, out = new DataView(new ArrayBuffer(44 + n * 2));
        function w(o, s) { for (var i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); }
        w(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
        out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
        out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
        w(36, 'data'); out.setUint32(40, n * 2, true);
        for (var j = 0; j < n; j++) { var v = Math.max(-1, Math.min(1, mono[j])); out.setInt16(44 + j * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
        return new Blob([out.buffer], { type: 'audio/wav' });
    }
    function decode(blob) {
        return blob.arrayBuffer().then(function (ab) {
            var c = ac(); if (!c) throw new Error('no audio');
            return new Promise(function (res, rej) { var p = c.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); });
        });
    }
    function bufferOf(it) {
        if (bufCache[it.id]) return Promise.resolve(bufCache[it.id]);
        return decode(it.blob).then(function (b) { bufCache[it.id] = b; return b; });
    }
    function find(v) { var id = String(v).replace(/^rec:/, ''); for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i]; return null; }
    function rateOf(it) { return Math.pow(2, (it.semi || 0) / 12); }
    function effDur(it) { return Math.max(0.05, ((it.end || it.dur) - (it.start || 0)) / rateOf(it)); }

    /* ---------- 저장소 API ---------- */
    function addFromBuffer(buf, name) {
        var it = { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), num: freeNum(), name: name || '',
            start: 0, end: buf.duration, gain: 100, semi: 0, dur: buf.duration, blob: encodeWav(buf), created: Date.now() };
        items.push(it); sortItems(); bufCache[it.id] = buf;
        return persist(it).then(function () { emit(); return it; });
    }
    function update(it) { sortItems(); return persist(it).then(emit); }
    function remove(id) {
        items = items.filter(function (x) { return x.id !== id; }); delete bufCache[id];
        return unpersist(id).then(emit);
    }

    /* ---------- 재생 ---------- */
    function stop() { active.forEach(function (s) { try { s.stop(); } catch (e) { } }); active = []; }
    // fx: {vol:0..100, pan:-100..100, pitch:센트}
    function play(v, fx) {
        fx = fx || {};
        var it = find(v);
        if (!it) return Promise.resolve();
        var c = ac(); if (!c) return Promise.resolve();
        return bufferOf(it).then(function (buf) {
            return new Promise(function (res) {
                var src = c.createBufferSource(), g = c.createGain(), end = Math.min(it.end || buf.duration, buf.duration), st = Math.min(it.start || 0, end - 0.02);
                src.buffer = buf;
                src.playbackRate.value = rateOf(it) * Math.pow(2, (fx.pitch || 0) / 1200);
                var vol = (it.gain / 100) * (fx.vol === undefined ? 1 : Math.max(0, Math.min(100, fx.vol)) / 100);
                g.gain.value = vol;
                var node = g;
                if (c.createStereoPanner && fx.pan) { var pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, fx.pan / 100)); g.connect(pn); node = pn; }
                src.connect(g); node.connect(c.destination);
                src.onended = function () { active = active.filter(function (s) { return s !== src; }); res(); };
                active.push(src);
                src.start(0, st, end - st);
            });
        }).catch(function () { });
    }

    /* ---------- 녹음/편집 창 ---------- */
    var CSS = '' +
        '.sl-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;display:flex;align-items:center;justify-content:center;font-family:"Noto Sans KR",sans-serif}' +
        '.sl-box{text-align:center;background:#fff;border-radius:18px;width:min(560px,94vw);max-height:92vh;overflow:auto;padding:18px 20px 16px;box-shadow:0 20px 50px rgba(0,0,0,.35);color:#1e293b}' +
        '.sl-box h3{position:relative;font-size:1.15rem;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;padding:0 36px}' +
        '.sl-x{position:absolute;right:0;top:50%;transform:translateY(-50%);border:none;background:#f1f5f9;border-radius:8px;width:30px;height:30px;font-size:16px;cursor:pointer;color:#64748b}' +
        '.sl-list{display:flex;flex-direction:column;gap:6px;max-height:150px;overflow:auto;margin-bottom:12px}' +
        '.sl-row{display:flex;align-items:center;gap:8px;background:#f5f3ff;border-radius:10px;padding:6px 8px;font-weight:700}' +
        '.sl-row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.sl-row .ic{display:flex;align-items:center;gap:4px;color:#5B3FD0;flex-shrink:0}.sl-row small{color:#7c3aed}' +
        '.sl-btn{border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:13px;border-radius:10px;padding:8px 14px;color:#fff;background:#7c3aed}' +
        '.sl-btn:disabled{opacity:.45;cursor:default}.sl-btn.gray{background:#e2e8f0;color:#334155}.sl-btn.red{background:#ef4444}.sl-btn.sm{padding:4px 9px;font-size:12px}' +
        '.sl-rec{display:flex;flex-direction:column;align-items:center;gap:8px;margin:6px 0 12px}.sl-btn.big{font-size:18px;padding:14px 34px;border-radius:14px}'+
        '.sl-time:empty{display:none}.sl-time{font-weight:900;color:#ef4444;min-width:56px}' +
        '.sl-wave{position:relative;height:90px;background:#1e1b4b;border-radius:12px;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}' +
        '.sl-wave canvas{width:100%;height:100%;display:block}' +
        '.sl-h{position:absolute;top:0;bottom:0;width:14px;margin-left:-7px;cursor:ew-resize;display:flex;justify-content:center}' +
        '.sl-h::before{content:"";width:3px;background:#facc15;border-radius:2px}' +
        '.sl-shade{position:absolute;top:0;bottom:0;background:rgba(0,0,0,.55);pointer-events:none}' +
        '.sl-ctl{display:grid;grid-template-columns:70px 1fr 58px;align-items:center;gap:8px;margin-top:10px;font-weight:800;font-size:13px}' +
        '.sl-ctl input[type=range]{width:100%}.sl-ctl b{text-align:right;color:#7c3aed}' +
        '.sl-name{width:100%;margin-top:12px;border:2px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-family:inherit;font-size:14px;font-weight:700}' +
        '.sl-ov2{background:rgba(15,23,42,.45)}' +
        '.sl-ask{width:min(340px,90vw);text-align:center;padding:22px 22px 18px}' +
        '.sl-ask-ic{font-size:34px;margin-bottom:6px}.sl-ask-t{font-size:1.1rem;font-weight:900;margin-bottom:10px}' +
        '.sl-ask-n{display:inline-block;background:#f5f3ff;color:#5B3FD0;border-radius:12px;padding:7px 16px;font-weight:800;margin-bottom:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.sl-nums{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
        '.sl-n{width:38px;height:38px;border-radius:50%;border:3px solid transparent;background:#f1f5f9;color:#5B3FD0;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer}' +
        '.sl-n.on{background:#fff;border-color:#5B3FD0}.sl-n.used{opacity:.35;cursor:not-allowed}' +
        '.sl-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}' +
        '.sl-msg{font-size:12.5px;color:#64748b;margin-bottom:8px}.sl-err{color:#dc2626}';

    // 단색 마이크 아이콘 (글자색을 따라간다)
    function mic(px) { return '<svg viewBox="0 0 384 512" width="' + px + '" height="' + px + '" fill="currentColor" aria-hidden="true" style="vertical-align:-0.15em"><path d="M192 0C139 0 96 43 96 96v160c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM48 216c0-13.300-10.700-24-24-24S0 202.700 0 216v40c0 89.100 66.200 162.700 152 174.400V464h-48c-13.300 0-24 10.700-24 24s10.700 24 24 24h160c13.300 0 24-10.700 24-24s-10.700-24-24-24h-48v-33.600C317.800 418.700 384 345.100 384 256v-40c0-13.300-10.700-24-24-24s-24 10.700-24 24v40c0 70.700-57.300 128-128 128S64 326.700 64 256v-40z"/></svg>'; }
    function fmt(s) { return (Math.round(s * 10) / 10).toFixed(1) + T('초', 's'); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

    function openStudio(onClose) {
        if (document.getElementById('slStudio')) return;
        if (!document.getElementById('slStyle')) { var st = el('style'); st.id = 'slStyle'; st.textContent = CSS; document.head.appendChild(st); }
        var ov = el('div', 'sl-ov'); ov.id = 'slStudio';
        var box = el('div', 'sl-box'); ov.appendChild(box);
        document.body.appendChild(ov);
        var edit = null;      // 편집 중인 항목 (저장된 것)
        var draft = null;     // 방금 녹음해서 아직 저장 안 한 {buf}
        var recState = null;  // {mr, stream, chunks, t0, timer}
        // 소리를 지우거나 바꾸면 목록을 바로 새로 그린다
        var redraw = function () { drawList(); };
        listeners.push(redraw);
        function close() { stop(); stopRec(true); listeners = listeners.filter(function (f) { return f !== redraw; }); ov.remove(); if (onClose) onClose(); }
        ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
        ['keydown', 'keyup'].forEach(function (k) { ov.addEventListener(k, function (e) { e.stopPropagation(); }); });

        function stopRec(discard) {
            if (!recState) return;
            var r = recState; recState = null; clearInterval(r.timer);
            r.discard = !!discard;
            try { r.mr.state !== 'inactive' && r.mr.stop(); } catch (e) { }
            try { r.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
        }

        function drawList() {
            var wrap = box.querySelector('.sl-list'); if (!wrap) return;
            wrap.innerHTML = '';
            if (!items.length) wrap.appendChild(el('div', 'sl-msg', T('아래의 녹음 시작 버튼을 누르면 녹음이 시작됩니다', 'Press the Record button below to start recording')));
            items.forEach(function (it) {
                var row = el('div', 'sl-row');
                row.appendChild(el('span', 'ic', mic(15) + ' <b>' + it.num + '</b>'));
                row.appendChild(el('span', 'nm', dispName(it).replace(/</g, '&lt;')));
                row.appendChild(el('small', '', fmt(effDur(it))));
                var p = el('button', 'sl-btn sm', '▶'); p.type = 'button'; p.onclick = function () { stop(); play('rec:' + it.id); };
                var e = el('button', 'sl-btn sm gray', T('편집', 'Edit')); e.type = 'button'; e.onclick = function () { stop(); edit = it; draft = null; drawEditor(); };
                var d = el('button', 'sl-btn sm red', '×'); d.type = 'button'; d.title = T('지우기', 'Delete');
                d.onclick = function () { stop(); askDelete(it, function () { if (edit === it) { edit = null; drawEditor(); } remove(it.id); }); };
                row.appendChild(p); row.appendChild(e); row.appendChild(d);
                wrap.appendChild(row);
            });
        }

        // 브라우저 기본 확인창 대신 앱 디자인의 삭제 확인 창
        function askDelete(it, onYes) {
            var cv = el('div', 'sl-ov sl-ov2'); cv.style.zIndex = '100001';
            var cd = el('div', 'sl-box sl-ask');
            cd.appendChild(el('div', 'sl-ask-ic', '🗑️'));
            var h = el('div', 'sl-ask-t'); h.textContent = T('이 소리를 지울까요?', 'Delete this sound?'); cd.appendChild(h);
            var nmEl = el('div', 'sl-ask-n'); nmEl.innerHTML = mic(14) + ' ' + it.num + '  ' + dispName(it).replace(/</g, '&lt;'); cd.appendChild(nmEl);
            var ft = el('div', 'sl-foot'); ft.style.justifyContent = 'center';
            var no = el('button', 'sl-btn gray', T('취소', 'Cancel')); no.type = 'button';
            var yes = el('button', 'sl-btn red', T('지우기', 'Delete')); yes.type = 'button';
            function done() { cv.remove(); document.removeEventListener('keydown', key, true); }
            function key(e) { if (e.key === 'Escape') { e.stopPropagation(); done(); } }
            no.onclick = done; yes.onclick = function () { done(); onYes(); };
            cv.addEventListener('mousedown', function (e) { if (e.target === cv) done(); });
            document.addEventListener('keydown', key, true);
            ft.appendChild(no); ft.appendChild(yes); cd.appendChild(ft); cv.appendChild(cd); ov.appendChild(cv);
            yes.focus();
        }

        function shell() {
            box.innerHTML = '';
            var h = el('h3', '', '<span class="sl-ttl"></span>');
            var x = el('button', 'sl-x', '✕'); x.type = 'button'; x.onclick = close; h.appendChild(x);
            box.appendChild(h);
            box.appendChild(el('div', 'sl-list'));
            box.appendChild(el('div', 'sl-ed'));
            drawList();
        }

        function drawEditor() {
            drawList();
            var host = box.querySelector('.sl-ed'); host.innerHTML = '';
            var cur = draft ? { buf: draft.buf } : edit ? { it: edit } : null;
            var ttl = box.querySelector('.sl-ttl');
            if (ttl) ttl.innerHTML = mic(20) + ' ' + (cur ? T('내 소리', 'My Sounds') : T('내 목소리를 녹음해보세요', 'Record your voice'));
            if (!cur) {
                var rec = el('div', 'sl-rec');
                var b = el('button', 'sl-btn red big', mic(20) + ' ' + T('녹음 시작', 'Record')); b.type = 'button';
                var tm = el('span', 'sl-time', '');
                rec.appendChild(b); rec.appendChild(tm);
                host.appendChild(rec);
                host.appendChild(el('div', 'sl-msg', T('최대 ' + MAX_SEC + '초까지 녹음할 수 있어요. 녹음한 소리는 이 컴퓨터의 브라우저에만 저장돼요.', 'Up to ' + MAX_SEC + ' seconds. Sounds are saved only in this browser.')));
                var err = el('div', 'sl-msg sl-err', ''); host.appendChild(err);
                b.onclick = function () {
                    if (recState) { stopRec(false); return; }
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { err.textContent = T('이 브라우저에서는 녹음을 쓸 수 없어요.', 'Recording is not supported in this browser.'); return; }
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                        var mr = new MediaRecorder(stream), r = { mr: mr, stream: stream, chunks: [], t0: Date.now(), discard: false };
                        recState = r;
                        mr.ondataavailable = function (e) { if (e.data && e.data.size) r.chunks.push(e.data); };
                        mr.onstop = function () {
                            if (r.discard) return;
                            decode(new Blob(r.chunks, { type: mr.mimeType || 'audio/webm' })).then(function (buf) {
                                draft = { buf: buf }; edit = null; drawEditor();
                            }).catch(function () { drawEditor(); var m = box.querySelector('.sl-err'); if (m) m.textContent = T('녹음을 읽지 못했어요. 다시 해 볼까요?', 'Could not read the recording. Try again.'); });
                        };
                        mr.start();
                        b.textContent = '■ ' + T('녹음 끝내기', 'Stop');
                        r.timer = setInterval(function () {
                            var s = (Date.now() - r.t0) / 1000; tm.textContent = fmt(s);
                            if (s >= MAX_SEC) stopRec(false);
                        }, 100);
                    }).catch(function () { err.textContent = T('마이크를 사용할 수 없어요. 브라우저에서 마이크 사용을 허용해 주세요.', 'Microphone unavailable. Please allow microphone access.'); });
                };
                return;
            }

            // --- 편집기 ---
            var it = cur.it || { name: '', start: 0, end: draft.buf.duration, gain: 100, semi: 0, dur: draft.buf.duration };
            var model = { name: draft ? T('내 소리 ' + freeNum(), 'My sound ' + freeNum()) : dispName(it), num: draft ? freeNum() : it.num, start: it.start || 0, end: it.end || it.dur, gain: it.gain, semi: it.semi || 0 };
            var dur = it.dur;
            var wave = el('div', 'sl-wave'), cv = el('canvas'); wave.appendChild(cv);
            var shL = el('div', 'sl-shade'), shR = el('div', 'sl-shade'), hL = el('div', 'sl-h'), hR = el('div', 'sl-h');
            [shL, shR, hL, hR].forEach(function (n) { wave.appendChild(n); });
            host.appendChild(el('div', 'sl-msg', T('노란 막대를 끌어서 소리의 앞뒤를 잘라 보세요.', 'Drag the yellow bars to trim the start and end.')));
            host.appendChild(wave);
            var info = el('div', 'sl-msg', ''); info.style.marginTop = '6px'; host.appendChild(info);

            function ctl(label, min, max, step, key, unit) {
                var row = el('div', 'sl-ctl'); row.appendChild(el('span', '', label));
                var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = model[key];
                var o = el('b', '', ''); row.appendChild(r); row.appendChild(o); host.appendChild(row);
                function show() { o.textContent = (key === 'semi' && model.semi > 0 ? '+' : '') + model[key] + unit; }
                r.oninput = function () { model[key] = parseFloat(r.value); show(); upd(); }; show();
            }
            ctl(T('볼륨', 'Volume'), 0, 200, 5, 'gain', '%');
            ctl(T('높낮이', 'Pitch'), -12, 12, 1, 'semi', '');

            // 번호는 녹음할 때 자동으로 붙는다 (1번부터, 비어 있는 가장 작은 번호)
            var nm = el('input', 'sl-name'); nm.value = model.name; nm.maxLength = 20; nm.placeholder = T('소리 이름', 'Sound name');
            nm.oninput = function () { model.name = nm.value; };
            host.appendChild(nm);

            var foot = el('div', 'sl-foot');
            var pv = el('button', 'sl-btn gray', '▶ ' + T('미리듣기', 'Preview')); pv.type = 'button';
            var again = el('button', 'sl-btn gray', T('새로 녹음', 'New recording')); again.type = 'button';
            var sv = el('button', 'sl-btn', T('저장', 'Save')); sv.type = 'button';
            foot.appendChild(pv); foot.appendChild(again); foot.appendChild(sv);
            host.appendChild(foot);

            function upd() {
                var a = model.start / dur * 100, b2 = model.end / dur * 100;
                hL.style.left = a + '%'; hR.style.left = b2 + '%';
                shL.style.left = 0; shL.style.width = a + '%'; shR.style.left = b2 + '%'; shR.style.right = 0; shR.style.width = (100 - b2) + '%';
                info.textContent = T('길이 ', 'Length ') + fmt((model.end - model.start) / Math.pow(2, model.semi / 12));
            }
            function drawWave(buf) {
                var W = cv.width = 520, H = cv.height = 90, g = cv.getContext('2d'), d = buf.getChannelData(0), n = d.length, step = Math.max(1, Math.floor(n / W));
                g.clearRect(0, 0, W, H); g.fillStyle = '#a78bfa';
                for (var x = 0; x < W; x++) {
                    var mx = 0; for (var k = 0; k < step; k++) { var v = Math.abs(d[x * step + k] || 0); if (v > mx) mx = v; }
                    var h = Math.max(1, mx * H * 0.95); g.fillRect(x, (H - h) / 2, 1, h);
                }
            }
            (draft ? Promise.resolve(draft.buf) : bufferOf(it)).then(function (b) { drawWave(b); });
            function drag(h, key) {
                h.addEventListener('pointerdown', function (e) {
                    e.preventDefault(); h.setPointerCapture(e.pointerId);
                    function mv(ev) {
                        var r = wave.getBoundingClientRect(), t = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur;
                        if (key === 'start') model.start = Math.max(0, Math.min(t, model.end - 0.1));
                        else model.end = Math.min(dur, Math.max(t, model.start + 0.1));
                        upd();
                    }
                    function up() { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); }
                    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
                });
            }
            drag(hL, 'start'); drag(hR, 'end'); upd();

            function applyTo(t) { t.name = (model.name || '').trim() || T('내 소리 ' + model.num, 'My sound ' + model.num); t.num = model.num; t.start = model.start; t.end = model.end; t.gain = model.gain; t.semi = model.semi; }
            pv.onclick = function () {
                stop();
                var tmp = { id: '_tmp', blob: null, dur: dur }; applyTo(tmp);
                var b = draft ? draft.buf : bufCache[it.id];
                if (!b) return;
                var save = bufCache._tmp; bufCache._tmp = b; items.push(tmp);
                play('rec:_tmp').then(function () { items = items.filter(function (x) { return x !== tmp; }); if (save) bufCache._tmp = save; else delete bufCache._tmp; });
            };
            again.onclick = function () { stop(); draft = null; edit = null; drawEditor(); };
            sv.onclick = function () {
                stop();
                if (draft) { addFromBuffer(draft.buf, '').then(function (n) { applyTo(n); return update(n); }).then(function () { draft = null; edit = null; drawEditor(); }); }
                else { applyTo(it); update(it).then(function () { edit = null; drawEditor(); }); }
            };
        }

        shell(); drawEditor();
        ready.then(drawList);
    }

    window.SoundLib = {
        ready: ready,
        list: function () { return items.slice(); },
        onChange: function (f) { listeners.push(f); },
        isRec: function (v) { return typeof v === 'string' && v.indexOf('rec:') === 0; },
        nameOf: function (v) { var it = find(v); return it ? dispName(it) : null; },
        numOf: function (v) { var it = find(v); return it ? it.num : null; },
        labelHtml: function (v) { return labelHtml(find(v)); },
        // 효과가 적용된 재생 시간(초). 없는 소리면 0
        durationOf: function (v) { var it = find(v); return it ? effDur(it) : 0; },
        play: play,
        stop: stop,
        openStudio: openStudio,
        _addFromBuffer: addFromBuffer
    };
})();
