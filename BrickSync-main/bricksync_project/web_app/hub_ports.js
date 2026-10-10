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
})();
