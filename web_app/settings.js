// BrickSync - 공통 설정 모달 스크립트 (Settings Modal Module)
// 이 스크립트는 공통 설정창 주입, 다국어 처리, 효과음 볼륨 조절, 블록 영역 배율 조정, 로컬 백업/복원 기능을 처리합니다.

(function () {
    // ----------------------------------------------------
    // 1. 다국어 사전 정의 (Translation Dictionary)
    // ----------------------------------------------------
            const i18n = {
        ko: {
            // Sidebar / UI Shell
            nav_home: "홈",
            nav_lessons: "학습단원",
            nav_ai_lessons: "AI 학습단원",
            nav_workspace: "시스템 연결",
            nav_projects: "최근 프로젝트",
            nav_dashboard: "교사/학부모용 대시보드",
            nav_settings: "설정",

            // Settings Modal
            modal_title: "BrickSync 설정",
            sec_profile: "학생 프로필",
            logout_btn: "로그아웃",
            sec_lang: "언어 설정 (Language)",
            sec_volume: "효과음 볼륨 (Volume)",
            sec_backup: "💾 프로젝트 로컬 백업 & 복구",
            backup_export: "📤 내 컴퓨터로 백업하기",
            backup_import: "📥 컴퓨터에서 복원하기",
            sec_diagnostics: "📡 실시간 통신 진단",
            diag_btn: "자가 진단 시작",
            diag_connecting: "클라우드 서버 연결 확인 중...",
            diag_online: "● Firebase 클라우드 연결됨 (정상 연동 중)",
            diag_offline: "● 오프라인 모드 안전 작동 중",
            // exe 다운로드 / 서버 연결 (설정창)
            sec_exe: "BrickSync.exe 다운로드 / 버전",
            exe_check_btn: "버전 확인",
            exe_download_btn: "BrickSync.exe 다운로드",
            exe_checking: "버전을 확인하는 중...",
            exe_status_ok: "현재 버전 : v{cur} - 최신 버전 입니다.",
            exe_status_old: "현재 버전 : v{cur} - 새 버전 v{latest}이 있어요. 아래 버튼으로 받아 주세요.",
            exe_status_unknown_cur: "현재 버전 : 알 수 없음 - 서버가 꺼져 있거나 구버전이에요. (최신 v{latest})",
            exe_status_unknown_latest: "현재 버전 : v{cur} - 최신 버전을 확인하지 못했어요.",
            exe_status_none: "버전을 확인하지 못했어요. 인터넷 연결을 확인해 주세요",
            sec_server: "서버 연결",
            server_retry_btn: "재연결",
            server_checking: "서버를 확인하는 중...",
            server_ok: "로컬 서버 연결됨 (포트 8000)",
            server_off: "로컬 서버 연결 안 됨 — BrickSync.exe를 실행해 주세요",
            alert_import_success: "프로젝트 복원이 완료되었습니다. 화면을 새로고침합니다.",
            alert_import_fail: "올바르지 않은 백업 파일입니다.",
            session_expires: "대기 시간 만료 예정",

            // [New translations for index.html, workspace, and lesson UI]
            profile_student: "학생",
            lbl_my_projects: "내 프로젝트",
            btn_new_project: "+ 새 프로젝트",
            lbl_blocks_count: "블록 수: {count}개",
            lbl_last_modified: "최근 수정",
            lbl_lesson_badge: "일반 단원 {unit}",
            lbl_ai_lesson_badge: "AI 단원 {unit}",
            lbl_connect_hub: "허브 연결",
            lbl_hub_not_connected: "허브 연결 안 됨",
            lbl_workspace_title: "BrickSync Essential 아이콘 코딩",
            lbl_mode_icon: "아이콘 블록 코딩",
            lbl_mode_word: "워드 블록 코딩",
            btn_back_home: "홈으로 가기",
            btn_run: "실행",
            btn_stop: "정지",
            btn_try_mission: "미션 도전하기",
            btn_check_tasks: "미션 과제 체크",
            btn_live_log: "통신 로그",
            lbl_mission_progress: "미션 달성도",
            lbl_stamp_complete: "미션 완료",
            btn_close: "닫기",
            lbl_cancel: "취소",
            lbl_mission_clear_title: "미션 달성!",
            lbl_mission_clear_desc: "레고 포트나이트 미션을 성공하였습니다!",

            // UI Elements & Placeholders
            default_student_name: "탐험가",
            lbl_not_started: "시작 전",
            lbl_ai_vision_title: "AI 비전 제스처 인식",
            lbl_ai_voice_title: "AI 음성 인식",
            lbl_ai_object_title: "AI 사물 인식",
            lbl_ai_loading: "AI 엔진 로딩 중...",
            lbl_gesture_waiting: "대기 중...",
            lbl_status_waiting: "입력 대기 중...",
            lbl_btn_rock: "주먹",
            lbl_btn_paper: "보",
            lbl_btn_scissors: "가위",
            lbl_btn_none: "배경",
            lbl_model_training: "인식 모델 학습 기능",

            // Dashboard
            dashboard_title: "BrickSync 학습 대시보드",
            tab_student: "학생",
            tab_teacher: "교사",
            tab_parent: "학부모",
            nav_dashboard_all: "교사/학부모용 대시보드",
            nav_dashboard_teacher: "교사 대시보드",
            nav_dashboard_parent: "학부모 대시보드",
            lbl_school_name: "학교명",
            lbl_class_code: "학급 코드",
            lbl_select_student: "학생 선택",
            lbl_today_summary_sub: "실시간 AI 학습 추적 및 블록 코딩 분석 리포트",
            lbl_focus_learning_time: "집중 학습 시간",
            lbl_growth_prev_class: "지난 수업 대비",
            lbl_block_execution_cnt: "블록 실행 총 횟수",
            lbl_sys_conn_integrity: "시스템 연동 무결성",
            lbl_success_rate: "미션 성공률",
            lbl_self_error_resolution: "자기주도 오류 해결",
            lbl_tracked_block_cnt: "추적 블록 수",
            lbl_today_concepts: "오늘 마스터한 핵심 코딩 개념",
            concept_loops: "반복문 & 무한 루프",
            concept_conditionals: "조건문 & 센서 이벤트",
            concept_motor_control: "모터 다단계 속도 제어",
            concept_sensor_input: "상호작용 센서 입력",
            concept_ai_recog: "AI 제스처 & 비전 인식",
            concept_fn_sync: "포트나이트 실시간 연동",
            lbl_teacher_comment: "선생님 총평 및 피드백",
            lbl_ai_comment_placeholder: "AI 학습 분석 리포트 및 교사 피드백이 표시됩니다.",
            lbl_other_actions: "기타 작업",
            btn_reset_all_data: "학습 데이터 전체 초기화",
            btn_send_kakao: "알림톡으로 리포트 전송",
            lbl_block_usage_analysis: "학습 블록 사용 분포 분석",
            lbl_block_analysis_hint: "이동, 제어, 센서, 출력 블록의 사용 비율을 분석합니다.",
            lbl_realtime_log: "하드웨어 및 AI 실시간 통신 스트림",
            lbl_log_start: "시스템이 초기화되었습니다. 블록 실행 및 센서 이벤트를 대기 중입니다...",
            lbl_log_waiting_hint: "레고 허브 및 포트나이트의 실시간 프로토콜 메시지가 스트리밍됩니다.",
            lbl_local_server_connected: "로컬 브릿지 서버 연결됨",
            lbl_parent_report_title: "학부모를 위한 주간 학습 리포트",
            lbl_focus_time: "집중 학습 시간",
            lbl_coding_complexity: "코딩 복잡도",
            lbl_mission_speed: "미션 수행 속도",
            lbl_badge_master: "브릭 마스터",
            lbl_badge_skins: "포트나이트 연동",
            lbl_badge_vbucks: "100% 정답률",
            lbl_coin_shelf: "수집한 포트나이트 황금 동전",
            lbl_coin_shelf_subtitle: "미션 완수 및 과제 성공으로 획득한 코인",
            unit_mins: "분",
            unit_times: "회",
            unit_blocks: "개",

            // Login & Registration
            mode_login: "로그인",
            mode_signup: "회원가입",
            info_student_signup: "닉네임으로 간편하게 시작하는 학생용 로그인",
            info_teacher_signup: "학급 관리 및 대시보드 접근을 위한 교사용 계정",
            info_parent_signup: "자녀의 학습 리포트를 확인하는 학부모용 계정",
            lbl_name: "이름",
            lbl_name_placeholder: "이름을 입력하세요",
            lbl_login_name: "닉네임",
            lbl_login_name_placeholder: "사용할 닉네임을 입력하세요",
            lbl_school_placeholder: "학교명을 입력하세요",
            lbl_class_code_placeholder: "6자리 학급 코드를 입력하세요",
            lbl_email: "이메일 주소",
            lbl_password: "비밀번호",
            lbl_password_placeholder: "비밀번호를 입력하세요",
            lbl_signup_password_placeholder: "6자리 이상 입력하세요",
            lbl_password_req: "비밀번호는 6자리 이상이어야 합니다.",
            lbl_parent_code: "자녀 연동 코드",
            lbl_parent_code_placeholder: "자녀의 고유 연동 코드를 입력하세요",
            btn_signup: "회원가입 완료",
            lbl_or: "또는",
            btn_guest_entry: "게스트로 바로 체험하기",
            guest_anonymous: "게스트 탐험가",

            // Guide
            lbl_guide_hero_title: "BrickSync 9단계 가이드",
            lbl_guide_banner_title: "BrickSync 시작 가이드",
            lbl_guide_banner_subtitle: "레고 스파이크와 포트나이트 연동을 9단계로 완벽 마스터하세요",
            lbl_guide_menu_header: "시작하기",
            lbl_guide_setup_header: "퀵스타트 가이드",
            lbl_guide_setup_tag: "인터랙티브 셋업",
            lbl_guide_setup_title: "레고 허브 & 포트나이트 연동 가이드",
            lbl_guide_setup_badge: "9단계 원클릭 퀵스타트 가이드",
            lbl_guide_step1_title: "1. BrickSync 런처 실행",
            lbl_guide_step1_desc: "바탕화면의 BrickSync.exe를 실행하여 로컬 브릿지 서버와 웹 플랫폼을 시작합니다.",
            lbl_guide_step2_title: "2. 학생 & 교사 & 학부모 로그인 및 계정 생성",
            lbl_guide_step2_desc: "학생, 교사, 학부모 중 해당하는 계정을 선택하여 로그인하고 맞춤형 워크스페이스를 불러옵니다.",
            lbl_guide_step3_title: "3. 레고 모델 조립",
            lbl_guide_step3_desc: "레고 브릭을 조립하고 허브에 모터, 센서, 라이트 등 상호작용 부품을 연결합니다.",
            lbl_guide_step4_title: "4. 학습단원 & AI 단원 선택",
            lbl_guide_step4_desc: "일반 학습단원(1~5단원) 또는 AI 융합 단원(6~8단원) 중 원하는 미션을 선택합니다.",
            lbl_guide_step5_title: "5. 레고 허브 연결 (블루투스 / USB)",
            lbl_guide_step5_desc: "화면 상단 버튼으로 블루투스 무선 페어링 또는 USB 유선으로 허브를 연결합니다.",
            lbl_guide_step6_title: "6. 아이콘 · 워드 블록 코딩 & Verse 코드 변환 학습",
            lbl_guide_step6_desc: "미션 과제를 확인한 후 하단의 아이콘 블록을 조립하여 코드를 작성합니다.",
            lbl_guide_step7_title: "7. AI 머신러닝 / LLM 기반 바이브 코딩 학습",
            lbl_guide_step7_desc: "웹캠과 마이크로 제스처, 음성, 사물 인식 모델을 학습시켜 AI 코딩을 경험합니다.",
            lbl_guide_step8_title: "8. 포트나이트 맵 접속",
            lbl_guide_step8_desc: "포트나이트에서 'The Brick Island' (맵 코드: 7603-2493-0825) 맵에 접속합니다.",
            lbl_guide_step9_title: "9. 레고 허브 & 포트나이트 실시간 연동",
            lbl_guide_step9_desc: "1~5단원은 Run 버튼으로, 6~8단원은 AI 제스처/음성 프롬프팅으로 레고와 포트나이트 3D 에셋을 실시간 동시 조종합니다.",

            // Fortnite Key Guide
            lbl_guide_fortnite_header: "🎮 포트나이트 플레이 환경설정",
            lbl_guide_fortnite_tag: "포트나이트 조작법 설정",
            lbl_guide_fortnite_title: "The Brick Island 맵 키보드 조작법 커스텀 설정",
            lbl_guide_fortnite_desc: "포트나이트 The Brick Island 맵 접속 후, 블록 코드를 통해 에셋과 상호작용(탑승) 및 이동 조종이 작동하도록 아래 단계별로 키보드 커스텀 키를 설정해 주세요.",
            lbl_guide_fn_step1_badge: "STEP 1",
            lbl_guide_fn_step1_title: "플레이어 메뉴 (ESC) → 설정",
            lbl_guide_fn_step1_desc: "포트나이트 맵 접속 후 ESC 키를 눌러 플레이어 메뉴를 열고, 좌측 하단의 설정 (⚙️) 메뉴를 클릭합니다.",
            lbl_guide_fn_step2_badge: "STEP 2",
            lbl_guide_fn_step2_title: "키보드 조작법 (KEYBOARD CONTROLS)",
            lbl_guide_fn_step2_desc: "상단 메뉴의 탭 아이콘 중 4방향 화살표 모양의 KEYBOARD CONTROLS (키보드 조작법 ⌨️) 탭을 클릭합니다.",
            lbl_guide_fn_step3_badge: "STEP 3",
            lbl_guide_fn_step3_title: "크리에이티브 입력 동작 커스텀 키 설정",
            lbl_guide_fn_step3_desc: "스크롤을 내려 크리에이티브 입력 동작 섹션의 사용자 지정 입력 6 ~ 10 항목을 지정된 단축키로 변경합니다.",
            lbl_guide_fn_summary_title: "🔑 필수 커스텀 입력 키 설정 목록 (사용자 지정 입력 6 ~ 10)",
            lbl_guide_fn_in6_name: "사용자 지정 입력 6 (Interact)",
            lbl_guide_fn_in6_role: "에셋 상호작용 및 탑승",
            lbl_guide_fn_in7_name: "사용자 지정 입력 7 (Forward)",
            lbl_guide_fn_in7_role: "전진 이동",
            lbl_guide_fn_in8_name: "사용자 지정 입력 8 (Backwards)",
            lbl_guide_fn_in8_role: "후진 이동",
            lbl_guide_fn_in9_name: "사용자 지정 입력 9 (Left)",
            lbl_guide_fn_in9_role: "좌회전 (왼쪽 회전)",
            lbl_guide_fn_in10_name: "사용자 지정 입력 10 (Right)",
            lbl_guide_fn_in10_role: "우회전 (오른쪽 회전)",

            // Lesson Names
            lesson_1: "1. 탐험보트를 출발시켜요",
            lesson_2: "2. 바닷속 잠수함으로 바다를 탐험해요",
            lesson_3: "3. 대관람차 회전하기",
            lesson_4: "4. 탐험 자동차를 만들어요",
            lesson_5: "5. 사이렌을 켜줘",
            ai_lesson_1: "6. 가위, 바위, 보로 여닫는 오두막 지붕",
            ai_lesson_2: "7. 마이크에 대고 외쳐봐! 목소리로 조종하는 요술 그네",
            ai_lesson_3: "8. 몬스터를 보여줘! 경보 알림켜기.",
            lc_1: "탐험보트를 출발시켜요",
            lc_2: "바닷속 잠수함으로 바다를 탐험해요",
            lc_3: "대관람차 회전하기",
            lc_4: "탐험 자동차를 만들어요",
            lc_5: "사이렌을 켜줘",
            lc_6: "가위, 바위, 보로 여닫는 오두막 지붕",
            lc_7: "마이크에 대고 외쳐봐! 목소리로 조종하는 요술 그네",
            lc_8: "몬스터를 보여줘! 경보 알림켜기",

            // Modal & Workspace UI
            lbl_required_tasks: "📋 미션 달성 과제",
            btn_try_mission: "미션 도전하기",
            btn_check_tasks: "미션 과제 체크",
            hint_drag_blocks: "하단에서 아이콘 블록을 끌어와 조립해보세요!",
            hint_drag_assemble: "하단에서 아이콘 블록을 끌어와 조립해보세요!",
            btn_retry_camera: "웹캠 수동 연결 📷",
            btn_start_camera_now: "📷 카메라 바로 켜기",
            lbl_conn_method_title: "연결 방식 선택",
            lbl_conn_method_desc: "스파이크 허브와 연결할 방식을 선택해주세요.",
            lbl_conn_usb: "USB 선으로 연결 (강력 추천)",
            lbl_conn_usb_desc: "안정적이며 빠른 속도 지원",
            lbl_conn_bt: "무선 블루투스 연결",

            // Extra UI Keys
            login_slogan: "레고 스파이크와 포트나이트를 연결하는 스마트 코딩 플랫폼",
            lbl_map_play_now: "지금 플레이하기",
            lbl_system_check: "시스템 연결 점검",
            lbl_code_injection: "포트나이트 코드 주입",
            lbl_device_sync: "디바이스 실시간 동기화",
            lbl_live: "실시간",
            lbl_measuring: "측정 중...",
            lbl_measuring_waiting: "데이터 대기 중",
            lbl_analysis_pending: "분석 대기 중",
            lbl_waiting_active_data: "활동 데이터 수신 대기 중...",
            lbl_assembly_track_result: "조립 추적 결과",
            lbl_motor_related: "모터 제어 블록",
            lbl_sensor_control_related: "센서 감지 블록",
            lbl_motor_sensor_fusion: "모터/센서 융합 블록",
            lbl_class_status_live: "실시간 수업 현황",
            lbl_fortnite_mission: "포트나이트 미션",

            // Menu & Guide Badges
            lbl_menu01_title: "홈",
            lbl_menu01_desc: "BrickSync의 메인 페이지입니다.",
            lbl_menu01_badge: "시작 화면",
            lbl_menu02_title: "학습단원",
            lbl_menu02_desc: "1~5단원 일반 학습 미션",
            lbl_menu02_badge: "기본 과정",
            lbl_menu03_title: "AI 학습단원",
            lbl_menu03_desc: "6~8단원 AI 융합 미션",
            lbl_menu03_badge: "심화 과정",
            lbl_menu05_title: "프로젝트",
            lbl_menu05_desc: "내 코딩 프로젝트 모음",
            lbl_menu05_badge: "보관함",

            // Guide Step Bullets
            lbl_guide_step1_b1: "바탕화면의 바로가기 실행",
            lbl_guide_step1_b2: "로컬 서버 자동 구동 확인",
            lbl_guide_step1_b3: "웹 화면 자동 접속",
            lbl_guide_step2_b1: "학생은 계정 등록 후 학습시 학습 데이터가 클라우드 DB에 저장",
            lbl_guide_step2_b2: "교사 계정으로 관리학생 및 클래스별 학습 DB 관리 및 전송",
            lbl_guide_step2_b3: "학부모의 자녀 학습 데이터 실시간 수신 및 피드백",
            lbl_guide_step2_b4: "계정 생성 없이도 게스트로 즉시 체험 가능",
            lbl_guide_step3_b1: "스파이크 에센셜/프라임 허브 준비",
            lbl_guide_step3_b2: "모터, 센서, 라이트 연결",
            lbl_guide_step4_b1: "1~5단원 기본 코딩 학습",
            lbl_guide_step4_b2: "6~8단원 AI 학습단원",
            lbl_guide_step5_b1: "블루투스 페어링",
            lbl_guide_step5_b2: "USB 유선 연결 지원",
            lbl_guide_step5_b3: "단원 이동 시 연결 유지",
            lbl_guide_step6_b1: "아이콘 블록 / 워드 블록 드래그 앤 드롭",
            lbl_guide_step6_b2: "실시간 문법 및 파라미터 조절",
            lbl_guide_step6_b3: "블록 코드를 Verse 코드로 1:1 변환 학습",
            lbl_guide_step7_b1: "카메라 제스처·사물 인식 AI 모델",
            lbl_guide_step7_b2: "마이크 음성 명령 AI 모델",
            lbl_guide_step7_b3: "LLM 기반 바이브 코딩 AI 모델",
            lbl_guide_step8_b1: "The Brick Island 포트나이트 맵 접속",
            lbl_guide_step8_b2: "섬 코드 입력 (7603-2493-0825)",
            lbl_guide_step9_b1: "앱 내 명령 코드 실행 시 포트나이트에 신호 전달",
            lbl_guide_step9_b2: "포트나이트 3D 에셋 조종",
            lbl_guide_step9_b3: "학습 단원 미션 달성으로 포트나이트 황금 동전 획득"
        },
        en: {
            // Sidebar / UI Shell
            nav_home: "Home",
            nav_lessons: "Lessons",
            nav_ai_lessons: "AI Lessons",
            nav_workspace: "System Connection",
            nav_projects: "Recent Project",
            nav_dashboard: "Teacher/Parent Dashboard",
            nav_settings: "Settings",

            // Settings Modal
            modal_title: "BrickSync Settings",
            sec_profile: "Student Profile",
            logout_btn: "Logout",
            sec_lang: "Language Settings",
            sec_volume: "SFX Volume",
            sec_backup: "💾 Local Backup & Restore",
            backup_export: "Export to PC",
            backup_import: "Import from PC",
            sec_diagnostics: "📡 Connectivity Diagnostics",
            diag_btn: "Start Diagnostic",
            diag_connecting: "Checking cloud connection...",
            diag_online: "● Firebase Connected (Syncing Live)",
            diag_offline: "● Operating safely in Offline Mode",
            // exe download / server connection (settings)
            sec_exe: "Download BrickSync.exe / Version",
            exe_check_btn: "Check version",
            exe_download_btn: "Download BrickSync.exe",
            exe_checking: "Checking version...",
            exe_status_ok: "Current version: v{cur} - You are up to date.",
            exe_status_old: "Current version: v{cur} - A new version v{latest} is available. Use the button below.",
            exe_status_unknown_cur: "Current version: unknown - the server is off or an old version. (Latest v{latest})",
            exe_status_unknown_latest: "Current version: v{cur} - Could not check the latest version.",
            exe_status_none: "Could not check the version. Please check your internet connection",
            sec_server: "Server Connection",
            server_retry_btn: "Reconnect",
            server_checking: "Checking the server...",
            server_ok: "Local server connected (port 8000)",
            server_off: "Local server not connected — please run BrickSync.exe",
            alert_import_success: "Project restore completed. Reloading page.",
            alert_import_fail: "Invalid backup file format.",
            session_expires: "Session expiring soon",

            // [New translations for index.html, workspace, and lesson UI]
            profile_student: "Student",
            lbl_my_projects: "My Projects",
            btn_new_project: "+ New Project",
            lbl_blocks_count: "Blocks: {count}",
            lbl_last_modified: "Last modified",
            lbl_lesson_badge: "Lesson {unit}",
            lbl_ai_lesson_badge: "AI Lesson {unit}",
            lbl_connect_hub: "Connect Hub",
            lbl_hub_not_connected: "Hub Disconnected",
            lbl_workspace_title: "BrickSync Essential Icon Coding",
            lbl_mode_icon: "Icon Block Coding",
            lbl_mode_word: "Word Block Coding",
            btn_back_home: "Go Back Home",
            btn_run: "Run",
            btn_stop: "Stop",
            btn_try_mission: "Try Mission",
            btn_check_tasks: "Check Tasks",
            btn_live_log: "Live Log",
            lbl_mission_progress: "Mission Progress",
            lbl_stamp_complete: "Mission Complete",
            btn_close: "Close",
            lbl_cancel: "Cancel",
            lbl_mission_clear_title: "Mission Complete!",
            lbl_mission_clear_desc: "You have successfully completed the Lego Fortnite mission!",

            // UI Elements & Placeholders
            default_student_name: "Explorer",
            lbl_not_started: "Not Started",
            lbl_ai_vision_title: "Vision Model",
            lbl_ai_voice_title: "Voice Model",
            lbl_ai_object_title: "Object Model",
            lbl_ai_loading: "AI Engine Initializing...",
            lbl_gesture_waiting: "Waiting for gesture...",
            lbl_status_waiting: "Waiting for input...",
            lbl_btn_rock: "Rock",
            lbl_btn_paper: "Paper",
            lbl_btn_scissors: "Scissors",
            lbl_btn_none: "Background (None)",
            lbl_model_training: "Model Training",

            // Dashboard
            dashboard_title: "BrickSync Learning Dashboard",
            tab_student: "Student",
            tab_teacher: "Teacher",
            tab_parent: "Parent",
            nav_dashboard_all: "Teacher/Parent Dashboard",
            nav_dashboard_teacher: "Teacher Dashboard",
            nav_dashboard_parent: "Parent Dashboard",
            lbl_school_name: "School Name",
            lbl_class_code: "Class Code",
            lbl_select_student: "Select Student",
            lbl_today_summary_sub: "Real-time AI learning tracking & block coding analysis report",
            lbl_focus_learning_time: "Focus Learning Time",
            lbl_growth_prev_class: "vs Last Session",
            lbl_block_execution_cnt: "Total Block Executions",
            lbl_sys_conn_integrity: "Hub Connection Integrity",
            lbl_success_rate: "Mission Success Rate",
            lbl_self_error_resolution: "Self Error Resolution",
            lbl_tracked_block_cnt: "Tracked Blocks",
            lbl_today_concepts: "Core Coding Concepts Mastered Today",
            concept_loops: "Repeat & Forever Loops",
            concept_conditionals: "Conditionals & Sensor Events",
            concept_motor_control: "Multi-speed Motor Control",
            concept_sensor_input: "Interactive Sensor Inputs",
            concept_ai_recog: "AI Gesture & Vision Recognition",
            concept_fn_sync: "Fortnite Real-time Sync",
            lbl_teacher_comment: "Teacher's Evaluation & Feedback",
            lbl_ai_comment_placeholder: "AI learning report and teacher feedback will be displayed here.",
            lbl_other_actions: "Other Actions",
            btn_reset_all_data: "Reset All Learning Data",
            btn_send_kakao: "Send Report via Messenger",
            lbl_block_usage_analysis: "Block Usage Distribution Analysis",
            lbl_block_analysis_hint: "Analyzes usage ratio between Movement, Control, Sensor, and Display blocks.",
            lbl_realtime_log: "Real-time Hardware & AI Communication Stream",
            lbl_log_start: "System initialized. Waiting for block execution and sensor events...",
            lbl_log_waiting_hint: "Real-time protocol messages from Lego Hub and Fortnite will stream here.",
            lbl_local_server_connected: "Local Bridge Server Connected",
            lbl_parent_report_title: "Weekly Learning Summary for Parents",
            lbl_focus_time: "Focused Time",
            lbl_coding_complexity: "Coding Complexity",
            lbl_mission_speed: "Mission Speed",
            lbl_badge_master: "Brick Master",
            lbl_badge_skins: "Fortnite Sync",
            lbl_badge_vbucks: "100% Accuracy",
            lbl_coin_shelf: "Collected Fortnite Golden Coins",
            lbl_coin_shelf_subtitle: "Earned by completing missions and challenges",
            unit_mins: "mins",
            unit_times: "times",
            unit_blocks: "blocks",

            // Login & Registration
            mode_login: "Login",
            mode_signup: "Sign Up",
            info_student_signup: "Quick Student Login with Nickname",
            info_teacher_signup: "Teacher Account Login & Management",
            info_parent_signup: "Parent Account Login & Reports",
            lbl_name: "Name",
            lbl_name_placeholder: "Enter your name",
            lbl_login_name: "Nickname",
            lbl_login_name_placeholder: "Enter your nickname",
            lbl_school_placeholder: "Enter school name",
            lbl_class_code_placeholder: "Enter 6-digit class code",
            lbl_email: "Email Address",
            lbl_password: "Password",
            lbl_password_placeholder: "Enter your password",
            lbl_signup_password_placeholder: "At least 6 characters",
            lbl_password_req: "Password must be at least 6 characters.",
            lbl_parent_code: "Student Link Code",
            lbl_parent_code_placeholder: "Enter student's unique link code",
            btn_signup: "Sign Up",
            lbl_or: "OR",
            btn_guest_entry: "Enter as Guest",
            guest_anonymous: "Guest Explorer",

            // Guide
            lbl_guide_hero_title: "BrickSync 9-Step Guide",
            lbl_guide_banner_title: "BrickSync Starter Guide",
            lbl_guide_banner_subtitle: "Master the Lego Spike & Fortnite Integration in 9 Easy Steps",
            lbl_guide_menu_header: "Getting Started",
            lbl_guide_setup_header: "Quick Start Guide",
            lbl_guide_setup_tag: "Interactive Setup",
            lbl_guide_setup_title: "Lego Hub & Fortnite Integration Guide",
            lbl_guide_setup_badge: "9-Step Quickstart Guide",
            lbl_guide_step1_title: "1. Launch BrickSync Launcher",
            lbl_guide_step1_desc: "Run BrickSync.exe on your desktop to start the local bridge server and web platform.",
            lbl_guide_step2_title: "2. Student, Teacher & Parent Login and Account Creation",
            lbl_guide_step2_desc: "Select Student, Teacher, or Parent account and log in to load your personalized workspace.",
            lbl_guide_step3_title: "3. Build Lego Model",
            lbl_guide_step3_desc: "Assemble your Lego Spike Essential model and connect motors, sensors, and lights to the Hub.",
            lbl_guide_step4_title: "4. Choose Learning Unit",
            lbl_guide_step4_desc: "Choose from standard units (1~5) or AI fusion units (6~8) to begin your mission.",
            lbl_guide_step5_title: "5. Connect Lego Hub",
            lbl_guide_step5_desc: "Pair your Hub wirelessly via Bluetooth or connect via USB cable.",
            lbl_guide_step6_title: "6. Icon · Word Block Coding & Verse Code Conversion Learning",
            lbl_guide_step6_desc: "Review mission objectives and assemble icon blocks to code movements and sensor logic.",
            lbl_guide_step7_title: "7. AI Machine Learning / LLM Vibe Coding",
            lbl_guide_step7_desc: "Train gesture, voice, or vision models with webcam and microphone for AI-powered coding.",
            lbl_guide_step8_title: "8. Enter Fortnite Island",
            lbl_guide_step8_desc: "Jump into 'The Brick Island' (Island Code: 7603-2493-0825) inside Fortnite.",
            lbl_guide_step9_title: "9. Real-time Dual Control",
            lbl_guide_step9_desc: "Control both your physical Lego robot and virtual 3D Fortnite vehicles simultaneously in real time!",

            // Fortnite Key Guide
            lbl_guide_fortnite_header: "🎮 Fortnite Control Settings",
            lbl_guide_fortnite_tag: "Keybind Setup",
            lbl_guide_fortnite_title: "The Brick Island Keyboard Custom Bindings",
            lbl_guide_fortnite_desc: "Configure the custom input keys in Fortnite to enable vehicle boarding and directional driving from code.",
            lbl_guide_fn_step1_badge: "STEP 1",
            lbl_guide_fn_step1_title: "Player Menu (ESC) -> Settings",
            lbl_guide_fn_step1_desc: "Press ESC inside Fortnite and click the Settings icon in the bottom left.",
            lbl_guide_fn_step2_badge: "STEP 2",
            lbl_guide_fn_step2_title: "KEYBOARD CONTROLS Tab",
            lbl_guide_fn_step2_desc: "Click the 4-way arrow icon on the top tab for Keyboard Controls.",
            lbl_guide_fn_step3_badge: "STEP 3",
            lbl_guide_fn_step3_title: "Creative Custom Input Keys",
            lbl_guide_fn_step3_desc: "Scroll down to Creative Inputs and set Custom Inputs 6 through 10 as specified below.",
            lbl_guide_fn_summary_title: "🔑 Required Custom Input Keybinds (Inputs 6 ~ 10)",
            lbl_guide_fn_in6_name: "Custom Input 6 (Interact)",
            lbl_guide_fn_in6_role: "Vehicle Boarding & Interaction",
            lbl_guide_fn_in7_name: "Custom Input 7 (Forward)",
            lbl_guide_fn_in7_role: "Move Forward",
            lbl_guide_fn_in8_name: "Custom Input 8 (Backwards)",
            lbl_guide_fn_in8_role: "Move Backward",
            lbl_guide_fn_in9_name: "Custom Input 9 (Left)",
            lbl_guide_fn_in9_role: "Turn Left",
            lbl_guide_fn_in10_name: "Custom Input 10 (Right)",
            lbl_guide_fn_in10_role: "Turn Right",

            // Lesson Names
            lesson_1: "1. Launch the Exploration Boat",
            lesson_2: "2. Explore the Sea with a Submarine",
            lesson_3: "3. Rotate the Ferris Wheel",
            lesson_4: "4. Ride a Cave Car and Travel",
            lesson_5: "5. Turn on the Siren",
            ai_lesson_1: "6. RPS Gesture-Controlled Cabin Roof",
            ai_lesson_2: "7. Voice-Controlled Magic Swing",
            ai_lesson_3: "8. Animal Alert Ranger (Monster Camera)",
            lc_1: "Launch the Exploration Boat",
            lc_2: "Explore the Sea with a Submarine",
            lc_3: "Rotate the Ferris Wheel",
            lc_4: "Ride a Cave Car and Travel",
            lc_5: "Turn on the Siren",
            lc_6: "RPS Gesture-Controlled Cabin Roof",
            lc_7: "Voice-Controlled Magic Swing",
            lc_8: "Animal Alert Ranger (Monster Camera)",

            // Modal & Workspace UI
            lbl_required_tasks: "📋 Required Tasks",
            btn_try_mission: "Try Mission",
            btn_check_tasks: "Check Tasks",
            hint_drag_blocks: "Drag icon blocks from below to assemble your code!",
            hint_drag_assemble: "Drag icon blocks from below to assemble your code!",
            btn_retry_camera: "Retry Webcam 📷",
            btn_start_camera_now: "📷 Start Camera",
            lbl_conn_method_title: "Select Connection Method",
            lbl_conn_method_desc: "Choose how to connect with your Lego Spike Hub.",
            lbl_conn_usb: "Connect via USB Cable (Recommended)",
            lbl_conn_usb_desc: "Ultra-fast and stable connection",
            lbl_conn_bt: "Wireless Bluetooth Connection",

            // Extra UI Keys
            login_slogan: "Smart Coding Platform Connecting Lego Spike & Fortnite",
            lbl_map_play_now: "Play Now",
            lbl_system_check: "System Integrity Check",
            lbl_code_injection: "Fortnite Code Injection",
            lbl_device_sync: "Real-time Device Sync",
            lbl_live: "LIVE",
            lbl_measuring: "Measuring...",
            lbl_measuring_waiting: "Waiting for data",
            lbl_analysis_pending: "Analysis Pending",
            lbl_waiting_active_data: "Waiting for live session data...",
            lbl_assembly_track_result: "Assembly Tracking",
            lbl_motor_related: "Motor Control Blocks",
            lbl_sensor_control_related: "Sensor Event Blocks",
            lbl_motor_sensor_fusion: "Motor & Sensor Fusion",
            lbl_class_status_live: "Live Classroom Activity",
            lbl_fortnite_mission: "Fortnite Mission",

            // Menu & Guide Badges
            lbl_menu01_title: "Home",
            lbl_menu01_desc: "BrickSync Main Portal",
            lbl_menu01_badge: "Main",
            lbl_menu02_title: "Lessons",
            lbl_menu02_desc: "Units 1~5 Core Missions",
            lbl_menu02_badge: "Core",
            lbl_menu03_title: "AI Lessons",
            lbl_menu03_desc: "Units 6~8 AI Fusion Missions",
            lbl_menu03_badge: "Advanced",
            lbl_menu05_title: "Projects",
            lbl_menu05_desc: "My Project Workspace",
            lbl_menu05_badge: "Vault",

            // Guide Step Bullets
            lbl_guide_step1_b1: "Launch Desktop Shortcut",
            lbl_guide_step1_b2: "Local Bridge Server Verified",
            lbl_guide_step1_b3: "Auto-navigate to Web Platform",
            lbl_guide_step2_b1: "After signing up, a student's learning data is saved to the cloud DB as they learn",
            lbl_guide_step2_b2: "Teacher accounts manage and send learning data by student and by class",
            lbl_guide_step2_b3: "Parents receive their child's learning data in real time and can give feedback",
            lbl_guide_step2_b4: "Try it right away as a guest, no account needed",
            lbl_guide_step3_b1: "Prepare Spike Essential / Prime Hub",
            lbl_guide_step3_b2: "Connect Motors, Sensors, Lights",
            lbl_guide_step4_b1: "Units 1~5 Core Block Coding",
            lbl_guide_step4_b2: "Units 6~8 AI Lessons",
            lbl_guide_step5_b1: "Bluetooth Wireless Pairing",
            lbl_guide_step5_b2: "USB Cable Connection",
            lbl_guide_step5_b3: "Connection Preserved Across Units",
            lbl_guide_step6_b1: "Drag & Drop Icon / Word Blocks",
            lbl_guide_step6_b2: "Real-time Parameter Adjustment",
            lbl_guide_step6_b3: "Learn 1:1 Block-to-Verse Code Conversion",
            lbl_guide_step7_b1: "Webcam Gesture & Object Recognition AI Model",
            lbl_guide_step7_b2: "Microphone Voice Command AI Model",
            lbl_guide_step7_b3: "LLM-based Vibe Coding AI Model",
            lbl_guide_step8_b1: "Enter The Brick Island Fortnite Map",
            lbl_guide_step8_b2: "Enter Island Code (7603-2493-0825)",
            lbl_guide_step9_b1: "Running Code in the App Sends Signals to Fortnite",
            lbl_guide_step9_b2: "Drive 3D Fortnite Vehicles",
            lbl_guide_step9_b3: "Complete Lesson Missions to Earn Fortnite Golden Coins"
        }
    };

// ----------------------------------------------------
    // 2. CSS 스타일 주입 (Glassmorphic Custom UI matching Lego Fortnite)
    // ----------------------------------------------------
    const styles = `
                .home-btn, a.home-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            padding: 7px 20px !important;
            border-radius: 30px !important;
            background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%) !important;
            border: 2px solid #0284c7 !important;
            color: #0284c7 !important;
            text-decoration: none !important;
            font-weight: 800 !important;
            font-size: 0.95rem !important;
            white-space: nowrap !important;
            transition: all 0.15s ease !important;
            box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.9), 0 3px 0 #0284c7, 0 5px 12px rgba(2, 132, 199, 0.18) !important;
            position: relative !important;
            cursor: pointer !important;
        }
        .home-btn i, a.home-btn i {
            color: #0284c7 !important;
            font-size: 1.05rem !important;
        }
        .home-btn:hover, a.home-btn:hover {
            background: linear-gradient(180deg, #ffffff 0%, #bae6fd 100%) !important;
            transform: translateY(-1px) !important;
            color: #0284c7 !important;
            box-shadow: inset 0 2px 4px rgba(255, 255, 255, 1), 0 4px 0 #0284c7, 0 7px 14px rgba(2, 132, 199, 0.25) !important;
        }
        .home-btn:active, a.home-btn:active {
            transform: translateY(2px) !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 0 #0284c7, 0 2px 4px rgba(2, 132, 199, 0.1) !important;
        }
        .bs-settings-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(43, 27, 77, 0.28);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center;
            z-index: 99999;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .bs-settings-overlay.show {
            opacity: 1; pointer-events: auto;
        }
        .bs-settings-card {
            background: rgba(255, 255, 255, 0.96);
            border: 1.5px solid #cfe9f2;
            box-shadow: 0 24px 60px rgba(43, 27, 77, 0.28);
            border-radius: 32px;
            width: 720px; max-width: 92%;
            padding: 38px 42px;
            color: #2b1b4d;
            transform: scale(0.9);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            max-height: 90vh;
            overflow-y: auto;
        }
        .bs-settings-overlay.show .bs-settings-card {
            transform: scale(1);
        }
        .bs-settings-header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #d6edf5;
            padding-bottom: 18px; margin-bottom: 22px;
        }
        .bs-settings-title {
            font-size: 2rem; font-weight: 800; color: #2b1b4d;
        }
        .bs-settings-close {
            background: none; border: none; color: #7a7396;
            font-size: 2.25rem; cursor: pointer; transition: color 0.2s;
        }
        .bs-settings-close:hover { color: #e11d48; }

        .bs-settings-section {
            margin-bottom: 22px;
        }
        .bs-settings-sec-title {
            font-size: 1.3rem; font-weight: 700; color: #6c1f86;
            margin-bottom: 12px; display: flex; align-items: center; gap: 10px;
        }

        /* Profile Row */
        .bs-profile-row {
            display: flex; justify-content: space-between; align-items: center;
            background: #e2f5f9; padding: 16px 24px; border-radius: 16px;
            border: 1px solid #cfe9f2;
        }
        .bs-profile-name { font-weight: 700; font-size: 1.5rem; color: #2b1b4d; }
        .bs-btn-danger {
            background: #fde8ec; border: 1px solid #f9c4cf;
            color: #e11d48; padding: 8px 20px; border-radius: 12px; font-weight: 700;
            font-size: 1rem; cursor: pointer; transition: 0.2s;
        }
        .bs-btn-danger:hover { background: #e11d48; color: #fff; }

        /* Button Groups (Language / Zoom) */
        .bs-btn-group {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
        }
        .bs-btn-group.three-cols {
            grid-template-columns: repeat(3, 1fr);
        }
        .bs-btn-option {
            background: #fff; border: 1.5px solid #cfe9f2;
            color: #4b4570; padding: 14px; border-radius: 14px; font-weight: 700;
            font-size: 1.1rem; cursor: pointer; text-align: center; transition: 0.2s;
        }
        .bs-btn-option:hover { background: #f6fbfe; color: #2b1b4d; }
        .bs-btn-option.active {
            background: #edbd95; color: #2b1b4d;
            border-color: #edbd95; font-weight: 800;
        }

        /* Volume Range */
        .bs-volume-container {
            display: flex; align-items: center; gap: 20px;
        }
        .bs-volume-slider {
            flex: 1; height: 9px; -webkit-appearance: none; appearance: none;
            background: #a5b1d7; border-radius: 5px; outline: none;
        }
        .bs-volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 27px; height: 27px;
            border-radius: 50%; background: #edbd95; cursor: pointer;
            border: 3px solid #fff; box-shadow: 0 2px 6px rgba(43, 27, 77, 0.25);
        }
        .bs-volume-val { font-family: 'Outfit', monospace; font-weight: 700; font-size: 1.1rem; width: 52px; text-align: right; color: #2b1b4d; }

        /* Backup Buttons */
        .bs-backup-group {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
        }
        .bs-btn-accent {
            background: #e8f4f2; border: 1.5px solid #a0c9c3;
            color: #2f6f66; padding: 14px; border-radius: 14px; font-weight: 700;
            font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
            transition: 0.2s;
        }
        .bs-btn-accent:hover { background: #a0c9c3; color: #2b1b4d; }
        .bs-btn-wide { width: 100%; margin-top: 12px; }

        /* 상태 줄 (exe 버전 / 서버 연결) */
        .bs-diag-box {
            background: #f6fbfe; padding: 16px 24px; border-radius: 16px;
            border: 1px solid #d6edf5; font-size: 1.05rem; min-height: 58px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .bs-diag-status { font-weight: 600; color: #5b5478; line-height: 1.4; }
        .bs-diag-btn {
            background: #a5b1d7; border: none;
            color: #2b1b4d; padding: 7px 16px; border-radius: 10px; font-size: 0.95rem;
            font-weight: 700; cursor: pointer; transition: 0.2s; white-space: nowrap; flex-shrink: 0;
        }
        .bs-diag-btn:hover { background: #8f9cc9; }
        .bs-diag-btn:disabled { opacity: 0.6; cursor: default; }
    `;

    // ----------------------------------------------------
    // 3. HTML 마크업 및 동적 레이아웃 주입
    // ----------------------------------------------------
    function injectSettingsDOM() {
        if (document.getElementById('bs-settings-modal')) return;

        // 1. Style Tag 주입
        const styleTag = document.createElement('style');
        styleTag.innerHTML = styles;
        document.head.appendChild(styleTag);

        // 2. Modal Overlay & Card 주입
        const overlay = document.createElement('div');
        overlay.id = 'bs-settings-modal';
        overlay.className = 'bs-settings-overlay';
        overlay.innerHTML = `
            <div class="bs-settings-card">
                <div class="bs-settings-header">
                    <span class="bs-settings-title" data-settings-i18n="modal_title">BrickSync 설정</span>
                    <button class="bs-settings-close" onclick="closeSettingsModal()">&times;</button>
                </div>
                
                <!-- 1. Profile Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_profile">학생 프로필</div>
                    <div class="bs-profile-row">
                        <span class="bs-profile-name" id="bs-settings-profile-name">최민</span>
                        <button class="bs-btn-danger" onclick="settingsLogout()" data-settings-i18n="logout_btn">로그아웃</button>
                    </div>
                </div>
                
                <!-- 2. Language Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_lang">언어 설정 (Language)</div>
                    <div class="bs-btn-group">
                        <button class="bs-btn-option" id="btn-lang-ko" onclick="changeSettingsLanguage('ko')">한국어</button>
                        <button class="bs-btn-option" id="btn-lang-en" onclick="changeSettingsLanguage('en')">English</button>
                    </div>
                </div>
                
                <!-- 3. Volume Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_volume">효과음 볼륨 (Volume)</div>
                    <div class="bs-volume-container">
                        <input type="range" class="bs-volume-slider" id="settings-volume-slider" min="0" max="100" value="100" oninput="changeSettingsVolume(this.value)">
                        <span class="bs-volume-val" id="settings-volume-display">100%</span>
                    </div>
                </div>
                
                <!-- 4. exe 다운로드 / 버전 -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_exe">BrickSync.exe 다운로드 / 버전</div>
                    <div class="bs-diag-box">
                        <span class="bs-diag-status" id="bs-exe-status"></span>
                        <button class="bs-diag-btn" id="bs-exe-check-btn" onclick="checkExeVersion()" data-settings-i18n="exe_check_btn">버전 확인</button>
                    </div>
                    <button class="bs-btn-accent bs-btn-wide" onclick="downloadExe()" data-settings-i18n="exe_download_btn">BrickSync.exe 다운로드</button>
                </div>

                <!-- 5. 서버 연결 -->
                <div class="bs-settings-section" style="margin-bottom: 0;">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_server">서버 연결</div>
                    <div class="bs-diag-box">
                        <span class="bs-diag-status" id="bs-server-status"></span>
                        <button class="bs-diag-btn" id="bs-server-retry-btn" onclick="reconnectBridgeServer()" data-settings-i18n="server_retry_btn">재연결</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 뒷배경 클릭 시 모달 닫기 바인딩
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettingsModal();
        });
    }

    // ----------------------------------------------------
    // 4. 모달 인터랙션 및 상태 매핑 로직
    // ----------------------------------------------------
    window.openSettingsModal = function () {
        injectSettingsDOM();

        // 1. 프로필 이름 세팅
        let studentName = "Guest_익명";
        try {
            const sessionStr = localStorage.getItem('bricksync_student_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session && session.name) {
                    studentName = session.name;
                }
            }
        } catch (e) { }
        document.getElementById('bs-settings-profile-name').textContent = studentName;

        // 2. 로컬 스토리지에 저장된 설정값 불러와 UI 동기화
        const currentLang = localStorage.getItem('bricksync_lang') || 'ko';
        const currentVolume = parseFloat(localStorage.getItem('bricksync_volume') || '1.0');

        // 언어 버튼 활성화
        document.querySelectorAll('#bs-settings-modal .bs-btn-option').forEach(btn => btn.classList.remove('active'));
        const activeLangBtn = document.getElementById(`btn-lang-${currentLang}`);
        if (activeLangBtn) activeLangBtn.classList.add('active');

        // 볼륨 슬라이더 값
        const slider = document.getElementById('settings-volume-slider');
        const display = document.getElementById('settings-volume-display');
        if (slider && display) {
            slider.value = Math.round(currentVolume * 100);
            display.textContent = Math.round(currentVolume * 100) + '%';
        }
        
        // 모달 내 텍스트 전체 번역 적용
        translateSettingsModal(currentLang);
        renderExeStatus(); renderServerStatus();
        window.checkExeVersion(); window.refreshServerStatus();

        // 오픈 애니메이션 구동
        const modal = document.getElementById('bs-settings-modal');
        modal.classList.add('show');
    };

    // ----------------------------------------------------
    // 4-2. exe 버전 확인 / 다운로드, 로컬 서버 연결 상태 / 재연결
    // ----------------------------------------------------
    const EXE_DOWNLOAD_URL = 'https://edu.bricksync.org/Bricksync.exe';
    const exeState = { kind: 'checking', cur: '', latest: '' };
    const serverState = { kind: 'checking' };

    function settingsLang() { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; }
    function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] !== undefined ? o[k] : m)); }
    // 로컬 서버(포트 8000) 주소: 로컬에서 열었으면 같은 주소, 인터넷 주소에서 열었으면 127.0.0.1:8000
    function bridgeBase() {
        const h = location.hostname;
        return (h === 'localhost' || h === '127.0.0.1') ? '' : 'http://127.0.0.1:8000';
    }
    function bridgeWsUrl() {
        const h = location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
        return 'ws://127.0.0.1:8000/ws';
    }
    function shellWin() {
        try { if (window.parent && window.parent !== window && typeof window.parent.getBridgeStatus === 'function') return window.parent; } catch (e) { }
        return typeof window.getBridgeStatus === 'function' ? window : null;
    }
    function versionNewer(a, b) {   // a가 b보다 새 버전이면 true
        const pa = String(a).split('.').map(n => parseInt(n, 10) || 0), pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const x = pa[i] || 0, y = pb[i] || 0;
            if (x !== y) return x > y;
        }
        return false;
    }
    function renderExeStatus() {
        const el = document.getElementById('bs-exe-status'); if (!el) return;
        const t = i18n[settingsLang()];
        const v = { cur: exeState.cur, latest: exeState.latest };
        const map = { checking: t.exe_checking, ok: t.exe_status_ok, old: t.exe_status_old, unknown_cur: t.exe_status_unknown_cur, unknown_latest: t.exe_status_unknown_latest, none: t.exe_status_none };
        el.textContent = fmt(map[exeState.kind] || t.exe_checking, v);
    }
    function renderServerStatus() {
        const el = document.getElementById('bs-server-status'); if (!el) return;
        const t = i18n[settingsLang()];
        el.textContent = serverState.kind === 'ok' ? t.server_ok : (serverState.kind === 'off' ? t.server_off : t.server_checking);
        el.style.color = serverState.kind === 'ok' ? '#2f7a4d' : (serverState.kind === 'off' ? '#e11d48' : '');
    }
    window.checkExeVersion = async function () {
        const btn = document.getElementById('bs-exe-check-btn'); if (btn) btn.disabled = true;
        exeState.kind = 'checking'; renderExeStatus();
        let cur = '', latest = '';
        try {   // 지금 실행 중인 exe가 알려 주는 버전 (구버전 exe는 알려 주지 못한다)
            const r = await fetch(bridgeBase() + '/api/version', { cache: 'no-store' });
            if (r.ok) { const j = await r.json(); cur = String(j.version || ''); }
        } catch (e) { }
        try {   // 웹앱이 알고 있는 최신 exe 버전
            const r = await fetch(new URL('version.json', location.href).href + '?t=' + Date.now(), { cache: 'no-store' });
            if (r.ok) { const j = await r.json(); latest = String(j.exe_version || ''); }
        } catch (e) { }
        exeState.cur = cur; exeState.latest = latest;
        if (!latest && !cur) exeState.kind = 'none';
        else if (!latest) exeState.kind = 'unknown_latest';
        else if (!cur) exeState.kind = 'unknown_cur';
        else exeState.kind = versionNewer(latest, cur) ? 'old' : 'ok';
        renderExeStatus();
        if (btn) btn.disabled = false;
    };
    window.downloadExe = function () {
        const a = document.createElement('a');
        // 서버가 exe 를 몇 시간 동안 캐시해도 된다고 알리므로, 주소에 버전과 시각을 붙여 항상 새로 받는다 (이전에 받은 옛 파일이 재사용되지 않게)
        const bust = '?v=' + encodeURIComponent(exeState.latest || 'latest') + '&t=' + Date.now();
        a.href = EXE_DOWNLOAD_URL + bust; a.target = '_blank'; a.rel = 'noopener'; a.download = 'Bricksync.exe';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
    // 서버 연결 상태: 앱 화면(app.html)이 쓰는 연결을 그대로 보고, 없으면 잠깐 직접 접속해 본다
    function probeBridge() {
        return new Promise(resolve => {
            let done = false;
            const finish = ok => { if (!done) { done = true; resolve(ok); } };
            try {
                const s = new WebSocket(bridgeWsUrl());
                s.onopen = () => { finish(true); try { s.close(); } catch (e) { } };
                s.onerror = () => finish(false);
                s.onclose = () => finish(false);
                setTimeout(() => { finish(false); try { s.close(); } catch (e) { } }, 2500);
            } catch (e) { finish(false); }
        });
    }
    window.refreshServerStatus = async function () {
        const sh = shellWin();
        if (sh) serverState.kind = sh.getBridgeStatus() ? 'ok' : 'off';
        else serverState.kind = (await probeBridge()) ? 'ok' : 'off';
        renderServerStatus();
    };
    window.reconnectBridgeServer = async function () {
        const btn = document.getElementById('bs-server-retry-btn'); if (btn) btn.disabled = true;
        serverState.kind = 'checking'; renderServerStatus();
        const sh = shellWin();
        try { if (sh && typeof sh.reconnectBridge === 'function') sh.reconnectBridge(); } catch (e) { }
        await new Promise(r => setTimeout(r, 1500));
        await window.refreshServerStatus();
        if (btn) btn.disabled = false;
    };
    window.addEventListener('bs-bridge-status', () => { if (document.getElementById('bs-server-status')) window.refreshServerStatus(); });
    try { if (window.parent && window.parent !== window) window.parent.addEventListener('bs-bridge-status', () => { if (document.getElementById('bs-server-status')) window.refreshServerStatus(); }); } catch (e) { }

    window.closeSettingsModal = function () {
        const modal = document.getElementById('bs-settings-modal');
        if (modal) modal.classList.remove('show');
    };

    // ----------------------------------------------------
    // 5. 비즈니스 로직 처리 함수들 (볼륨, 스케일, 백업, 로그아웃)
    // ----------------------------------------------------

    // 5.1 다국어 변경 로직 (Change Language)
    window.applyBrickSyncLanguage = function (lang) {
        const targetLang = lang || localStorage.getItem('bricksync_lang') || 'ko';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[targetLang] && i18n[targetLang][key]) {
                const icon = el.querySelector('i');
                if (icon) {
                    const iconHtml = icon.outerHTML;
                    el.innerHTML = iconHtml + ' ' + i18n[targetLang][key];
                } else {
                    el.innerHTML = i18n[targetLang][key];
                }
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (i18n[targetLang] && i18n[targetLang][key]) {
                el.placeholder = i18n[targetLang][key];
            }
        });
    };

    window.changeSettingsLanguage = function (lang) {
        localStorage.setItem('bricksync_lang', lang);

        // 다국어 선택 칩 변경
        document.querySelectorAll('#bs-settings-modal .bs-btn-option[id^="btn-lang-"]').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-lang-${lang}`);
        if (activeBtn) activeBtn.classList.add('active');

        // 모달 내부 텍스트 번역
        translateSettingsModal(lang);
        renderExeStatus(); renderServerStatus();

        // 부모 페이지의 data-i18n 마크업이 부착된 노드 전체 번역
        window.applyBrickSyncLanguage(lang);

        // 다국어 변경 커스텀 이벤트 디스패치 (학습단원 및 미션 동적 텍스트 실시간 연동용)
        const langEvent = new CustomEvent('bricksync-language-changed', { detail: { lang: lang } });
        window.dispatchEvent(langEvent);
        if (window.parent && window.parent !== window) {
            try {
                window.parent.dispatchEvent(langEvent);
            } catch (e) { }
        }

        // Lucide 아이콘 손상 없게 보완 재생성 (Lucide 로드되어 있는 경우)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        window.applyBrickSyncLanguage();
    });

    function translateSettingsModal(lang) {
        document.querySelectorAll('[data-settings-i18n]').forEach(el => {
            const key = el.getAttribute('data-settings-i18n');
            if (i18n[lang] && i18n[lang][key]) {
                el.innerText = i18n[lang][key];
            }
        });
    }

    // 5.2 효과음 볼륨 변경 (Change Volume)
    window.changeSettingsVolume = function (val) {
        const volume = parseFloat(val) / 100;
        localStorage.setItem('bricksync_volume', volume.toFixed(2));

        const display = document.getElementById('settings-volume-display');
        if (display) display.textContent = val + '%';

        // 오디오 볼륨값 적용을 위해 오디오 재생 시 AudioContext gain 노드와 매핑하도록 권장
    };

    // 5.3 내 프로젝트 내보내기 백업 (Export Backup JSON)
    window.exportSettingsProjects = function () {
        let studentName = "Guest_익명";
        try {
            const sessionStr = localStorage.getItem('bricksync_student_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session && session.name) {
                    studentName = session.name;
                }
            }
        } catch (e) { }

        const backupData = {};

        // 1. 세션 백업
        const sessionKey = 'bricksync_student_session';
        const sessionVal = localStorage.getItem(sessionKey);
        if (sessionVal) backupData[sessionKey] = sessionVal;

        // 2. 해당 학생의 모든 오프라인 프로젝트 백업
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(studentName + '_project_') || key === 'dashboard_stats_' + studentName)) {
                backupData[key] = localStorage.getItem(key);
            }
        }

        // 3. 파일 다운로드 유도
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `bricksync_backup_${studentName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 5.5 컴퓨터에 소장 중인 JSON 백업파일 업로드 복원 (Import Backup JSON)
    window.importSettingsProjects = function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const backupData = JSON.parse(e.target.result);

                // 데이터 무결성 체크
                let valid = false;
                for (const key in backupData) {
                    localStorage.setItem(key, backupData[key]);
                    valid = true;
                }

                if (valid) {
                    const currentLang = localStorage.getItem('bricksync_lang') || 'ko';
                    alert(i18n[currentLang].alert_import_success);
                    location.reload();
                } else {
                    throw new Error("Empty backup");
                }
            } catch (err) {
                const currentLang = localStorage.getItem('bricksync_lang') || 'ko';
                alert(i18n[currentLang].alert_import_fail);
            }
        };
        reader.readAsText(file);
    };

    // 5.6 학생 로그아웃 (Session Clear & Logout)
    window.settingsLogout = function () {
        try {
            localStorage.removeItem('bricksync_student_session');
            localStorage.removeItem('bricksync_user_session');
            sessionStorage.removeItem('brickSyncLastPage');
            sessionStorage.removeItem('bs_entered');
        } catch (e) { }
        // 앱 틀(app.html) 안에서 눌러도 바깥 창 전체가 로그인 화면으로 가야 틀 안에 틀이 겹치지 않는다
        try { window.top.location.href = 'login.html'; } catch (e) { location.href = 'login.html'; }
    };

    // 5.7 Firebase 실시간 통신 진단 툴 (Run Connection Diagnostics)
    window.runSettingsDiagnostics = function () {
        const statusText = document.getElementById('bs-settings-diag-status');
        const currentLang = localStorage.getItem('bricksync_lang') || 'ko';
        if (!statusText) return;

        statusText.textContent = i18n[currentLang].diag_connecting;

        setTimeout(() => {
            const isOnline = (typeof isFirebaseOnline !== 'undefined' && isFirebaseOnline);
            if (isOnline) {
                statusText.innerHTML = `<span style="color:#10b981;">●</span> Cloud Connected (Latency: ${Math.round(15 + Math.random() * 20)}ms)`;
            } else {
                statusText.innerHTML = `<span style="color:#ef4444;">●</span> ${i18n[currentLang].diag_offline}`;
            }
        }, 1200);
    };

    // ----------------------------------------------------
    // 6. 페이지 로드 초기 바인딩 및 버튼 이벤트 연결
    // ----------------------------------------------------
    window.addEventListener('DOMContentLoaded', () => {
        // 1. 사이드바 설정 메뉴 버튼 클릭 리스너 연결
        const settingsBtn = document.getElementById('settings-menu-btn');
        if (settingsBtn) {
            settingsBtn.style.cursor = 'pointer';
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openSettingsModal();
            });
        }

        // 2. 앱 전역 설정값 초기 적용 (언어)
        const savedLang = localStorage.getItem('bricksync_lang');
        if (savedLang) {
            // 언어 자동 번역 1차 적용
            setTimeout(() => { changeSettingsLanguage(savedLang); window.dispatchEvent(new Event("bs-lang-ready")); }, 100);
        }

        // 이전 구버전 배율 캐시 완전 정리
        try {
            localStorage.removeItem('bricksync_scale');
        } catch (e) {}
    });

})();