# 🛡️ BrickSync Project Rules & Operational Guard Harness (운영 및 금지 규칙)

이 문서는 다른 Antigravity 계정이나 새로운 세션에서 이 프로젝트를 이어받았을 때, **반드시 최우선으로 준수해야 하는 절대 규칙(Golden Rules) 및 금지 사항**을 정의합니다.

---

## 🚨 [제1 절대 규칙: 사전 분석 승인 원칙 (Pre-Analysis Approval Rule)]

> [!CRITICAL]
> **사용자의 명시적 승인("진행해", "수정해")이 떨어지기 전에는 코드를 단 1글자도 수정하거나 변경 명령을 실행해서는 안 됩니다.**

1. 사용자가 문제점이나 수정을 요청했을 때:
   - 즉시 코드를 고치지 말고, **원인 정밀 분석(Root Cause)**과 **구체적 수정 계획(Implementation Plan)**을 마크다운으로 상세히 설명합니다.
2. 답변 마지막에 사용자의 확인을 요청하고 **도구 호출을 멈추고(Stop Calling Tools) 턴을 종료**합니다.
3. 사용자가 **"진행해"** 또는 **"수정해"**라고 명시적으로 답했을 때만 실제 코드 수정에 착수합니다.

---

## 🔒 [제2 절대 규칙: 타 단원 및 레고 제어 100% 영구 동결 (Zero-Regression)]

> [!CRITICAL]
> **특정 단원(예: 1단원, 4단원)의 문제를 수정할 때, 다른 단원이나 레고 구동 코드는 절대 건드리지 마십시오.**

1. **영구 동결 대상**:
   - 1, 2, 3, 4, 5, 6, 7, 8단원 중 **수정 대상이 아닌 모든 단원의 코드**
   - 레고 물리 모터 제어 큐(`bleQueue`, `directMotorQueue`) 및 Web Bluetooth LWP3 프로토콜
   - 3x3 라이트 매트릭스 제어(0x41/0x51), 자이로 틸트 제어
   - 6, 7, 8단원의 음성 인식(Speech Parser), 비전 AI(Monster Vision), 패럿 서보 모터 로직
2. **수정 후 필수 2종 무결성 검증 (0 Fail 원칙)**:
   수정 후 반드시 아래 2개의 검증 스크립트를 터미널에서 실행하여 100% 통과(Pass)를 확인해야 합니다:
   ```bash
   py check_active_syntax.py      # 자바스크립트 구문 오류 검사 + 미러 4곳 동일성 검사
   py test_all_i18n.py            # 다국어(i18n) 태그 누락 검사 (ko/en 사전)
   ```
   (AI·듀얼 큐 타이밍 검증 스크립트 `verify_ai_calibrations.py`는 저장소에 존재하지 않아 규칙에서 제외했습니다.)

---

## 🌐 [제3 절대 규칙: 홍보용 웹사이트 (`legofortnite.bricksync.org`) 절대 간섭 금지]

> [!WARNING]
> **`legofortnite.bricksync.org`는 독립적인 홍보용 사이트(`bricksync-web` Pages)이므로 절대 덮어씌우거나 배포해서는 안 됩니다.**

1. **도메인 역할 구분**:
   - `bricksync.org` / `www.bricksync.org` ➔ **브릭싱크 코딩 웹앱 (배포 대상)**
   - `legofortnite.bricksync.org` ➔ **레고 포트나이트 홍보 랜딩 웹사이트 (절대 수정/배포 금지)**
2. Cloudflare 배포 시 `bricksync-web` Pages 프로젝트로 배포하지 말고, 오직 Worker 프로젝트(`bricksync` / `bricksync.org`)로만 배포해야 합니다.

---

## 📦 [제4 절대 규칙: 미러 경로 & 단일 바이너리(`BrickSync.exe`) 완벽 동기화]

1. **다중 경로 미러링**:
   웹앱 파일(`lesson.html`, `ai_fusion.html` 등)이나 서버 파일(`server.py`)을 수정할 때는 저장소 내 모든 복제본 경로에 동일하게 반영합니다:
   - `web_app/`
   - `BrickSync-main/bricksync_project/web_app/`
   - `bricksync_project/web_app/`
   - 루트 디렉토리
2. **단일 단독 실행 바이너리 빌드 (`BrickSync.exe`)**:
   - 중첩 실행(Nested onefile exe) 방식을 절대 사용하지 말고, `server.py`와 브라우저 자동 실행기가 내장된 **단일 단독 실행 바이너리(Single Standalone PyInstaller Binary)**로 빌드해야 합니다.
   - `bricksync.ico` 아이콘을 내장하고, 바탕화면(`C:\Users\PC\Desktop\BrickSync.exe`) 및 GitHub 저장소 루트에 배포합니다.

---

## 🧹 [제5 절대 규칙: IDE 백그라운드 태스크 잔여 방지 (No Lingering Tasks)]

1. `manage_task`에 종료되지 않는 프로세스(예: `py launcher.py`)를 백그라운드로 띄워두지 마십시오.
2. 백그라운드 태스크가 남아있으면 사용자 프롬프트가 대기열(Queue)에 갇히므로, 빌드나 확인 작업 후에는 항상 태스크를 깔끔하게 종료(Clean up)해야 합니다.
