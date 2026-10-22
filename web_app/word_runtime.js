/* BrickSync 워드 블록 실행 엔진 (4단계)
 *  - 워드 블록(JSON) → 허브(BLE/USB) 신호 + 포트나이트 신호를 만들어 보낸다.
 *  - 아이콘 모드(lesson.html)와 같은 시간표/패킷 규칙을 쓴다. 아이콘 모드 코드는 건드리지 않고,
 *    부모 창(app.html)이 내놓는 writeToHub / sendWebSocketAction / hubDevices / connectionType 만 호출한다.
 *  - 미션 달성도(과제 체크, 진행바)와 완료 보상도 여기서 판정한다.
 */
(function () {
    'use strict';

    var WB = window.WORD_BLOCKS;
    var ENGINE = function () { return window.WORD_ENGINE; };
    var unit = new URLSearchParams(location.search).get('unit') || '1';

    var counter = 0;           // 실행 번호 (바뀌면 이전 실행은 즉시 멈춘다)
    var lightSeq = 0;          // 조명 명령 번호 (예약된 자동 끄기가 새 조명 명령을 끄지 않게)
    var running = false;
    var audioCtx = null, soundFx = { pitch: 0, pan: 0, vol: 100 };

    function sleep(ms) { return window.bsSleep ? window.bsSleep(ms) : new Promise(function (r) { setTimeout(r, ms); }); }      // 가려진 탭에서도 정확하게 (bs_timer.js)
    // 통신 로그 창(아래쪽 "통신 로그")에 남긴다
    function slog(category, msg) { try { if (typeof window.addSystemLog === 'function') window.addSystemLog(category, msg); } catch (e) { } }
    function lang() { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }

    /* ---------- 부모 창(허브/포트나이트 창구) ---------- */
    function hubWin() {
        var w = window;
        for (var i = 0; i < 5; i++) {
            if (w.hubDevices && w.writeToHub) return w;
            if (w.parent && w.parent !== w) w = w.parent; else break;
        }
        return window.parent || window;
    }
    function connType() {
        var p = window.parent;
        if (p && p !== window) {
            if (p.connectionType === 'BLE' || p.isBluetoothMode || p.txCharacteristic) return 'BLE';
            if (p.connectionType === 'USB') return 'USB';
        }
        return null;
    }
    function sendWS(item) {
        try {
            if (window.parent && typeof window.parent.sendWebSocketAction === 'function') window.parent.sendWebSocketAction(item);
        } catch (e) { }
    }
    function isSensorPort(dev) { return dev === 64 || dev === 61 || dev === 62 || dev === 63; }

    /* ---------- 아이콘 모드와 같은 시간표 ---------- */
    var MIN_SPEED = 18;      // 실측: 이 값보다 낮으면 모터가 돌지 않는다
    function speedLevel(s) { return s <= 15 ? 1 : (s <= 40 ? 2 : (s <= 70 ? 3 : 4)); }
    function oneStepMs(s) { return s <= 25 ? 3200 : (s <= 50 ? 1280 : (s <= 80 ? 640 : 305)); }    // 자동차 1칸
    function oneTurnMs(s) { return s <= 25 ? 1660 : (s <= 50 ? 665 : (s <= 80 ? 330 : 160)); }      // 자동차 회전 1번
    function motorTurnMs(s) { return s <= 25 ? 3730 : (s <= 50 ? 1400 : (s <= 80 ? 600 : 300)); }   // 모터 1바퀴
    // 모터 "n바퀴"는 n x 360도를 허브의 '각도만큼 돌리기'로 정확히 돌린다. 예상 소요 시간(ms)은 완료 신호가 안 와도 넘어가기 위한 상한
    function turnEstMs(turns, s) { return Math.round(Math.abs(turns) * 360 * 1000 / (Math.max(10, Math.abs(s)) * 6)) + 300; }

    var COLOR_ID = { black: 0, pink: 1, violet: 2, blue: 3, azure: 4, green: 6, yellow: 7, orange: 8, red: 9, white: 10 };

    /* ---------- 컴파일: 블록 → 신호 목록 ---------- */
    // 한 스택을 {ble, local, fort, py, bleT, fortT} 로 만든다.
    function newCtx(opts) {
        return {
            ble: [], local: [], fort: [], py: '',
            bleT: 0, fortT: 0, speed: 40, wheelMm: 43.2,
            light: { base: [0, 0, 0, 0, 0, 0, 0, 0, 0], bright: 100, rot: 0 },
            turns: opts && opts.turns, voiceDir: opts && opts.voiceDir, depth: (opts && opts.depth) || 0, stopped: false, fortLit: false,
            sync: !!(opts && opts.sync !== undefined ? opts.sync : (typeof window.bsHubIsBle === 'function' && window.bsHubIsBle(hubWin())))
        };
    }

    function num(v, d) { v = parseFloat(v); return isNaN(v) ? d : v; }

    // 단위(rot/deg/sec)를 "칸 수"와 "밀리초"로 바꾼다
    function amount(n, u) {
        if (u === 'sec') return { ms: n * 1000, steps: null };
        if (u === 'deg') return { ms: null, steps: n / 360 };
        return { ms: null, steps: n };
    }

    // 이동 거리: cm/인치는 바퀴 둘레로 나눠 "바퀴 몇 칸"으로 바꾼다 (도(°)와 같은 방식)
    function amountD(n, u, ctx) {
        if (u === 'cm' || u === 'inch') {
            var mm = n * (u === 'cm' ? 10 : 25.4);
            return { ms: null, steps: mm / (Math.PI * (ctx.wheelMm || 43.2)), reg: true };   // reg: 허브가 바퀴 각도를 직접 맞추게 한다
        }
        return amount(n, u);
    }
    var DEG_PER_PCT = 6.5;     // 속도 1%당 초당 도(°): 이동 시간을 넉넉히 잡기 위한 값
    function lightPortOf(p) { return (p === undefined || p === 'auto' || p === null) ? null : portIdx(p); }
    var PORT_INDEX = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
    function portIdx(p) { var i = PORT_INDEX[String(p || 'A').toUpperCase()]; return i === undefined ? 0 : i; }

    function lightPayload(ctx) {
        // 기준 그림을 회전한 뒤 [색<<4 | 밝기] 바이트 9개로 만든다
        var b = ctx.light.base, out = [];
        var r = ctx.light.rot % 4, cur = b.slice();
        for (var k = 0; k < r; k++) {
            var nx = new Array(9);
            for (var row = 0; row < 3; row++) for (var col = 0; col < 3; col++) nx[row * 3 + col] = cur[(2 - col) * 3 + row];
            cur = nx;
        }
        for (var i = 0; i < 9; i++) out.push(cur[i] ? cur[i] : 0);
        return out;
    }
    // 3x3 조명 한 칸의 값: 위 4비트 = 밝기(1~10, 10이 가장 밝음), 아래 4비트 = 색 번호 (아이콘 모드와 같은 방식)
    function pixelByte(colorId, level) { return ((Math.max(1, Math.min(10, level)) & 0x0F) << 4) | (colorId & 0x0F); }
    function litLevel(ctx) { return Math.max(1, Math.round(ctx.light.bright / 100 * 10)); }
    function anyLit(arr) { return arr.some(function (x) { return x > 0; }); }

    function emitBlocks(list, ctx, ind) {
        for (var i = 0; i < list.length && !ctx.stopped; i++) emitOne(list[i], ctx, ind);
    }

    function emitCar(ctx, ind, dir, amt, steer) {
        // dir: 'fwd'|'back'|'left'|'right' (steer 가 있으면 조향 이동)
        var s = ctx.speed;
        var steps = amt.steps, ms = amt.ms;
        var isTurn = (dir === 'left' || dir === 'right');
        var legoDur = 0;      // 레고가 이 블록을 실제로 끝내는 시간 (각도 이동일 때만)
        var unitMs = isTurn ? oneTurnMs(s) : oneStepMs(s);
        var bleMs = ms !== null ? Math.round(ms) : Math.round(steps * unitMs);
        // 각 바퀴 값 (아이콘 모드: 앞으로 = A -, B +)
        var a, b;
        if (steer !== undefined) {
            var fl = 1 + Math.min(0, steer) / 50, fr = 1 - Math.max(0, steer) / 50;
            var sgn = dir === 'back' ? -1 : 1;
            a = -s * fl * sgn; b = s * fr * sgn;
        } else {
            a = (dir === 'fwd' || dir === 'right') ? -s : s;
            b = (dir === 'fwd' || dir === 'left') ? s : -s;
        }
        if (amt.reg && steps !== null) {
            // cm/인치: 두 바퀴 모두 허브의 속도 제어로 정확한 각도만큼 돌린다 (시간으로 재면 바퀴마다 달라서 휘어진다)
            var topSpd = Math.max(Math.abs(a), Math.abs(b), 1), wholeDeg = steps * 360;
            var dl = Math.round(wholeDeg * Math.abs(a) / topSpd), dr = Math.round(wholeDeg * Math.abs(b) / topSpd);
            ctx.ble.push({ a: 'car_deg', l: Math.round(a), r: Math.round(b), dl: dl, dr: dr, delay: ctx.bleT, tag: dir });
            ctx.bleT += Math.round(wholeDeg / (topSpd * DEG_PER_PCT) * 1000) + 400;
        } else if (ms === null && steer === undefined && typeof window.bsCarDriveDeg === 'function') {
            // 시간이 아니라 바퀴 각도로 정확히: 기본 블록은 칸/회전 기준 각도(hub_ports.js BS_CAR), '[n] 회전/도 이동하기'는 바퀴 n x 360도 / n도
            var wdeg = amt.basic ? window.bsCarWheelDeg(dir, steps) : Math.max(1, Math.round(Math.abs(steps) * 360));
            var west = window.bsCarEstMs(wdeg, s);
            legoDur = Math.round(wdeg * 1000 / (Math.max(10, s) * 5.5)) + 650;
            ctx.ble.push({ a: 'wheels_deg', dir: dir, deg: wdeg, speed: s, est: west, blocking: true, delay: ctx.bleT, tag: dir });
            ctx.bleT += west + 500;
        } else {
            ctx.ble.push({ a: 'car', l: Math.round(a), r: Math.round(b), delay: ctx.bleT, tag: dir });
            ctx.bleT += bleMs;
            ctx.ble.push({ a: 'car_stop', delay: ctx.bleT });
            ctx.bleT += 500;
        }

        // 포트나이트: 가장 가까운 동작으로
        var fdir = dir, fgap = 850;
        if (steer !== undefined) {
            if (steer < -25) { fdir = 'left'; } else if (steer > 25) { fdir = 'right'; } else { fdir = dir === 'back' ? 'back' : 'fwd'; }
        }
        var fturn = (fdir === 'left' || fdir === 'right');
        fgap = fturn ? 650 : 850;
        var key = { fwd: 'UP', back: 'DOWN', left: 'LEFT', right: 'RIGHT' }[fdir];
        var taps = ms !== null ? Math.max(1, Math.round(ms / fgap)) : Math.max(1, Math.round(steps));
        var fort0 = ctx.fortT;
        for (var k = 0; k < taps; k++) { ctx.fort.push({ a: 'ws', action: 'STEER_' + key + '_TAP', delay: ctx.fortT }); ctx.fortT += fgap; }
        ctx.fortT += 100;
        // 허브가 연결돼 있으면 포트나이트의 다음 블록도 레고가 이 블록을 끝낸 뒤에 시작 (키 간격과 횟수는 그대로)
        if (ctx.sync && legoDur) ctx.fortT = Math.max(ctx.fortT, fort0 + legoDur);

        // USB(파이썬) 시간
        var pyUnit = isTurn ? 835 : 1600;
        var pyMs = ms !== null ? Math.round(ms) : Math.round(steps * pyUnit);
        var den = s || 1;
        var pa = a / den, pb = b / den;
        ctx.py += ind + 'dm(' + (pa * 1) + '*global_motor_speed, ' + (pb * 1) + '*global_motor_speed)\n' + ind + 'utime.sleep_ms(' + pyMs + ') \n' + ind + 'sm() \n';
    }

    function emitCarStart(ctx, ind, dir, steer) {
        var s = ctx.speed;
        var a, b;
        if (steer !== undefined) {
            var fl = 1 + Math.min(0, steer) / 50, fr = 1 - Math.max(0, steer) / 50;
            a = -s * fl; b = s * fr;
        } else { a = dir === 'fwd' ? -s : s; b = dir === 'fwd' ? s : -s; }
        ctx.ble.push({ a: 'car', l: Math.round(a), r: Math.round(b), delay: ctx.bleT });
        ctx.bleT += 100;
        var key = (steer !== undefined && steer < -25) ? 'LEFT' : ((steer !== undefined && steer > 25) ? 'RIGHT' : (dir === 'back' ? 'DOWN' : 'UP'));
        ctx.fort.push({ a: 'ws', action: 'STEER_' + key + '_TAP', delay: ctx.fortT });
        ctx.fortT += 100;
        ctx.py += ind + 'dm(' + (a / (s || 1)) + '*global_motor_speed, ' + (b / (s || 1)) + '*global_motor_speed)\n';
    }

    function emitMotor(ctx, ind, dirCw, amt) {
        var s = ctx.speed;
        var turns = amt.steps, ms = amt.ms;
        var motorFort0 = ctx.fortT, motorLegoDur = (ms === null) ? Math.round(Math.abs(turns) * 360 * 1000 / (Math.max(10, s) * 5.5)) + 650 : 0;
        if (ms === null) {
            var estMs = turnEstMs(turns, s);
            ctx.ble.push({ a: 'motor_turn', tag: dirCw ? 'motor_cw' : 'motor_ccw', turns: turns, speed: dirCw ? s : -s, est: estMs, blocking: true, port: null, delay: ctx.bleT });
            ctx.bleT += estMs + 600;
        } else {
            ctx.ble.push({ a: 'motor', tag: dirCw ? 'motor_cw' : 'motor_ccw', speed: dirCw ? s : -s, delay: ctx.bleT });
            ctx.bleT += Math.round(ms);
            ctx.ble.push({ a: 'motor_stop', tag: 'motor_stop_generic', delay: ctx.bleT });
            ctx.bleT += 600;
        }
        if (unit === '7') {
            // 그네: 음성의 방향/횟수로 한 번에 보낸다 (아이콘 모드 7단원과 같음)
            var swings = ms !== null ? Math.max(1, Math.round(ms / 2300)) : Math.max(1, Math.round(turns));
            ctx.fort.push({ a: 'ws', action: 'SWING_CONTROL', dir: ctx.voiceDir === 1 ? 'BACKWARD' : 'FORWARD', val: swings, delay: ctx.fortT });
            ctx.fortT += swings * 2300 + 500;
        } else if (unit === '6' || unit === '8') {
            // 오두막 지붕: 시계 = motor_cw(열기), 반시계 = motor_ccw(닫기). 한 바퀴마다 한 번, 브레이크 키는 보내지 않는다
            var hn = ms !== null ? Math.max(1, Math.round(ms / 1400)) : Math.max(1, Math.round(turns));
            for (var hi = 0; hi < hn; hi++) { ctx.fort.push({ a: 'ws', action: dirCw ? 'motor_cw' : 'motor_ccw', delay: ctx.fortT }); ctx.fortT += 1400; }
            ctx.fortT += 600;
        } else {
            var key = dirCw ? 'MWHEEL_RIGHT' : 'MWHEEL_LEFT';
            var n = ms !== null ? Math.max(1, Math.round(ms / 1400)) : Math.max(1, Math.round(turns));
            for (var i = 0; i < n; i++) { ctx.fort.push({ a: 'ws', action: key, delay: ctx.fortT }); ctx.fortT += 1400; }
            ctx.fort.push({ a: 'ws', action: 'STOP_' + key, delay: ctx.fortT });
            ctx.fortT += 800;
        }
        if (ctx.sync && motorLegoDur) ctx.fortT = Math.max(ctx.fortT, motorFort0 + motorLegoDur);      // 게임 회전은 그대로, 다음 블록만 레고가 끝난 뒤에 시작
        var pyMs = ms !== null ? Math.round(ms) : Math.round(turns * 1000);
        ctx.py += ind + 'rm(' + (dirCw ? '' : '-') + 'global_motor_speed) \n' + ind + 'utime.sleep_ms(' + pyMs + ') \n' + ind + 'sm() \n';
    }

    function fortStopAll(ctx) {
        ['STOP_MWHEEL_LEFT', 'STOP_MWHEEL_RIGHT', 'STOP_UP', 'STOP_DOWN', 'STOP_LEFT', 'STOP_RIGHT'].forEach(function (a) {
            ctx.fort.push({ a: 'ws', action: a, delay: ctx.fortT });
        });
    }

    function lightShow(ctx, durSec) {
        var pay = lightPayload(ctx);
        ctx.ble.push({ a: 'matrix', pay: pay, delay: ctx.bleT, dur: durSec, port: ctx.light.port === undefined ? null : ctx.light.port });
        if (anyLit(pay)) {
            if (!ctx.fortLit) { ctx.fort.push({ a: 'ws', action: 'ACTION_LIGHT', delay: ctx.fortT }); ctx.fortLit = true; }
            ctx.fort.push({ a: 'ws', action: 'LIGHT_ON', delay: ctx.fortT });
        }
        if (durSec) {
            ctx.bleT += durSec * 1000 + 300;
            ctx.fortT += durSec * 1000;
            ctx.fort.push({ a: 'ws', action: 'LIGHT_OFF', delay: ctx.fortT });
            ctx.fortLit = false;
            ctx.fortT += 300;
        } else {
            ctx.bleT += 100;
        }
    }

    function emitOne(node, ctx, ind) {
        var t = node.type, v = node.vals || {};
        switch (t) {
            case 'start': case 'ev_color': case 'ev_tilt': case 'ev_up': case 'ev_gesture': case 'ev_force': case 'ev_distance':
            case 'ev_timer': case 'ev_recv': case 'ev_ai_gesture': case 'ev_ai_voice': case 'ev_ai_vision':
                break;

            case 'wait': {
                var w = num(v.n, 1);
                ctx.bleT += w * 1000; ctx.fortT += w * 1000;
                ctx.py += ind + 'utime.sleep_ms(int(' + w + ' * 1000)) \n';
                break;
            }
            case 'repeat': {
                var times = Math.max(1, Math.round(num(v.n, 1)));
                ctx.py += ind + 'for _ in range(' + times + '):\n';
                var before = ctx.py.length, once = null;
                for (var r = 0; r < times && !ctx.stopped; r++) {
                    emitBlocks(node.kids || [], ctx, ind + '  ');
                    if (once === null) once = ctx.py.slice(before);       // 파이썬은 for 문이 반복하므로 한 번만 적는다
                    else ctx.py = ctx.py.slice(0, before) + once;
                }
                if (ctx.py.length === before) ctx.py += ind + '  pass\n';
                break;
            }
            case 'forever': {
                var inner = newCtx({ turns: ctx.turns, depth: ctx.depth });
                inner.speed = ctx.speed; inner.wheelMm = ctx.wheelMm;
                emitBlocks(node.kids || [], inner, ind + '  ');
                ctx.py += ind + 'while True:\n' + (inner.py || (ind + '  pass\n'));
                ctx.ble.push({ a: 'forever', inner: inner.ble, dur: inner.bleT, delay: ctx.bleT });
                ctx.local.push({ a: 'forever', inner: inner.local, dur: inner.bleT, delay: ctx.bleT });
                ctx.fort.push({ a: 'forever', inner: inner.fort, dur: inner.fortT, delay: ctx.fortT });
                ctx.stopped = true;      // 무한 반복 뒤의 블록은 실행되지 않는다
                break;
            }
            case 'ct_stop_other':
                ctx.ble.push({ a: 'stop_others', delay: ctx.bleT });
                ctx.local.push({ a: 'stop_others', delay: ctx.bleT });
                break;
            case 'ct_stop':
                if (v.m === 'this') { ctx.stopped = true; break; }
                ctx.ble.push({ a: 'stop_all', delay: ctx.bleT });
                ctx.local.push({ a: 'stop_all', delay: ctx.bleT });
                ctx.fort.push({ a: 'stop_all', delay: ctx.fortT });
                ctx.stopped = true;
                break;

            /* ---- 기본 이동(아이콘 블록과 같은 값) ---- */
            case 'fwd': case 'back': case 'left': case 'right': {
                var cnt = ctx.turns && (unit === '7') ? ctx.turns : num(v.n, 1);
                emitCar(ctx, ind, t, { ms: null, steps: cnt, basic: true });
                break;
            }
            /* ---- 동작 ---- */
            case 'mv_move': {
                var a1 = amountD(ctx.turns && v.unit === 'rot' && unit === '7' ? ctx.turns : num(v.n, 1), v.unit, ctx);
                emitCar(ctx, ind, v.d, a1);
                break;
            }
            case 'mv_start': emitCarStart(ctx, ind, v.d); break;
            case 'mv_wheel': ctx.wheelMm = Math.max(10, Math.min(200, num(v.n, 43.2))); break;
            case 'mv_steer': {
                var s1 = num(v.s, 0);
                emitCar(ctx, ind, 'fwd', amountD(num(v.n, 1), v.unit, ctx), s1);
                break;
            }
            case 'mv_steer_start': emitCarStart(ctx, ind, 'fwd', num(v.s, 0)); break;
            case 'mv_stop':
                ctx.ble.push({ a: 'car_stop', delay: ctx.bleT });
                ctx.bleT += 500;
                fortStopAll(ctx);
                ctx.py += ind + 'sm() \n';
                break;
            case 'mv_speed': case 'motor_speed': {
                var sp = Math.max(MIN_SPEED, Math.min(100, num(v.n, 40)));
                ctx.speed = sp;
                ctx.py += ind + 'global_motor_speed = ' + sp + ' \n' + ind + 'print("Global Motor Speed Set:", global_motor_speed, "%") \n';
                ctx.ble.push({ a: 'speed_log', level: speedLevel(sp), pct: sp, delay: ctx.bleT });
                ctx.fort.push({ a: 'ws', action: 'SPEED_' + speedLevel(sp), delay: ctx.fortT });
                break;
            }

            /* ---- 모터 ---- */
            case 'motor_run': {
                var turnsN = ctx.turns && v.unit === 'rot' && unit === '7' ? ctx.turns : num(v.n, 1);
                emitMotor(ctx, ind, v.dir !== 'ccw', amount(turnsN, v.unit));
                break;
            }
            case 'motor_on': {
                var cw = v.dir !== 'ccw';
                ctx.ble.push({ a: 'motor', tag: cw ? 'motor_cw' : 'motor_ccw', speed: cw ? ctx.speed : -ctx.speed, delay: ctx.bleT });
                ctx.bleT += 100;
                ctx.fort.push({ a: 'ws', action: (unit === '6' || unit === '8') ? (cw ? 'motor_cw' : 'motor_ccw') : (cw ? 'MWHEEL_RIGHT' : 'MWHEEL_LEFT'), delay: ctx.fortT });
                ctx.fortT += 100;
                ctx.py += ind + 'rm(' + (cw ? '' : '-') + 'global_motor_speed) \n';
                break;
            }
            /* ---- 포트를 고른 모터 (허브 직결에서만 동작: 포트나이트/USB에는 같은 동작이 없다) ---- */
            case 'motor_port_run': {
                var pr = lightPortOf(v.p), pcw = v.dir !== 'ccw', pam = amount(num(v.n, 1), v.unit);
                if (pam.ms === null) {
                    var pest = turnEstMs(pam.steps, ctx.speed);
                    ctx.ble.push({ a: 'motor_turn', tag: 'motor_port_' + v.p, turns: pam.steps, speed: pcw ? ctx.speed : -ctx.speed, est: pest, blocking: true, port: pr, delay: ctx.bleT });
                    ctx.bleT += pest + 600;
                } else {
                    var pms = Math.round(pam.ms);
                    ctx.ble.push({ a: 'motor_p', port: pr, tag: 'motor_port_' + v.p, speed: pcw ? ctx.speed : -ctx.speed, delay: ctx.bleT });
                    ctx.bleT += pms;
                    ctx.ble.push({ a: 'motor_p', port: pr, tag: 'motor_port_stop_' + v.p, speed: 0, delay: ctx.bleT });
                    ctx.bleT += 600;
                }
                ctx.py += ind + '# 포트 ' + v.p + ' 모터는 블루투스 허브 연결에서만 움직여요\n';
                break;
            }
            case 'motor_port_on':
                ctx.ble.push({ a: 'motor_p', port: lightPortOf(v.p), tag: 'motor_port_' + v.p, speed: v.dir !== 'ccw' ? ctx.speed : -ctx.speed, delay: ctx.bleT });
                ctx.bleT += 100;
                ctx.py += ind + '# 포트 ' + v.p + ' 모터는 블루투스 허브 연결에서만 움직여요\n';
                break;
            case 'motor_port_stop':
                ctx.ble.push({ a: 'motor_p', port: lightPortOf(v.p), tag: 'motor_port_stop_' + v.p, speed: 0, delay: ctx.bleT });
                ctx.bleT += 300;
                break;
            case 'motor_goto':
                ctx.ble.push({ a: 'motor_goto', port: lightPortOf(v.p), deg: Math.round(num(v.a, 0)), speed: Math.max(10, ctx.speed), delay: ctx.bleT });
                ctx.bleT += 2500;
                ctx.py += ind + '# 포트 ' + v.p + ' 모터 위치 이동은 블루투스 허브 연결에서만 돼요\n';
                break;
            case 'motor_reset':
                ctx.ble.push({ a: 'motor_reset', port: lightPortOf(v.p), delay: ctx.bleT });
                ctx.bleT += 300;
                break;

            case 'motor_stop':
                ctx.ble.push({ a: 'motor_stop', tag: 'motor_stop_generic', delay: ctx.bleT });
                ctx.bleT += 800;
                fortStopAll(ctx);
                ctx.py += ind + 'sm() \n';
                break;

            /* ---- 조명 ---- */
            case 'li_pattern_for': case 'li_pattern': {
                var bits = String(v.p || '000000000');
                var lvl = litLevel(ctx);
                ctx.light.port = lightPortOf(v.pt);
                var pcId = COLOR_ID[v.c] !== undefined ? COLOR_ID[v.c] : COLOR_ID.white;
                var CODE = { p: 'pink', v: 'violet', b: 'blue', a: 'azure', g: 'green', y: 'yellow', o: 'orange', r: 'red', w: 'white' };
                ctx.light.base = bits.split('').map(function (c) {                 // 칸마다 색 (예전 '1'은 블록 색)
                    if (c === '0') return 0;
                    var id = c === '1' ? pcId : (COLOR_ID[CODE[c]] !== undefined ? COLOR_ID[CODE[c]] : pcId);
                    return pixelByte(id, lvl);
                });
                lightShow(ctx, t === 'li_pattern_for' ? Math.max(0, num(v.n, 2)) : 0);
                break;
            }
            case 'li_off':
                ctx.light.base = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                ctx.light.port = lightPortOf(v.pt);
                ctx.ble.push({ a: 'matrix_clear', delay: ctx.bleT, port: ctx.light.port });
                ctx.bleT += 300;
                ctx.fort.push({ a: 'ws', action: 'LIGHT_OFF', delay: ctx.fortT });
                ctx.fortLit = false;
                ctx.fortT += 300;
                break;
            case 'li_red': {                     // 9칸 전체 빨강 (아이콘 모드의 고정 빨간 조명 블록과 같은 역할)
                var rl = litLevel(ctx);
                ctx.light.port = lightPortOf(v.pt);
                ctx.light.base = [0, 0, 0, 0, 0, 0, 0, 0, 0].map(function () { return pixelByte(COLOR_ID.red, rl); });
                // 5·8단원 미션 중에는 켜진 뒤 3초 후 저절로 꺼진다 (정지 버튼을 누르지 않아도)
                lightShow(ctx, ((unit === '5' || unit === '8') && window.isMissionActive) ? 3 : 0);
                break;
            }
            case 'li_bright': ctx.light.bright = Math.max(0, Math.min(100, num(v.n, 100))); ctx.light.port = lightPortOf(v.pt); break;
            case 'li_pixel': {
                var idx = (Math.round(num(v.y, 1)) - 1) * 3 + (Math.round(num(v.x, 1)) - 1);
                var level = Math.max(0, Math.round(num(v.n, 100) / 100 * 10));
                ctx.light.base[idx] = level > 0 ? pixelByte(COLOR_ID[v.c] !== undefined ? COLOR_ID[v.c] : 9, level) : 0;
                lightShow(ctx, 0);
                break;
            }
            case 'li_rotate': {
                ctx.light.port = lightPortOf(v.pt);
                ctx.light.rot = (ctx.light.rot + (v.dir === 'ccw' ? 3 : 1)) % 4;
                lightShow(ctx, 0);
                break;
            }
            case 'li_orient': {
                ctx.light.port = lightPortOf(v.pt);
                ctx.light.rot = { straight: 0, right: 1, upside: 2, left: 3 }[v.o] || 0;
                lightShow(ctx, 0);
                break;
            }
            case 'li_center':
                ctx.ble.push({ a: 'led', color: COLOR_ID[v.c] !== undefined ? COLOR_ID[v.c] : 3, delay: ctx.bleT });
                ctx.bleT += 100;
                break;

            /* ---- 소리 (브라우저에서 재생) ---- */
            case 'so_play': ctx.local.push({ a: 'sound', n: soundArg(v.s), wait: false, delay: ctx.bleT }); break;
            case 'so_play_wait': {
                var swMs = isRecSound(v.s) ? Math.ceil(SoundLib.durationOf(v.s) * 1000) + 50 : (window.KidMusic ? Math.ceil(KidMusic.duration(Math.max(1, Math.min(8, Math.round(num(v.s, 1))))) * 1000) + 100 : 700);
                ctx.local.push({ a: 'sound', n: soundArg(v.s), wait: true, delay: ctx.bleT });
                ctx.bleT += swMs; ctx.fortT += swMs;
                break;
            }
            case 'so_stop': ctx.local.push({ a: 'sound_stop', delay: ctx.bleT }); break;
            case 'so_effect_change': ctx.local.push({ a: 'fx', k: v.e, d: num(v.n, 0), rel: true, delay: ctx.bleT }); break;
            case 'so_effect_set': ctx.local.push({ a: 'fx', k: v.e, d: num(v.n, 0), rel: false, delay: ctx.bleT }); break;
            case 'log_show': {                    // 값을 통신 로그에 보여 준다 (센서 값 확인용)
                ctx.local.push({ a: 'log', text: String(v.x === undefined ? '' : v.x), delay: ctx.bleT });
                ctx.py += ind + 'print(' + JSON.stringify(String(v.x === undefined ? '' : v.x)) + ')' + String.fromCharCode(10);
                break;
            }
            case 'so_pitch_change': ctx.local.push({ a: 'fx', k: 'pitch', d: num(v.n, 0), rel: true, delay: ctx.bleT }); break;
            case 'so_pitch_set': ctx.local.push({ a: 'fx', k: 'pitch', d: num(v.n, 0), rel: false, delay: ctx.bleT }); break;
            case 'so_pan_change': ctx.local.push({ a: 'fx', k: 'pan', d: num(v.n, 0), rel: true, delay: ctx.bleT }); break;
            case 'so_pan_set': ctx.local.push({ a: 'fx', k: 'pan', d: num(v.n, 0), rel: false, delay: ctx.bleT }); break;
            case 'so_effect_clear': ctx.local.push({ a: 'fx_clear', delay: ctx.bleT }); break;
            case 'so_vol_change': ctx.local.push({ a: 'fx', k: 'vol', d: num(v.n, 0), rel: true, delay: ctx.bleT }); break;
            case 'so_vol_set': ctx.local.push({ a: 'fx', k: 'vol', d: num(v.n, 100), rel: false, delay: ctx.bleT }); break;

            /* ---- 메시지 ---- */
            case 'ev_send':
                ctx.local.push({ a: 'broadcast', m: v.m, delay: ctx.bleT });
                break;
            case 'ev_send_wait': {
                ctx.local.push({ a: 'broadcast', m: v.m, delay: ctx.bleT });
                var d = receiverDuration(v.m, ctx.depth + 1);
                ctx.bleT += d; ctx.fortT += d;
                break;
            }
        }
    }

    function stacksSorted() {
        var st = (ENGINE() && ENGINE().state.stacks) || [];
        return st.slice().sort(function (a, b) { return a.x - b.x; });
    }
    function hatOf(stack) { var f = stack.blocks[0]; return f && WB.byType[f.type] && WB.byType[f.type].hat ? f : null; }

    function receiverDuration(m, depth) {
        if (depth > 4) return 0;
        var max = 0;
        stacksSorted().forEach(function (s) {
            var h = hatOf(s);
            if (h && h.type === 'ev_recv' && h.vals.m === m) {
                var c = newCtx({ depth: depth });
                emitBlocks(s.blocks, c, '');
                max = Math.max(max, c.bleT, c.fortT);
            }
        });
        return max;
    }

    /* ---------- 재생 ---------- */
    async function play(queue, token, exec, waitEach) {
        var last = 0;
        for (var i = 0; i < queue.length; i++) {
            if (token.id !== counter) return;
            var cmd = queue[i];
            if (cmd.a === 'forever') {
                var guard = 0;
                while (token.id === counter && guard++ < 100000) {
                    await play(cmd.inner, token, exec, waitEach);
                    await sleep(60);
                }
                return;
            }
            var wait = cmd.delay - last;
            if (wait > 0) { await sleep(wait); last = cmd.delay; }
            if (token.id !== counter) return;
            var execStart = Date.now();
            await exec(cmd);
            if (cmd.blocking) last = cmd.delay + (cmd.est || 0);
        }
    }

    function motorPorts(attached) {
        var ports = [];
        for (var p = 0; p < 2; p++) { if (!isSensorPort(attached[p])) ports.push(p); }
        return ports;
    }

    async function hubExec(cmd) {
        var hw = hubWin(), send = hw.writeToHub, attached = hw.hubDevices || {};
        if (typeof send !== 'function') return;
        var spd = function (x) { var i = Math.round(x); return i < 0 ? 256 + i : i; };
        var pkt = function (p, x) { return new Uint8Array([8, 0, 0x81, p, 0x10, 0x51, 0x00, spd(x)]); };
        try {
            if (cmd.a === 'motor' || cmd.a === 'motor_stop') {
                slog('HUB', '⚡ 레고 허브 모터: ' + cmd.tag + ' (속도: ' + (cmd.speed || 0) + ')');
                sendWS({ action: 'HUB_LOG', msg: '⚡ 레고 허브 모터: ' + cmd.tag + ' (속도: ' + (cmd.speed || 0) + ')' });
                var ports = motorPorts(attached);
                if (ports.length) {
                    await send(pkt(ports[0], cmd.a === 'motor' ? cmd.speed : 0));
                    await sleep(60);
                }
            } else if (cmd.a === 'wheels_deg') {
                var wmsg = '⚡ 레고 허브 자동차: ' + ({ fwd: '앞으로', back: '뒤로', left: '왼쪽 회전', right: '오른쪽 회전' }[cmd.dir] || cmd.dir) + ' (바퀴 ' + cmd.deg + '°, 속도: ' + cmd.speed + ')';
                slog('HUB', wmsg);
                sendWS({ action: 'HUB_LOG', msg: wmsg });
                var wRun = counter;
                var wres = await window.bsCarDriveDeg(hw, cmd.dir, cmd.deg, cmd.speed, cmd.est, function () { return counter === wRun; });
                var wline = window.bsCarDriveLine(wres);
                slog('HUB', wline);
                sendWS({ action: 'HUB_LOG', msg: wline });
            } else if (cmd.a === 'motor_turn') {
                var tp = cmd.port;
                if (tp === null || tp === undefined) {
                    var mps = (typeof window.bsMotorPorts === 'function') ? window.bsMotorPorts(attached) : motorPorts(attached).map(function (q) { return { port: q }; });
                    tp = mps.length ? mps[0].port : null;
                }
                if (tp === null) { slog('HUB', '⚠ 연결된 모터를 찾지 못했어요.'); return; }
                var tdeg = Math.max(1, Math.round(Math.abs(cmd.turns) * 360));
                var tsp = Math.max(10, Math.min(100, Math.abs(Math.round(cmd.speed)))) * (cmd.speed < 0 ? -1 : 1);
                var tmsg = '⚡ 레고 허브 모터: ' + (cmd.speed >= 0 ? '시계' : '반시계') + '방향 ' + cmd.turns + '바퀴 (' + tdeg + '°, 속도: ' + Math.abs(tsp) + ')';
                slog('HUB', tmsg);
                sendWS({ action: 'HUB_LOG', msg: tmsg });
                hw.hubMotorDone = hw.hubMotorDone || {};
                var myRun = counter, tstart = Date.now();
                // StartSpeedForDegrees: 각도(4바이트), 속도(부호로 방향), 최대 힘 100, 끝나면 브레이크(127), 가감속 없음
                await send(new Uint8Array([14, 0x00, 0x81, tp, 0x11, 0x0B, tdeg & 255, (tdeg >>> 8) & 255, (tdeg >>> 16) & 255, (tdeg >>> 24) & 255, spd(tsp), 100, 127, 0x00]));
                var tres = await window.bsMotorTurnWait(hw, tp, tstart, tdeg, tsp, cmd.est, function () { return counter === myRun; });
                var tline = window.bsMotorTurnLine(tres);
                slog('HUB', tline);
                sendWS({ action: 'HUB_LOG', msg: tline });
                if (counter !== myRun || !tres.ok) { try { await send(pkt(tp, 0)); } catch (e2) { } }   // 멈춤 / 신호 없음: 안전하게 정지
            } else if (cmd.a === 'motor_p') {
                var mp = cmd.port === null || cmd.port === undefined ? (motorPorts(attached)[0] || 0) : cmd.port;
                slog('HUB', '⚡ 레고 허브 포트 ' + 'ABCDEF'.charAt(mp) + ' 모터 (속도: ' + cmd.speed + ')');
                await send(pkt(mp, cmd.speed));
                await sleep(60);
            } else if (cmd.a === 'motor_goto') {
                var gp = cmd.port === null || cmd.port === undefined ? (motorPorts(attached)[0] || 0) : cmd.port;
                var gname = 'ABCDEF'.charAt(gp);
                // 1) 지금 절대 각도(−180~179)를 읽는다 (APOS 모드)
                sensors.apos[gp] = undefined;
                await send(new Uint8Array([10, 0x00, 0x41, gp, 0x03, 0x01, 0x00, 0x00, 0x00, 0x01]));
                for (var wt = 0; wt < 12 && sensors.apos[gp] === undefined; wt++) await sleep(40);
                var curA = sensors.apos[gp];
                if (curA === undefined) {
                    // 각도를 못 읽으면 허브의 "절대 위치로 가기" 명령을 그대로 보낸다
                    slog('HUB', '⚠ 포트 ' + gname + ' 모터의 현재 각도를 읽지 못했어요. 허브 위치 명령으로 대신 보냅니다.');
                    var ap = cmd.deg < 0 ? cmd.deg + 4294967296 : cmd.deg;
                    await send(new Uint8Array([14, 0x00, 0x81, gp, 0x11, 0x0D, ap & 255, (ap >>> 8) & 255, (ap >>> 16) & 255, (ap >>> 24) & 255, spd(cmd.speed), 100, 126, 0x03]));
                } else {
                    // 2) 가장 가까운 방향으로 모자란 만큼만 돌린다 (검증된 "각도만큼 돌리기" 명령)
                    var tgt = ((cmd.deg + 180) % 360 + 360) % 360 - 180;
                    var diff = ((tgt - curA + 540) % 360 + 360) % 360 - 180;
                    slog('HUB', '⚡ 포트 ' + gname + ' 모터: 지금 ' + curA + '° → 목표 ' + cmd.deg + '° (' + (diff >= 0 ? '+' : '') + diff + '°만큼 돌림)');
                    if (Math.abs(diff) >= 1) {
                        var gd2 = Math.round(Math.abs(diff)), sgn = diff > 0 ? 1 : -1;
                        await send(new Uint8Array([14, 0x00, 0x81, gp, 0x11, 0x0B, gd2 & 255, (gd2 >>> 8) & 255, (gd2 >>> 16) & 255, (gd2 >>> 24) & 255, spd(sgn * Math.max(10, cmd.speed)), 100, 126, 0x00]));
                    }
                }
                await sleep(60);
            } else if (cmd.a === 'motor_reset') {
                var rp = cmd.port === null || cmd.port === undefined ? (motorPorts(attached)[0] || 0) : cmd.port;
                slog('HUB', '⚡ 레고 허브 포트 ' + 'ABCDEF'.charAt(rp) + ' 모터 위치를 0으로');
                await send(new Uint8Array([11, 0x00, 0x81, rp, 0x11, 0x51, 0x02, 0, 0, 0, 0]));
                await sleep(60);
            } else if (cmd.a === 'car_deg') {
                slog('HUB', '⚡ 레고 허브 자동차 각도 이동 (왼쪽 ' + cmd.dl + '°, 오른쪽 ' + cmd.dr + '°)');
                var dgs = [[0, cmd.l, cmd.dl], [1, cmd.r, cmd.dr]];
                for (var gi = 0; gi < dgs.length; gi++) {
                    var gp = dgs[gi][0], gs = dgs[gi][1], gd = dgs[gi][2];
                    if (isSensorPort(attached[gp]) || !gd || !gs) continue;
                    // StartSpeedForDegrees: 각도(4바이트), 속도(부호로 방향), 최대 힘 100, 끝나면 브레이크(127), 가감속 없음
                    await send(new Uint8Array([14, 0x00, 0x81, gp, 0x11, 0x0B, gd & 255, (gd >>> 8) & 255, (gd >>> 16) & 255, (gd >>> 24) & 255, spd(gs), 100, 127, 0x00]));
                }
            } else if (cmd.a === 'car' || cmd.a === 'car_stop') {
                slog('HUB', cmd.a === 'car' ? '⚡ 레고 허브 자동차 이동 (왼쪽 ' + cmd.l + ', 오른쪽 ' + cmd.r + ')' : '⚡ 레고 허브 자동차 멈춤');
                for (var p = 0; p < 2; p++) {
                    if (isSensorPort(attached[p])) continue;
                    var val = cmd.a === 'car_stop' ? 0 : (p === 0 ? cmd.l : cmd.r);
                    await send(pkt(p, val));
                    await sleep(60);
                }
            } else if (cmd.a === 'matrix' || cmd.a === 'matrix_clear') {
                slog('HUB', cmd.a === 'matrix' ? '⚡ 레고 허브 라이트 켜기' : '⚡ 레고 허브 라이트 끄기');
                var targets = [];
                if (cmd.port !== null && cmd.port !== undefined) targets.push(cmd.port);          // 포트를 직접 고른 경우
                else {
                    for (var k in attached) { if (Number(attached[k]) === 64) targets.push(Number(k)); }
                    if (!targets.length) targets.push(0, 1);
                }
                var pay = cmd.a === 'matrix' ? cmd.pay : [0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (var ti = 0; ti < targets.length; ti++) {
                    var port = targets[ti];
                    await send(new Uint8Array([10, 0x00, 0x41, port, 0x02, 0x01, 0x00, 0x00, 0x00, 0x01]));
                    await sleep(40);
                    await send(new Uint8Array([16, 0x00, 0x81, port, 0x11, 0x51, 0x02].concat(pay)));
                    await sleep(40);
                }
                var seq = ++lightSeq;
                if (cmd.a === 'matrix' && cmd.dur) {
                    setTimeout(async function () {
                        if (seq !== lightSeq) return;            // 그 사이 다른 조명 명령이 있었거나 정지했으면 건드리지 않는다
                        for (var tj = 0; tj < targets.length; tj++) {
                            try { await send(new Uint8Array([16, 0x00, 0x81, targets[tj], 0x11, 0x51, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0])); } catch (e) { }
                            await sleep(40);
                        }
                    }, cmd.dur * 1000);
                }
            } else if (cmd.a === 'speed_log') {
                sendWS({ action: 'HUB_LOG', msg: '⚡ 모터 속도 설정: ' + cmd.level + '단 (' + cmd.pct + '%)' });
            } else if (cmd.a === 'led') {
                // 허브 가운데 버튼 불빛 (RGB 장치, 색 번호 모드). 허브가 알려 준 포트를 쓰고, 없으면 0x32 → 0x31 을 시도한다.
                var ledPorts = [];
                Object.keys(attached).forEach(function (k) { if (Number(attached[k]) === 23) ledPorts.push(Number(k)); });
                if (!ledPorts.length) ledPorts = [0x32, 0x31];
                slog('HUB', '⚡ 허브 가운데 조명 → 포트 ' + ledPorts.join(', ') + ' (색 번호 ' + cmd.color + ', 연결된 장치: ' + JSON.stringify(attached) + ')');
                for (var lp = 0; lp < ledPorts.length; lp++) {
                    // 모드 0(색 번호)을 먼저 고르고 값을 쓴다
                    await send(new Uint8Array([10, 0x00, 0x41, ledPorts[lp], 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]));
                    await sleep(40);
                    await send(new Uint8Array([8, 0x00, 0x81, ledPorts[lp], 0x11, 0x51, 0x00, cmd.color]));
                    await sleep(40);
                }
            }
        } catch (e) { console.error('[word hub]', e); }
    }

    function fortExec(cmd) {
        if (cmd.a === 'ws') {
            var o = { action: cmd.action, delay: cmd.delay };
            if (cmd.dir) o.dir = cmd.dir;
            if (cmd.val !== undefined) o.val = cmd.val;
            sendWS(o);
            slog('FORTNITE', '🎮 포트나이트 액션 연동 송출: ' + cmd.action);
        }
        else if (cmd.a === 'stop_all') sendWS({ action: 'CLEANUP_KEYS' });
        return Promise.resolve();
    }

    /* ---- 소리 ---- */
    var NOTES = [
        [523, 659, 784], [392, 523, 659], [330, 392, 494], [262, 330, 392],
        [698, 587, 523], [784, 988, 1175], [440, 440, 554], [294, 370, 440]
    ];
    var activeOsc = [];
    function ensureAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { audioCtx = null; }
        return audioCtx;
    }
    function isRecSound(x) { return !!(window.SoundLib && SoundLib.isRec(x)); }
    function soundArg(x) { return isRecSound(x) ? x : num(x, 1); }
    function playSound(n, wait) {
        if (isRecSound(n)) {                                    // 내가 녹음한 소리
            var pr = SoundLib.play(n, { vol: soundFx.vol, pan: soundFx.pan, pitch: soundFx.pitch * 12 });      // 효과값 100 = 한 옥타브
            return wait ? pr : sleep(0);
        }
        if (window.KidMusic) {                                  // 아이들이 좋아하는 노래 1~8
            var kp = KidMusic.play(Math.max(1, Math.min(8, Math.round(n))), { vol: soundFx.vol, pan: soundFx.pan, pitch: soundFx.pitch * 12 });      // 효과값 100 = 한 옥타브
            return wait ? kp : sleep(0);
        }
        var ac = ensureAudio();
        if (!ac) return sleep(0);
        var notes = NOTES[Math.max(0, Math.min(7, n - 1))];
        var pitchMul = Math.pow(2, soundFx.pitch / 100);
        var t0 = ac.currentTime;
        notes.forEach(function (f, i) {
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = 'triangle'; o.frequency.value = f * pitchMul;
            var vol = Math.max(0, Math.min(1, soundFx.vol / 100)) * 0.25;
            g.gain.setValueAtTime(0, t0 + i * 0.2);
            g.gain.linearRampToValueAtTime(vol, t0 + i * 0.2 + 0.02);
            g.gain.linearRampToValueAtTime(0, t0 + i * 0.2 + 0.19);
            var node = g;
            if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, soundFx.pan / 100)); g.connect(pn); node = pn; }
            o.connect(g); node.connect(ac.destination);
            o.start(t0 + i * 0.2); o.stop(t0 + i * 0.2 + 0.2);
            activeOsc.push(o);
        });
        return wait ? sleep(660) : sleep(0);
    }
    function stopSounds() { activeOsc.forEach(function (o) { try { o.stop(); } catch (e) { } }); activeOsc = []; if (window.SoundLib) SoundLib.stop(); if (window.KidMusic) KidMusic.stop(); }

    async function localExec(cmd, token) {
        if (cmd.a === 'sound') await playSound(cmd.n, cmd.wait);
        else if (cmd.a === 'sound_stop') stopSounds();
        else if (cmd.a === 'fx') {
            if (cmd.k === 'vol') soundFx.vol = Math.max(0, Math.min(100, cmd.rel ? soundFx.vol + cmd.d : cmd.d));
            else soundFx[cmd.k] = Math.max(-100, Math.min(100, cmd.rel ? soundFx[cmd.k] + cmd.d : cmd.d));
            if (window.KidMusic) KidMusic.update({ vol: soundFx.vol, pan: soundFx.pan });          // 지금 나오는 소리의 균형/볼륨은 바로 바뀐다
        } else if (cmd.a === 'fx_clear') { soundFx.pitch = 0; soundFx.pan = 0; if (window.KidMusic) KidMusic.update({ vol: soundFx.vol, pan: 0 }); }
        else if (cmd.a === 'log') slog('INFO', '💬 ' + cmd.text);
        else if (cmd.a === 'broadcast') startReceivers(cmd.m, token);
        else if (cmd.a === 'stop_all') halt();
    }

    /* ---------- 실행 ---------- */
    function startReceivers(m, token) {
        stacksSorted().forEach(function (s) {
            var h = hatOf(s);
            if (h && h.type === 'ev_recv' && h.vals.m === m) runStacks([s], token, {}, true);
        });
    }

    function pickStacks(trigger) {
        var all = stacksSorted().filter(hatOf);
        if (trigger.kind === 'gui') {
            return all.filter(function (s) { var t = hatOf(s).type; return t === 'start' || t.indexOf('ev_ai_') === 0; });
        }
        if (trigger.kind === 'ai') {
            return all.filter(function (s) {
                var h = hatOf(s);
                if (h.type !== trigger.hat) return false;
                if (h.type === 'ev_ai_gesture' && h.vals.g !== 'any' && trigger.gesture !== undefined && Number(h.vals.g) !== Number(trigger.gesture)) return false;
                return true;
            });
        }
        return [];
    }

    function runStacks(stacks, token, opts, isSub) {
        var live = [];
        var staticStacks = stacks.filter(function (s) {
            if (isDynamic(s.blocks)) { live.push(runLive(s, token, opts)); return false; }
            return true;
        });
        var results = staticStacks.map(function (s) {
            var c = newCtx({ turns: opts.turns, voiceDir: opts.voiceDir, depth: isSub ? 1 : 0 });
            emitBlocks(s.blocks, c, '');
            return c;
        });
        // 포트나이트/파이썬은 아이콘 모드처럼 스택을 이어 붙인다
        var fort = [], py = '', off = 0;
        results.forEach(function (c) {
            c.fort.forEach(function (it) { var cp = Object.assign({}, it); cp.delay = it.delay + off; fort.push(cp); });
            off += c.fortT;
            py += c.py;
        });
        var conn = connType();

        play(fort, token, fortExec);
        results.forEach(function (c) {
            play(c.local, token, function (cmd) { return localExec(cmd, token); });
            if (conn === 'BLE') play(c.ble, token, hubExec);
        });
        if (conn === 'USB' && !isSub) {
            (async function () {
                var hw = hubWin();
                try {
                    await hw.writeToHub('\x03\x03');
                    await hw.writeToHub('\x01');
                    await hw.writeToHub(PY_HEADER + py);
                    await hw.writeToHub('\x04');
                } catch (e) { console.error('[word usb]', e); }
            })();
        }
        var total = 0, hasForever = false;
        results.forEach(function (c) {
            total = Math.max(total, c.bleT, c.fortT);
            [c.ble, c.local, c.fort].forEach(function (q) { q.forEach(function (it) { if (it.a === 'forever') hasForever = true; }); });
        });
        return { total: total, forever: hasForever, conn: conn, count: stacks.length, live: live };
    }

    var PY_HEADER = 'import hub, utime, math\nglobal_motor_speed = 40\n\n' +
        'def rm(v):\n  try:\n    import motor\n    try: motor.set_duty_cycle(0, int(v * 100))\n    except:\n      try: motor.run(0, int(v * 100))\n      except: pass\n  except:\n    pA = getattr(hub.port, \'A\', None)\n    if pA and hasattr(pA, \'motor\'):\n      try: pA.motor.pwm(int(v))\n      except: pass\n\n' +
        'def sm():\n  try:\n    import motor\n    for i in range(6):\n      try: motor.stop(i)\n      except: pass\n  except:\n    for p in [getattr(hub.port, x, None) for x in [\'A\',\'B\',\'C\',\'D\',\'E\',\'F\']]:\n      try:\n        if p and hasattr(p, \'motor\'):\n          p.motor.pwm(0)\n      except: pass\n\n' +
        'def dm(v0, v1):\n  try:\n    import motor\n    try: motor.set_duty_cycle(0, int(v0 * 100))\n    except:\n      try: motor.run(0, int(v0 * 100))\n      except: pass\n    try: motor.set_duty_cycle(1, int(v1 * 100))\n    except:\n      try: motor.run(1, int(v1 * 100))\n      except: pass\n  except:\n    pA = getattr(hub.port, \'A\', None)\n    pB = getattr(hub.port, \'B\', None)\n    if pA and hasattr(pA, \'motor\'):\n      try: pA.motor.pwm(int(v0))\n      except: pass\n    if pB and hasattr(pB, \'motor\'):\n      try: pB.motor.pwm(int(v1))\n      except: pass\n\n' +
        'print("BrickSync Sandbox Run")\n';

    function setRunning(on) {
        running = on;
        try {
            var rb = document.querySelector('.run-btn');
            if (rb) { rb.classList.toggle('is-running', !!on); rb.setAttribute('aria-busy', on ? 'true' : 'false'); }
        } catch (e) { }
        window.isBlockExecutionRunning = on;
        try { if (window.parent && window.parent !== window) window.parent.isBlockExecutionRunning = on; } catch (e) { }
    }

    // 허브/포트나이트에 나가 있는 모든 출력을 끈다 (모터, 조명, 소리, 가상 키)
    async function stopHardware() {
        lightSeq++;
        stopSounds();
        sendWS({ action: 'CLEANUP_KEYS' });
        var conn = connType();
        var hw = hubWin();
        try {
            if (conn === 'BLE') {
                var attached = hw.hubDevices || {};
                var ports = Object.keys(attached).map(Number).filter(function (p) { return p >= 0 && p < 6; });
                if (!ports.length) ports = [0, 1, 2, 3, 4, 5];
                for (var i = 0; i < ports.length; i++) {
                    await hw.writeToHub(new Uint8Array([8, 0, 0x81, ports[i], 0x10, 0x51, 0x00, 0])).catch(function () { });
                    await sleep(30);
                }
                // 3x3 조명도 끈다
                var lights = Object.keys(attached).filter(function (k) { return Number(attached[k]) === 64; }).map(Number);
                for (var li = 0; li < lights.length; li++) {
                    await hw.writeToHub(new Uint8Array([10, 0x00, 0x41, lights[li], 0x02, 0x01, 0x00, 0x00, 0x00, 0x01])).catch(function () { });
                    await sleep(40);
                    await hw.writeToHub(new Uint8Array([16, 0x00, 0x81, lights[li], 0x11, 0x51, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0])).catch(function () { });
                    await sleep(40);
                }
            } else if (conn === 'USB') {
                await hw.writeToHub('\x03\x03\x01import motor\ntry:\n for i in range(6):\n  try: motor.stop(i)\n  except: pass\nexcept: pass\ntry:\n import color_matrix\n for p in range(6):\n  try: color_matrix.clear(p)\n  except: pass\nexcept: pass\n\x04');
            }
        } catch (e) { }
    }

    async function halt() {
        slog('INFO', '■ 정지');
        counter++;
        clearTimeout(finishTimer);
        disarmSensors();
        setRunning(false);
        await stopHardware();
    }

    /* ---------- 센서 상태 / 값 계산 / 센서 이벤트 ---------- */
    // 부모 창은 건드리지 않고, 허브 수신 이벤트를 읽기만 한다.
    var SENSOR_COLOR_ID = { pink: 1, violet: 2, blue: 3, azure: 4, green: 6, yellow: 7, orange: 8, red: 9, white: 10, none: -1 };
    // 실제 브릭에서 센서가 내놓는 번호: 초록 브릭은 허브가 '청록(5)'으로 알려 주므로 초록은 5, 6 둘 다 받는다
    var SENSOR_COLOR_ACCEPT = { green: [5, 6] };
    function colorIs(name, val) { var a = SENSOR_COLOR_ACCEPT[name]; return a ? a.indexOf(val) >= 0 : SENSOR_COLOR_ID[name] === val; }
    var TILT_THRESHOLD = 160;                      // 차 조종(app.html)과 같은 기준
    var sensors = { apos: {}, armed: null, listener: null, chr: null, lastColor: {}, init: null, cand: null, frames: 0, stable: 'CENTER', timers: [], busy: {}, mode: 0, modeAt: 0, modeList: [], near: {} };
    var sensorState = { color: -1, tilt: 'CENTER', reflect: 0, ambient: 0, force: 0, dist: 200 };
    // 색 센서 모드(LWP3): 0 색 번호, 1 반사 빛(%), 2 주변 빛(%). 한 번에 한 모드만 받을 수 있다.
    var MODE_SWITCH_MS = 350, MODE_SETTLE_MS = 140;
    var env = { vars: {}, lists: {}, timerStart: 0 };
    function clock() { return (window.WORD_CLOCK || Date.now)(); }

    function eventStacks(type) { return stacksSorted().filter(function (s) { var h = hatOf(s); return h && h.type === type; }); }

    function fireEvent(stack, token) {
        if (token.id !== counter || sensors.busy[stack.id]) return;
        sensors.busy[stack.id] = true;
        var info = runStacks([stack], token, {}, true);
        var release = function () { sensors.busy[stack.id] = false; };
        if (info.live.length) { Promise.all(info.live).then(release); return; }
        if (info.forever) return;                 // 무한 반복이면 정지할 때까지 계속
        setTimeout(release, info.total + 300);
    }

    function onHubData(ev) {
        var v = ev.target && ev.target.value;
        if (v && v.byteLength >= 5 && v.getUint8(2) === 0x05) {          // 허브가 명령을 거절했을 때
            var errNames = { 1: 'ACK', 2: 'MACK', 3: '버퍼 넘침', 4: '시간 초과', 5: '모르는 명령', 6: '잘못된 사용', 7: '과전류', 8: '허브 내부 오류' };
            slog('HUB', '⚠ 허브 오류: 명령 0x' + v.getUint8(3).toString(16) + ' → ' + (errNames[v.getUint8(4)] || ('코드 ' + v.getUint8(4))));
            return;
        }
        if (!v || v.byteLength < 5 || v.getUint8(2) !== 0x45) return;
        var token = sensors.armed && sensors.armed.id === counter ? sensors.armed : null;
        var port = v.getUint8(3);
        var hw = hubWin();
        if ((port === 97 || port === 99) && v.byteLength >= 8) {
            var x = v.getInt16(4, true), y = v.getInt16(6, true);
            if (sensors.init === null) { sensors.init = { x: x, y: y }; return; }
            var ax = x - sensors.init.x, ay = y - sensors.init.y, st = 'CENTER';
            if (ay > TILT_THRESHOLD) st = 'front'; else if (ay < -TILT_THRESHOLD) st = 'back';
            else if (ax > TILT_THRESHOLD) st = 'right'; else if (ax < -TILT_THRESHOLD) st = 'left';
            if (sensors.cand === st) sensors.frames++; else { sensors.cand = st; sensors.frames = 1; }
            if (sensors.frames >= 3 && sensors.stable !== st) {
                sensors.stable = st;
                sensorState.tilt = st;
                if (token && st !== 'CENTER') eventStacks('ev_tilt').forEach(function (s) { if (hatOf(s).vals.t === st) fireEvent(s, token); });
            }
        } else if (port < 6 && Number((hw.hubDevices || {})[port]) === 63) {
            // 프라임 힘 센서: 눌린 세기(0이면 안 눌림). 프라임 장비로는 아직 실측하지 못한 기본 구현이다
            var fv = v.getUint8(4), wasPressed = sensorState.force > 0;
            sensorState.force = fv;
            if ((fv > 0) !== wasPressed && token) eventStacks('ev_force').forEach(function (s) {
                var wantReleased = hatOf(s).vals.s === 'released';
                if (wantReleased === !(fv > 0)) fireEvent(s, token);
            });
        } else if (port < 6 && Number((hw.hubDevices || {})[port]) === 62) {
            // 프라임 거리 센서: mm (0, 2000 이상은 물체 없음) → cm로 바꿔 보관
            var rawMm = v.byteLength >= 6 ? v.getUint16(4, true) : v.getUint8(4);
            var cmNow = (rawMm > 0 && rawMm < 2000) ? rawMm / 10 : 200;
            sensorState.dist = cmNow;
            if (token) eventStacks('ev_distance').forEach(function (s) {
                var near = cmNow <= num(hatOf(s).vals.cm, 20);
                if (near && !sensors.near[s.id]) fireEvent(s, token);
                sensors.near[s.id] = near;
            });
        } else if (port < 6 && Number((hw.hubDevices || {})[port]) === 61 && sensors.mode !== 0) {
            // 색 센서를 반사/주변 빛 모드로 읽는 중: 길이가 달라도 값을 읽고, 원시 값을 통신 로그에 남긴다
            if (sensors.modeList.length > 1 && clock() - sensors.modeAt < MODE_SETTLE_MS) return;
            var rv = v.byteLength >= 6 ? v.getUint16(4, true) : v.getUint8(4);
            if (sensors.mode === 1) sensorState.reflect = rv; else if (sensors.mode === 2) sensorState.ambient = rv;
            var nowT = clock();
            if (!sensors.lastLog || nowT - sensors.lastLog > 700) {
                sensors.lastLog = nowT;
                var raw = []; for (var bi = 0; bi < v.byteLength; bi++) raw.push(v.getUint8(bi).toString(16).padStart(2, '0'));
                slog('HUB', '🎨 색 센서(포트 ' + 'ABCDEF'.charAt(port) + ') ' + (sensors.mode === 1 ? '반사 빛' : '주변 빛') + ' = ' + rv + '   [원시 ' + raw.join(' ') + ']');
            }
        } else if (port < 6 && v.byteLength === 6) {
            sensors.apos[port] = v.getInt16(4, true);                       // 모터 절대 각도(APOS)
        } else if (port < 6 && v.byteLength === 5) {
            if (Number((hw.hubDevices || {})[port]) !== 61) return;        // 색 센서만
            if (sensors.modeList.length > 1 && clock() - sensors.modeAt < MODE_SETTLE_MS) return;     // 모드를 막 바꾼 직후의 옛 값은 버린다
            if (sensors.mode === 1) { sensorState.reflect = v.getUint8(4); return; }
            if (sensors.mode === 2) { sensorState.ambient = v.getUint8(4); return; }
            var val = v.getInt8(4);
            if (sensors.lastColor[port] === val) return;
            sensors.lastColor[port] = val;
            sensorState.color = val;
            if (token) eventStacks('ev_color').forEach(function (s) {
                if (colorIs(hatOf(s).vals.c, val)) fireEvent(s, token);
            });
        }
    }

    // 색 센서에 모드를 바꾸라고 알린다
    function setColorMode(mode) {
        var hw = hubWin(), attached = hw.hubDevices || {};
        sensors.mode = mode; sensors.modeAt = clock();
        if (connType() !== 'BLE' || typeof hw.writeToHub !== 'function') return;
        var found = Object.keys(attached).filter(function (k) { return Number(attached[k]) === 61; });
        slog('HUB', '🎨 색 센서 모드 ' + mode + ' (' + ['색 번호', '반사 빛', '주변 빛'][mode] + ') 설정 → ' + (found.length ? '포트 ' + found.map(function (k) { return 'ABCDEF'.charAt(Number(k)); }).join(', ') : '색 센서를 찾지 못했어요 (연결된 장치: ' + JSON.stringify(attached) + ')'));
        Object.keys(attached).forEach(function (k) {
            if (Number(attached[k]) === 61) hw.writeToHub(new Uint8Array([10, 0, 0x41, Number(k), mode, 1, 0, 0, 0, 1])).catch(function () { });
        });
    }
    function scanTypes(list, acc) {
        (list || []).forEach(function (n) {
            if (!n) return;
            acc[n.type] = true;
            if (n.vals) Object.keys(n.vals).forEach(function (k) { var x = n.vals[k]; if (x && typeof x === 'object' && x.type) scanTypes([x], acc); });
            if (n.kids) scanTypes(n.kids, acc);
            if (n.kids2) scanTypes(n.kids2, acc);
        });
    }
    // 프로그램이 쓰는 색 센서 값(색/반사/주변)에 맞춰 모드를 정한다. 여러 개를 쓰면 번갈아 읽는다.
    function setupSensorModes() {
        var used = {};
        stacksSorted().forEach(function (s) { scanTypes(s.blocks, used); });
        var needColor = used.sn_color || used.sn_color_is || used.ev_color;
        try {
            var devs = hubWin().hubDevices || {}, has = function (id) { return Object.keys(devs).some(function (k) { return Number(devs[k]) === id; }); };
            if ((used.sn_force || used.sn_force_is || used.ev_force) && !has(63)) slog('HUB', '🔘 힘 센서를 찾지 못했어요 (프라임 힘 센서가 허브에 꽂혀 있는지 확인해 주세요)');
            if ((used.sn_distance || used.ev_distance) && !has(62)) slog('HUB', '📡 거리 센서를 찾지 못했어요 (프라임 거리 센서가 허브에 꽂혀 있는지 확인해 주세요)');
        } catch (e) { }
        var list = [];
        if (needColor) list.push(0);
        if (used.sn_reflect) list.push(1);
        if (used.sn_ambient) list.push(2);
        sensors.modeList = list;
        if (!list.length || (list.length === 1 && list[0] === 0)) return;          // 색 번호만 쓰면 기본 모드 그대로
        var i = 0;
        setColorMode(list[0]);
        if (list.length > 1) {
            sensors.timers.push(setInterval(function () { i = (i + 1) % list.length; setColorMode(list[i]); }, MODE_SWITCH_MS));
        }
    }

    function attachSensors() {
        if (sensors.listener) return;
        var chr = window.parent && window.parent.txCharacteristic;
        if (connType() === 'BLE' && chr) {
            sensors.chr = chr; sensors.listener = onHubData;
            chr.addEventListener('characteristicvaluechanged', onHubData);
        }
    }

    function disarmSensors() {
        sensors.armed = null;
        sensors.timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        sensors.timers = [];
        sensors.busy = {};
        sensors.init = null; sensors.cand = null; sensors.frames = 0; sensors.stable = 'CENTER'; sensors.lastColor = {}; sensors.apos = {};
        sensorState.color = -1; sensorState.tilt = 'CENTER'; sensorState.reflect = 0; sensorState.ambient = 0; sensorState.force = 0; sensorState.dist = 200; sensors.near = {};
        if (sensors.mode !== 0) { try { setColorMode(0); } catch (e) { } }          // 색 번호 모드로 되돌린다
        sensors.modeList = [];
        if (sensors.chr && sensors.listener) { try { sensors.chr.removeEventListener('characteristicvaluechanged', sensors.listener); } catch (e) { } }
        sensors.chr = null; sensors.listener = null;
    }

    // 실행 버튼을 누르면 이벤트 스택들이 대기 상태가 된다. 정지하면 해제.
    function armEvents(token) {
        var colors = eventStacks('ev_color'), tilts = eventStacks('ev_tilt'), timers = eventStacks('ev_timer'), conds = eventStacks('ev_cond');
        var forces = eventStacks('ev_force').length + eventStacks('ev_distance').length;
        var unsupported = eventStacks('ev_up').length + eventStacks('ev_gesture').length;
        var armed = colors.length + tilts.length + timers.length + conds.length + forces;
        if (!armed && !unsupported) return 0;
        sensors.armed = token;
        timers.forEach(function (s) {
            var sec = num(hatOf(s).vals.n, 10);
            sensors.timers.push(setTimeout(function () { fireEvent(s, token); }, sec * 1000));
        });
        conds.forEach(function (s) {            // 조건이 거짓 → 참이 되는 순간 실행
            var was = false;
            sensors.timers.push(setInterval(function () {
                if (token.id !== counter) return;
                var now = false;
                try { now = truthy(evalSlot(hatOf(s).vals.c)); } catch (e) { }
                if (now && !was) fireEvent(s, token);
                was = now;
            }, 100));
        });
        if ((colors.length + tilts.length + forces) && !sensors.listener && window.wToast) {
            window.wToast(lang() === 'en' ? 'Sensor events work with a Bluetooth hub connection.' : '센서 이벤트는 블루투스로 허브를 연결해야 동작해요.');
        }
        if (unsupported && window.wToast) {
            window.wToast(lang() === 'en' ? 'This hub event is not ready yet.' : '허브 방향/흔들기 이벤트는 아직 준비 중이에요.');
        }
        return armed;
    }

    /* ---------- 값 / 조건 계산 ---------- */
    // fr: 내 블록을 실행하는 동안의 입력 값들 { a0: 값, a1: 값 ... }
    function toNum(x) { var n = parseFloat(x); return isNaN(n) ? 0 : n; }
    function truthy(x) { return x === true || (typeof x === 'number' && x !== 0) || x === 'true'; }
    function isNode(v) { return !!(v && typeof v === 'object' && v.type); }
    function evalSlot(v, fr) { return isNode(v) ? evalNode(v, fr) : v; }
    function deg(r) { return r * 180 / Math.PI; }
    function rad(d) { return d * Math.PI / 180; }
    function listOf(name) { if (!env.lists[name]) env.lists[name] = []; return env.lists[name]; }
    function same(a, b) {
        if (isNaN(parseFloat(a)) || isNaN(parseFloat(b))) return String(a).toLowerCase() === String(b).toLowerCase();
        return toNum(a) === toNum(b);
    }

    function evalNode(n, fr) {
        var v = n.vals || {};
        var E = function (k) { return evalSlot(v[k], fr); };
        switch (n.type) {
            case 'op_random': {
                var a = toNum(E('a')), b = toNum(E('b'));
                if (a > b) { var tmp = a; a = b; b = tmp; }
                if (a % 1 === 0 && b % 1 === 0) return a + Math.floor(Math.random() * (b - a + 1));
                return Math.round((a + Math.random() * (b - a)) * 100) / 100;
            }
            case 'op_add': return toNum(E('a')) + toNum(E('b'));
            case 'op_sub': return toNum(E('a')) - toNum(E('b'));
            case 'op_mul': return toNum(E('a')) * toNum(E('b'));
            case 'op_div': { var d = toNum(E('b')); return d === 0 ? 0 : toNum(E('a')) / d; }
            case 'op_mod': { var m = toNum(E('b')); return m === 0 ? 0 : ((toNum(E('a')) % m) + m) % m; }
            case 'op_round': return Math.round(toNum(E('a')));
            case 'op_math': {
                var x = toNum(E('a'));
                switch (v.f) {
                    case 'abs': return Math.abs(x);
                    case 'floor': return Math.floor(x);
                    case 'ceiling': return Math.ceil(x);
                    case 'sqrt': return x < 0 ? 0 : Math.sqrt(x);
                    case 'sin': return Math.round(Math.sin(rad(x)) * 1e6) / 1e6;
                    case 'cos': return Math.round(Math.cos(rad(x)) * 1e6) / 1e6;
                    case 'tan': return Math.round(Math.tan(rad(x)) * 1e6) / 1e6;
                    case 'asin': return deg(Math.asin(x)) || 0;
                    case 'acos': return deg(Math.acos(x)) || 0;
                    case 'atan': return deg(Math.atan(x));
                    case 'ln': return x <= 0 ? 0 : Math.log(x);
                    case 'log': return x <= 0 ? 0 : Math.log10(x);
                    case 'e^': return Math.exp(x);
                    case '10^': return Math.pow(10, x);
                }
                return 0;
            }
            case 'op_join': return String(E('a')) + String(E('b'));
            case 'op_letter': return String(E('s')).charAt(Math.round(toNum(E('n'))) - 1);
            case 'op_length': return String(E('s')).length;
            case 'op_lt': return toNum(E('a')) < toNum(E('b'));
            case 'op_gt': return toNum(E('a')) > toNum(E('b'));
            case 'op_eq': return same(E('a'), E('b'));
            case 'op_and': return truthy(E('a')) && truthy(E('b'));
            case 'op_or': return truthy(E('a')) || truthy(E('b'));
            case 'op_not': return !truthy(E('a'));
            case 'op_between': { var q = toNum(E('a')); return q >= toNum(E('lo')) && q <= toNum(E('hi')); }
            case 'op_contains': return String(E('s')).toLowerCase().indexOf(String(E('t')).toLowerCase()) >= 0;
            case 'sn_color_is': return colorIs(v.c, sensorState.color);
            case 'sn_color': return sensorState.color;
            case 'sn_reflect': return sensorState.reflect;
            case 'sn_ambient': return sensorState.ambient;
            case 'sn_tilted': return sensorState.tilt === v.t;
            case 'sn_force_is': return sensorState.force > 0;
            case 'sn_force': return sensorState.force;
            case 'sn_distance': return sensorState.dist;
            case 'sn_timer': return Math.round((clock() - env.timerStart) / 100) / 10;
            case 'var': return env.vars[v.name] !== undefined ? env.vars[v.name] : 0;
            case 'lst_val': return listOf(v.l).join(' ');
            case 'lst_item': { var arr = listOf(v.l), ix = Math.round(toNum(E('n'))); return ix >= 1 && ix <= arr.length ? arr[ix - 1] : ''; }
            case 'lst_index': { var tx = E('x'), ar2 = listOf(v.l); for (var i = 0; i < ar2.length; i++) if (same(ar2[i], tx)) return i + 1; return 0; }
            case 'lst_length': return listOf(v.l).length;
            case 'lst_contains': { var tx2 = E('x'); return listOf(v.l).some(function (it) { return same(it, tx2); }); }
            case 'my_param_v': case 'my_param_b': return fr && fr[v.pid] !== undefined ? fr[v.pid] : (n.type === 'my_param_b' ? false : 0);
        }
        return 0;
    }

    /* ---------- 실행 중 계산이 필요한 스택은 블록을 하나씩 실행 ---------- */
    var DYN_TYPES = {
        ct_if: 1, ct_if_else: 1, ct_wait_until: 1, ct_repeat_until: 1, var_set: 1, var_change: 1, sn_reset_timer: 1,
        lst_add: 1, lst_delete: 1, lst_clear: 1, lst_insert: 1, lst_replace: 1
    };
    function isDynamic(list) {
        return (list || []).some(function (n) {
            if (DYN_TYPES[n.type] || n.type.indexOf('my_call_') === 0) return true;
            var inSlots = Object.keys(n.vals || {}).some(function (k) { return isNode(n.vals[k]); });
            return inSlots || isDynamic(n.kids) || isDynamic(n.kids2);
        });
    }

    // 블록의 칸 값을 지금 계산해서 숫자/글자로 바꾼 복사본
    function resolveNode(n, fr) {
        var def = WB.byType[n.type], vals = {};
        Object.keys(def.slots).forEach(function (k) {
            var raw = evalSlot(n.vals[k], fr), kind = def.slots[k].kind;
            if (kind === 'num' || kind === 'steer') vals[k] = (n.vals[k] !== undefined && isNode(n.vals[k])) ? toNum(raw) : raw;
            else vals[k] = raw;
        });
        return { type: n.type, vals: vals };
    }

    // 내 블록 정의(모자 아래 블록들) 찾기
    function findDefinition(id) {
        var st = stacksSorted().filter(function (s) { var h = hatOf(s); return h && h.type === 'my_def_' + id; })[0];
        return st ? st.blocks.slice(1) : null;
    }

    async function execLive(list, rt) {
        var fr = rt.frame;
        for (var i = 0; i < list.length; i++) {
            if (rt.token.id !== counter) return 'stop';
            var node = list[i], t = node.type, v = node.vals || {};
            var sig = null;
            if (t === 'ct_if' || t === 'ct_if_else') {
                if (truthy(evalSlot(v.c, fr))) sig = await execLive(node.kids || [], rt);
                else if (t === 'ct_if_else') sig = await execLive(node.kids2 || [], rt);
            } else if (t === 'repeat') {
                var times = Math.max(0, Math.round(toNum(evalSlot(v.n, fr))));
                for (var r = 0; r < times && !sig; r++) sig = await execLive(node.kids || [], rt);
            } else if (t === 'forever') {
                while (!sig && rt.token.id === counter) { sig = await execLive(node.kids || [], rt); await sleep(30); }
            } else if (t === 'ct_repeat_until') {
                while (!sig && rt.token.id === counter && !truthy(evalSlot(v.c, fr))) { sig = await execLive(node.kids || [], rt); await sleep(30); }
            } else if (t === 'ct_wait_until') {
                while (rt.token.id === counter && !truthy(evalSlot(v.c, fr))) await sleep(60);
            } else if (t === 'wait') {
                await sleep(Math.max(0, toNum(evalSlot(v.n, fr))) * 1000);
            } else if (t === 'var_set') {
                env.vars[v.name] = evalSlot(v.v, fr);
            } else if (t === 'var_change') {
                env.vars[v.name] = toNum(env.vars[v.name]) + toNum(evalSlot(v.v, fr));
            } else if (t === 'sn_reset_timer') {
                env.timerStart = clock();
            } else if (t === 'lst_add') {
                listOf(v.l).push(evalSlot(v.x, fr));
            } else if (t === 'lst_delete') {
                var arr = listOf(v.l), di = Math.round(toNum(evalSlot(v.n, fr)));
                if (di >= 1 && di <= arr.length) arr.splice(di - 1, 1);
            } else if (t === 'lst_clear') {
                env.lists[v.l] = [];
            } else if (t === 'lst_insert') {
                var arr2 = listOf(v.l), ii = Math.max(1, Math.min(arr2.length + 1, Math.round(toNum(evalSlot(v.n, fr)))));
                arr2.splice(ii - 1, 0, evalSlot(v.x, fr));
            } else if (t === 'lst_replace') {
                var arr3 = listOf(v.l), ri = Math.round(toNum(evalSlot(v.n, fr)));
                if (ri >= 1 && ri <= arr3.length) arr3[ri - 1] = evalSlot(v.x, fr);
            } else if (t.indexOf('my_call_') === 0) {
                var body = findDefinition(t.slice(8));
                var depth = rt.depth || 0;
                if (body && depth < 40) {
                    var args = {};
                    Object.keys(v).forEach(function (k) { args[k] = evalSlot(v[k], fr); });
                    var sub = { token: rt.token, turns: rt.turns, voiceDir: rt.voiceDir, ctx: rt.ctx, frame: args, depth: depth + 1 };
                    sig = await execLive(body, sub);
                    if (sig === 'break') sig = null;
                }
            } else if (t === 'ct_stop_other') {
                // 이 실행 안에서는 다른 스택이 따로 돌지 않으므로 할 일이 없다
            } else if (t === 'ct_stop') {
                if (v.m === 'this') return 'break';
                halt();
                return 'stop';
            } else if (WB.byType[t] && !WB.byType[t].hat && (WB.byType[t].shape || 'stack') === 'stack') {
                var seg = newCtx({ turns: rt.turns, voiceDir: rt.voiceDir, depth: 1 });
                seg.speed = rt.ctx.speed; seg.light = rt.ctx.light; seg.fortLit = rt.ctx.fortLit; seg.wheelMm = rt.ctx.wheelMm;
                emitOne(resolveNode(node, fr), seg, '');
                rt.ctx.wheelMm = seg.wheelMm;
                rt.ctx.speed = seg.speed; rt.ctx.light = seg.light; rt.ctx.fortLit = seg.fortLit;
                playSegment(seg, rt.token);
                var span = Math.max(seg.bleT, seg.fortT);
                if (span > 0) await sleep(span);
            }
            if (sig) return sig;
        }
        return null;
    }

    function playSegment(c, token) {
        play(c.fort, token, fortExec);
        play(c.local, token, function (cmd) { return localExec(cmd, token); });
        if (connType() === 'BLE') play(c.ble, token, hubExec);
    }

    function runLive(stack, token, opts) {
        var rt = { token: token, turns: opts.turns, voiceDir: opts.voiceDir, ctx: newCtx({ turns: opts.turns, voiceDir: opts.voiceDir }), frame: null, depth: 0 };
        return execLive(stack.blocks, rt).then(function () { return true; });
    }

    var finishTimer = null;

    // trigger: {kind:'gui'} | {kind:'ai', hat:'ev_ai_gesture', gesture:0, turns:3}
    async function run(trigger) {
        trigger = trigger || { kind: 'gui' };
        var picked = pickStacks(trigger);
        var hasEventHats = trigger.kind === 'gui' && stacksSorted().some(function (s) { var h = hatOf(s); return h && ['ev_color', 'ev_tilt', 'ev_timer', 'ev_up', 'ev_gesture', 'ev_cond', 'ev_force', 'ev_distance'].indexOf(h.type) >= 0; });
        if (!picked.length && !hasEventHats) {
            if (trigger.kind === 'gui' && window.wToast) {
                window.wToast(lang() === 'en' ? 'Add a "when started" block first.' : '먼저 "시작하면" 블록을 연결해 주세요.');
            }
            return false;
        }
        // 제스처 인식은 이미 실행 중이면 무시, 음성 명령은 새 명령으로 바꿔 실행
        if (running && trigger.kind === 'ai' && trigger.hat !== 'ev_ai_voice') return false;
        var wasRunning = running;
        counter++;
        var token = { id: counter };
        clearTimeout(finishTimer);
        if (wasRunning) await stopHardware();
        if (trigger.kind === 'gui') { disarmSensors(); env.vars = {}; env.lists = {}; soundFx.pitch = 0; soundFx.pan = 0; soundFx.vol = 100; }      // 실행할 때마다 소리 효과는 처음 값으로
        env.timerStart = clock();
        attachSensors();
        setRunning(true);
        ensureAudio();
        slog('INFO', trigger.kind === 'gui' ? '▶ 실행 시작' : '▶ AI 신호로 실행 시작');
        var info = picked.length ? runStacks(picked, token, { turns: trigger.turns, voiceDir: trigger.voiceDir }, false)
            : { total: 0, forever: false, conn: connType(), count: 0, live: [] };
        if (trigger.kind === 'gui') setupSensorModes();
        var armedCount = trigger.kind === 'gui' ? armEvents(token) : 0;
        if (info.conn === null && window.wToast) {
            window.wToast(lang() === 'en' ? 'No hub connected: sending Fortnite signals only.' : '허브가 연결되지 않아 포트나이트 신호만 보냅니다.');
        }
        if (!info.forever && !armedCount) {
            var finish = function () {
                if (token.id !== counter) return;
                setRunning(false);
                if (window.WORD_MISSION && window.WORD_MISSION.onRunFinished) window.WORD_MISSION.onRunFinished();
            };
            var statics = new Promise(function (res) { finishTimer = setTimeout(res, info.total + 800); });
            Promise.all([statics].concat(info.live)).then(finish);
        }
        return true;
    }

    /* ---------- AI 인식 → 이벤트 스택 실행 ---------- */
    function parseTurns(text) {
        var l = String(text || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        var n = 1;
        if (/\b(triple|thrice)\b/.test(l) || l.indexOf('세 배') >= 0 || l.indexOf('3배') >= 0) n = 3;
        else if (/\b(twice|double)\b/.test(l) || l.indexOf('두 배') >= 0 || l.indexOf('2배') >= 0) n = 2;
        else if (/\b(once|single)\b/.test(l) || l.indexOf('한 배') >= 0 || l.indexOf('1배') >= 0) n = 1;
        else if (/다섯\s*(바퀴|번|회)?|5\s*(바퀴|번|회)|오\s*(회|바퀴)/.test(l) || /\b(five|5th)\b/.test(l) || l.indexOf('5 times') >= 0 || l.indexOf('5 turns') >= 0) n = 5;
        else if (/네\s*(바퀴|번|회)?|넷\s*(바퀴|번|회)?|4\s*(바퀴|번|회)|사\s*(회|바퀴)/.test(l) || /\b(four|4th)\b/.test(l) || l.indexOf('4 times') >= 0 || l.indexOf('4 turns') >= 0) n = 4;
        else if (/세\s*(바퀴|번|회)?|셋\s*(바퀴|번|회)?|3\s*(바퀴|번|회)|삼\s*(회|바퀴)/.test(l) || /\b(three|3rd)\b/.test(l) || l.indexOf('3 times') >= 0 || l.indexOf('3 turns') >= 0) n = 3;
        else if (/두\s*(바퀴|번|회)?|둘\s*(바퀴|번|회)?|2\s*(바퀴|번|회)|이\s*(회|바퀴)/.test(l) || /\b(two|2nd)\b/.test(l) || l.indexOf('2 times') >= 0 || l.indexOf('2 turns') >= 0) n = 2;
        else if (/한\s*(바퀴|번|회)?|하나\s*(바퀴|번|회)?|1\s*(바퀴|번|회)|일\s*(회|바퀴)/.test(l) || /\b(one|1st)\b/.test(l) || l.indexOf('1 time') >= 0 || l.indexOf('1 turn') >= 0) n = 1;
        else { var m = l.match(/\d+/); if (m) n = parseInt(m[0], 10); }
        if (isNaN(n) || n < 1) n = 1;
        return Math.min(10, n);
    }

    window.addEventListener('wordai:gesture', function (e) {
        var id = e.detail.id;
        slog('AI', '👾 AI 이미지 인식 성공: ' + (e.detail.label || id));
        slog('TRIGGER', '🚀 AI 이벤트 블록 실행 요청 (' + (unit === '8' ? 'ev_ai_vision' : 'ev_ai_gesture') + ')');
        if (unit === '6') run({ kind: 'ai', hat: 'ev_ai_gesture', gesture: id });
        else if (unit === '8' && id === 0) run({ kind: 'ai', hat: 'ev_ai_vision' });
    });
    // 음성의 방향: 뒤/반시계/후진 등이 들어 있으면 1(뒤로), 아니면 0(앞으로)
    function parseDirection(text) {
        var l = String(text || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        var back = ['뒤', '후진', '반시계', '거꾸로', '역방향', 'backward', 'backwards', 'back', 'counter clockwise', 'counterclockwise', 'reverse', 'ccw', 'left'];
        return back.some(function (p) { return l.indexOf(p) >= 0; }) ? 1 : 0;
    }
    window.addEventListener('wordai:voice', function (e) {
        slog('AI', '🗣️ 음성/텍스트 명령어 수신: "' + e.detail.text + '"');
        slog('TRIGGER', '🚀 AI 이벤트 블록 실행 요청 (ev_ai_voice)');
        run({ kind: 'ai', hat: 'ev_ai_voice', turns: parseTurns(e.detail.text), voiceDir: parseDirection(e.detail.text) });
    });
    // 화면을 떠나면(다른 페이지로 이동) 실행 중이던 출력도 끈다
    window.addEventListener('pagehide', function () { if (running) halt(); });

    window.WORD_RUNTIME = {
        run: run, stop: halt,
        isRunning: function () { return running; },
        compileForTest: function (stackBlocks, opts) {            // 검증용: 한 스택의 신호 목록
            var c = newCtx(opts); emitBlocks(stackBlocks, c, ''); return c;
        },
        playForTest: function (queue) { var tk = { id: counter }; return play(queue, tk, hubExec); },      // 검증용: 허브 명령 목록을 실제 재생 경로로 실행
        parseTurns: parseTurns
    };
})();
