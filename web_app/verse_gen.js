/* BrickSync → UEFN Verse 변환기
 *  - 워드 블록(JSON)과 아이콘 블록(화면 DOM)을 같은 중간 형태(노드)로 바꾼 뒤, 하나의 규칙으로 Verse 코드를 만든다.
 *  - 결과: { lines: [ { t: '코드 한 줄', r: [블록 id, ...], k: 'code'|'comment'|'blank' } ], text }
 *    r[0] 은 그 줄을 만든 블록 자신, 뒤는 감싸고 있는 블록들과 칸에 끼워 넣은 값 블록들 (마우스 올리기 연결용).
 *  - 레고 허브 장치는 UEFN 장치(creative_prop, customizable_light_device, audio_player_device ...) 호출 형태로 옮긴다.
 *  - 학습용 예시 코드이다. 장치 이름/연결은 UEFN 에디터에서 직접 맞춰야 한다.
 */
(function () {
    'use strict';

    var lang = function () { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } };
    var c = function (ko, en) { return lang() === 'en' ? en : ko; };
    function isNode(v) { return !!(v && typeof v === 'object' && v.type); }

    /* ---------- 값 표기 ---------- */
    function fnum(n) {
        n = Number(n); if (isNaN(n)) n = 0;
        if (Number.isInteger(n)) return n.toFixed(1);
        return String(Math.round(n * 1000) / 1000);
    }
    function fint(n) { n = Math.round(Number(n)); return String(isNaN(n) ? 0 : Math.max(0, n)); }
    function str(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[{}]/g, function (m) { return '\\' + m; }) + '"'; }

    var COLOR = { pink: 'Pink', violet: 'Purple', blue: 'Blue', azure: 'Cyan', green: 'Green', yellow: 'Yellow', orange: 'Orange', red: 'Red', white: 'White', black: 'Black', none: 'Black' };
    var HEX_NAME = { '#ef4444': 'Red', '#f97316': 'Orange', '#facc15': 'Yellow', '#eab308': 'Yellow', '#22c55e': 'Green', '#10b981': 'Green', '#3b82f6': 'Blue', '#ec4899': 'Pink', '#a855f7': 'Purple', '#ff4d4d': 'Red', '#ff8a3d': 'Orange', '#ffd23f': 'Yellow', '#3dbe6b': 'Green', '#3e7bfa': 'Blue', '#ff8fb1': 'Pink' };
    var LWP_COLOR = { 0: 'black', 1: 'pink', 2: 'violet', 3: 'blue', 4: 'azure', 5: 'azure', 6: 'green', 7: 'yellow', 8: 'orange', 9: 'red', 10: 'white' };

    function msgName(m) {
        if (m === undefined || m === null) return 'Message';
        var s = String(m).toLowerCase();
        if (HEX_NAME[s]) return HEX_NAME[s];
        if (COLOR[s]) return COLOR[s];
        return 'Message' + s.replace(/[^a-z0-9]/g, '');
    }

    /* ---------- 아이콘 블록(DOM) → 노드 ---------- */
    function valOf(el) {
        var p = el.querySelector(':scope > .param-time') || el.querySelector(':scope > .block-param') || el.querySelector('.block-param') || el.querySelector('[data-val]');
        if (!p) return NaN;
        if (p.hasAttribute('data-val')) { var d = parseFloat(p.getAttribute('data-val')); return isNaN(d) ? p.getAttribute('data-val') : d; }
        return parseFloat(p.innerText);
    }
    function rawVal(el) {
        var p = el.querySelector(':scope > .block-param') || el.querySelector('.block-param');
        return p && p.hasAttribute('data-val') ? p.getAttribute('data-val') : '';
    }
    var vidCounter = 0;
    var seenVids = null;
    function vidOf(el) {
        if (!el.dataset.vid || (seenVids && seenVids[el.dataset.vid] && seenVids[el.dataset.vid] !== el)) { vidCounter += 1; el.dataset.vid = 'v' + vidCounter; }
        if (seenVids) seenVids[el.dataset.vid] = el;
        return el.dataset.vid;
    }
    function num(v, d) { v = Number(v); return isNaN(v) ? d : v; }

    function iconBlockToNode(el, unit) {
        var a = el.getAttribute('data-action') || '';
        var id = vidOf(el), n = { id: id, type: 'unknown', vals: {}, action: a };
        var v = valOf(el);
        switch (a) {
            case 'start': n.type = 'start'; break;
            case 'flow_wait': n.type = 'wait'; n.vals = { n: num(v, 1) }; break;
            case 'car_forward': n.type = 'fwd'; n.vals = { n: num(v, 1) }; break;
            case 'car_backward': n.type = 'back'; n.vals = { n: num(v, 1) }; break;
            case 'car_left': n.type = 'left'; n.vals = { n: num(v, 1) }; break;
            case 'car_right': n.type = 'right'; n.vals = { n: num(v, 1) }; break;
            case 'car_speed_set': n.type = 'mv_speed'; n.vals = { n: num(v, 40) }; break;
            case 'motor_speed_set': n.type = 'motor_speed'; n.vals = { n: num(v, 40) }; break;
            case 'motor_cw': n.type = 'motor_run'; n.vals = { dir: 'cw', n: num(v, 1), unit: 'rot' }; break;
            case 'motor_ccw': n.type = 'motor_run'; n.vals = { dir: 'ccw', n: num(v, 1), unit: 'rot' }; break;
            case 'motor_stop': n.type = 'motor_stop'; break;
            case 'matrix_clear': n.type = 'li_off'; break;
            case 'matrix_pixel_red': n.type = 'li_red'; break;
            case 'matrix_pixel': {
                if (el.getAttribute('data-light-color') === 'red') { n.type = 'li_red'; break; }
                var mp = el.querySelector('.param-unified') || el.querySelector('.block-param');
                var bits = '010010010';
                try {
                    var arr = JSON.parse(mp.getAttribute('data-matrix'));
                    if (Array.isArray(arr) && arr.length === 9) bits = arr.map(function (x) { return x > 0 ? '1' : '0'; }).join('');
                } catch (e) { }
                n.type = 'li_pattern_for';
                n.vals = { p: bits, n: num(mp && mp.getAttribute('data-val'), 2) };
                break;
            }
            case 'sound_play': case 'sound_note': case 'sound_animal': n.type = 'so_play'; n.vals = { s: /^rec:/.test(String(v)) ? String(v) : num(v, 1) }; break;
            case 'event_ai_gesture':
                if (String(unit) === '7') n.type = 'ev_ai_voice';
                else if (String(unit) === '8') n.type = 'ev_ai_vision';
                else { n.type = 'ev_ai_gesture'; n.vals = { g: isNaN(Number(v)) ? 'any' : Number(v) }; }
                break;
            case 'event_ai_vision': n.type = 'ev_ai_vision'; break;
            case 'event_color_sensor': n.type = 'ev_color'; n.vals = { c: LWP_COLOR[v] || 'none' }; break;
            case 'event_tilt_sensor': n.type = 'ev_tilt'; n.vals = { t: String(rawVal(el) || v || 'front') }; break;
            case 'event_force_sensor': n.type = 'ev_force'; n.vals = { s: String(v) === '0' ? 'released' : 'pressed' }; break;
            case 'event_distance_sensor': n.type = 'ev_distance'; n.vals = { cm: num(v, 20) }; break;
            case 'event_sound_level': n.type = 'ev_sound_level'; break;
            case 'event_reflect_sensor': case 'event_ambient_sensor': {         // 색 센서 빛: 기준 값을 넘으면(▲) / 이하가 되면(▼)
                var pEl = el.querySelector('.block-param'), down = pEl && pEl.getAttribute('data-dir') === 'down';
                n.type = 'ct_wait_until';                 // 아이콘 모드의 센서 이벤트는 "~할 때까지 기다리기" 로 동작한다
                n.vals = { c: { id: n.id + '_c', type: down ? 'op_lt' : 'op_gt', kids: [], vals: { a: { id: n.id + '_s', type: a === 'event_ambient_sensor' ? 'sn_ambient' : 'sn_reflect', vals: {}, kids: [] }, b: num(v, 50) } } };
                break;
            }
            case 'event_message_received': n.type = 'ev_recv'; n.vals = { m: rawVal(el) || 'red' }; break;
            case 'action_send_message': n.type = 'ev_send'; n.vals = { m: rawVal(el) || 'red' }; break;
            case 'control_repeat': n.type = 'repeat'; n.vals = { n: num(v, 4) }; n.kids = []; n.flat = true; break;
            case 'control_forever': n.type = 'forever'; n.kids = []; break;
        }
        return n;
    }

    // 작업 공간(#workspaceArea)의 모든 스택을 노드 목록으로
    function fromIcon(area, unit) {
        var stacks = [];
        seenVids = {};
        var stackEls = Array.prototype.slice.call(area.querySelectorAll('.block-stack'));
        stackEls.sort(function (a, b) { return (parseFloat(a.style.left) || 0) - (parseFloat(b.style.left) || 0); });
        stackEls.forEach(function (st, si) {
            var items = Array.prototype.filter.call(st.children, function (b) { return b.classList.contains('workspace-item') && !b.classList.contains('placeholder'); });
            if (!items.length) return;
            var list = [];
            var flatRepeat = null;
            items.forEach(function (el) {
                var n = iconBlockToNode(el, unit);
                if (n.type === 'forever') {
                    var inner = el.querySelector(':scope > .loop-inner-stack') || el.querySelector('.loop-inner-stack');
                    if (inner) Array.prototype.forEach.call(inner.children, function (ch) {
                        if (ch.classList.contains('workspace-item') && !ch.classList.contains('placeholder')) n.kids.push(iconBlockToNode(ch, unit));
                    });
                }
                if (flatRepeat && n.type !== 'repeat') { flatRepeat.kids.push(n); return; }   // 반복 블록은 아래에 이어진 블록들을 반복한다
                if (n.type === 'repeat') { flatRepeat = n; list.push(n); return; }
                list.push(n);
            });
            stacks.push({ id: 's' + si, blocks: list });
        });
        return { stacks: stacks, vars: [], lists: [], myblocks: [], unit: unit };
    }

    /* ---------- 노드 훑기 ---------- */
    function nestedIds(n, out) {
        out = out || [];
        if (!n || !n.vals) return out;
        Object.keys(n.vals).forEach(function (k) {
            var x = n.vals[k];
            if (isNode(x)) { out.push(x.id); nestedIds(x, out); }
        });
        return out;
    }

    /* ---------- 생성 ---------- */
    function generate(prog) {
        var unit = String(prog.unit || '');
        var names = { vars: {}, lists: {}, mb: {} };
        var devices = {}, helpers = {}, classVars = {}, notes = {};
        var funcs = [];                     // 이벤트/내 블록 함수 { name, params, suspends, lines }
        var hasRecv = {};                   // 받는 메시지 함수 이름
        var timerCount = 0, condCount = 0;
        var typeOfVar = {};

        (prog.vars || []).forEach(function (v, i) { names.vars[v] = /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) ? v.charAt(0).toUpperCase() + v.slice(1) : 'Variable' + (i + 1); });
        (prog.lists || []).forEach(function (v, i) { names.lists[v] = /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) ? v.charAt(0).toUpperCase() + v.slice(1) : 'List' + (i + 1); });
        var mbIndex = {};
        (prog.myblocks || []).forEach(function (mb, i) { mbIndex[mb.id] = mb; names.mb[mb.id] = 'MyBlock' + (i + 1); });

        function varName(v) { return names.vars[v] || (names.vars[v] = 'Variable' + (Object.keys(names.vars).length + 1)); }
        function listName(v) { return names.lists[v] || (names.lists[v] = 'List' + (Object.keys(names.lists).length + 1)); }

        // 변수 타입 미리 알아내기 (글자 값이 들어가면 string)
        function exType(v) {
            if (!isNode(v)) return typeof v === 'string' && isNaN(parseFloat(v)) ? 'string' : 'float';
            if (v.type === 'op_join' || v.type === 'op_letter' || v.type === 'lst_item') return 'string';
            if (v.type === 'var') return typeOfVar[v.vals.name] || 'float';
            return 'float';
        }
        function scanTypes(list) {
            (list || []).forEach(function (n) {
                if (!n) return;
                if ((n.type === 'var_set' || n.type === 'var_change') && n.vals) {
                    if (!typeOfVar[n.vals.name] || typeOfVar[n.vals.name] === 'float') typeOfVar[n.vals.name] = exType(n.vals.v);
                }
                scanTypes(n.kids); scanTypes(n.kids2);
            });
        }
        prog.stacks.forEach(function (s) { scanTypes(s.blocks); });

        /* ---- 줄 만들기 ---- */
        function Builder(ind) {
            this.lines = []; this.ind = ind; this.anc = [];
        }
        Builder.prototype.push = function (text, refs, kind) {
            this.lines.push({ t: new Array(this.ind + 1).join('    ') + text, r: refs || [], k: kind || (text.charAt(0) === '#' ? 'comment' : 'code') });
        };
        function refsOf(n, B) {
            var r = [n.id];
            nestedIds(n).forEach(function (x) { r.push(x); });
            B.anc.slice().reverse().forEach(function (x) { r.push(x); });
            return r;
        }

        /* ---- 값 식 ---- */
        var NUM_OPS = { op_random: 1, op_add: 1, op_sub: 1, op_mul: 1, op_div: 1, op_mod: 1, op_round: 1, op_math: 1, op_lt: 1, op_gt: 1, op_eq: 1, op_between: 1 };
        function ex(v, B) {
            if (!isNode(v)) {
                if (typeof v === 'number') return fnum(v);
                if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return fnum(v);
                return str(v === undefined || v === null ? '' : v);
            }
            var a = function (k) { var x = v.vals[k]; if (x === '' && NUM_OPS[v.type]) return '0.0'; return ex(x, B); };      // 비워 둔 숫자 칸은 0
            switch (v.type) {
                case 'op_random': return 'GetRandomFloat(' + a('a') + ', ' + a('b') + ')';
                case 'op_add': return '(' + a('a') + ' + ' + a('b') + ')';
                case 'op_sub': return '(' + a('a') + ' - ' + a('b') + ')';
                case 'op_mul': return '(' + a('a') + ' * ' + a('b') + ')';
                case 'op_div': return '(' + a('a') + ' / ' + a('b') + ')';
                case 'op_mod': return 'Mod[Round[' + a('a') + '], Round[' + a('b') + ']]';
                case 'op_round': return 'Round[' + a('a') + ']';
                case 'op_math': {
                    var f = v.vals.f, x = a('a');
                    var map = { abs: 'Abs(' + x + ')', floor: 'Floor[' + x + ']', ceiling: 'Ceil[' + x + ']', sqrt: 'Sqrt(' + x + ')', sin: 'Sin(DegreesToRadians(' + x + '))', cos: 'Cos(DegreesToRadians(' + x + '))', tan: 'Tan(DegreesToRadians(' + x + '))', asin: 'ArcSin(' + x + ')', acos: 'ArcCos(' + x + ')', atan: 'ArcTan(' + x + ')', ln: 'Ln(' + x + ')', log: 'Ln(' + x + ') / Ln(10.0)', 'e^': 'Exp(' + x + ')', '10^': 'Pow(10.0, ' + x + ')' };
                    return map[f] || 'Abs(' + x + ')';
                }
                case 'op_join': return '"{' + exStrPart(v.vals.a, B) + '}{' + exStrPart(v.vals.b, B) + '}"';
                case 'op_letter': return a('s') + '[' + a('n') + ' - 1]';
                case 'op_length': return a('s') + '.Length';
                case 'var': return varName(v.vals.name);
                case 'lst_val': return listName(v.vals.l);
                case 'lst_item': return listName(v.vals.l) + '[' + a('n') + ' - 1]';
                case 'lst_index': return 'FindIndex(' + listName(v.vals.l) + ', ' + a('x') + ')';
                case 'lst_length': return listName(v.vals.l) + '.Length';
                case 'sn_color': helpers.sensors = true; return 'ColorSensorValue';
                case 'sn_reflect': helpers.sensors = true; helpers.light2 = true; return 'ReflectedLight';
                case 'sn_ambient': helpers.sensors = true; helpers.light2 = true; return 'AmbientLight';
                case 'sn_force': helpers.sensors = true; return 'ForceSensorValue';
                case 'sn_distance': helpers.sensors = true; return 'DistanceSensorCm';
                case 'sn_timer': helpers.timer = true; return '(GetSimulationElapsedTime() - TimerStart)';
                case 'my_param_v': case 'my_param_b': return 'Arg' + (String(v.vals.pid).replace(/\D/g, '') || '0');
                default: return cond(v, B);
            }
        }
        function exStrPart(v, B) { return isNode(v) ? ex(v, B) : String(v).replace(/[{}"\\]/g, ''); }

        /* ---- 조건 식 (실패할 수 있는 식: if 안에서 쓴다) ---- */
        function cond(v, B) {
            if (!isNode(v)) return 'false?';
            var a = function (k) { var x = v.vals[k]; if (x === '' && NUM_OPS[v.type]) return '0.0'; return ex(x, B); };
            var ca = function (k) { return cond(v.vals[k], B); };
            switch (v.type) {
                case 'op_lt': return a('a') + ' < ' + a('b');
                case 'op_gt': return a('a') + ' > ' + a('b');
                case 'op_eq': return a('a') + ' = ' + a('b');
                case 'op_and': return '(' + ca('a') + ') and (' + ca('b') + ')';
                case 'op_or': return '(' + ca('a') + ') or (' + ca('b') + ')';
                case 'op_not': return 'not (' + ca('a') + ')';
                case 'op_between': return a('a') + ' >= ' + a('lo') + ', ' + a('a') + ' <= ' + a('hi');
                case 'op_contains': return 'StringContains[' + a('s') + ', ' + a('t') + ']';
                case 'lst_contains': return 'FindIndex[' + listName(v.vals.l) + ', ' + a('x') + ']';
                case 'sn_color_is': helpers.sensors = true; return 'SeesColor["' + String(v.vals.c) + '"]';
                case 'sn_tilted': helpers.sensors = true; return 'HubTilted["' + String(v.vals.t) + '"]';
                case 'sn_force_is': helpers.sensors = true; return 'ForcePressed[]';
                case 'my_param_b': return 'Arg' + (String(v.vals.pid).replace(/\D/g, '') || '0') + '?';
                default: return ex(v, B);
            }
        }

        /* ---- 장치/도우미 등록 ---- */
        function useDev(name) { devices[name] = true; return name; }
        function turnsExpr(n, unitOpt, B) {
            var base = ex(n, B);
            if (unitOpt === 'deg') return '(' + base + ' / 360.0)';
            return base;
        }

        function distSteps(base, u) {
            if (u === 'cm') { classVars.WheelMm = true; return '(' + base + ' * 10.0 / (PiFloat * WheelMm))'; }
            if (u === 'inch') { classVars.WheelMm = true; return '(' + base + ' * 25.4 / (PiFloat * WheelMm))'; }
            return base;
        }

        /* ---- 문장 ---- */
        function stmt(n, B) {
            var R = refsOf(n, B), t = n.type, v = n.vals || {};
            var P = function (text) { B.push(text, R); };
            var N = function (k) { return ex(v[k], B); };
            switch (t) {
                case 'start': case 'ev_ai_gesture': case 'ev_ai_voice': case 'ev_ai_vision': case 'ev_color': case 'ev_tilt': case 'ev_up':
                case 'ev_gesture': case 'ev_timer': case 'ev_recv': case 'ev_cond': case 'ev_force': case 'ev_distance': case 'ev_sound_level':
                    return;     // 시작/이벤트 블록은 함수 머리에서 처리

                /* 모터 */
                case 'motor_run': {
                    useDev('Motor'); helpers.spin = true; classVars.TurnSeconds = true;
                    var sign = v.dir === 'ccw' ? '-' : '';
                    var amt = v.unit === 'sec' ? N('n') : turnsExpr(v.n, v.unit, B);
                    var amtTxt = isNode(v.n) ? '' : ' ' + v.n + (v.unit === 'deg' ? c('도', ' deg') : v.unit === 'sec' ? c('초(1초에 1바퀴)', ' s (1 turn per second)') : c('바퀴', ' turns'));
                    P('# ' + c('모터를 ', 'motor ') + (v.dir === 'ccw' ? c('반시계', 'counter-clockwise') : c('시계', 'clockwise')) + c(' 방향으로', '') + amtTxt);
                    P('SpinProp(Motor, ' + sign + amt + ', TurnSeconds)');
                    return;
                }
                case 'motor_on': useDev('Motor'); helpers.spin = true; classVars.TurnSeconds = true;
                    P('spawn{ SpinProp(Motor, ' + (v.dir === 'ccw' ? '-' : '') + '1000.0, TurnSeconds) }   ' + c('# 계속 돌리기', '# keep spinning')); return;
                case 'motor_stop': useDev('Motor');
                    P('Motor.MoveTo(Motor.GetTransform().Translation, Motor.GetTransform().Rotation, 0.1)   ' + c('# 지금 자리에서 멈추기', '# stop where it is')); return;
                case 'motor_speed': classVars.TurnSeconds = true;
                    P('set TurnSeconds = 100.0 / Max(18.0, ' + N('n') + ')   ' + c('# 속도(%)가 클수록 한 바퀴가 짧아진다', '# higher speed -> shorter turn')); return;

                /* 이동 */
                case 'fwd': useDev('Car'); helpers.drive = true; classVars.StepSeconds = true; P('DriveProp(Car, ' + N('n') + ', StepSeconds)   ' + c('# 앞으로', '# forward')); return;
                case 'back': useDev('Car'); helpers.drive = true; classVars.StepSeconds = true; P('DriveProp(Car, -' + N('n') + ', StepSeconds)   ' + c('# 뒤로', '# backward')); return;
                case 'left': useDev('Car'); helpers.turn = true; P('TurnProp(Car, -90.0 * ' + N('n') + ', 0.6)   ' + c('# 왼쪽으로 돌기 (90도씩)', '# turn left (90 deg each)')); return;
                case 'right': useDev('Car'); helpers.turn = true; P('TurnProp(Car, 90.0 * ' + N('n') + ', 0.6)   ' + c('# 오른쪽으로 돌기 (90도씩)', '# turn right (90 deg each)')); return;
                case 'mv_move': {
                    useDev('Car'); helpers.drive = true; classVars.StepSeconds = true;
                    var steps = v.unit === 'deg' ? '(' + N('n') + ' / 360.0)' : distSteps(N('n'), v.unit);
                    P('DriveProp(Car, ' + (v.d === 'back' ? '-' : '') + steps + ', StepSeconds)' + (v.unit === 'cm' || v.unit === 'inch' ? '   ' + c('# 거리 ÷ 바퀴 둘레 = 바퀴 몇 칸', '# distance / wheel circumference = steps') : ''));
                    return;
                }
                case 'mv_wheel': classVars.WheelMm = true; P('set WheelMm = ' + N('n') + '   ' + c('# 바퀴 지름(mm)', '# wheel diameter (mm)')); return;
                case 'motor_port_run': case 'motor_port_on': case 'motor_port_stop': case 'motor_goto': case 'motor_reset': {
                    P('# ' + c('포트 ' + v.p + ' 모터: 레고 허브에서만 쓰는 블록이에요 (UEFN 장치에는 같은 동작이 없어요)', 'port ' + v.p + ' motor: hub-only block (no UEFN equivalent)'));
                    return;
                }
                case 'mv_start': useDev('Car'); helpers.drive = true; classVars.StepSeconds = true;
                    P('spawn{ DriveProp(Car, ' + (v.d === 'back' ? '-' : '') + '1000.0, StepSeconds) }   ' + c('# 계속 이동', '# keep moving')); return;
                case 'mv_steer': useDev('Car'); helpers.steer = true; classVars.StepSeconds = true;
                    P('SteerProp(Car, ' + N('s') + ', ' + (v.unit === 'deg' ? '(' + N('n') + ' / 360.0)' : distSteps(N('n'), v.unit)) + ', StepSeconds)   ' + c('# 조향(−100~100)', '# steering (-100..100)')); return;
                case 'mv_steer_start': useDev('Car'); helpers.steer = true; classVars.StepSeconds = true;
                    P('spawn{ SteerProp(Car, ' + N('s') + ', 1000.0, StepSeconds) }'); return;
                case 'mv_stop': useDev('Car');
                    P('Car.MoveTo(Car.GetTransform().Translation, Car.GetTransform().Rotation, 0.1)   ' + c('# 이동 멈추기', '# stop moving')); return;
                case 'mv_speed': classVars.StepSeconds = true;
                    P('set StepSeconds = 100.0 / Max(18.0, ' + N('n') + ')   ' + c('# 속도(%)가 클수록 한 칸이 짧아진다', '# higher speed -> shorter step')); return;

                /* 조명 */
                case 'li_pattern_for': case 'li_pattern': {
                    useDev('LightGrid'); helpers.lights = true;
                    var bits = String(v.p || '000000000').replace(/[^0]/g, '1');      // 칸마다 색은 코드에서 따로 정한다
                    P('# 3x3 ' + c('조명 패턴', 'light pattern') + ': ' + bits.slice(0, 3) + ' / ' + bits.slice(3, 6) + ' / ' + bits.slice(6, 9));
                    P('ShowPattern(LightGrid, "' + bits + '")');
                    if (t === 'li_pattern_for') { P('Sleep(' + N('n') + ')'); P('ClearLights(LightGrid)'); }
                    return;
                }
                case 'li_off': useDev('LightGrid'); helpers.lights = true; P('ClearLights(LightGrid)   ' + c('# 조명 모두 끄기', '# turn all lights off')); return;
                case 'li_red': useDev('LightGrid'); helpers.lights = true;
                    P('SetAllLights(LightGrid, NamedColors.Red)   ' + c('# 9칸 모두 빨간색', '# all 9 lights red'));
                    if ((unit === '5' || unit === '8') && prog.mission) { P('Sleep(3.0)'); P('ClearLights(LightGrid)   ' + c('# 미션에서는 3초 뒤 저절로 꺼진다', '# in the mission it turns off after 3 s')); }
                    return;
                case 'li_bright': useDev('LightGrid'); helpers.lights = true; P('SetBrightness(LightGrid, ' + N('n') + ')'); return;
                case 'li_pixel': useDev('LightGrid'); helpers.lights = true;
                    P('SetPixel(LightGrid, ' + fint(v.x) + ', ' + fint(v.y) + ', NamedColors.' + (COLOR[v.c] || 'Red') + ', ' + N('n') + ')   ' + c('# (열, 행)', '# (column, row)')); return;
                case 'li_rotate': P('# ' + c('조명 돌리기: UEFN 조명 장치에는 같은 기능이 없어 건너뜁니다', 'rotate lights: no UEFN equivalent, skipped')); return;
                case 'li_orient': P('# ' + c('조명 방향 정하기: UEFN 조명 장치에는 같은 기능이 없어 건너뜁니다', 'light orientation: no UEFN equivalent, skipped')); return;
                case 'li_center': P('# ' + c('허브 가운데 버튼 불빛: UEFN에는 같은 장치가 없어 건너뜁니다', 'hub center button light: no UEFN equivalent, skipped')); return;

                /* 소리 */
                case 'log_show': P('Print("{' + N('x') + '}")   ' + c('# 통신 로그에 보여 주기', '# show in the log')); return;
                case 'so_play': case 'so_play_wait': {
                    useDev('Sounds'); helpers.sound = true;
                    var recS = typeof v.s === 'string' && v.s.indexOf('rec:') === 0;
                    var sn = recS ? (window.SoundLib && SoundLib.nameOf(v.s)) || '?' : '';
                    P('PlaySound(Sounds, ' + (recS ? '1' : fint(isNode(v.s) ? 1 : v.s)) + ')' + (recS ? '   ' + c('# 내가 녹음한 소리 "' + sn + '" (UEFN에서는 오디오 파일을 따로 올려요)', '# my recording "' + sn + '" (upload an audio file in UEFN)') : ''));
                    if (t === 'so_play_wait') P('Sleep(' + (recS && window.SoundLib ? (Math.round(SoundLib.durationOf(v.s) * 10) / 10).toFixed(1) : '0.7') + ')   ' + c('# 소리가 끝날 때까지', '# until it finishes'));
                    return;
                }
                case 'so_stop': useDev('Sounds'); P('for (Sound : Sounds):'); B.ind++; B.push('Sound.Stop()', R); B.ind--; return;
                case 'so_effect_change': case 'so_effect_set': case 'so_pitch_change': case 'so_pitch_set': case 'so_pan_change': case 'so_pan_set': case 'so_effect_clear': P('# ' + c('소리 효과(음높이/좌우 균형): audio_player_device에서 직접 설정합니다', 'sound effects: set them on the audio_player_device')); return;
                case 'so_vol_change': case 'so_vol_set': P('# ' + c('볼륨: audio_player_device의 음량 설정을 사용합니다', 'volume: use the audio_player_device volume setting')); return;

                /* 제어 */
                case 'wait': P('Sleep(' + N('n') + ')'); return;
                case 'repeat': {
                    var cnt = isNode(v.n) ? 'Round[' + ex(v.n, B) + '] or 1' : fint(v.n);
                    if (isNode(v.n)) { P('Count := ' + cnt + '   ' + c('# 반복 횟수', '# repeat count')); P('for (Index := 1..Count):'); }
                    else P('for (Index := 1..' + cnt + '):');
                    block(n, n.kids, B); return;
                }
                case 'forever': P('loop:'); block(n, n.kids, B); return;
                case 'ct_if': P('if (' + cond(v.c, B) + '):'); block(n, n.kids, B); return;
                case 'ct_if_else': P('if (' + cond(v.c, B) + '):'); block(n, n.kids, B);
                    B.push('else:', R); B.ind++; B.anc.push(n.id);
                    if (!(n.kids2 || []).length) B.push('Sleep(0.0)   ' + c('# 비어 있음', '# empty'), R);
                    (n.kids2 || []).forEach(function (k) { stmt(k, B); });
                    B.anc.pop(); B.ind--; return;
                case 'ct_wait_until': P('loop:'); B.ind++; B.push('if (' + cond(v.c, B) + '):', R); B.ind++; B.push('break', R); B.ind--; B.push('Sleep(0.1)', R); B.ind--; return;
                case 'ct_repeat_until': P('loop:'); B.ind++; B.push('if (' + cond(v.c, B) + '):', R); B.ind++; B.push('break', R); B.ind--;
                    B.anc.push(n.id); (n.kids || []).forEach(function (k) { stmt(k, B); }); B.anc.pop();
                    B.push('Sleep(0.1)', R); B.ind--; return;
                case 'ct_stop_other': P('# ' + c('다른 스택 멈추기: 실행 중인 spawn 작업의 Cancel()을 호출합니다', 'stop other stacks: call Cancel() on the running spawn tasks')); return;
                case 'ct_stop': P(v.m === 'this' ? 'return   ' + c('# 이 스택 멈추기', '# stop this stack') : '# ' + c('모두 멈추기: 모든 작업을 Cancel() 합니다', 'stop all: Cancel() every task')); return;

                /* 센서/타이머 */
                case 'sn_reset_timer': helpers.timer = true; P('set TimerStart = GetSimulationElapsedTime()   ' + c('# 타이머 초기화', '# reset timer')); return;

                /* 변수/리스트 */
                case 'var_set': P('set ' + varName(v.name) + ' = ' + N('v')); return;
                case 'var_change': P('set ' + varName(v.name) + ' += ' + N('v')); return;
                case 'lst_add': P('set ' + listName(v.l) + ' += array{' + N('x') + '}'); return;
                case 'lst_delete': helpers.listops = true; P('set ' + listName(v.l) + ' = RemoveItem(' + listName(v.l) + ', ' + N('n') + ')'); return;
                case 'lst_clear': P('set ' + listName(v.l) + ' = array{}'); return;
                case 'lst_insert': helpers.listops = true; P('set ' + listName(v.l) + ' = InsertItem(' + listName(v.l) + ', ' + N('n') + ', ' + N('x') + ')'); return;
                case 'lst_replace': helpers.listops = true; P('set ' + listName(v.l) + ' = ReplaceItem(' + listName(v.l) + ', ' + N('n') + ', ' + N('x') + ')'); return;

                /* 메시지 */
                case 'ev_send': P(hasRecv[msgName(v.m)] ? 'spawn{ OnMessage' + msgName(v.m) + '() }   ' + c('# 메시지 보내기', '# broadcast message') : '# ' + c('메시지 보내기: ', 'broadcast message: ') + msgName(v.m)); return;
                case 'ev_send_wait': P(hasRecv[msgName(v.m)] ? 'OnMessage' + msgName(v.m) + '()   ' + c('# 메시지를 보내고 끝날 때까지 기다리기', '# broadcast and wait') : '# ' + c('메시지 보내고 기다리기: ', 'broadcast and wait: ') + msgName(v.m)); return;

                /* 내 블록 */
                default:
                    if (t.indexOf('my_call_') === 0) {
                        var mbId = t.slice(8), mb = mbIndex[mbId];
                        if (mb) {
                            var args = [];
                            mb.parts.forEach(function (p, i) { if (p.k !== 'label') args.push(ex(v['a' + i], B)); });
                            P(names.mb[mbId] + '(' + args.join(', ') + ')   # ' + mb.parts.filter(function (p) { return p.k === 'label'; }).map(function (p) { return p.text; }).join(' '));
                            return;
                        }
                    }
                    P('# ' + c('이 블록은 아직 Verse로 바꾸는 규칙이 없어요', 'no Verse conversion for this block yet') + ' (' + (n.action || t) + ')');
            }
        }

        function block(n, kids, B) {
            B.ind++; B.anc.push(n.id);
            if (!(kids || []).length) B.push('Sleep(0.0)   ' + c('# 비어 있음', '# empty'), [n.id].concat(B.anc.slice(0, -1).reverse()));
            (kids || []).forEach(function (k) { stmt(k, B); });
            B.anc.pop(); B.ind--;
        }

        function body(list, B, from) {
            for (var i = from; i < list.length; i++) stmt(list[i], B);
        }

        /* ---- 이벤트 이름 ---- */
        function capital(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
        function hatInfo(h) {
            var v = h.vals || {};
            switch (h.type) {
                case 'ev_ai_gesture': return { name: 'OnAIGesture', params: 'Gesture : int', cm: c('AI 제스처(MediaPipe)가 인식되면 브릭싱크가 호출하는 이벤트 함수', 'event function called by BrickSync when the AI (MediaPipe) recognizes a gesture'), guard: (v.g === 'any' || v.g === undefined) ? null : 'if (Gesture <> ' + fint(v.g) + '):' };
                case 'ev_ai_voice': return { name: 'OnVoiceCommand', params: 'Text : string', cm: c('AI 음성/텍스트 명령이 들어오면 호출되는 이벤트 함수', 'event function called when an AI voice/text command arrives') };
                case 'ev_ai_vision': return { name: 'OnMonsterSeen', params: '', cm: c('AI 비전이 몬스터를 알아보면 호출되는 이벤트 함수', 'event function called when AI vision sees a monster') };
                case 'ev_color': return { name: 'OnColorSensor' + capital(COLOR[v.c] ? v.c : 'none'), params: '', cm: c('색 센서에 ' + v.c + ' 색이 보이면 호출되는 이벤트 함수', 'event function called when the color sensor sees ' + v.c) };
                case 'ev_tilt': return { name: 'OnHubTilted' + capital(v.t), params: '', cm: c('허브가 ' + v.t + ' 쪽으로 기울면 호출되는 이벤트 함수', 'event function called when the hub tilts ' + v.t) };
                case 'ev_up': return { name: 'OnHubFaceUp' + capital(v.f), params: '', cm: c('허브의 ' + v.f + ' 면이 위를 향하면 호출되는 이벤트 함수', 'event function called when the hub face ' + v.f + ' is up') };
                case 'ev_gesture': return { name: 'OnHub' + capital(v.g), params: '', cm: c('허브를 ' + v.g + ' 때 호출되는 이벤트 함수', 'event function called when the hub is ' + v.g) };
                case 'ev_force': return { name: 'OnForceSensor' + capital(v.s), params: '', cm: c('힘 센서가 ' + v.s + ' 상태가 되면 호출되는 이벤트 함수', 'event function called when the force sensor is ' + v.s) };
                case 'ev_distance': return { name: 'OnDistanceSensor', params: '', cm: c('거리 센서에 ' + v.cm + 'cm 이내로 가까워지면 호출되는 이벤트 함수', 'event function called when something is within ' + v.cm + ' cm') };
                case 'ev_sound_level': return { name: 'OnLoudSound', params: '', cm: c('큰 소리가 나면 호출되는 이벤트 함수', 'event function called on a loud sound') };
                case 'ev_recv': return { name: 'OnMessage' + msgName(v.m), params: '', cm: c('"' + msgName(v.m) + '" 메시지를 받으면 실행되는 이벤트 함수', 'event function that runs when message "' + msgName(v.m) + '" is received') };
                case 'ev_timer': timerCount++; return { name: 'OnTimer' + timerCount, params: '', cm: c('시작한 지 ' + fnum(v.n) + '초가 지나면 실행되는 이벤트 함수', 'event function that runs ' + fnum(v.n) + ' s after start'), afterStart: fnum(v.n) };
                case 'ev_cond': condCount++; return { name: 'WatchCondition' + condCount, params: '', cm: c('조건이 거짓에서 참으로 바뀌는 순간 실행되는 감시 함수', 'watcher that runs when the condition turns from false to true'), watch: true };
            }
            return null;
        }

        // 받는 메시지 이름 미리 모으기
        prog.stacks.forEach(function (s) { var h = s.blocks[0]; if (h && h.type === 'ev_recv') hasRecv[msgName((h.vals || {}).m)] = true; });

        var startBodies = [], onBeginExtra = [];
        var startCount = 0;
        prog.stacks.forEach(function (s) { if (s.blocks[0] && s.blocks[0].type === 'start') startCount++; });
        var startIdx = 0;

        prog.stacks.forEach(function (s) {
            var h = s.blocks[0];
            if (!h) return;
            // 내 블록 정의
            if (h.type.indexOf('my_def_') === 0) {
                var mb = mbIndex[h.type.slice(7)];
                if (!mb) return;
                var B = new Builder(2);
                B.anc = [h.id];
                body(s.blocks, B, 1);
                if (!B.lines.length) B.push('Sleep(0.0)   ' + c('# 비어 있음', '# empty'), [h.id]);
                var params = [];
                mb.parts.forEach(function (p, i) { if (p.k !== 'label') params.push('Arg' + i + ' : ' + (p.k === 'bool' ? 'logic' : 'float')); });
                var label = mb.parts.filter(function (p) { return p.k === 'label'; }).map(function (p) { return p.text; }).join(' ');
                funcs.push({ name: names.mb[mb.id], params: params.join(', '), suspends: true, cm: c('내 블록: ', 'my block: ') + label, headRefs: [h.id], lines: B.lines });
                return;
            }
            if (h.type === 'start') {
                startIdx++;
                var Bs = new Builder(2);
                body(s.blocks, Bs, 1);
                startBodies.push({ lines: Bs.lines, headId: h.id, idx: startIdx });
                return;
            }
            var info = hatInfo(h);
            if (info) {
                var Bf = new Builder(2);
                Bf.anc = [h.id];
                if (info.watch) {
                    Bf.push('var Was : logic = false', [h.id]);
                    Bf.push('loop:', [h.id]);
                    Bf.ind++;
                    Bf.push('Now := if (' + cond((h.vals || {}).c, Bf) + ') then true else false', [h.id].concat(nestedIds(h)));
                    Bf.push('if (Now = true, Was = false):', [h.id]);
                    Bf.ind++;
                    var before = Bf.lines.length;
                    body(s.blocks, Bf, 1);
                    if (Bf.lines.length === before) Bf.push('Sleep(0.0)   ' + c('# 비어 있음', '# empty'), [h.id]);
                    Bf.ind--;
                    Bf.push('set Was = Now', [h.id]);
                    Bf.push('Sleep(0.1)', [h.id]);
                    Bf.ind--;
                    onBeginExtra.push({ t: 'spawn{ ' + info.name + '() }', r: [h.id] });
                } else {
                    if (info.guard) { Bf.push(info.guard, [h.id]); Bf.ind++; Bf.push('return', [h.id]); Bf.ind--; }
                    var b2 = Bf.lines.length;
                    body(s.blocks, Bf, 1);
                    if (Bf.lines.length === b2) Bf.push('Sleep(0.0)   ' + c('# 비어 있음', '# empty'), [h.id]);
                    if (info.afterStart) onBeginExtra.push({ t: 'spawn{ Sleep(' + info.afterStart + '); ' + info.name + '() }', r: [h.id] });
                }
                funcs.push({ name: info.name, params: info.params, suspends: true, cm: info.cm, headRefs: [h.id], lines: Bf.lines });
                return;
            }
            // 알 수 없는 맨 앞 블록(떠 있는 값 블록 등)은 건너뛴다
        });

        /* ---- 위쪽 안내 / 선언 ---- */
        var out = [];
        var add = function (t, r, k) { out.push({ t: t, r: r || [], k: k || (/^\s*#/.test(t) ? 'comment' : (t === '' ? 'blank' : 'code')) }); };

        add('using { /Fortnite.com/Devices }');
        add('using { /Verse.org/Simulation }');
        add('using { /Verse.org/Colors }');
        add('using { /UnrealEngine.com/Temporary/SpatialMath }');
        add('using { /UnrealEngine.com/Temporary/Diagnostics }');
        add('');
        add('# ' + c('브릭싱크 블록을 UEFN Verse 코드로 옮긴 학습용 예시입니다.', 'A study example of your BrickSync blocks written as UEFN Verse code.'));
        add('# ' + c('레고 허브 장치는 UEFN 장치 호출로 바꿨고, 장치 이름은 UEFN 에디터에서 직접 연결해야 합니다.', 'Hub parts are shown as UEFN device calls. Connect the devices in the UEFN editor.'));
        add('# ' + c('블록 위에 마우스를 올리면 대응하는 코드가 표시됩니다.', 'Hover a block to see its matching code.'));
        add('');
        add('brick_sync_device := class(creative_device):');
        add('');

        // 장치
        var devKeys = Object.keys(devices);
        var DEVDECL = {
            Motor: ['@editable Motor : creative_prop = creative_prop{}', c('모터가 돌려 줄 소품', 'the prop the motor spins')],
            Car: ['@editable Car : creative_prop = creative_prop{}', c('주행하는 소품(자동차/보트)', 'the driving prop (car/boat)')],
            LightGrid: ['@editable LightGrid : []customizable_light_device = array{}', c('3x3 조명 9개 (왼쪽 위부터 차례로)', 'the 9 lights of the 3x3 grid (top-left first)')],
            Sounds: ['@editable Sounds : []audio_player_device = array{}', c('소리 1~8번 장치', 'sound devices 1-8')]
        };
        if (devKeys.length) {
            add('    # ' + c('--- UEFN 에디터에서 연결할 장치 ---', '--- devices to connect in the UEFN editor ---'));
            devKeys.forEach(function (k) { if (DEVDECL[k]) { add('    ' + DEVDECL[k][0] + '   # ' + DEVDECL[k][1]); } });
            add('');
        }

        // 변수
        var varLines = [];
        Object.keys(names.vars).forEach(function (orig) {
            varLines.push('    var ' + names.vars[orig] + ' : ' + (typeOfVar[orig] || 'float') + ' = ' + ((typeOfVar[orig] === 'string') ? '""' : '0.0') + (orig !== names.vars[orig] ? '   # ' + orig : ''));
        });
        Object.keys(names.lists).forEach(function (orig) {
            varLines.push('    var ' + names.lists[orig] + ' : []string = array{}' + (orig !== names.lists[orig] ? '   # ' + orig : ''));
        });
        if (classVars.TurnSeconds) varLines.push('    var TurnSeconds : float = 1.4   # ' + c('모터가 한 바퀴 도는 시간(초)', 'seconds per motor turn'));
        if (classVars.WheelMm) varLines.push('    var WheelMm : float = 43.2   # ' + c('바퀴 지름(mm)', 'wheel diameter (mm)'));
        if (classVars.StepSeconds) varLines.push('    var StepSeconds : float = 1.0   # ' + c('한 칸 이동하는 시간(초)', 'seconds per step'));
        if (helpers.timer) varLines.push('    var TimerStart : float = 0.0   # ' + c('타이머를 시작한 시각', 'when the timer started'));
        if (helpers.light2) {
            varLines.push('    var ReflectedLight : float = 0.0   # ' + c('반사 빛 세기(%) - 센서 값은 직접 연결해서 바꿔 주세요', 'reflected light (%) - update it from your sensor'));
            varLines.push('    var AmbientLight : float = 0.0   # ' + c('주변 빛 세기(%)', 'ambient light (%)'));
        }
        if (helpers.sensors) {
            varLines.push('    var ColorSensorValue : string = "none"   # ' + c('센서 값은 직접 연결해서 바꿔 주세요', 'update the sensor values yourself'));
            varLines.push('    var HubTiltValue : string = "none"');
            varLines.push('    var ForceSensorValue : float = 0.0   # ' + c('힘 센서 값은 직접 연결해서 바꿔 주세요', 'update the force sensor value yourself'));
            varLines.push('    var DistanceSensorCm : float = 200.0   # ' + c('거리 센서 값(cm)은 직접 연결해서 바꿔 주세요', 'update the distance sensor value (cm) yourself'));
        }
        if (varLines.length) {
            add('    # ' + c('--- 변수 ---', '--- variables ---'));
            varLines.forEach(function (t) { add(t); });
            add('');
        }

        // 도우미 함수
        var H = [];
        var hp = function (arr) { arr.forEach(function (t) { H.push(t); }); };
        if (helpers.spin) hp([
            'SpinProp(Prop : creative_prop, Turns : float, SecondsPerTurn : float)<suspends> : void =',
            '    Steps := Round[Abs(Turns) * 4.0] or 1',
            '    Sign := if (Turns < 0.0) then -1.0 else 1.0',
            '    for (Step := 1..Steps):',
            '        Transform := Prop.GetTransform()',
            '        Prop.MoveTo(Transform.Translation, Transform.Rotation.RotateBy(MakeRotation(vector3{Z := 1.0}, Sign * PiFloat / 2.0)), SecondsPerTurn / 4.0)',
            '']);
        if (helpers.drive) hp([
            'DriveProp(Prop : creative_prop, Steps : float, SecondsPerStep : float)<suspends> : void =',
            '    Transform := Prop.GetTransform()',
            '    Forward := Transform.Rotation.RotateVector(vector3{X := 1.0})',
            '    Prop.MoveTo(Transform.Translation + Forward * (Steps * 100.0), Transform.Rotation, Abs(Steps) * SecondsPerStep)',
            '']);
        if (helpers.turn) hp([
            'TurnProp(Prop : creative_prop, Degrees : float, Seconds : float)<suspends> : void =',
            '    Transform := Prop.GetTransform()',
            '    Prop.MoveTo(Transform.Translation, Transform.Rotation.RotateBy(MakeRotation(vector3{Z := 1.0}, DegreesToRadians(Degrees))), Seconds)',
            '']);
        if (helpers.steer) hp([
            'SteerProp(Prop : creative_prop, Steering : float, Steps : float, SecondsPerStep : float)<suspends> : void =',
            '    Transform := Prop.GetTransform()',
            '    Turned := Transform.Rotation.RotateBy(MakeRotation(vector3{Z := 1.0}, DegreesToRadians(Steering * 0.9)))',
            '    Forward := Turned.RotateVector(vector3{X := 1.0})',
            '    Prop.MoveTo(Transform.Translation + Forward * (Steps * 100.0), Turned, Abs(Steps) * SecondsPerStep)',
            '']);
        if (helpers.lights) hp([
            'SetAllLights(Lights : []customizable_light_device, Color : color) : void =',
            '    for (Light : Lights):',
            '        Light.SetLightColor(Color)',
            '        Light.TurnOn()',
            '',
            'ClearLights(Lights : []customizable_light_device) : void =',
            '    for (Light : Lights):',
            '        Light.TurnOff()',
            '',
            'ShowPattern(Lights : []customizable_light_device, Pattern : string) : void =',
            '    for (Index := 0..8):',
            '        if (Light := Lights[Index]):',
            '            if (Pattern[Index] = \'1\'):',
            '                Light.TurnOn()',
            '            else:',
            '                Light.TurnOff()',
            '',
            'SetBrightness(Lights : []customizable_light_device, Percent : float) : void =',
            '    for (Light : Lights):',
            '        Light.SetLightIntensity(Percent)',
            '',
            'SetPixel(Lights : []customizable_light_device, X : int, Y : int, Color : color, Percent : float) : void =',
            '    if (Light := Lights[(Y - 1) * 3 + (X - 1)]):',
            '        Light.SetLightColor(Color)',
            '        Light.SetLightIntensity(Percent)',
            '        Light.TurnOn()',
            '']);
        if (helpers.sound) hp([
            'PlaySound(Players : []audio_player_device, Number : int) : void =',
            '    if (Player := Players[Number - 1]):',
            '        Player.Play()',
            '']);
        if (helpers.sensors) hp([
            'SeesColor(Name : string)<transacts><decides> : void =',
            '    ColorSensorValue = Name',
            '',
            'HubTilted(Direction : string)<transacts><decides> : void =',
            '    HubTiltValue = Direction',
            '',
            'ForcePressed()<transacts><decides> : void =',
            '    ForceSensorValue > 0.0',
            '']);
        if (helpers.listops) hp([
            'RemoveItem(Items : []string, Number : float) : []string =',
            '    if (Result := Items.RemoveElement[Round[Number] - 1]):',
            '        return Result',
            '    Items',
            '']);

        // OnBegin
        add('    # ' + c('--- 프로그램이 시작될 때 실행됩니다 ---', '--- runs when the program starts ---'));
        add('    OnBegin<override>()<suspends> : void =');
        var any = false;
        onBeginExtra.forEach(function (e) { add('        ' + e.t, e.r); any = true; });
        if (startBodies.length === 1) {
            startBodies[0].lines.forEach(function (l) { out.push(l); any = true; });
            if (!startBodies[0].lines.length) { add('        Sleep(0.0)   # ' + c('비어 있음', 'empty'), [startBodies[0].headId]); any = true; }
        } else if (startBodies.length > 1) {
            startBodies.forEach(function (sb) { add('        spawn{ Program' + sb.idx + '() }', [sb.headId]); any = true; });
        }
        if (!any) add('        Sleep(0.0)   # ' + c('아직 블록이 없어요', 'no blocks yet'));
        if (startBodies.length > 1) {
            startBodies.forEach(function (sb) {
                add('');
                add('    # ' + c('"시작하면" 블록 묶음 ', '"when started" stack ') + sb.idx);
                add('    Program' + sb.idx + '()<suspends> : void =', [sb.headId]);
                if (!sb.lines.length) add('        Sleep(0.0)   # ' + c('비어 있음', 'empty'), [sb.headId]);
                sb.lines.forEach(function (l) { out.push(l); });
            });
        }

        // 이벤트/내 블록 함수
        funcs.forEach(function (f) {
            add('');
            add('    # ' + f.cm, f.headRefs);
            add('    ' + f.name + '(' + f.params + ')' + (f.suspends ? '<suspends>' : '') + ' : void =', f.headRefs);
            f.lines.forEach(function (l) { out.push(l); });
        });

        // 도우미 함수는 맨 아래로 (본문을 먼저 보고 공부할 수 있게)
        if (H.length) {
            add('');
            add('    # ' + c('--- 도우미 함수 (블록 하나를 장치 호출 여러 줄로 풀어 쓴 것) ---', '--- helper functions (one block spelled out as several device calls) ---'));
            H.forEach(function (t) { add(t === '' ? '' : '    ' + t); });
        }

        return { lines: out, text: out.map(function (l) { return l.t; }).join('\n') };
    }

    window.VerseGen = { generate: generate, fromIcon: fromIcon, fromWord: function (state, unit, mission) {
        return { stacks: (state.stacks || []).map(function (s) { return { id: s.id, blocks: s.blocks }; }), vars: state.vars || [], lists: state.lists || [], myblocks: state.myblocks || [], unit: unit, mission: !!mission };
    } };
})();
