# 🛡️ BrickSync 절대 개발 불변 규칙 (ABSOLUTE RULES)

본 문서는 BrickSync 프로젝트의 모든 기능 개발, 유지보수, 리팩토링 시 **절대로 위반해서는 안 되는 최상위 불변 규칙**을 정의합니다. 모든 AI 어시스턴트와 개발자는 코드를 수정하기 전 본 규칙을 반드시 확인하고 100% 준수해야 합니다.

---

### 🚨 [규칙 1] 로컬 우선 원칙 (Local-First Rule)
1. 모든 기능 구현 및 수정은 **로컬 개발 서버(`http://127.0.0.1:8000`) 환경을 최우선 기준**으로 작업합니다.
2. 사용자의 명시적인 배포/커밋 지시("커밋해", "푸시해", "배포해" 등)가 없는 한, **절대로 `git push`나 `wrangler deploy`(Cloudflare Pages 원격 배포) 명령을 임의로 실행하지 않습니다.**
3. 모든 테스트와 검증은 로컬 브라우저 및 로컬 Python Bridge Server(`server.py`) 환경에서 완결합니다.

---

### 🚨 [규칙 2] 맹목적 수용 금지 & 사전 기술 분석/계획 승인 원칙 (Pre-Analysis Approval Rule)
1. 새로운 기능 추가나 코드 수정 요청이 들어오면 즉시 코드를 변경하지 않고, **기존 시스템(듀얼 큐, 타이밍 지연 연산, 물리 모터 제어 등)에 미칠 잠재적 영향을 심층 분석**합니다.
2. 분석된 원인과 구체적인 수정 계획(Implementation Plan)을 사용자에게 **명확하게 보고하고, 사용자의 명시적인 승인("진행해" 등)을 득한 후에만 코드 수정에 착수**합니다.

---

### 🚨 [규칙 3] 듀얼 큐 독립 보존 & 하드웨어/게임 동시 연동 불변 원칙 (Dual-Queue Coexistence Rule)
1. BrickSync의 모든 블록 해석 엔진(`buildPyCode`)은 **포트나이트 연동 큐(`localActionsQueue`)**와 **레고 물리 허브 BLE 연동 큐(`bleQueue`)**라는 **2개의 독립적인 실행 큐**를 동시에 생성하고 운용합니다.
2. **포트나이트 연동 코드(`localActionsQueue`)를 수정할 때 레고 물리 모터 제어 코드(`bleQueue`)를 덮어쓰거나 누락시키는 행위를 엄격히 금지**하며, 그 반대도 마찬가지입니다.
3. 모든 모터 회전(`motor_cw`, `motor_ccw`), 자동차 주행(`car_forward`, `car_backward`, `car_left`, `car_right`), 특수 기믹 액션은 두 큐 모두에 정밀한 지연 시간(`delay`)과 함께 완벽히 등록되어야 합니다.
4. 코드 수정 후에는 반드시 자동화 검증 스크립트(`verify_ai_calibrations.py`)를 실행하여 **두 큐의 온전성이 100% 유지되었는지 교차 검증**해야 합니다.

---

### 🚨 [규칙 4] 범위 확장 금지 & 완결 단원 영구 동결 원칙 (Zero Scope Creep & Unit Lock)
사용자가 "작동이 잘 된다", "더 이상 건드리지 마라", "잠금해줘"라고 명시한 완결된 기능과 단원은 **영구 동결(PERMANENTLY FROZEN)** 처리되며, 어떠한 경우에도 코드를 임의로 변경할 수 없습니다.

#### 🔒 영구 동결(Locked) 완료 목록:
1. 🔒 **[완결 영구 동결] 1단원 (탐험선 출항! 아이콘 코딩 + 레고 자동차/보트 & 포트나이트 보트 주행 연동)**:
   - `[5초 대기]` ➔ `[앞으로 3]` ➔ `[좌회전 1]` ➔ `[뒤로 2]` 등 주행 블록 시퀀스 듀얼 큐 연동
   - 상단 자이로 버튼 상태와 무관하게 블록 실행 시 포트나이트 보트 주행 신호(`STEER_UP`, `STEER_LEFT`, `STEER_DOWN`) 자동 송출 보장
   - **DO NOT MODIFY UNIT 1 UNDER ANY CIRCUMSTANCES**.
2. 🔒 **[완결 영구 동결] 6단원 (오두막 지붕 RPS 제스처 + 레고 모터 & 포트나이트 연동)**:
   - AI 가위바위보 제스처 인식 ➔ 레고 모터 4단계 회전 & 포트나이트 지붕 개폐 (`motor_cw`, `motor_ccw`)
   - 연속 제스처 잠금 자동 해제 타이머 (`blockExecutionTimer` 무조건 실행 보장)
   - **DO NOT MODIFY UNIT 6 UNDER ANY CIRCUMSTANCES**.
3. 🔒 **[완결 영구 동결] 7단원 (마법 그네 음성/프롬프트 제어 + 레고 모터 & 포트나이트 연동)**:
   - AI 음성/텍스트 프롬프트 바퀴 수 및 방향 파싱 ➔ `window.lastParsedSpeechDirection`, `window.lastParsedSpeechTurns` 최우선 Override
   - 캔버스 블록 5초 대기 후 `SWING_CONTROL` 객체(`dir`, `val`) 웹소켓 온전 전송 및 레고 실물 모터 회전 동기화
   - 음성 인식 직후 조기 중복 송출 차단 (1바퀴 + N바퀴 버그 원천 해결)
   - **DO NOT MODIFY UNIT 7 UNDER ANY CIRCUMSTANCES**.
4. 🔒 **[완결 영구 동결] 8단원 (몬스터를 보여줘! AI 비전 이미지 인식 + 레고 라이트 & 포트나이트 경보 조명)**:
   - AI 비전 사물/몬스터 이미지 인식 ➔ 5초 대기 ➔ 빨간색 조명 연결 (`matrix_pixel`, `matrix_pixel_red`)
   - 레고 3x3 라이트 매트릭스 점등 및 포트나이트 붉은 경보 조명 (`MONSTER_ALERT`, `ACTION_LIGHT`) 연동
   - **DO NOT MODIFY UNIT 8 UNDER ANY CIRCUMSTANCES**.
5. 🔒 **미션 완료 모달 도장(Stamp) 그래픽**: `white-space: nowrap; font-size: 21px;` 1줄 정렬 유지
6. 🔒 **단일 모터 4단계 정밀 캘리브레이션**:
   - 1단계(15%): `3730ms` / 2단계(40%): `1400ms` / 3단계(70%): `600ms` / 4단계(100%): `300ms`
7. 🔒 **자동차 주행 4단계 정밀 캘리브레이션**:
   - 1단계(15%): `3200ms` / 2단계(40%): `1280ms` / 3단계(70%): `640ms` / 4단계(100%): `305ms`
8. 🔒 **3x3 라이트 매트릭스 프로토콜**: `0x41` (포트 모드 설정) + Mode 2 `0x51` (페이로드 전송)
9. 🔒 **한/영 8개 페이지 다국어(i18n) 시스템 전체**: `data-i18n` 태그 누락 0개, 누락 키 0개

---

### 🚨 [규칙 5] 시소 이펙트 0% 원칙 (Zero Seesaw Effect)
1. 특정 단원이나 기능을 수정할 때 다른 단원의 정상 기능이 망가지는 '시소 현상'이 발생하지 않도록, 코드 수정 후 반드시 전체 단위 테스트 및 구문 검사를 수행합니다.
2. 모든 HTML/JS 파일 수정 시 Node.js 구문 검사(`node -c`)를 통해 Syntax Error가 0건임을 확인합니다.

---

### 🚨 [규칙 6] 표준 규격 준수 (LWP 3.0 Standard Compliance)
- 레고 무선 통신 패킷은 LEGO Wireless Protocol 3.0 표준 규격을 엄격히 준수하며, 임의의 바이트 변조나 규격 외 패킷 전송을 금지합니다.
