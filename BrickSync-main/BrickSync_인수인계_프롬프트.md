# BrickSync 프로젝트 인수인계 프롬프트
# ─────────────────────────────────────────────────────────────────────────────
# 이 파일을 새 Antigravity 채팅창에 전체 복사·붙여넣기 하세요.
# ─────────────────────────────────────────────────────────────────────────────

아래는 내가 진행 중인 **BrickSync** 프로젝트의 전체 컨텍스트야.
이전 대화에서 이어서 개발을 계속해야 해. 아래 내용을 완전히 숙지하고 나서 작업을 시작해줘.

---

## 1. 프로젝트 개요

**BrickSync**는 LEGO SPIKE Prime 허브(실물 하드웨어)와 에픽게임즈 **Fortnite**를 실시간으로 연동하는 교육용 STEAM 코딩 플랫폼이야.

- 학생이 **브라우저 기반 블록 코딩**으로 프로그램을 짜면
- **LEGO 실물 모터**가 동작하고
- **동시에 포트나이트 인게임 오브젝트**도 함께 반응해

---

## 2. 시스템 아키텍처 (End-to-End)

```
[LEGO SPIKE Hub]
     ↕ BLE (Web Bluetooth API / LWP3 프로토콜)
[Chrome 브라우저 - BrickSync Web App]
     ↕ HTTPS                    ↕ Firebase SDK
[Cloudflare Workers]         [Firebase Auth + Firestore]
(bricksync.monsteratech.com)

[Chrome 브라우저]
     ↓ WebSocket  ws://127.0.0.1:8000/ws
[server.py / server.exe  (로컬 브릿지 서버, port 8000)]
     ↓ pydirectinput (Windows SendInput API)
[Fortnite 게임]
```

---

## 3. 개발 파일 위치

모든 개발 파일은 **E:\BrickSync** 에 정리되어 있어:

```
E:\BrickSync\
├── README.md
├── source\
│   ├── bricksync_project\
│   │   ├── web_app\                   ← 핵심! 웹앱 소스 (Cloudflare 배포 대상)
│   │   │   ├── lesson.html            ← 블록코딩 UI + BLE 엔진 + WS 클라이언트
│   │   │   ├── app.html               ← 메인 워크스페이스
│   │   │   ├── firebase_config.js
│   │   │   ├── auth.js
│   │   │   ├── cloud_storage.js
│   │   │   ├── wrangler.toml          ← Cloudflare 배포 설정
│   │   │   └── assets\
│   │   └── bridge_server\
│   │       └── server.py              ← WebSocket 브릿지 서버
│   └── bricksync_launcher\
│       ├── launcher.py                ← BrickSync.exe 런처 소스
│       └── BrickSync.spec
├── dist\
│   ├── BrickSync.exe                  ← 배포용 실행파일 (server.exe 내장됨)
│   └── server.exe
├── reports\
│   ├── BrickSync_Architecture_Report_KR.html
│   └── BrickSync_Architecture_Report_EN.html
└── tools\
    ├── install_bt_driver.ps1
    ├── reinstall_bt_driver.ps1
    ├── enable_tplink_bt.ps1
    ├── disable_tplink_bt.ps1
    └── clear_icon_cache.bat
```

GitHub 레포: E:\GitHub\BrickSync\BrickSync-main
(UEFN 포트나이트 맵 프로젝트 LegoFortnite_X, MyProjectB, Verse 스크립트 포함)

---

## 4. server.py 액션-키 매핑 (현재 설정)

| 액션 | 포트나이트 키 | 설명 |
|------|-------------|------|
| STEER_UP | Y (연사, 1.1초 간격) | 전진 |
| STEER_DOWN | L (연사) | 후진 |
| STEER_LEFT | U (연사) | 좌회전 |
| STEER_RIGHT | O (연사) | 우회전 |
| MWHEEL_LEFT | H (단타) | 관람차 좌회전 |
| MWHEEL_RIGHT | J (단타) | 관람차 우회전 |
| SWING_CONTROL | H/J (n회, 2.3초 간격) | 그네 n바퀴 회전 |
| motor_cw | H (0.3초) | 괴물 입 열기 |
| motor_ccw | J (0.3초) | 괴물 입 닫기 |
| SPEED_1~4 | T (0.2/0.5/0.9/1.3초) | 속도 변속 |
| ACTION_LIGHT | [ | 네온사인 ON |
| ACTION_SOUND | P | 사운드 재생 |
| CAT_FEED_REWARD | E | 고양이 보상 |
| MONSTER_ALERT | G | 몬스터 경보 |
| CLEANUP_KEYS | (모든 키 해제) | 안전 해제 |

---

## 5. BLE 모터 제어 (LWP3)

- GATT Service UUID: `00001623-1212-efde-1623-785feabcd123`
- StartPower 명령: `[8, 0, 0x81, port, 0x10, 0x51, 0x00, speed]`
  - speed: 0~100 (양수=정방향, 음수=역방향, 0=정지)
- 모터 포트: A=0x00, B=0x01, C=0x02, D=0x03

---

## 6. BrickSync.exe 구조

- launcher.py + server.exe 를 PyInstaller로 번들링
- BrickSync.exe 실행 시:
  1. 관리자 권한 요청
  2. server.exe 추출(_MEIPASS) 후 백그라운드 실행
  3. Chrome으로 bricksync.monsteratech.com 오픈
- **server.exe는 BrickSync.exe 안에 내장** → 배포 시 BrickSync.exe 하나면 충분

---

## 7. 배포 명령어

```bash
# 웹앱 Cloudflare 배포 (수정 후 필수 실행)
cd E:\BrickSync\source\bricksync_project\web_app
npx wrangler deploy

# BrickSync.exe 재빌드
cd E:\BrickSync\source\bricksync_launcher
pyinstaller BrickSync.spec

# server.exe 재빌드
cd E:\BrickSync\source\bricksync_project\bridge_server
pyinstaller server.spec
```

---

## 8. 주요 개발 히스토리

- BLE 모터 회전 정밀도 개선 (n바퀴 = 실제 n바퀴 정확히 동작)
- server.py Chrome PNA preflight 처리 구현 (HTTPS↔ws:// 혼용 차단 우회)
- SWING_CONTROL: 1회전=2.3초 대기, 첫 키 씹힘 방지 1.0초 초기 대기
- 모든 개발 파일 E:\BrickSync 로 정리 완료
- 시스템 아키텍처 보고서 제작 (한/영 HTML)
- BT 드라이버 스크립트 정리

---

## 9. 제약사항

- Web Bluetooth API = Chrome 전용 (Edge 불안정)
- Fortnite 포그라운드 실행 필수 (server.py가 자동 포커스 전환)
- ws://localhost:8000 비암호화 → HTTPS Mixed Content 이슈
  (BrickSync.exe Chrome 실행 시 자동 처리)
- BT 어댑터: TP-Link USB 블루투스 → 문제 시 reinstall_bt_driver.ps1 실행

---

이제 위 내용을 바탕으로 BrickSync 개발을 이어서 시작해줘.
현재 작업하고 싶은 내용은: [여기에 작업 내용을 입력해줘]
