/* BrickSync 워드 블록 정의 (3단계: 시간 기반 블록 전체)
   - 블록은 데이터로만 정의: 종류(type), 탭(tab), 색(color), 문장(ko/en), 입력칸(slots), 컨테이너/시작 여부
   - 문장 안의 {이름} 위치에 입력칸이 들어간다.
   - 입력칸 종류: num(숫자) list(목록) dir(방향 버튼) steer(조향 -100~100) pattern(3x3 조명) color(색 팔레트)
   - 값을 끼워 넣는 칸(조건/연산/변수)은 다음 단계에서 추가한다.
*/
(function () {
    var CATS = [
        { id: 'motor', ko: '모터', en: 'Motor', color: 'mo' },
        { id: 'move', ko: '동작', en: 'Movement', color: 'mv' },
        { id: 'light', ko: '조명', en: 'Light', color: 'li' },
        { id: 'sound', ko: '소리', en: 'Sound', color: 'so' },
        { id: 'event', ko: '이벤트', en: 'Events', color: 'ev' },
        { id: 'control', ko: '제어', en: 'Control', color: 'lp' },
        { id: 'sensor', ko: '센서', en: 'Sensors', color: 'se' },
        { id: 'ops', ko: '연산', en: 'Operators', color: 'op' },
        { id: 'my', ko: '내 블록', en: 'My Blocks', color: 'my' }
    ];

    /* 카테고리 색 (작업 공간 테마와 동일한 값) */
    var COLORS = {
        ev: { c: '#FFD23F', tx: '#5A4300', k: '#8A6200', a: ['#FF6B6B', '#5B8DEF', '#3DBE6B'] },
        mv: { c: '#FF6B6B', tx: '#FFFFFF', k: '#B93030', a: ['#FFD23F', '#4CC9F0', '#7ED957'] },
        mo: { c: '#7ED957', tx: '#1E4D12', k: '#3A8A22', a: ['#FFD23F', '#FF6B6B', '#5B8DEF'] },
        ai: { c: '#5B8DEF', tx: '#FFFFFF', k: '#2F55B5', a: ['#FFD23F', '#FF8FB1', '#7EEAB0'] },
        lp: { c: '#FF8A3D', tx: '#FFFFFF', k: '#B8530F', a: ['#FFD23F', '#4CC9F0', '#FFFFFF'] },
        li: { c: '#A66BFF', tx: '#FFFFFF', k: '#6A32C8', a: ['#FFD23F', '#4CC9F0', '#FF8FB1'] },
        so: { c: '#FF7AB6', tx: '#FFFFFF', k: '#C0357E', a: ['#FFD23F', '#5B8DEF', '#7EEAB0'] },
        se: { c: '#2EB8E6', tx: '#FFFFFF', k: '#0F7FA8', a: ['#FFD23F', '#FF6B6B', '#7ED957'] },
        op: { c: '#2FBF9B', tx: '#FFFFFF', k: '#157A60', a: ['#FFD23F', '#FF8FB1', '#5B8DEF'] },
        va: { c: '#FF9F43', tx: '#FFFFFF', k: '#B8650F', a: ['#FFD23F', '#4CC9F0', '#FFFFFF'] },
        my: { c: '#B9825A', tx: '#FFFFFF', k: '#7A4B2B', a: ['#FFD23F', '#4CC9F0', '#7EEAB0'] }
    };

    var UNIT_OPTS = [
        { v: 'rot', ko: '회전', en: 'rotations' },
        { v: 'deg', ko: '도', en: 'degrees' },
        { v: 'sec', ko: '초', en: 'seconds' }
    ];
    var DIR_OPTS = [
        { v: 'cw', ko: '시계 방향', en: 'clockwise', glyph: '↻' },
        { v: 'ccw', ko: '반시계 방향', en: 'counter-clockwise', glyph: '↺' }
    ];
    var VDIR_OPTS = [
        { v: 'fwd', ko: '앞으로', en: 'forward', glyph: '↑' },
        { v: 'back', ko: '뒤로', en: 'backward', glyph: '↓' }
    ];
    var XY_OPTS = [1, 2, 3].map(function (n) { return { v: n, ko: String(n), en: String(n) }; });
    var SOUND_OPTS = [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return { v: n, ko: '소리 ' + n, en: 'Sound ' + n }; });
    var EFFECT_OPTS = [
        { v: 'pitch', ko: '음높이', en: 'pitch' },
        { v: 'pan', ko: '좌우 균형', en: 'pan' }
    ];
    var ORIENT_OPTS = [
        { v: 'straight', ko: '똑바로', en: 'straight' },
        { v: 'left', ko: '왼쪽', en: 'left' },
        { v: 'right', ko: '오른쪽', en: 'right' },
        { v: 'upside', ko: '거꾸로', en: 'upside down' }
    ];
    var TILT_OPTS = [
        { v: 'front', ko: '앞쪽', en: 'forward' },
        { v: 'back', ko: '뒤쪽', en: 'backward' },
        { v: 'left', ko: '왼쪽', en: 'left' },
        { v: 'right', ko: '오른쪽', en: 'right' }
    ];
    var FORCE_OPTS = [
        { v: 'pressed', ko: '눌리면', en: 'pressed' },
        { v: 'released', ko: '떼어지면', en: 'released' }
    ];
    var FACE_OPTS = [
        { v: 'front', ko: '앞면', en: 'front' },
        { v: 'back', ko: '뒷면', en: 'back' },
        { v: 'top', ko: '윗면', en: 'top' },
        { v: 'bottom', ko: '아랫면', en: 'bottom' },
        { v: 'right', ko: '오른쪽 면', en: 'right' },
        { v: 'left', ko: '왼쪽 면', en: 'left' }
    ];
    var GESTURE_OPTS = [
        { v: 'shaken', ko: '흔들면', en: 'shaken' },
        { v: 'tapped', ko: '두드리면', en: 'tapped' },
        { v: 'falling', ko: '떨어뜨리면', en: 'falling' }
    ];
    var AI_GESTURE_OPTS = [
        { v: 'any', ko: '아무 손 모양', en: 'any hand sign' },
        { v: 0, ko: '주먹', en: 'rock' },
        { v: 1, ko: '보', en: 'paper' },
        { v: 2, ko: '가위', en: 'scissors' }
    ];
    var STOP_OPTS = [
        { v: 'all', ko: '모두', en: 'all' },
        { v: 'this', ko: '이 스택', en: 'this stack' },
        { v: 'end', ko: '모두 멈추고 끝내기', en: 'all and end program' }
    ];

    /* 색 팔레트 (조명 색) */
    var LIGHT_COLORS = [
        { v: 'pink', ko: '분홍', en: 'Pink', hex: '#FF8FB1' },
        { v: 'violet', ko: '보라', en: 'Violet', hex: '#A66BFF' },
        { v: 'blue', ko: '파랑', en: 'Blue', hex: '#3E7BFA' },
        { v: 'azure', ko: '하늘', en: 'Azure', hex: '#4CC9F0' },
        { v: 'green', ko: '초록', en: 'Green', hex: '#3DBE6B' },
        { v: 'yellow', ko: '노랑', en: 'Yellow', hex: '#FFD23F' },
        { v: 'orange', ko: '주황', en: 'Orange', hex: '#FF8A3D' },
        { v: 'red', ko: '빨강', en: 'Red', hex: '#FF4D4D' },
        { v: 'white', ko: '하양', en: 'White', hex: '#FFFFFF' },
        { v: 'black', ko: '검정', en: 'Black', hex: '#2B2B35' }
    ];
    /* 색 센서 이벤트: 조명 색 + 색 없음 */
    var SENSOR_COLORS = LIGHT_COLORS.filter(function (c) { return c.v !== 'black'; })
        .concat([{ v: 'none', ko: '색 없음', en: 'No color', hex: '#E2E8F0', none: true }]);
    /* 메시지 (색으로 구분) */
    var MSG_COLORS = [
        { v: 'red', ko: '빨강', en: 'Red', hex: '#FF4D4D' },
        { v: 'orange', ko: '주황', en: 'Orange', hex: '#FF8A3D' },
        { v: 'yellow', ko: '노랑', en: 'Yellow', hex: '#FFD23F' },
        { v: 'green', ko: '초록', en: 'Green', hex: '#3DBE6B' },
        { v: 'blue', ko: '파랑', en: 'Blue', hex: '#3E7BFA' },
        { v: 'pink', ko: '분홍', en: 'Pink', hex: '#FF8FB1' }
    ];

    function num(def, min, max, step) { return { kind: 'num', def: def, min: min, max: max, step: step }; }
    function list(def, opts) { return { kind: 'list', def: def, opts: opts }; }
    function color(def, opts) { return { kind: 'color', def: def, opts: opts }; }
    function cond() { return { kind: 'bool', def: null }; }                       // 조건(육각) 칸
    function txt(def) { return { kind: 'text', def: def }; }                      // 글자 칸
    function val(def) { return { kind: 'num', def: def, min: -99999, max: 99999, step: 1 }; }   // 값을 끼워 넣을 수 있는 숫자 칸
    function vr() { return { kind: 'var', def: '' }; }                            // 변수 이름 칸
    function ls() { return { kind: 'lst', def: '' }; }                            // 리스트 이름 칸
    var MATH_KO = { abs: '절댓값', floor: '버림', ceiling: '올림', sqrt: '제곱근', 'e^': 'e ^', '10^': '10 ^' };
    var MATH_OPTS = ['abs', 'floor', 'ceiling', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'e^', '10^'].map(function (f) {
        return { v: f, ko: MATH_KO[f] || f, en: f };
    });
    var ONLY_UNIT = list('rot', UNIT_OPTS);
    /* 이동 거리 단위: 바퀴 회전수/도/초에 cm, 인치를 더한다 (바퀴 지름으로 바퀴 몇 칸인지 계산) */
    var DIST_OPTS = UNIT_OPTS.concat([{ v: 'cm', ko: 'cm', en: 'cm' }, { v: 'inch', ko: '인치', en: 'inch' }]);
    var DIST_UNIT = list('rot', DIST_OPTS);
    /* 허브 포트 */
    var PORT_OPTS = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (p) { return { v: p, ko: p, en: p }; });
    /* 3x3 조명 포트: 자동 = 연결된 조명을 알아서 찾는다 */
    var LIGHT_PORT_OPTS = [{ v: 'auto', ko: '자동', en: 'Auto' }].concat(PORT_OPTS.slice(0, 2));      // 일단 A, B까지 (나중에 늘린다)
    function lightPort() { return list('auto', LIGHT_PORT_OPTS); }
    var PAT_COLOR = color('white', LIGHT_COLORS.filter(function (c) { return c.v !== 'black'; }));

    /* 블록 정의
       icon: block_icons.js 의 아이콘 이름
       hat: 맨 위에만 올 수 있는 시작 블록
       container: 안쪽에 블록을 끼우는 ㄷ자 블록 */
    var BLOCKS = [
        /* ---- 모터 ---- */
        {
            type: 'motor_run', tab: 'motor', color: 'mo', icon: 'cw', freeHidden: true,
            ko: '모터 {dir} 으로 {n} {unit} 만큼 작동하기', en: 'run motor {dir} for {n} {unit}',
            slots: { dir: { kind: 'dir', def: 'cw', opts: DIR_OPTS }, n: num(1, 0.1, 99), unit: ONLY_UNIT }
        },
        {
            type: 'motor_on', tab: 'motor', color: 'mo', icon: 'cw', freeHidden: true,
            ko: '모터 {dir} 으로 계속 돌리기', en: 'start motor {dir}',
            slots: { dir: { kind: 'dir', def: 'cw', opts: DIR_OPTS } }
        },
        { type: 'motor_stop', tab: 'motor', color: 'mo', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#3B4252" stroke-width="2.4"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#B7C0D0" stroke-width="2.4" stroke-linecap="round"/><rect x="8" y="8" width="8" height="8" rx="1.6" fill="#EF4444"/></svg>', ko: '모터 멈추기', en: 'stop motor', slots: {} },
        {
            type: 'motor_speed', tab: 'motor', color: 'mo', icon: 'gauge',
            ko: '모터 속도를 {n} % 로 정하기', en: 'set motor speed to {n} %',
            slots: { n: num(75, 18, 100) }          // 18% 아래에서는 모터가 돌지 않는다 (실측)
        },

        /* ---- 포트를 골라 쓰는 모터 (허브 직결 전용) ---- */
        {
            type: 'motor_port_run', tab: 'motor', color: 'mo', icon: 'cw',
            ko: '포트 {p} 모터를 {dir} 으로 {n} {unit} 만큼 작동하기', en: 'run port {p} motor {dir} for {n} {unit}',
            slots: { p: lightPort(), dir: { kind: 'dir', def: 'cw', opts: DIR_OPTS }, n: num(1, 0.1, 99), unit: ONLY_UNIT }
        },
        {
            type: 'motor_port_on', tab: 'motor', color: 'mo', icon: 'cw',
            ko: '포트 {p} 모터를 {dir} 으로 계속 돌리기', en: 'start port {p} motor {dir}',
            slots: { p: lightPort(), dir: { kind: 'dir', def: 'cw', opts: DIR_OPTS } }
        },
        { type: 'motor_port_stop', tab: 'motor', color: 'mo', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#3B4252" stroke-width="2.4"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#B7C0D0" stroke-width="2.4" stroke-linecap="round"/><rect x="8" y="8" width="8" height="8" rx="1.6" fill="#EF4444"/></svg>', ko: '포트 {p} 모터 멈추기', en: 'stop port {p} motor', slots: { p: lightPort() } },
        {
            type: 'motor_goto', tab: 'motor', color: 'mo', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" fill="#F1F5F9" stroke="#3B4252" stroke-width="2.2"/><g stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round"><path d="M12 4.4v1.8M19.6 12h-1.8M12 19.6v-1.8M4.4 12h1.8"/></g><path d="M12 5.6A6.4 6.4 0 0 1 17.6 8.8" fill="none" stroke="#3E7BFA" stroke-width="2" stroke-linecap="round"/><path d="M19 6.8l-2.4.4 1.4 2.6z" fill="#3E7BFA" transform="translate(-0.4 0.4)"/><path d="M12 12L16.2 7.8" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="#3B4252"/></svg>',
            ko: '포트 {p} 모터를 {a} 도 위치로 가기', en: 'turn port {p} motor to {a} degrees',
            slots: { p: lightPort(), a: num(0, -180, 180, 1) }
        },
        {
            type: 'motor_reset', tab: 'motor', color: 'mo', icon: 'gauge', hidden: true,
            ko: '포트 {p} 모터 위치를 0 으로 정하기', en: 'reset port {p} motor position to 0',
            slots: { p: lightPort() }
        },

        /* ---- 동작 ---- */
        {
            type: 'mv_move', tab: 'move', color: 'mv', icon: 'gear',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B4252"/><circle cx="12" cy="12" r="7.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round"><path d="M12 6.2v11.6M6.2 12h11.6M7.9 7.9l8.2 8.2M16.1 7.9l-8.2 8.2"/></g><circle cx="12" cy="12" r="2.6" fill="#FF6B6B" stroke="#fff" stroke-width="1"/></svg>',
            ko: '{d} {n} {unit} 만큼 이동하기', en: 'move {d} for {n} {unit}',
            slots: { d: { kind: 'dir', def: 'fwd', opts: VDIR_OPTS }, n: num(1, 0.1, 99), unit: DIST_UNIT }
        },
        {
            type: 'mv_wheel', tab: 'move', color: 'mv', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8.6" r="7.4" fill="#3B4252"/><circle cx="12" cy="8.6" r="5.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"><path d="M12 4.2v8.8M7.6 8.6h8.8M8.9 5.5l6.2 6.2M15.1 5.5l-6.2 6.2"/></g><circle cx="12" cy="8.6" r="1.9" fill="#FF6B6B" stroke="#fff" stroke-width=".8"/><rect x="1.8" y="10.6" width="20.4" height="7" rx="1.6" fill="#FFD23F" stroke="#B8860B" stroke-width="1"/><g stroke="#7A5A00" stroke-width="1.1" stroke-linecap="round"><path d="M5 11.2v3M8.2 11.2v1.9M11.4 11.2v3M14.6 11.2v1.9M17.8 11.2v3"/></g><path d="M3.2 21h17.6M3.2 19.6v2.8M20.8 19.6v2.8" stroke="#3B4252" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
            ko: '바퀴 지름을 {n} mm 로 정하기', en: 'set wheel diameter to {n} mm',
            slots: { n: num(43.2, 10, 200, 0.1) }
        },
        {
            type: 'mv_start', tab: 'move', color: 'mv', icon: 'gear',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B4252"/><circle cx="12" cy="12" r="7.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round"><path d="M12 6.2v11.6M6.2 12h11.6M7.9 7.9l8.2 8.2M16.1 7.9l-8.2 8.2"/></g><circle cx="12" cy="12" r="2.6" fill="#FF6B6B" stroke="#fff" stroke-width="1"/></svg>',
            ko: '{d} 계속 이동하기', en: 'start moving {d}',
            slots: { d: { kind: 'dir', def: 'fwd', opts: VDIR_OPTS } }
        },
        {
            type: 'mv_steer', tab: 'move', color: 'mv', icon: 'gear',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B4252"/><circle cx="12" cy="12" r="7.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round"><path d="M12 6.2v11.6M6.2 12h11.6M7.9 7.9l8.2 8.2M16.1 7.9l-8.2 8.2"/></g><circle cx="12" cy="12" r="2.6" fill="#FF6B6B" stroke="#fff" stroke-width="1"/></svg>',
            ko: '{s} 방향으로 {n} {unit} 만큼 이동하기', en: 'move with steering {s} for {n} {unit}',
            slots: { s: { kind: 'steer', def: 0, min: -100, max: 100 }, n: num(1, 0.1, 99), unit: DIST_UNIT }
        },
        {
            type: 'mv_steer_start', tab: 'move', color: 'mv', icon: 'gear',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B4252"/><circle cx="12" cy="12" r="7.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round"><path d="M12 6.2v11.6M6.2 12h11.6M7.9 7.9l8.2 8.2M16.1 7.9l-8.2 8.2"/></g><circle cx="12" cy="12" r="2.6" fill="#FF6B6B" stroke="#fff" stroke-width="1"/></svg>',
            ko: '{s} 방향으로 계속 이동하기', en: 'start moving with steering {s}',
            slots: { s: { kind: 'steer', def: 0, min: -100, max: 100 } }
        },
        { type: 'mv_stop', tab: 'move', color: 'mv', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B4252"/><circle cx="12" cy="12" r="7.2" fill="#E5E7EB"/><g stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round"><path d="M12 6.2v11.6M6.2 12h11.6M7.9 7.9l8.2 8.2M16.1 7.9l-8.2 8.2"/></g><circle cx="12" cy="12" r="2.6" fill="#FF6B6B" stroke="#fff" stroke-width="1"/></svg>', ko: '이동 멈추기', en: 'stop moving', slots: {} },
        {
            type: 'mv_speed', tab: 'move', color: 'mv', icon: 'gauge',
            ko: '이동 속도를 {n} % 로 정하기', en: 'set movement speed to {n} %',
            slots: { n: num(75, 18, 100) }          // 18% 아래에서는 모터가 돌지 않는다 (실측)
        },
        {
            type: 'fwd', tab: 'move', color: 'mv', icon: 'fwd',
            ko: '앞으로 {n} 번 이동', en: 'move forward {n}', slots: { n: num(1, 1, 99) }
        },
        {
            type: 'back', tab: 'move', color: 'mv', icon: 'back',
            ko: '뒤로 {n} 번 이동', en: 'move backward {n}', slots: { n: num(1, 1, 99) }
        },
        {
            type: 'left', tab: 'move', color: 'mv', icon: 'left',
            ko: '왼쪽으로 {n} 번 돌기', en: 'turn left {n}', slots: { n: num(1, 1, 99) }
        },
        {
            type: 'right', tab: 'move', color: 'mv', icon: 'right',
            ko: '오른쪽으로 {n} 번 돌기', en: 'turn right {n}', slots: { n: num(1, 1, 99) }
        },

        /* ---- 조명 ---- */
        {
            type: 'li_pattern_for', tab: 'light', color: 'li', icon: 'matrix',
            ko: '{pt} 조명 {p} 을 {n} 초 동안 켜기', en: '{pt} light {p} on for {n} seconds',
            slots: { pt: lightPort(), p: { kind: 'pattern', def: '010111010' }, c: PAT_COLOR, n: num(2, 0, 99) }
        },
        {
            type: 'li_pattern', tab: 'light', color: 'li', icon: 'matrix',
            ko: '{pt} 조명 {p} 켜기', en: '{pt} turn light {p} on',
            slots: { pt: lightPort(), p: { kind: 'pattern', def: '010111010' }, c: PAT_COLOR }
        },
        {
            type: 'li_red', tab: 'light', color: 'li', icon: 'matrix',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3.2" y="3.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="9.2" y="3.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="15.2" y="3.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="3.2" y="9.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="9.2" y="9.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="15.2" y="9.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="3.2" y="15.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="9.2" y="15.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/><rect x="15.2" y="15.2" width="5" height="5" rx="1.2" fill="#FF3B3B"/></svg>',
            ko: '{pt} 조명 전체를 {c} 으로 켜기', en: '{pt} turn all lights {c}',
            slots: { pt: lightPort(), c: { kind: 'fixed', def: 'red', label: { ko: '빨간색', en: 'red' }, ink: '#E53935' } }
        },
        { type: 'li_off', tab: 'light', color: 'li', icon: 'matrix', ko: '{pt} 조명 모두 끄기', en: '{pt} turn all lights off', slots: { pt: lightPort() } },
        {
            type: 'li_bright', tab: 'light', color: 'li', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="7.6" fill="#3B3F66"/><rect x="7" y="7" width="3" height="3" rx=".8" fill="#FFF1A8"/><rect x="10.7" y="7" width="3" height="3" rx=".8" fill="#FFD23F"/><rect x="14.4" y="7" width="3" height="3" rx=".8" fill="#FFF1A8"/><rect x="7" y="10.7" width="3" height="3" rx=".8" fill="#FFD23F"/><rect x="10.7" y="10.7" width="3" height="3" rx=".8" fill="#FFF1A8"/><rect x="14.4" y="10.7" width="3" height="3" rx=".8" fill="#FFD23F"/><rect x="7" y="14.4" width="3" height="3" rx=".8" fill="#FFF1A8"/><rect x="10.7" y="14.4" width="3" height="3" rx=".8" fill="#FFD23F"/><rect x="14.4" y="14.4" width="3" height="3" rx=".8" fill="#FFF1A8"/><path d="M12.0 3.8L12.0 1.2M17.8 6.2L19.6 4.4M20.2 12.0L22.8 12.0M17.8 17.8L19.6 19.6M12.0 20.2L12.0 22.8M6.2 17.8L4.4 19.6M3.8 12.0L1.2 12.0M6.2 6.2L4.4 4.4" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
            ko: '{pt} 조명 밝기를 {n} % 로 정하기', en: '{pt} set light brightness to {n} %',
            slots: { pt: lightPort(), n: num(75, 0, 100) }
        },
        {
            type: 'li_pixel', tab: 'light', color: 'li', icon: 'color', hidden: true,
            ko: '조명 {x} 열 {y} 행을 {c} 색, 밝기 {n} % 로 켜기', en: 'set light at x {x} y {y} to {c} at {n} %',
            slots: { x: list(1, XY_OPTS), y: list(1, XY_OPTS), c: color('red', LIGHT_COLORS), n: num(100, 0, 100) }
        },
        {
            type: 'li_rotate', tab: 'light', color: 'li', icon: 'matrix',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#A66BFF"><rect x="2.5" y="8" width="4.2" height="4.2" rx="1"/><rect x="8.2" y="8" width="4.2" height="4.2" rx="1" fill="#FFD23F"/><rect x="13.9" y="8" width="4.2" height="4.2" rx="1"/><rect x="2.5" y="13.7" width="4.2" height="4.2" rx="1" fill="#FF8A3D"/><rect x="8.2" y="13.7" width="4.2" height="4.2" rx="1"/><rect x="13.9" y="13.7" width="4.2" height="4.2" rx="1" fill="#3DBE6B"/><rect x="2.5" y="19.4" width="4.2" height="2.6" rx="1" fill="#3E7BFA"/><rect x="8.2" y="19.4" width="4.2" height="2.6" rx="1"/><rect x="13.9" y="19.4" width="4.2" height="2.6" rx="1" fill="#FF4D4D"/></g><path d="M9 4.2A8 8 0 0 1 20.2 6.4" fill="none" stroke="#3E7BFA" stroke-width="2.2" stroke-linecap="round"/><path d="M21.6 2.2v5.6h-5.6z" fill="#3E7BFA"/></svg>',
            ko: '{pt} 조명 {dir} 으로 돌리기', en: '{pt} rotate light {dir}',
            slots: { pt: lightPort(), dir: { kind: 'dir', def: 'cw', opts: DIR_OPTS } }
        },
        {
            type: 'li_orient', tab: 'light', color: 'li', icon: 'matrix',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#A66BFF"><rect x="2.5" y="8" width="4.2" height="4.2" rx="1"/><rect x="8.2" y="8" width="4.2" height="4.2" rx="1" fill="#FFD23F"/><rect x="13.9" y="8" width="4.2" height="4.2" rx="1"/><rect x="2.5" y="13.7" width="4.2" height="4.2" rx="1" fill="#FF8A3D"/><rect x="8.2" y="13.7" width="4.2" height="4.2" rx="1"/><rect x="13.9" y="13.7" width="4.2" height="4.2" rx="1" fill="#3DBE6B"/><rect x="2.5" y="19.4" width="4.2" height="2.6" rx="1" fill="#3E7BFA"/><rect x="8.2" y="19.4" width="4.2" height="2.6" rx="1"/><rect x="13.9" y="19.4" width="4.2" height="2.6" rx="1" fill="#FF4D4D"/></g><path d="M9 4.2A8 8 0 0 1 20.2 6.4" fill="none" stroke="#3E7BFA" stroke-width="2.2" stroke-linecap="round"/><path d="M21.6 2.2v5.6h-5.6z" fill="#3E7BFA"/></svg>',
            ko: '{pt} 조명 방향을 {o} 으로 이동/되돌리기', en: '{pt} move/restore light direction to {o}',
            slots: { pt: lightPort(), o: list('straight', ORIENT_OPTS) }
        },
        {
            type: 'li_center', tab: 'light', color: 'li', icon: 'color',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.8" y="4.6" width="18.4" height="14.8" rx="4.2" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="#3E7BFA" stroke="#fff" stroke-width="1.2"/><rect x="5.6" y="2.2" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="15.4" y="2.2" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="5.6" y="19.4" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="15.4" y="19.4" width="3" height="2.4" rx=".8" fill="#6B7280"/></svg>',
            ko: '허브 가운데 조명색을 {c} 로 설정하기', en: 'set hub center light color to {c}',
            slots: { c: color('blue', LIGHT_COLORS) }
        },

        /* ---- 소리 ---- */
        {
            type: 'so_play_wait', tab: 'sound', color: 'so', icon: 'sound',
            ko: '{s} 끝까지 재생하기', en: 'play {s} until done', slots: { s: list(1, SOUND_OPTS) }
        },
        {
            type: 'so_play', tab: 'sound', color: 'so', icon: 'sound',
            ko: '{s} 재생하기', en: 'play {s}', slots: { s: list(1, SOUND_OPTS) }
        },
        { type: 'so_stop', tab: 'sound', color: 'so', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.4 8.6h3.8L11.6 4v14L6.2 13.4H2.4z" fill="#E8458B"/><path d="M14.2 8.4a4.6 4.6 0 0 1 0 5.2" fill="none" stroke="#E8458B" stroke-width="1.8" stroke-linecap="round" opacity=".7"/><circle cx="17.4" cy="16.8" r="5.4" fill="#EF4444" stroke="#fff" stroke-width="1.4"/><rect x="14.8" y="14.2" width="5.2" height="5.2" rx="1.1" fill="#fff"/></svg>', slots: {} },
        {
            type: 'so_pitch_change', tab: 'sound', color: 'so', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="7.2" cy="17.2" rx="3" ry="2.4" fill="#E8458B" transform="rotate(-18 7.2 17.2)"/><path d="M9.9 16.4V5.2l5 1.8v2.6l-3-1.1v7.9" fill="#E8458B"/><path d="M19 3.6l3.4 4.4h-6.8zM19 20.4l3.4-4.4h-6.8z" fill="#3E7BFA"/><path d="M19 8v8" stroke="#3E7BFA" stroke-width="2" stroke-linecap="round"/></svg>',
            ko: '음높이 효과를 {n} 만큼 바꾸기', en: 'change pitch effect by {n}',
            slots: { n: num(10, -100, 100) }
        },
        {
            type: 'so_pitch_set', tab: 'sound', color: 'so', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="7.2" cy="17.2" rx="3" ry="2.4" fill="#E8458B" transform="rotate(-18 7.2 17.2)"/><path d="M9.9 16.4V5.2l5 1.8v2.6l-3-1.1v7.9" fill="#E8458B"/><path d="M19 3.6l3.4 4.4h-6.8zM19 20.4l3.4-4.4h-6.8z" fill="#3E7BFA"/><path d="M19 8v8" stroke="#3E7BFA" stroke-width="2" stroke-linecap="round"/></svg>',
            ko: '음높이 효과를 {n} 으로 정하기', en: 'set pitch effect to {n}',
            slots: { n: num(0, -100, 100) }
        },
        {
            type: 'so_pan_change', tab: 'sound', color: 'so', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#B7C0D0" stroke-width="2.2" stroke-linecap="round"><path d="M3.8 5.5h16.4M3.8 12h16.4M3.8 18.5h16.4"/></g><circle cx="14.6" cy="5.5" r="2.9" fill="#E8458B" stroke="#fff" stroke-width="1.2"/><circle cx="8.2" cy="12" r="2.9" fill="#3E7BFA" stroke="#fff" stroke-width="1.2"/><circle cx="16.2" cy="18.5" r="2.9" fill="#FFB020" stroke="#fff" stroke-width="1.2"/><path d="M1.6 12l1.8-1.5v3zM22.4 12l-1.8-1.5v3z" fill="#7C8AA5"/></svg>',
            ko: '좌우 균형 효과를 {n} 만큼 바꾸기', en: 'change pan effect by {n}',
            slots: { n: num(10, -100, 100) }
        },
        {
            type: 'so_pan_set', tab: 'sound', color: 'so', icon: 'gauge',
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#B7C0D0" stroke-width="2.2" stroke-linecap="round"><path d="M3.8 5.5h16.4M3.8 12h16.4M3.8 18.5h16.4"/></g><circle cx="14.6" cy="5.5" r="2.9" fill="#E8458B" stroke="#fff" stroke-width="1.2"/><circle cx="8.2" cy="12" r="2.9" fill="#3E7BFA" stroke="#fff" stroke-width="1.2"/><circle cx="16.2" cy="18.5" r="2.9" fill="#FFB020" stroke="#fff" stroke-width="1.2"/><path d="M1.6 12l1.8-1.5v3zM22.4 12l-1.8-1.5v3z" fill="#7C8AA5"/></svg>',
            ko: '좌우 균형 효과를 {n} 으로 정하기', en: 'set pan effect to {n}',
            slots: { n: num(0, -100, 100) }
        },
        {
            type: 'so_effect_change', tab: 'sound', color: 'so', icon: 'gauge', hidden: true,
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="7.2" cy="17.2" rx="3" ry="2.4" fill="#E8458B" transform="rotate(-18 7.2 17.2)"/><path d="M9.9 16.4V5.2l5 1.8v2.6l-3-1.1v7.9" fill="#E8458B"/><path d="M19 3.6l3.4 4.4h-6.8zM19 20.4l3.4-4.4h-6.8z" fill="#3E7BFA"/><path d="M19 8v8" stroke="#3E7BFA" stroke-width="2" stroke-linecap="round"/></svg>',
            ko: '{e} 효과를 {n} 만큼 바꾸기', en: 'change {e} effect by {n}',
            slots: { e: list('pitch', EFFECT_OPTS), n: num(10, -100, 100) }
        },
        {
            type: 'so_effect_set', tab: 'sound', color: 'so', icon: 'gauge', hidden: true,
            iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#B7C0D0" stroke-width="2.2" stroke-linecap="round"><path d="M5.5 3.8v16.4M12 3.8v16.4M18.5 3.8v16.4"/></g><circle cx="5.5" cy="14.6" r="2.9" fill="#E8458B" stroke="#fff" stroke-width="1.2"/><circle cx="12" cy="8.2" r="2.9" fill="#3E7BFA" stroke="#fff" stroke-width="1.2"/><circle cx="18.5" cy="16.2" r="2.9" fill="#FFB020" stroke="#fff" stroke-width="1.2"/></svg>',
            ko: '{e} 효과를 {n} 으로 정하기', en: 'set {e} effect to {n}',
            slots: { e: list('pitch', EFFECT_OPTS), n: num(100, -100, 100) }
        },
        { type: 'so_effect_clear', tab: 'sound', color: 'so', icon: 'sound', ko: '소리 효과 지우기', en: 'clear sound effects', slots: {} },
        {
            type: 'so_vol_change', tab: 'sound', color: 'so', icon: 'sound',
            ko: '볼륨을 {n} 만큼 바꾸기', en: 'change volume by {n}', slots: { n: num(-10, -100, 100) }
        },
        {
            type: 'so_vol_set', tab: 'sound', color: 'so', icon: 'sound',
            ko: '볼륨을 {n} % 로 정하기', en: 'set volume to {n} %', slots: { n: num(100, 0, 100) }
        },

        /* ---- 이벤트 ---- */
        { type: 'start', tab: 'event', color: 'ev', icon: 'start', hat: true, ko: '시작하면', en: 'when started', slots: {} },
        {
            type: 'ev_color', tab: 'event', color: 'ev', icon: 'color', hat: true,
            ko: '색 센서에 {c} 이 보이면', en: 'when color sensor sees {c}', slots: { c: color('red', SENSOR_COLORS) }
        },
        {
            type: 'ev_tilt', tab: 'event', color: 'ev', icon: 'tilt', hat: true,
            ko: '허브가 {t} 으로 기울면', en: 'when hub tilts {t}', slots: { t: list('front', TILT_OPTS) }
        },
        {
            type: 'ev_force', tab: 'event', color: 'ev', icon: 'tilt', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="11" width="17" height="9.5" rx="3" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><rect x="8" y="6.4" width="8" height="4.6" rx="1.4" fill="#FFB020" stroke="#fff" stroke-width="1"/><path d="M12 1.6v3.4M10 3.6l2 2 2-2" fill="none" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', hat: true,
            ko: '힘 센서가 {s}', en: 'when force sensor is {s}', slots: { s: list('pressed', FORCE_OPTS) }
        },
        {
            type: 'ev_distance', tab: 'event', color: 'ev', icon: 'tilt', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.8" y="3.4" width="18.4" height="10" rx="3.6" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><circle cx="8.4" cy="8.4" r="2.6" fill="#fff" stroke="#6B7280" stroke-width="1.4"/><circle cx="15.6" cy="8.4" r="2.6" fill="#fff" stroke="#6B7280" stroke-width="1.4"/><path d="M7 16.2q5 3 10 0M5 19.4q7 4 14 0" fill="none" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round"/></svg>', hat: true,
            ko: '거리 센서에 {cm} cm 안으로 물체가 들어오면', en: 'when something comes within {cm} cm of the distance sensor', slots: { cm: num(20, 1, 200) }
        },
        {
            type: 'ev_up', tab: 'event', color: 'ev', icon: 'tilt', hat: true,
            ko: '허브의 {f} 이 위를 향하면', en: 'when hub {f} is up', slots: { f: list('top', FACE_OPTS) }
        },
        {
            type: 'ev_gesture', tab: 'event', color: 'ev', icon: 'tilt', hat: true,
            ko: '허브를 {g}', en: 'when hub is {g}', slots: { g: list('shaken', GESTURE_OPTS) }
        },
        /* AI 이벤트: 해당 단원(units)의 보관 칸에만 나온다 */
        {
            type: 'ev_ai_gesture', tab: 'event', color: 'ai', icon: 'hand', hat: true, units: ['6'],
            ko: 'AI 손 제스처가 {g} 로 보이면', en: 'when AI sees {g}', slots: { g: list('any', AI_GESTURE_OPTS) }
        },
        {
            type: 'ev_ai_voice', tab: 'event', color: 'ai', icon: 'mic', hat: true, units: ['7'],
            ko: 'AI 음성 명령을 받으면', en: 'when AI hears a voice command', slots: {}
        },
        {
            type: 'ev_ai_vision', tab: 'event', color: 'ai', icon: 'monster', hat: true, units: ['8'],
            ko: 'AI 비전에 몬스터가 보이면', en: 'when AI vision sees a monster', slots: {}
        },
        {
            type: 'ev_timer', tab: 'event', color: 'ev', icon: 'wait', hat: true,
            ko: '타이머가 {n} 초를 넘으면', en: 'when timer > {n} seconds', slots: { n: num(10, 0, 999) }
        },
        {
            type: 'ev_recv', tab: 'event', color: 'ev', icon: 'mail', hat: true,
            ko: '{m} 메시지를 받으면', en: 'when I receive {m}', slots: { m: color('red', MSG_COLORS) }
        },
        {
            type: 'ev_send', tab: 'event', color: 'ev', icon: 'send',
            ko: '{m} 메시지 보내기', en: 'broadcast {m}', slots: { m: color('red', MSG_COLORS) }
        },
        {
            type: 'ev_send_wait', tab: 'event', color: 'ev', icon: 'send',
            ko: '{m} 메시지를 보내고 기다리기', en: 'broadcast {m} and wait', slots: { m: color('red', MSG_COLORS) }
        },

        /* ---- 조건 이벤트 ---- */
        {
            type: 'ev_cond', tab: 'event', color: 'ev', icon: 'start', hat: true,
            ko: '{c} 가 참이 되면', en: 'when {c}', slots: { c: cond() }
        },

        /* ---- 제어 (조건) ---- */
        {
            type: 'ct_if', tab: 'control', color: 'lp', icon: 'force', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.4l9.6 9.6-9.6 9.6L2.4 12z" fill="#3E7BFA"/><path d="M7.6 12.2l3.2 3.2 5.8-6.4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', container: true,
            ko: '만약 {c} 라면', en: 'if {c} then', slots: { c: cond() }
        },
        {
            type: 'ct_if_else', tab: 'control', color: 'lp', icon: 'force', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.6v-7.4" stroke="#3B4252" stroke-width="2.6" stroke-linecap="round"/><path d="M12 14.2L5.6 7" stroke="#3E7BFA" stroke-width="2.6" stroke-linecap="round"/><path d="M12 14.2L18.4 7" stroke="#FF8A3D" stroke-width="2.6" stroke-linecap="round"/><path d="M2.6 4.6l7.2.8-4.4 5.4z" fill="#3E7BFA"/><path d="M21.4 4.6l-7.2.8 4.4 5.4z" fill="#FF8A3D"/></svg>', container: true, arms: 2,
            midKo: '아니면', midEn: 'else',
            ko: '만약 {c} 라면', en: 'if {c} then', slots: { c: cond() }
        },
        {
            type: 'ct_wait_until', tab: 'control', color: 'lp', icon: 'wait',
            ko: '{c} 까지 기다리기', en: 'wait until {c}', slots: { c: cond() }
        },
        {
            type: 'ct_repeat_until', tab: 'control', color: 'lp', icon: 'repeat', container: true,
            ko: '{c} 까지 반복하기', en: 'repeat until {c}', slots: { c: cond() }
        },

        /* ---- 센서 ---- */
        {
            type: 'sn_color_is', tab: 'sensor', color: 'se', repIcon: 'color', shape: 'bool',
            ko: '색 센서에 {c} 이 보이나요?', en: 'color sensor sees {c}?', slots: { c: color('red', SENSOR_COLORS) }
        },
        { type: 'sn_color', tab: 'sensor', color: 'se', repIcon: 'color', shape: 'value', ko: '색 센서가 본 색 번호', en: 'color sensor color number', slots: {} },
        { type: 'sn_reflect', tab: 'sensor', color: 'se', repIcon: 'color', shape: 'value', ko: '색 센서 반사 빛 세기(%)', en: 'color sensor reflected light (%)', slots: {} },
        { type: 'sn_ambient', tab: 'sensor', color: 'se', repIcon: 'color', shape: 'value', ko: '색 센서 주변 빛 세기(%)', en: 'color sensor ambient light (%)', slots: {} },
        {
            type: 'sn_tilted', tab: 'sensor', color: 'se', repIconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.8" y="4.6" width="18.4" height="14.8" rx="4.2" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="#3E7BFA" stroke="#fff" stroke-width="1.2"/><rect x="5.6" y="2.2" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="15.4" y="2.2" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="5.6" y="19.4" width="3" height="2.4" rx=".8" fill="#6B7280"/><rect x="15.4" y="19.4" width="3" height="2.4" rx=".8" fill="#6B7280"/></svg>', shape: 'bool',
            ko: '허브가 {t} 으로 기울었나요?', en: 'hub tilted {t}?', slots: { t: list('front', TILT_OPTS) }
        },
        { type: 'sn_force_is', tab: 'sensor', color: 'se', repIconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="11" width="17" height="9.5" rx="3" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><rect x="8" y="6.4" width="8" height="4.6" rx="1.4" fill="#FFB020" stroke="#fff" stroke-width="1"/><path d="M12 1.6v3.4M10 3.6l2 2 2-2" fill="none" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', shape: 'bool', ko: '힘 센서가 눌렸나요?', en: 'force sensor pressed?', slots: {} },
        { type: 'sn_force', tab: 'sensor', color: 'se', repIconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="11" width="17" height="9.5" rx="3" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><rect x="8" y="6.4" width="8" height="4.6" rx="1.4" fill="#FFB020" stroke="#fff" stroke-width="1"/><path d="M12 1.6v3.4M10 3.6l2 2 2-2" fill="none" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', shape: 'value', ko: '힘 센서가 느끼는 힘', en: 'force sensor force', slots: {} },
        { type: 'sn_distance', tab: 'sensor', color: 'se', repIconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.8" y="3.4" width="18.4" height="10" rx="3.6" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.6"/><circle cx="8.4" cy="8.4" r="2.6" fill="#fff" stroke="#6B7280" stroke-width="1.4"/><circle cx="15.6" cy="8.4" r="2.6" fill="#fff" stroke="#6B7280" stroke-width="1.4"/><path d="M7 16.2q5 3 10 0M5 19.4q7 4 14 0" fill="none" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round"/></svg>', shape: 'value', ko: '거리 센서가 본 거리(cm)', en: 'distance sensor distance (cm)', slots: {} },
        { type: 'sn_timer', tab: 'sensor', color: 'se', repIcon: 'wait', shape: 'value', ko: '타이머', en: 'timer', slots: {} },
        { type: 'sn_reset_timer', tab: 'sensor', color: 'se', icon: 'wait', ko: '타이머 초기화', en: 'reset timer', slots: {} },

        /* ---- 연산 (값) ---- */
        { type: 'op_random', tab: 'ops', color: 'op', shape: 'value', ko: '{a} 부터 {b} 사이의 무작위 수', en: 'random {a} to {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_add', tab: 'ops', color: 'op', shape: 'value', ko: '{a} + {b}', en: '{a} + {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_sub', tab: 'ops', color: 'op', shape: 'value', ko: '{a} − {b}', en: '{a} − {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_mul', tab: 'ops', color: 'op', shape: 'value', ko: '{a} × {b}', en: '{a} × {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_div', tab: 'ops', color: 'op', shape: 'value', ko: '{a} ÷ {b}', en: '{a} ÷ {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_mod', tab: 'ops', color: 'op', shape: 'value', ko: '{a} ÷ {b} 의 나머지', en: '{a} mod {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_round', tab: 'ops', color: 'op', shape: 'value', ko: '{a} 의 반올림', en: 'round {a}', slots: { a: val('') } },
        { type: 'op_math', tab: 'ops', color: 'op', shape: 'value', ko: '{f} ( {a} )', en: '{f} of {a}', slots: { f: list('abs', MATH_OPTS), a: val(0) } },
        { type: 'op_join', tab: 'ops', color: 'op', shape: 'value', ko: '{a} 와 {b} 합치기', en: 'join {a} and {b}', slots: { a: txt('apple'), b: txt('banana') } },
        { type: 'op_letter', tab: 'ops', color: 'op', shape: 'value', ko: '{s} 의 {n} 번째 글자', en: 'letter {n} of {s}', slots: { n: val(1), s: txt('apple') } },
        { type: 'op_length', tab: 'ops', color: 'op', shape: 'value', ko: '{s} 의 글자 수', en: 'length of {s}', slots: { s: txt('apple') } },

        /* ---- 연산 (조건) ---- */
        { type: 'op_lt', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} < {b}', en: '{a} < {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_eq', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} = {b}', en: '{a} = {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_gt', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} > {b}', en: '{a} > {b}', slots: { a: val(''), b: val('') } },
        { type: 'op_and', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} 그리고 {b}', en: '{a} and {b}', slots: { a: cond(), b: cond() } },
        { type: 'op_or', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} 또는 {b}', en: '{a} or {b}', slots: { a: cond(), b: cond() } },
        { type: 'op_not', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} 가 아니다', en: 'not {a}', slots: { a: cond() } },
        { type: 'op_between', tab: 'ops', color: 'op', shape: 'bool', ko: '{a} 가 {lo} 와 {hi} 사이인가요?', en: 'is {a} between {lo} and {hi}?', slots: { a: val(''), lo: val(''), hi: val('') } },
        { type: 'op_contains', tab: 'ops', color: 'op', shape: 'bool', ko: '{s} 에 {t} 가 들어 있나요?', en: '{s} contains {t}?', slots: { s: txt('apple'), t: txt('a') } },

        /* ---- 변수 ---- */
        { type: 'var', tab: 'my', color: 'my', shape: 'value', ko: '{name}', en: '{name}', slots: { name: vr() } },
        {
            type: 'var_set', tab: 'my', color: 'my', icon: 'gauge',
            ko: '{name} 을(를) {v} (으)로 정하기', en: 'set {name} to {v}', slots: { name: vr(), v: val(0) }
        },
        {
            type: 'var_change', tab: 'my', color: 'my', icon: 'gauge',
            ko: '{name} 을(를) {v} 만큼 바꾸기', en: 'change {name} by {v}', slots: { name: vr(), v: val(1) }
        },

        /* ---- 리스트 ---- */
        { type: 'lst_add', tab: 'my', color: 'my', icon: 'gauge', ko: '{x} 을(를) {l} 에 추가하기', en: 'add {x} to {l}', slots: { x: txt('thing'), l: ls() } },
        { type: 'lst_delete', tab: 'my', color: 'my', icon: 'gauge', ko: '{l} 의 {n} 번째 항목 지우기', en: 'delete {n} of {l}', slots: { l: ls(), n: val(1) } },
        { type: 'lst_clear', tab: 'my', color: 'my', icon: 'gauge', ko: '{l} 의 모든 항목 지우기', en: 'delete all of {l}', slots: { l: ls() } },
        { type: 'lst_insert', tab: 'my', color: 'my', icon: 'gauge', ko: '{x} 을(를) {l} 의 {n} 번째에 넣기', en: 'insert {x} at {n} of {l}', slots: { x: txt('thing'), l: ls(), n: val(1) } },
        { type: 'lst_replace', tab: 'my', color: 'my', icon: 'gauge', ko: '{l} 의 {n} 번째 항목을 {x} (으)로 바꾸기', en: 'replace item {n} of {l} with {x}', slots: { l: ls(), n: val(1), x: txt('thing') } },
        { type: 'lst_val', tab: 'my', color: 'my', shape: 'value', ko: '{l}', en: '{l}', slots: { l: ls() } },
        { type: 'lst_item', tab: 'my', color: 'my', shape: 'value', ko: '{l} 의 {n} 번째 항목', en: 'item {n} of {l}', slots: { l: ls(), n: val(1) } },
        { type: 'lst_index', tab: 'my', color: 'my', shape: 'value', ko: '{x} 의 위치 ({l})', en: 'item # of {x} in {l}', slots: { x: txt('thing'), l: ls() } },
        { type: 'lst_length', tab: 'my', color: 'my', shape: 'value', ko: '{l} 의 항목 수', en: 'length of {l}', slots: { l: ls() } },
        { type: 'lst_contains', tab: 'my', color: 'my', shape: 'bool', ko: '{l} 에 {x} 가 들어 있나요?', en: '{l} contains {x}?', slots: { l: ls(), x: txt('thing') } },

        /* ---- 내 블록: 정의 안에서 입력 값을 꺼내 쓰는 블록 (정의/호출 블록은 만들 때 동적으로 등록) ---- */
        { type: 'my_param_v', tab: 'my', color: 'my', shape: 'value', ko: '{n}', en: '{n}', slots: { pid: { kind: 'pname', def: '' }, n: { kind: 'pname', def: '' } } },
        { type: 'my_param_b', tab: 'my', color: 'my', shape: 'bool', ko: '{n}', en: '{n}', slots: { pid: { kind: 'pname', def: '' }, n: { kind: 'pname', def: '' } } },

        /* ---- 제어 ---- */
        {
            type: 'wait', tab: 'control', color: 'lp', icon: 'wait',
            ko: '{n} 초 기다리기', en: 'wait {n} seconds', slots: { n: num(1, 0, 99) }
        },
        {
            type: 'repeat', tab: 'control', color: 'lp', icon: 'repeat', container: true,
            ko: '{n} 번 반복하기', en: 'repeat {n} times', slots: { n: num(4, 1, 99) }
        },
        {
            type: 'forever', tab: 'control', color: 'lp', icon: 'forever', container: true,
            ko: '무한 반복하기', en: 'repeat forever', slots: {}
        },
        { type: 'log_show', tab: 'control', color: 'lp', icon: 'gauge', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.4" y="3.4" width="19.2" height="14" rx="3.4" fill="#3E7BFA"/><path d="M7 17.2l-.6 4 5-4z" fill="#3E7BFA"/><g stroke="#fff" stroke-width="1.9" stroke-linecap="round"><path d="M6.4 8h11.2M6.4 12.4h7"/></g></svg>', ko: '{x} 을(를) 통신 로그에 보여 주기', en: 'show {x} in the log', slots: { x: txt('') } },
        { type: 'ct_stop_other', tab: 'control', color: 'lp', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#B7C0D0"><rect x="2.4" y="3.6" width="12.6" height="4" rx="1.4"/><rect x="2.4" y="10" width="12.6" height="4" rx="1.4" fill="#3E7BFA"/><rect x="2.4" y="16.4" width="12.6" height="4" rx="1.4"/></g><path d="M18.4 9.4h3.6l2 2v3.6l-2 2h-3.6l-2-2v-3.6z" fill="#EF4444" transform="translate(-1.4 -1.4)"/><rect x="17.2" y="11.2" width="3.4" height="3.4" rx=".7" fill="#fff"/></svg>', ko: '다른 스택 멈추기', en: 'stop other stacks', slots: {} },
        {
            type: 'ct_stop', tab: 'control', color: 'lp', icon: 'stop', iconSvg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.2 2.6h7.6l5.6 5.6v7.6l-5.6 5.6H8.2l-5.6-5.6V8.2z" fill="#EF4444"/><rect x="7.6" y="7.6" width="8.8" height="8.8" rx="1.6" fill="#fff"/></svg>',
            ko: '{m} 멈추기', en: 'stop {m}', slots: { m: list('all', STOP_OPTS) }
        }
    ];

    var byType = {};
    BLOCKS.forEach(function (b) { byType[b.type] = b; });

    // 내가 녹음한 소리를 소리 고르기 목록에 이어 붙인다 (SOUND_OPTS 배열을 그대로 고쳐서 모든 소리 블록이 함께 바뀐다)
    function syncRecorded() {
        if (!window.SoundLib) return;
        SOUND_OPTS.length = 8;
        SoundLib.list().forEach(function (s) { SOUND_OPTS.push({ v: 'rec:' + s.id, ko: '🎤 ' + s.num + ' ' + (s.name || ''), en: '🎤 ' + s.num + ' ' + (s.name || '') }); });
    }
    syncRecorded();
    if (window.SoundLib) SoundLib.onChange(syncRecorded);

    window.WORD_BLOCKS = { CATS: CATS, COLORS: COLORS, BLOCKS: BLOCKS, byType: byType, LIGHT_COLORS: LIGHT_COLORS };
})();
