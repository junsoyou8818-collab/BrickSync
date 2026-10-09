/* 워드 블록 작업 공간 - 6~8단원 왼쪽 AI 패널 (웹캠 제스처/사물 학습, 음성/텍스트 프롬프트)
 * ai_fusion.html 의 패널과 같은 화면·같은 동작. 인식 결과는 이벤트로 알린다.
 *   window 'wordai:gesture' {detail:{id,label}}   - 제스처/사물이 안정적으로 인식됐을 때
 *   window 'wordai:voice'   {detail:{text}}       - 음성/텍스트 명령이 들어왔을 때
 */
(function () {
    'use strict';

    var lang = function () { return (localStorage.getItem('bricksync_lang') || 'ko') === 'en' ? 'en' : 'ko'; };
    var T = function (ko, en) { return lang() === 'en' ? en : ko; };

    var CDN = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier'
    ];

    var unit = '6';
    var side = null, body = null;
    var video = null, statusEl = null, gestureEl = null;
    var net = null, classifier = null, loopOn = false, training = false, trainTimer = null;
    var counts = [0, 0, 0, 0];
    var candidate = -1, frames = 0, lastFired = -1;
    var THRESH = 0.45;

    /* ---------- 공통 ---------- */
    function loadScript(src) {
        return new Promise(function (res) {
            var s = document.createElement('script');
            s.src = src; s.onload = function () { res(true); }; s.onerror = function () { res(false); };
            document.head.appendChild(s);
        });
    }
    function setStatus(el, html, bg, fg) {
        if (!el) return;
        el.innerHTML = html;
        el.style.background = bg; el.style.color = fg;
    }
    var OK = ['#d1fae5', '#065f46'], INFO = ['#e0f2fe', '#0369a1'], ERR = ['#fee2e2', '#991b1b'], WAIT = ['#dbeafe', '#1e3a8a'];

    function css() {
        if (document.getElementById('wordAiCss')) return;
        var st = document.createElement('style');
        st.id = 'wordAiCss';
        st.textContent =
            '#wordBody{display:flex;flex:1;min-height:0;overflow:hidden}' +
            '#ai-left-sidebar{width:clamp(340px,26vw,480px);flex-shrink:0;border-right:4px solid #e2e8f0;background:#fff;display:flex;flex-direction:column;z-index:10}' +
            '#ai-left-sidebar .ai-head{padding:15px 20px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-weight:800;color:#1e293b;font-size:1.1rem;white-space:nowrap}' +
            '#ai-left-panel-content{padding:20px;flex:1;display:flex;flex-direction:column;gap:15px;align-items:center;overflow-y:auto}' +
            '@keyframes mic-pulse{0%{box-shadow:0 0 0 0 rgba(139,92,246,.7);transform:scale(1)}70%{box-shadow:0 0 0 15px rgba(139,92,246,0);transform:scale(1.05)}100%{box-shadow:0 0 0 0 rgba(139,92,246,0);transform:scale(1)}}' +
            '@keyframes mic-idle-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.4),0 4px 6px rgba(0,0,0,.2)}70%{box-shadow:0 0 0 12px rgba(255,255,255,0),0 4px 6px rgba(0,0,0,.2)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0),0 4px 6px rgba(0,0,0,.2)}}' +
            '.mic-active{animation:mic-pulse 1.5s infinite!important;background:#8b5cf6!important;cursor:pointer}' +
            '.mic-idle{background:#475569!important;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,.2)!important;animation:mic-idle-pulse 2.2s infinite}' +
            '.mic-idle:hover{transform:scale(1.05);background:#64748b!important;animation:none}';
        document.head.appendChild(st);
    }

    /* ---------- 웹캠 ---------- */
    function stopCam() {
        try {
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { } });
                video.srcObject = null;
            }
        } catch (e) { }
    }
    function startCam() {
        stopCam();
        setStatus(statusEl, '<i class="fas fa-spinner fa-spin"></i> ' + T('웹캠 연결 중...', 'Connecting camera...'), WAIT[0], WAIT[1]);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            camError(new Error('getUserMedia not supported')); return Promise.resolve(false);
        }
        return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })
            .then(function (st) {
                video.muted = true; video.srcObject = st;
                return video.play().catch(function () { });
            })
            .then(function () { return true; })
            .catch(function (err) { camError(err); return false; });
    }
    function camError(err) {
        var msg = err && (err.name ? err.name + ': ' : '') + (err.message || err);
        setStatus(statusEl,
            '<i class="fas fa-exclamation-triangle"></i> ' + T('카메라 연결 실패', 'Camera error') + ': ' + msg +
            '<br><button id="wordAiRetry" style="margin-top:6px;padding:6px 16px;background:#0284c7;color:#fff;border:none;border-radius:18px;font-weight:800;cursor:pointer">' +
            T('카메라 다시 켜기 📷', 'Retry Camera 📷') + '</button>', ERR[0], ERR[1]);
        var b = document.getElementById('wordAiRetry');
        if (b) b.onclick = function () { startCam().then(function (ok) { if (ok) afterCam(); }); };
    }

    /* ---------- 학습/인식 ---------- */
    function labels() {
        if (unit === '8') return {
            names: [T('👾 몬스터', '👾 Monster'), T('🚫 배경', '🚫 Background')],
            icons: ['fa-dragon', 'fa-ban'], bg: [1]
        };
        return {
            names: [T('주먹 (Rock)', 'Rock'), T('보 (Paper)', 'Paper'), T('가위 (Scissors)', 'Scissors'), T('배경 (None)', 'Background (None)')],
            icons: ['fa-hand-rock', 'fa-hand-paper', 'fa-hand-scissors', 'fa-ban'], bg: [3]
        };
    }
    function updateCounts() {
        var ids = unit === '8' ? ['count-rock', 'count-none'] : ['count-rock', 'count-paper', 'count-scissors', 'count-none'];
        ids.forEach(function (id, i) {
            var el = document.getElementById(id);
            if (el) el.textContent = (counts[i] || 0) + T('개', '');
        });
    }
    window.wordAiAddExample = function (cls) {
        if (!classifier || !net || !video || !video.videoWidth) {
            setStatus(statusEl, '<i class="fas fa-spinner fa-spin"></i> ' + T('AI 분석 모델 로딩 중입니다... 잠시 후 다시 눌러주세요!', 'Loading AI model... try again in a moment.'), '#fef3c7', '#92400e');
            return;
        }
        training = true;
        clearTimeout(trainTimer);
        trainTimer = setTimeout(function () { training = false; }, 800);
        var act = net.infer(video, 'conv_preds');
        try { classifier.addExample(act, cls); } finally { act.dispose(); }
        counts[cls] = (counts[cls] || 0) + 1;
        updateCounts();
    };

    async function loop() {
        while (loopOn) {
            try {
                if (classifier && net && classifier.getNumClasses() > 0 && video && video.videoWidth && !training) {
                    var act = net.infer(video, 'conv_preds');
                    var res;
                    try { res = await classifier.predictClass(act); } finally { act.dispose(); }
                    var L = labels();
                    var conf = res.confidences[res.label];
                    if (conf > THRESH) {
                        var id = parseInt(res.label, 10);
                        if (gestureEl) gestureEl.innerHTML = '<i class="fas ' + L.icons[id] + '"></i> ' + L.names[id] + ' (' + Math.round(conf * 100) + '%)';
                        var isBg = L.bg.indexOf(id) >= 0;
                        if (isBg) { lastFired = -1; candidate = -1; frames = 0; }
                        else if (candidate === id) {
                            frames++;
                            if (frames >= 2 && lastFired !== id) {
                                lastFired = id;
                                window.dispatchEvent(new CustomEvent('wordai:gesture', { detail: { id: id, label: L.names[id] } }));
                            }
                        } else { candidate = id; frames = 1; }
                    } else {
                        if (gestureEl) gestureEl.innerHTML = '<i class="fas fa-question-circle"></i> ' + T('판독 불가 (신뢰도 미달)', 'Unclear (low confidence)');
                        candidate = -1; frames = 0; lastFired = -1;
                    }
                }
            } catch (e) { console.warn('[wordAI] loop', e); }
            await new Promise(function (r) { requestAnimationFrame(r); });
        }
    }

    async function afterCam() {
        setStatus(statusEl, '<i class="fas fa-check-circle"></i> ' + T('웹캠 연결 성공! AI 분석 모델 로딩 중...', 'Camera connected! Loading AI model...'), INFO[0], INFO[1]);
        try {
            if (!net) {
                try { net = await mobilenet.load({ version: 1, alpha: 0.25 }); }
                catch (e) { net = await mobilenet.load(); }
            }
            setStatus(statusEl, '<i class="fas fa-check-circle"></i> ' + T('AI 엔진 가동 완료! 하단의 버튼으로 학습하세요.', 'AI Engine Ready! Train using buttons below.'), OK[0], OK[1]);
            if (!loopOn) { loopOn = true; loop(); }
        } catch (e) {
            setStatus(statusEl, '<i class="fas fa-exclamation-triangle"></i> ' + T('카메라 AI 엔진 오류', 'AI Camera Engine Error') + ': ' + (e.message || e), ERR[0], ERR[1]);
        }
    }

    /* ---------- 화면 조각 ---------- */
    var BTN = 'color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;transition:transform .1s;';
    function camPanel(u8) {
        var btns = u8
            ? '<button onclick="wordAiAddExample(0)" style="background:#ef4444;box-shadow:0 3px 0 #b91c1c;padding:12px;font-size:1rem;' + BTN + '"><i class="fas fa-dragon"></i> <span>' + T('👾 몬스터', '👾 Monster') + '</span></button>' +
              '<button onclick="wordAiAddExample(1)" style="background:#64748b;box-shadow:0 3px 0 #475569;padding:12px;font-size:1rem;' + BTN + '"><i class="fas fa-ban"></i> <span>' + T('🚫 배경', '🚫 Background') + '</span></button>'
            : '<button onclick="wordAiAddExample(0)" style="background:#ef4444;box-shadow:0 3px 0 #b91c1c;padding:10px;' + BTN + '"><i class="fas fa-hand-rock"></i> <span>' + T('주먹 (Rock)', 'Rock') + '</span></button>' +
              '<button onclick="wordAiAddExample(1)" style="background:#3b82f6;box-shadow:0 3px 0 #1d4ed8;padding:10px;' + BTN + '"><i class="fas fa-hand-paper"></i> <span>' + T('보 (Paper)', 'Paper') + '</span></button>' +
              '<button onclick="wordAiAddExample(2)" style="background:#10b981;box-shadow:0 3px 0 #047857;padding:10px;' + BTN + '"><i class="fas fa-hand-scissors"></i> <span>' + T('가위 (Scissors)', 'Scissors') + '</span></button>' +
              '<button onclick="wordAiAddExample(3)" style="background:#64748b;box-shadow:0 3px 0 #475569;padding:10px;' + BTN + '"><i class="fas fa-ban"></i> <span>' + T('배경 (None)', 'Background') + '</span></button>';
        var cnt = u8
            ? '<span id="count-rock">0' + T('개', '') + '</span><span id="count-none">0' + T('개', '') + '</span>'
            : '<span id="count-rock">0' + T('개', '') + '</span><span id="count-paper">0' + T('개', '') + '</span><span id="count-scissors">0' + T('개', '') + '</span><span id="count-none">0' + T('개', '') + '</span>';
        return '' +
            '<div style="width:100%;aspect-ratio:4/3;background:#1e293b;border-radius:12px;overflow:hidden;position:relative;box-shadow:0 4px 6px rgba(0,0,0,.1);border:4px solid #334155;flex-shrink:0">' +
            '<video id="webcam" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>' +
            '<div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:8px 20px;border-radius:20px;font-weight:800;font-size:1.1rem;display:flex;align-items:center;gap:10px;white-space:nowrap">' +
            '<i class="fas fa-eye"></i> <span id="current-gesture">' + T('대기 중...', 'Waiting...') + '</span></div></div>' +
            '<div id="ai-status" style="width:100%;padding:12px;background:#dbeafe;border:1px solid #bfdbfe;border-radius:8px;color:#1e3a8a;font-weight:700;text-align:center;font-size:.95rem"><i class="fas fa-spinner fa-spin"></i> ' + T('AI 엔진 로딩 중...', 'Loading AI Engine...') + '</div>' +
            '<div style="width:100%;display:flex;flex-direction:column;gap:10px;background:#f1f5f9;padding:15px;border-radius:12px;border:1px solid #e2e8f0">' +
            '<div style="font-size:.9rem;font-weight:800;color:#64748b;margin-bottom:5px">' + T('인식 모델 학습 기능', 'Model Training Control') + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + btns + '</div>' +
            '<div style="display:flex;justify-content:' + (u8 ? 'space-around' : 'space-between') + ';font-size:.8rem;color:#94a3b8;font-weight:700;padding:0 5px;margin-top:5px">' + cnt + '</div></div>';
    }

    function voicePanel() {
        var bar = '<div class="wave-bar" style="width:6px;height:8px;background:#3b82f6;border-radius:3px;transition:height .1s"></div>';
        var box = 'width:100%;display:flex;flex-direction:column;gap:8px;background:#f1f5f9;padding:15px;border-radius:12px;border:1px solid #e2e8f0';
        return '' +
            '<div style="width:100%;aspect-ratio:4/3;background:#1e293b;border-radius:12px;overflow:hidden;position:relative;box-shadow:0 4px 6px rgba(0,0,0,.1);border:4px solid #334155;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:20px;flex-shrink:0">' +
            '<div id="mic-icon-glow" class="mic-idle" style="width:80px;height:80px;background:#3b82f6;border-radius:50%;display:flex;justify-content:center;align-items:center;color:#fff;font-size:36px;cursor:pointer"><i class="fas fa-microphone"></i></div>' +
            '<div style="width:80%;height:40px;display:flex;justify-content:center;align-items:center;gap:4px">' + bar + bar + bar + bar + bar + '</div>' +
            '<div style="position:absolute;bottom:15px;background:rgba(0,0,0,.7);color:#fff;padding:6px 15px;border-radius:20px;font-weight:800;font-size:.95rem;max-width:90%"><span id="voice-recognized-text">' + T('대기 중...', 'Waiting...') + '</span></div></div>' +
            '<div id="voice-status-box" style="width:100%;padding:12px;background:#dbeafe;border-radius:8px;color:#1e3a8a;font-weight:700;text-align:center;font-size:.95rem"><i class="fas fa-spinner fa-spin"></i> ' + T('마이크 활성화 대기 중...', 'Waiting for microphone activation...') + '</div>' +
            '<div style="' + box + '"><div style="font-size:.9rem;font-weight:800;color:#64748b">' + T('⌨️ 텍스트 프롬프트를 입력하세요.', '⌨️ Enter the text prompt.') + '</div>' +
            '<div style="display:flex;gap:8px;width:100%"><input type="text" id="voice-text-input" placeholder="' + T('예: 앞으로 3바퀴 돌아', 'e.g. turn 3 times forward') + '" style="flex:1;min-width:0;padding:10px;border-radius:8px;border:2px solid #cbd5e1;outline:none;font-weight:600;font-family:inherit">' +
            '<button id="btn-send-voice-text" style="background:#3b82f6;color:#fff;border:none;padding:0 15px;border-radius:8px;font-weight:700;cursor:pointer">' + T('입력', 'Submit') + '</button></div></div>' +
            '<div style="' + box + '"><div style="font-size:.9rem;font-weight:800;color:#64748b">' + T('📋 최근 인식된 음성 기록', '📋 Recent Voice Log') + '</div>' +
            '<div id="voice-command-log" style="font-size:.85rem;font-weight:600;color:#475569;display:flex;flex-direction:column;gap:6px;max-height:80px;overflow-y:auto"><span style="color:#94a3b8">' + T('인식 기록 없음', 'No history yet') + '</span></div></div>';
    }

    /* ---------- 음성 ---------- */
    var rec = null, listening = false, waveTimer = null;
    function voiceInput(text) {
        text = String(text || '').trim();
        if (!text) return;
        var shown = document.getElementById('voice-recognized-text');
        if (shown) shown.textContent = text;
        var log = document.getElementById('voice-command-log');
        if (log) {
            if (!log.dataset.has) { log.innerHTML = ''; log.dataset.has = '1'; }
            var row = document.createElement('span');
            row.textContent = '🗣️ ' + text;
            log.insertBefore(row, log.firstChild);
            while (log.children.length > 20) log.removeChild(log.lastChild);
        }
        window.dispatchEvent(new CustomEvent('wordai:voice', { detail: { text: text } }));
    }
    function setupVoice() {
        var status = document.getElementById('voice-status-box');
        var mic = document.getElementById('mic-icon-glow');
        var bars = document.querySelectorAll('.wave-bar');
        var okMsg = function () { setStatus(status, '<i class="fas fa-check-circle" style="color:#10b981"></i> ' + T('마이크가 연결되었습니다. 마이크를 누르고 말씀하세요!', 'Microphone connected! Click mic to speak.'), OK[0], OK[1]); };

        var send = document.getElementById('btn-send-voice-text');
        var inp = document.getElementById('voice-text-input');
        if (send && inp) {
            send.onclick = function () { voiceInput(inp.value); inp.value = ''; };
            inp.onkeypress = function (e) { if (e.key === 'Enter') send.click(); };
        }

        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setStatus(status, '<i class="fas fa-exclamation-triangle"></i> ' + T('이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트 창을 이용하세요.', 'Browser does not support speech recognition. Use text input below.'), ERR[0], ERR[1]);
            return;
        }
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
                st.getTracks().forEach(function (t) { t.stop(); });
                okMsg();
            }).catch(function () {
                setStatus(status, '<i class="fas fa-microphone-slash"></i> ' + T('마이크 권한을 허용해 주세요.', 'Please allow microphone access.'), ERR[0], ERR[1]);
            });
        }
        rec = new SR();
        rec.continuous = false; rec.interimResults = false;
        function wave() {
            clearInterval(waveTimer);
            waveTimer = setInterval(function () {
                if (!listening) { bars.forEach(function (b) { b.style.height = '8px'; }); clearInterval(waveTimer); return; }
                bars.forEach(function (b) { b.style.height = (Math.floor(Math.random() * 30) + 10) + 'px'; });
            }, 100);
        }
        rec.onstart = function () {
            listening = true; mic.className = 'mic-active';
            setStatus(status, '<i class="fas fa-volume-up"></i> ' + T('귀기울여 듣고 있어요... 말씀하세요!', 'Listening... Please speak now!'), ERR[0], ERR[1]);
            wave();
        };
        rec.onerror = function (e) {
            listening = false; mic.className = 'mic-idle';
            if (e.error === 'not-allowed') setStatus(status, '<i class="fas fa-microphone-slash"></i> ' + T('마이크 권한이 거부되었습니다. 허용해주세요.', 'Microphone permission denied.'), ERR[0], ERR[1]);
            else okMsg();
        };
        rec.onend = function () { listening = false; mic.className = 'mic-idle'; bars.forEach(function (b) { b.style.height = '8px'; }); if (status.style.color !== 'rgb(153, 27, 27)') okMsg(); };
        rec.onresult = function (ev) { voiceInput(ev.results[0][0].transcript); };
        mic.onclick = function () {
            if (listening) { try { rec.stop(); } catch (e) { } return; }
            try { rec.lang = lang() === 'en' ? 'en-US' : 'ko-KR'; rec.start(); } catch (e) { console.warn('[wordAI] speech', e); }
        };
    }

    /* ---------- 붙이기 ---------- */
    function mount(u) {
        unit = String(u);
        if (['6', '7', '8'].indexOf(unit) < 0) return;
        css();
        var ml = document.querySelector('.main-layout');
        if (!ml || document.getElementById('ai-left-sidebar')) return;

        var wrap = document.createElement('div');
        wrap.id = 'wordBody';
        ml.parentNode.insertBefore(wrap, ml);
        side = document.createElement('div');
        side.id = 'ai-left-sidebar';
        var title = unit === '7'
            ? '<i class="fas fa-microphone" style="color:#8b5cf6"></i> ' + T('AI 자연어 프롬프팅 (음성 / 텍스트)', 'AI Natural Language Prompting (Voice / Text)')
            : unit === '8'
                ? '<i class="fas fa-dragon" style="color:#f97316"></i> ' + T('AI 사물 이미지 인식', 'AI Object Recognition')
                : '<i class="fas fa-camera" style="color:#8b5cf6"></i> ' + T('AI 제스처 인식', 'AI Gesture Recognition');
        side.innerHTML = '<div class="ai-head">' + title + '</div><div id="ai-left-panel-content"></div>';
        wrap.appendChild(side);
        wrap.appendChild(ml);
        body = document.getElementById('ai-left-panel-content');

        if (unit === '7') {
            body.innerHTML = voicePanel();
            setupVoice();
            return;
        }
        body.innerHTML = camPanel(unit === '8');
        video = document.getElementById('webcam');
        statusEl = document.getElementById('ai-status');
        gestureEl = document.getElementById('current-gesture');

        // TF 라이브러리를 순서대로 불러온 뒤 웹캠 연결
        (function chain(i) {
            if (i < CDN.length) { loadScript(CDN[i]).then(function (ok) { if (!ok) setStatus(statusEl, '<i class="fas fa-exclamation-triangle"></i> ' + T('AI 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.', 'Could not load AI libraries. Check your internet.'), ERR[0], ERR[1]); else chain(i + 1); }); return; }
            classifier = knnClassifier.create();
            startCam().then(function (ok) { if (ok) afterCam(); });
        })(0);
    }

    function unmount() {
        loopOn = false;
        stopCam();
        try { if (rec) rec.abort(); } catch (e) { }
    }
    window.addEventListener('pagehide', unmount);

    window.WORD_AI = { mount: mount, unmount: unmount, voice: voiceInput };
})();
