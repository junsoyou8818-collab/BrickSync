/* 아이콘 모드 모터 포트 자동 선택
 *   허브가 "어느 포트에 어떤 장치가 꽂혔는지"(hubDevices) 알려 주므로, 그중 모터만 골라 포트 번호 순으로 돌려준다.
 *   모터를 A 에 꽂든 B 에 꽂든(프라임은 A~F) 같게 동작하게 하기 위한 것이다.
 *   반환: [{ port: 포트 번호(0=A, 1=B ...), role: 모터 순서(0, 1 ...) }]
 *   - 자동차 블록은 role 로 왼쪽/오른쪽 모터를 구분한다 (번호가 낮은 포트가 role 0).
 *   - 허브 정보를 아직 못 받았거나 모터를 못 찾으면 예전처럼 A, B 로 시도한다 (센서·라이트 매트릭스 포트는 제외).
 */
(function () {
    // 모터가 아닌 장치 종류 (LWP3 IO 타입): 불빛, 전압/전류, 피에조, 기울기/움직임 센서, 색/거리/힘 센서, 라이트 매트릭스 등
    var NON_MOTOR = { 8: 1, 20: 1, 21: 1, 22: 1, 23: 1, 34: 1, 35: 1, 36: 1, 37: 1, 40: 1, 57: 1, 58: 1, 59: 1, 60: 1, 61: 1, 62: 1, 63: 1, 64: 1 };

    window.bsMotorPorts = function (attached) {
        attached = attached || {};
        var found = [];
        for (var p = 0; p < 6; p++) {                      // 바깥 포트 A~F 만 (안쪽 포트는 허브 불빛·센서)
            var t = attached[p];
            if (t !== undefined && t !== null && !NON_MOTOR[Number(t)]) found.push({ port: p, role: found.length });
        }
        if (found.length) return found;
        var legacy = [];
        for (var q = 0; q < 2; q++) {
            var d = attached[q];
            if (!(d === 64 || d === 61 || d === 62 || d === 63)) legacy.push({ port: q, role: q });
        }
        return legacy;
    };

    // 회전 블록의 예상 소요 시간(ms): 바퀴 수 x 360도를 속도로 나눈 값 (넉넉하게 잡는다. 실제로는 허브의 완료 신호로 넘어간다)
    window.bsTurnEstMs = function (turns, speed) {
        var sp = Math.max(10, Math.abs(Number(speed) || 40));
        return Math.round(Math.abs(Number(turns) || 1) * 360 * 1000 / (sp * 6)) + 300;
    };

    /* ---- 자동차 이동/회전: 시간이 아니라 "바퀴 각도"로 (허브가 각자 정해진 각도에서 멈춘다) ----
     *   앞으로/뒤로 1번 = 바퀴 stepDeg 도 (360 = 바퀴 한 바퀴, 약 13cm)
     *   왼쪽/오른쪽 1번 = 차체 turnAngle 도 회전 = 두 바퀴가 서로 반대로 trackMm * turnAngle / wheelMm 도
     *   값을 바꾸려면 아래 숫자만 고치면 된다. */
    window.BS_CAR = { wheelMm: 42, trackMm: 80, stepDeg: 360, turnAngle: 90 };
    window.bsCarWheelDeg = function (dir, n) {
        var C = window.BS_CAR, isTurn = (dir === 'left' || dir === 'right');
        var per = isTurn ? C.trackMm * C.turnAngle / C.wheelMm : C.stepDeg;
        return Math.max(1, Math.round(Math.abs(Number(n) || 1) * per));
    };
    window.bsCarEstMs = function (deg, speed) {   // 예상 소요 시간(ms): 완료 신호가 안 와도 넘어가기 위한 넉넉한 상한
        return Math.round(Math.abs(deg) * 1000 / (Math.max(10, Math.abs(Number(speed) || 40)) * 6)) + 300;
    };
    // 바퀴별 방향 부호 [첫째 바퀴(포트 번호 낮은 쪽), 둘째 바퀴]: 앞으로 = (-, +), 뒤로 = (+, -), 오른쪽 = (-, -), 왼쪽 = (+, +)
    window.bsCarSigns = function (dir) {
        if (dir === 'fwd') return [-1, 1];
        if (dir === 'back') return [1, -1];
        if (dir === 'right') return [-1, -1];
        return [1, 1];
    };
    // 두 바퀴에 "각도만큼 돌리기"(StartSpeedForDegrees)를 기다림 없이 연달아 보내고, 두 바퀴가 다 돌았다는 신호를 기다린다
    // hw = 허브 연결을 가진 창(hubDevices / writeToHub / hubMotorDone), alive() = 아직 실행 중인지. 반환: 신호로 끝났으면 true
    window.bsCarDriveDeg = async function (hw, dir, deg, speed, est, alive) {
        var attached = hw.hubDevices || {}, send = hw.writeToHub;
        var mps = window.bsMotorPorts(attached).slice(0, 2);
        if (typeof send !== 'function' || !mps.length) return { ok: false, ms: 0, ports: [], sent: false, doneAt: {} };
        var sg = window.bsCarSigns(dir);
        var sp = Math.max(10, Math.min(100, Math.abs(Math.round(speed || 40))));
        hw.hubMotorDone = hw.hubMotorDone || {};
        var t0 = Date.now(), ports = [], writes = [], wres = {};
        mps.forEach(function (mp) {
            var v = sp * (mp.role === 0 ? sg[0] : sg[1]);
            ports.push(mp.port);
            var pkt = new Uint8Array([14, 0x00, 0x81, mp.port, 0x11, 0x0B, deg & 255, (deg >>> 8) & 255, (deg >>> 16) & 255, (deg >>> 24) & 255, v < 0 ? 256 + v : v, 100, 127, 0x00]);
            writes.push((async function (port) {            // 쓰기 결과를 남기고, 실패하면 한 번 더 시도한다
                try { await send(pkt); wres[port] = 'ok'; }
                catch (e1) { try { await (window.bsSleep || function (x) { return new Promise(function (r) { setTimeout(r, x); }); })(40); await send(pkt); wres[port] = '재시도ok'; } catch (e2) { wres[port] = '오류:' + String((e2 && e2.message) || e2).slice(0, 40); } }
            })(mp.port));
        });
        await Promise.all(writes);
        var limit = (est || 3000) + 1200;      // 완료 신호가 안 와도 예상 시간 + 1.2초 뒤에는 넘어간다
        var isDone = function () { return ports.every(function (p) { return (hw.hubMotorDone[p] || 0) > t0; }); };
        while ((!alive || alive()) && Date.now() - t0 < limit && !isDone()) await (window.bsSleep || function (x) { return new Promise(function (r) { setTimeout(r, x); }); })(30);
        var doneAt = {};
        ports.forEach(function (p) { var d = hw.hubMotorDone[p] || 0; doneAt[p] = d > t0 ? (d - t0) : null; });
        var ok = isDone(), ms = Date.now() - t0;
        if (!ok) {                             // 멈춤 / 신호 없음: 안전하게 정지
            for (var i = 0; i < ports.length; i++) { try { await send(new Uint8Array([8, 0, 0x81, ports[i], 0x10, 0x51, 0x00, 0])); } catch (e) { } }
        }
        var types = {}; ports.forEach(function (p) { types[p] = attached[p]; });
        return { ok: ok, ms: ms, ports: ports, sent: true, doneAt: doneAt, wres: wres, types: types };
    };
    /* 모터 "N바퀴" 회전이 끝날 때까지 기다린다 (아이콘/워드 모드 공통)
     *   - 허브의 "다 돌았다" 신호(hubMotorDone)가 와야 끝난 것으로 본다.
     *   - 그런데 이전 명령의 늦은 신호나 중복 신호가 먼저 도착하면 회전이 끝나기 전에 다음 명령이 나가서 회전이 짧아진다.
     *     그래서 이론상 걸리는 시간(속도 1%당 약 6도/초)의 80% 가 지나기 전에 온 신호는 무시하고 계속 기다린다.
     *   - 신호가 안 와도 예상 시간 + 1.2초 뒤에는 넘어간다. 끝난 뒤에는 브레이크가 자리 잡도록 0.15초 더 쉰다.
     * 반환: { ok: 신호로 끝남, ms: 걸린 시간, theoryMs: 이론 시간, early: 일찍 온 신호를 무시한 횟수 } */
    window.bsMotorTurnWait = async function (hw, port, t0, deg, speed, est, alive) {
        var sleep = window.bsSleep || function (x) { return new Promise(function (r) { setTimeout(r, x); }); };
        var theory = Math.round(Math.abs(deg) * 1000 / (Math.max(10, Math.abs(Number(speed) || 40)) * 6));
        var minMs = Math.round(theory * 0.8), limit = (est || theory + 300) + 1200, early = 0, seen = 0, ok = false;
        while ((!alive || alive()) && Date.now() - t0 < limit) {
            var d = (hw.hubMotorDone || {})[port] || 0;
            if (d > t0) {
                if (d - t0 >= minMs) { ok = true; break; }
                if (d !== seen) { seen = d; early++; }          // 너무 일찍 온 신호: 무시
            }
            await sleep(30);
        }
        if (ok) await sleep(150);
        return { ok: ok, ms: Date.now() - t0, theoryMs: theory, early: early };
    };
    window.bsMotorTurnLine = function (r) {
        return (r.ok ? '✓ 모터 회전 완료 ' : '⚠ 완료 신호 없음 ') + '(' + (r.ms / 1000).toFixed(2) + '초, 이론 ' + (r.theoryMs / 1000).toFixed(2) + '초' + (r.early ? ', 너무 일찍 온 신호 ' + r.early + '번 무시' : '') + ')';
    };
    // 통신 로그에 남길 한 줄 요약
    window.bsCarDriveLine = function (r) {
        if (!r.sent) return '⚠ 자동차 이동 명령을 보내지 못했어요 (허브 또는 모터를 찾지 못함)';
        var pd = r.ports.map(function (p) { return 'ABCDEF'.charAt(p) + ':' + (r.doneAt[p] === null ? '신호없음' : (r.doneAt[p] / 1000).toFixed(2) + '초'); }).join(' ');
        var wr = r.ports.map(function (p) { return 'ABCDEF'.charAt(p) + ':' + ((r.wres && r.wres[p]) || '?'); }).join(' ');
        var ty = r.ports.map(function (p) { return 'ABCDEF'.charAt(p) + '=' + (r.types ? r.types[p] : '?'); }).join(' ');
        return (r.ok ? '✓ 두 바퀴 완료 ' : '⚠ 완료 신호 없음 → 정지 ') + '(' + (r.ms / 1000).toFixed(2) + '초, ' + pd + ' | 전송 ' + wr + ' | 장치 ' + ty + ')';
    };
})();
