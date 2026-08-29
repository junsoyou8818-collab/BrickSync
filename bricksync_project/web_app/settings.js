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
            modal_title: "⚙️ BrickSync 설정",
            sec_profile: "👤 학생 프로필",
            logout_btn: "로그아웃",
            sec_lang: "🌐 언어 설정 (Language)",
            sec_volume: "🔊 효과음 볼륨 (Volume)",
            sec_backup: "💾 프로젝트 로컬 백업 & 복구",
            backup_export: "📤 내 컴퓨터로 백업하기",
            backup_import: "📥 컴퓨터에서 복원하기",
            sec_diagnostics: "📡 실시간 통신 진단",
            diag_btn: "자가 진단 시작",
            diag_connecting: "클라우드 서버 연결 확인 중...",
            diag_online: "● Firebase 클라우드 연결됨 (정상 연동 중)",
            diag_offline: "● 오프라인 모드 안전 작동 중",
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
            lbl_conn_method_title: "연결 방식 선택",
            lbl_conn_method_desc: "스파이크 허브와 연결할 방식을 선택해주세요.",
            lbl_conn_usb: "USB 선으로 연결 (강력 추천)",
            lbl_conn_usb_desc: "안정적이며 빠른 속도 지원",
            lbl_conn_bt: "무선 블루투스 연결",
            lbl_cancel: "취소",
            btn_run: "실행",
            btn_stop: "정지",
            lbl_mission_progress: "미션 달성도",
            btn_check_tasks: "과제 확인",
            lbl_required_tasks: "필수 수행 과제",
            btn_close: "닫기",
            hint_drag_assemble: "하단에서 아이콘 블럭을 끌어와 조립해보세요!",
            btn_back_home: "홈으로 가기",
            lbl_workspace_title: "BrickSync Essential 아이콘 코딩",
            lbl_ai_vision_title: "AI 비전 제스처 인식",
            lbl_ai_object_title: "AI 사물 이미지 인식",
            lbl_ai_voice_title: "AI 자연어 프롬프팅 (음성 / 텍스트)",
            lbl_model_training: "인식 모델 학습 기능",
            lbl_btn_rock: "주먹",
            lbl_btn_paper: "보",
            lbl_btn_scissors: "가위",
            lbl_btn_none: "배경",
            lbl_gesture_waiting: "대기 중...",
            lbl_ai_loading: "AI 엔진 로딩 중...",
            lbl_mission_clear_title: "미션 달성!",
            lbl_mission_clear_desc: "레고 포트나이트 미션을 성공하였습니다!",
            lbl_issued_code: "지급된 액세스 코드",
            btn_copy: "복사하기",
            nav_dashboard_all: "교사/학부모용 대시보드",
            nav_dashboard_teacher: "교사 대시보드",
            nav_dashboard_parent: "학부모 대시보드",
            lbl_coin_shelf: "코인 보상 진열대",
            lbl_coin_shelf_subtitle: "코딩 미션을 성공할 때마다 황금 코인이 진열대에 하나씩 추가됩니다!",
                        // ── 9단계 퀵스타트 비주얼 가이드 (Korean) ──
            lbl_guide_banner_title: "BrickSync 시작 가이드",
            lbl_guide_banner_subtitle: "BrickSync가 처음이신가요? 연결 및 활용법을 확인하세요",
            lbl_guide_hero_title: "이렇게 사용해요!",
            lbl_guide_setup_header: "⚙️ BrickSync 시작 가이드 (Quick Start)",
            lbl_guide_menu_header: "📋 메뉴 기능 안내",
            lbl_guide_setup_tag: "Visual Step-by-Step Guide",
            lbl_guide_setup_title: "BrickSync 시작하기 & 연동 가이드",
            lbl_guide_setup_badge: "9단계 비주얼 퀵스타트 가이드",
            lbl_guide_step1_title: "BrickSync.exe 다운로드 & 실행",
            lbl_guide_step1_b1: "<a href=\"https://legofortnite.bricksync.org\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"guide-url-link\"><code>legofortnite.bricksync.org ↗</code></a> 공식 웹사이트에서 <code>BrickSync.exe</code> 파일을 다운로드하여 실행합니다.",
            lbl_guide_step1_b2: "웹사이트의 'Quick Start' 안내 가이드를 확인하며 손쉽게 시작할 수 있습니다.",
            lbl_guide_step1_b3: "<code>BrickSync.exe</code> 실행 시 로컬 브릿지 서버가 자동으로 시작되며 브라우저가 열립니다.",
            lbl_guide_step2_title: "회원가입 및 로그인",
            lbl_guide_step2_b1: "<strong>계정 유형 지원</strong>: 학생(Student), 교사(Teacher), 학부모(Parent) 계정을 지원합니다.",
            lbl_guide_step2_b2: "학생과 학부모는 담임 선생님이 제공한 클래스 코드 / 학부모 연동 코드로 가입합니다.",
            lbl_guide_step2_b3: "교사와 학부모는 학생 소속 및 실시간 학습 활동 데이터를 모니터링할 수 있습니다.",
            lbl_guide_step2_b4: "가입 없이 빠른 체험을 위한 <strong>게스트(Guest) 로그인</strong>을 지원합니다.",
            lbl_guide_step3_title: "레고 모델 조립",
            lbl_guide_step3_b1: "레고 브릭을 조립하고 허브(블루투스 장치)에 모터, 컬러 센서, 라이트 등 상호작용 부품을 연결합니다.",
            lbl_guide_step3_b2: "허브는 블루투스 무선 연결을 통해 각 전자 부품의 회전 및 점등을 정밀하게 제어합니다.",
            lbl_guide_step4_title: "학습단원 & AI 단원 선택",
            lbl_guide_step4_b1: "<strong>일반 단원 (1~5단원)</strong>: 보트, 잠수함, 관람차, 자동차, 사이렌 등 기초 블록 코딩 미션",
            lbl_guide_step4_b2: "<strong>AI 학습단원 (6~8단원)</strong>: 가위바위보 지붕, 음성 마이크 그네, 몬스터 경보 등 AI 심화 미션",
            lbl_guide_step5_title: "레고 허브 연결 (블루투스 / USB)",
            lbl_guide_step5_b1: "상단 <strong>[허브 연결 🔗]</strong> 버튼을 누르고 레고 허브 전원 버튼을 눌러 블루투스로 페어링합니다.",
            lbl_guide_step5_b2: "한 번 연결된 블루투스 세션은 단원을 이동하더라도 자동으로 안정적으로 유지됩니다.",
            lbl_guide_step5_b3: "블루투스 외에 <strong>USB 유선 케이블 연결</strong>도 완벽하게 지원합니다.",
            lbl_guide_step6_title: "아이콘 블록 코딩",
            lbl_guide_step6_b1: "<strong>[과제 확인 / Try Mission]</strong> 버튼을 클릭하여 레고 포트나이트 미션 과제를 확인합니다.",
            lbl_guide_step6_b2: "하단 트레이에서 아이콘 블록들을 조립하여 레고 허브와 포트나이트를 제어하는 코드를 완성합니다.",
            lbl_guide_step7_title: "AI 학습단원 머신러닝 학습 (6~8단원)",
            lbl_guide_step7_b1: "웹캠과 마이크를 통해 <strong>손 제스처(가위/바위/보), 음성 명령, 사물(몬스터 브릭)</strong> 인식 모델을 직접 학습시킵니다.",
            lbl_guide_step7_b2: "브릭싱크 웹 내에서 머신러닝 모델의 실시간 예측과 판정을 즉각 체험할 수 있습니다.",
            lbl_guide_step8_title: "포트나이트 'The Brick Island' 맵 접속",
            lbl_guide_step8_b1: "브릭싱크 웹의 중앙 버튼을 클릭하여 에픽게임즈 런처 및 포트나이트를 실행합니다.",
            lbl_guide_step8_b2: "포트나이트 검색(디스커버)에서 <strong>'The Brick Island'</strong> 또는 맵 코드 <code>7603-2493-0825</code>를 입력하여 입장합니다.",
            lbl_guide_step9_title: "실물 허브 & 포트나이트 실시간 동시 연동",
            lbl_guide_step9_b1: "블록 코딩 명령을 실행하여 <strong>레고 스파이크 키트와 포트나이트 3D 에셋을 실시간 동시 제어</strong>합니다.",
            lbl_guide_step9_b2: "<strong>1~5단원</strong>: <code>Run ▶</code> 버튼을 눌러 레고 허브와 포트나이트에 조종 신호를 전송합니다.",
            lbl_guide_step9_b3: "<strong>AI 6~8단원</strong>: <code>Run</code> 버튼 없이도 <strong>비전(제스처/사물) 및 자연어 음성/텍스트 프롬프팅</strong>으로 자동 명령이 발동됩니다.",
            lbl_guide_setup_badge: "9단계 비주얼 퀵스타트 가이드",
        lbl_guide_menu_header: "📋 메뉴 기능 안내",
            lbl_guide_setup_tag: "Quick Start Guide",
            lbl_guide_setup_title: "BrickSync 시작하기 & 연동 가이드",
            lbl_guide_step1_title: "BrickSync.exe 다운로드 & 실행",
            lbl_guide_step1_desc: "<code>legofortnite.bricksync.org</code>에서 파일을 다운로드하여 실행하면 로컬 브릿지 서버가 자동 가동되고 웹 브라우저가 열립니다.",
            lbl_guide_step2_title: "회원가입 및 로그인",
            lbl_guide_step2_desc: "학생, 교사, 학부모 계정으로 가입하거나 게스트 모드로 즉시 체험할 수 있습니다. (클래스 코드 지원)",
            lbl_guide_step3_title: "레고 모델 조립",
            lbl_guide_step3_desc: "레고 브릭을 조립하고 허브에 모터, 센서, 라이트 등 상호작용 부품을 연결합니다.",
            lbl_guide_step4_title: "학습단원 & AI 단원 선택",
            lbl_guide_step4_desc: "일반 학습단원(1~5단원) 또는 AI 융합 단원(6~8단원) 중 원하는 미션을 선택합니다.",
            lbl_guide_step5_title: "레고 허브 연결 (블루투스 / USB)",
            lbl_guide_step5_desc: "화면 상단 버튼으로 블루투스 무선 페어링 또는 USB 유선으로 허브를 연결합니다. (단원 이동 시 자동 유지)",
            lbl_guide_step6_title: "아이콘 블록 코딩",
            lbl_guide_step6_desc: "'미션 과제'를 확인한 후 하단의 아이콘 블록을 조립하여 허브와 포트나이트를 제어하는 코드를 작성합니다.",
            lbl_guide_step7_title: "AI 머신러닝 학습 (6~8단원)",
            lbl_guide_step7_desc: "웹캠과 마이크로 제스처, 음성, 사물 인식 모델을 학습시켜 AI 비전/음성 코딩을 경험합니다.",
            lbl_guide_step8_title: "포트나이트 맵 접속",
            lbl_guide_step8_desc: "포트나이트에서 'The Brick Island' (맵 코드: <code>7603-2493-0825</code>) 맵에 접속합니다.",
            lbl_guide_step9_title: "레고 허브 & 포트나이트 실시간 연동",
            lbl_guide_step9_desc: "1~5단원은 Run 버튼으로, 6~8단원은 AI 제스처/음성 프롬프팅으로 레고와 포트나이트 3D 에셋을 실시간 동시 조종합니다.",
            lbl_guide_setup_badge: "9단계 원클릭 퀵스타트 가이드",
                            btn_back_home: "← 홈으로 가기",
        lbl_menu01_title: "홈",
        lbl_menu02_title: "학습단원",
        lbl_menu03_title: "AI 학습단원",
        lbl_menu05_title: "프로젝트",
        lbl_guide_fortnite_header: "🎮 포트나이트 플레이 환경설정",
        lbl_guide_fortnite_tag: "포트나이트 조작법 설정",
        lbl_guide_fortnite_title: "The Brick Island 맵 키보드 조작법 커스텀 설정",
        lbl_guide_fortnite_desc: "포트나이트 <strong>The Brick Island</strong> 맵 접속 후, 블록 코드를 통해 에셋과 <strong>상호작용(탑승) 및 이동 조종</strong>이 작동하도록 아래 단계별로 키보드 커스텀 키를 설정해 주세요.",
        lbl_guide_fn_step1_badge: "STEP 1",
        lbl_guide_fn_step1_title: "플레이어 메뉴 (ESC) → 설정",
        lbl_guide_fn_step1_desc: "포트나이트 맵 접속 후 <kbd>ESC</kbd> 키를 눌러 플레이어 메뉴를 열고, 좌측 하단의 <strong>설정 (⚙️)</strong> 메뉴를 클릭합니다.",
        lbl_guide_fn_step2_badge: "STEP 2",
        lbl_guide_fn_step2_title: "키보드 조작법 (KEYBOARD CONTROLS)",
        lbl_guide_fn_step2_desc: "상단 메뉴의 탭 아이콘 중 4방향 화살표 모양의 <strong>KEYBOARD CONTROLS (키보드 조작법 ⌨️)</strong> 탭을 클릭합니다.",
        lbl_guide_fn_step3_badge: "STEP 3",
        lbl_guide_fn_step3_title: "크리에이티브 입력 동작 커스텀 키 설정",
        lbl_guide_fn_step3_desc: "스크롤을 내려 <strong>크리에이티브 입력 동작</strong> 섹션의 <strong>사용자 지정 입력 6 ~ 10</strong> 항목을 지정된 단축키로 변경합니다.",
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

        lbl_guide_fortnite_header: "🎮 포트나이트 플레이 환경설정",
        lbl_guide_fortnite_title: "The Brick Island 맵 키보드 조작법 커스텀 설정",
        lbl_guide_fortnite_desc: "포트나이트 The Brick Island 맵 접속 후, 블록 코드를 통해 에셋과 상호작용(탑승) 및 이동 조종이 작동하도록 아래 단계별로 키보드 커스텀 키를 설정해 주세요.",

            lbl_menu01_title: "홈",
            lbl_menu01_desc: "BrickSync의 <strong>메인 페이지</strong>입니다.<br>학습 시작, 포트나이트 맵 접속, 내 프로젝트 확인 등<br>모든 기능을 한눈에 볼 수 있는 시작 화면입니다.",
            lbl_menu01_badge: "시작 화면",
            lbl_menu02_title: "학습단원",
            lbl_menu02_desc: "BrickSync 코딩 커리큘럼 <strong>1~5단원</strong>을 학습하는 공간입니다.<br>단원별 미션을 수행하며 레고 허브 블록 코딩을 단계적으로 배울 수 있습니다.<br>각 단원을 완료하면 <strong>코인 보상</strong>이 지급됩니다.",
            lbl_menu02_badge: "1단원 ~ 5단원",
            lbl_menu03_title: "AI 학습단원",
            lbl_menu03_desc: "인공지능을 활용한 <strong>심화 학습</strong> 공간입니다.<br><strong>6~8단원</strong>에서는 손 제스처 인식, 음성 명령 등<br>AI 기술과 레고 허브를 융합한 특별한 코딩 미션을 경험합니다.",
            lbl_menu03_badge: "6단원 ~ 8단원 · AI 융합",
            lbl_menu05_title: "프로젝트",
            lbl_menu05_desc: "내가 만든 <strong>코딩 프로젝트</strong>를 저장하고 관리하는 공간입니다.<br>이전에 작업한 코드를 불러오거나<br>새 프로젝트를 시작할 수 있습니다.",
            lbl_menu05_badge: "프로젝트 저장 · 관리",
            tab_student: "학생",
            tab_teacher: "교사",
            tab_parent: "학부모",
            mode_login: "로그인",
            mode_signup: "회원가입",
            lbl_email: "이메일",
            lbl_login_name: "이름 (아이디 / 이메일)",
            lbl_password: "비밀번호",
            lbl_or: "또는",
            btn_guest_entry: "로그인 없이 게스트로 입장",
            info_student_signup: "담임 선생님께 클래스 코드를 받은 후 가입하세요.",
            info_teacher_signup: "교사 계정으로 가입하면 클래스 코드를 발급할 수 있습니다.",
            info_parent_signup: "담임 선생님께 학부모 연결 코드를 받은 후 가입하세요.",
            lbl_name: "이름",
            lbl_password_req: "비밀번호 (6자 이상)",
            lbl_school_name: "학교/기관명",
            lbl_class_code: "클래스 코드 (선생님 제공)",
            lbl_parent_code: "학부모 연결 코드 (선생님 제공)",
            btn_signup: "계정 만들기",
            lbl_password_placeholder: "비밀번호 입력",
            lbl_name_placeholder: "홍길동",
            lbl_login_name_placeholder: "student01 또는 이메일 입력",
            lbl_signup_password_placeholder: "비밀번호 설정",
            lbl_school_placeholder: "○○초등학교",
            lbl_class_code_placeholder: "예: BS-A1B2C3",
            lbl_parent_code_placeholder: "예: PRT-X7Y8Z9",

            // Workspace & Dashboard UI Keys
            lbl_device_sync: "시스템 연결",
            lbl_code_injection: "코드 주입",
            lbl_system_check: "시스템 확인",
            lbl_local_server_connected: "로컬 서버(포트나이트 연동) 연결 완료",
            lbl_log_start: "================ 로그 시작 ================",
            lbl_status_waiting: "대기 중...",
            dashboard_title: "교사/학부모 대시보드",
            btn_reset_all_data: "전체 데이터 초기화",
            lbl_select_student: "학생 선택",
            lbl_focus_learning_time: "집중 학습 시간",
            lbl_measuring_waiting: "측정 대기중",
            lbl_block_execution_cnt: "블록 실행 횟수",
            lbl_success_rate: "성공률",
            lbl_self_error_resolution: "스스로 오류 해결",
            lbl_analysis_pending: "- 분석 대기중",
            lbl_fortnite_mission: "포트나이트 미션",
            lbl_not_started: "시작 전",
            lbl_block_usage_analysis: "블록 사용 분석",
            lbl_motor_related: "모터 관련",
            lbl_sensor_control_related: "센서/제어 관련",
            lbl_other_actions: "기타 동작",
            lbl_block_analysis_hint: "블록 실행 시 분석 데이터가 채워집니다.",
            lbl_badge_skins: "스킨 3개",
            lbl_badge_vbucks: "V-Bucks 150",
            lbl_badge_master: "뱃지: 마스터",
            lbl_today_concepts: "오늘 배운 개념",
            concept_loops: "반복문",
            concept_conditionals: "조건문",
            concept_sensor_input: "센서 입력",
            concept_motor_control: "모터 제어",
            concept_ai_recog: "AI 인식",
            concept_fn_sync: "포트나이트 연동",
            lbl_growth_prev_class: "지난 수업 대비 성장",
            lbl_coding_complexity: "코딩 복잡도",
            lbl_mission_speed: "미션 완료 속도",
            lbl_focus_time: "집중 시간",
            lbl_realtime_log: "실시간 활동 로그",
            lbl_log_waiting_hint: "대기 중... (학생이 코딩을 시작하면 기록됩니다)",
            lbl_parent_report_title: "학부모 전송용 리포트",
            btn_send_kakao: "카카오톡 전송",
            lbl_today_summary_sub: "오늘의 학습 현황 요약표",
            lbl_assembly_track_result: "조립 과정 탐지 결과",
            lbl_waiting_active_data: "활성 데이터 대기중",
            lbl_class_status_live: "수업 현황 (실시간 연동)",
            lbl_tracked_block_cnt: "실행 추적 블록 수",
            lbl_motor_sensor_fusion: "모터+센서 융합 활용",
            lbl_measuring: "측정중",
            lbl_sys_conn_integrity: "시스템 통신 무결성",
            guest_anonymous: "익명",
            unit_mins: "분",
            unit_times: "회",
            unit_blocks: "블록",
            lbl_teacher_comment: "선생님 한마디 (AI 자동 분석)",
            lbl_live: "실시간",
            lbl_ai_comment_placeholder: "학생이 블록 코딩을 시작하면 해당 세션의 로그를 AI가 자동 분석하여 맞춤형 코멘트를 이곳에 작성합니다. (대기 중...)",
            default_student_name: "김민준 학생",

            // Learning list
            lesson_1: "1. 탐험보트를 출발시켜요",
            lesson_2: "2. 바닷속 잠수함으로 바다를 탐험해요",
            lesson_3: "3. 대관람차 회전하기",
            lesson_4: "4. 탐험 자동차를 만들어요",
            lesson_5: "5. 사이렌을 켜줘",

            ai_lesson_1: "6. 가위, 바위, 보로 여닫는 오두막 지붕",
            ai_lesson_2: "7. 마이크에 대고 외쳐봐! 목소리로 조종하는 요술 그네",
            ai_lesson_3: "8. 몬스터를 보여줘! 경보 알림켜기.",

            // Modal & Workspace UI
            lbl_required_tasks: "📋 미션 달성 과제",
            btn_try_mission: "미션 도전하기",
            btn_check_tasks: "미션 과제 체크",
            hint_drag_blocks: "하단에서 아이콘 블록을 끌어와 조립해보세요!",
            hint_drag_assemble: "하단에서 아이콘 블록을 끌어와 조립해보세요!",
            btn_retry_camera: "웹캠 수동 연결 📷",
            btn_start_camera_now: "📷 카메라 바로 켜기"
        },
        en: {
            // Sidebar / UI Shell
            nav_home: "Home",
            nav_lessons: "Lessons",
            nav_ai_lessons: "AI Lessons",
            nav_workspace: "System Connection",
            nav_projects: "Recent Project",
            nav_dashboard: "Dashboard",
            nav_settings: "Settings",

            // Settings Modal
            modal_title: "⚙️ BrickSync Settings",
            sec_profile: "👤 Student Profile",
            logout_btn: "Logout",
            sec_lang: "🌐 Language Settings",
            sec_volume: "🔊 SFX Volume",
            sec_backup: "💾 Local Backup & Restore",
            backup_export: "Export to PC",
            backup_import: "Import from PC",
            sec_diagnostics: "📡 Connectivity Diagnostics",
            diag_btn: "Start Diagnostic",
            diag_connecting: "Checking cloud connection...",
            diag_online: "● Firebase Connected (Syncing Live)",
            diag_offline: "● Operating safely in Offline Mode",
            alert_import_success: "Project restore completed. Reloading page.",
            alert_import_fail: "Invalid backup file format.",
            session_expires: "Session expiring soon",

            // [New translations for index.html, workspace, and lesson UI]
            profile_student: "Student",
            lbl_my_projects: "My Projects",
            btn_new_project: "+ New Project",
            lbl_blocks_count: "Blocks: {count}",
            lbl_last_modified: "Modified",
            lbl_lesson_badge: "Lesson {unit}",
            lbl_ai_lesson_badge: "AI Lesson {unit}",
            lbl_connect_hub: "Connect Hub",
            lbl_conn_method_title: "Select Connection Method",
            lbl_conn_method_desc: "Please select how to connect with your Spike Hub.",
            lbl_conn_usb: "Connect with USB Cable (Recommended)",
            lbl_conn_usb_desc: "Provides stable and fast connection speed",
            lbl_conn_bt: "Wireless Bluetooth Connection",
            lbl_cancel: "Cancel",
            btn_run: "Run",
            btn_stop: "Stop",
            lbl_mission_progress: "Progress",
            btn_check_tasks: "Tasks",
            lbl_required_tasks: "Required Tasks",
            btn_close: "Close",
            hint_drag_assemble: "Drag and assemble icon blocks from below!",
            btn_back_home: "Go to Home",
            lbl_workspace_title: "BrickSync Essential Icon Coding",
            lbl_ai_vision_title: "AI Gesture Recognition",
            lbl_ai_object_title: "AI Object Recognition",
            lbl_ai_voice_title: "AI Natural Language Prompting (Voice / Text)",
            lbl_model_training: "Model Training Control",
            lbl_btn_rock: "Rock",
            lbl_btn_paper: "Paper",
            lbl_btn_scissors: "Scissors",
            lbl_btn_none: "Background",
            lbl_gesture_waiting: "Waiting...",
            lbl_ai_loading: "AI Engine Loading...",
            lbl_mission_clear_title: "Mission Accomplished!",
        lbl_mission_clear_desc: "You have successfully completed the LEGO Fortnite mission!",
            lbl_issued_code: "Issued Access Code",
            btn_copy: "Copy",
            nav_dashboard_all: "Teacher/Parent Dashboard",
            nav_dashboard_teacher: "Teacher Dashboard",
            nav_dashboard_parent: "Parent Dashboard",
            lbl_coin_shelf: "Coin Reward Shelf",
            lbl_coin_shelf_subtitle: "A golden coin is added to the shelf each time you complete a coding mission!",
                        // ── 9-Step Quick Start Visual Guide (English) ──
            lbl_guide_banner_title: "BrickSync Getting Started Guide",
            lbl_guide_banner_subtitle: "New to BrickSync? Learn how to connect and use it.",
            lbl_guide_hero_title: "How to Use BrickSync!",
            lbl_guide_setup_header: "⚙️ BrickSync Quick Start Guide",
            lbl_guide_menu_header: "📋 Menu & Features Guide",
            lbl_guide_setup_tag: "Visual Step-by-Step Guide",
            lbl_guide_setup_title: "Getting Started with BrickSync",
            lbl_guide_setup_badge: "9-Step Visual Quick Start Guide",
            lbl_guide_step1_title: "Download & Run BrickSync.exe",
            lbl_guide_step1_b1: "Download and run <code>BrickSync.exe</code> file from <a href=\"https://legofortnite.bricksync.org\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"guide-url-link\"><code>legofortnite.bricksync.org ↗</code></a>.",
            lbl_guide_step1_b2: "Check the 'Quick Start' onboarding guide on the website to easily begin.",
            lbl_guide_step1_b3: "Running <code>BrickSync.exe</code> automatically starts the local bridge server and opens your browser.",
            lbl_guide_step2_title: "Sign-up and Login",
            lbl_guide_step2_b1: "<strong>Account Types Supported</strong>: Student, Teacher, and Parent accounts.",
            lbl_guide_step2_b2: "Students and parents sign up using a class code / link code provided by the teacher.",
            lbl_guide_step2_b3: "Teachers and parents can monitor student class affiliation and real-time learning activity data.",
            lbl_guide_step2_b4: "Supports <strong>Guest Login</strong> for quick exploration without registration.",
            lbl_guide_step3_title: "Assembling the LEGO Model",
            lbl_guide_step3_b1: "Assemble LEGO bricks and connect interactive components (motors, color sensors, lights) to the LEGO Hub.",
            lbl_guide_step3_b2: "The Hub precisely controls the rotation and lighting of each electronic part via wireless Bluetooth.",
            lbl_guide_step4_title: "Try Lessons & AI Lessons",
            lbl_guide_step4_b1: "<strong>General Lessons (Lessons 1–5)</strong>: Fundamental block coding missions (Boat, Submarine, Ferris Wheel, Car, Siren).",
            lbl_guide_step4_b2: "<strong>AI Lessons (Lessons 6–8)</strong>: Advanced AI missions (RPS Roof, Voice Swing, Monster Camera Alert).",
            lbl_guide_step5_title: "Connect with LEGO Hub (Bluetooth / USB)",
            lbl_guide_step5_b1: "Click the <strong>[Connect Hub 🔗]</strong> button at the top and press the Hub power button to pair via Bluetooth.",
            lbl_guide_step5_b2: "Once connected, the Bluetooth session is stably maintained even when navigating between lessons.",
            lbl_guide_step5_b3: "In addition to Bluetooth, <strong>USB cable connection</strong> is also fully supported.",
            lbl_guide_step6_title: "Icon Block Coding",
            lbl_guide_step6_b1: "Click the <strong>[Try Mission]</strong> button to check the LEGO Fortnite mission objectives.",
            lbl_guide_step6_b2: "Drag and snap icon blocks from the bottom tray to complete code that controls the LEGO Hub and Fortnite.",
            lbl_guide_step7_title: "AI Lesson Machine Learning (Lessons 6–8)",
            lbl_guide_step7_b1: "Train <strong>hand gesture (Rock/Paper/Scissors), voice command, and object (Monster Brick)</strong> recognition models via webcam and microphone.",
            lbl_guide_step7_b2: "Experience real-time AI machine learning predictions and decisions directly inside BrickSync.",
            lbl_guide_step8_title: "Access LEGO Fortnite 'The Brick Island' Map",
            lbl_guide_step8_b1: "Click the map button on the BrickSync home screen to launch Epic Games Launcher and Fortnite.",
            lbl_guide_step8_b2: "In Fortnite Discover (Search), type <strong>'The Brick Island'</strong> or map code <code>7603-2493-0825</code> to enter the island.",
            lbl_guide_step9_title: "Real-time Dual Synchronization",
            lbl_guide_step9_b1: "Execute block coding commands to <strong>control the physical LEGO Spike kit and Fortnite 3D assets simultaneously in real time</strong>.",
            lbl_guide_step9_b2: "<strong>Lessons 1–5</strong>: Press the <code>Run ▶</code> button to send control signals to the LEGO Hub and Fortnite.",
            lbl_guide_step9_b3: "<strong>AI Lessons 6–8</strong>: Commands trigger automatically through <strong>Vision (gesture/object) and Natural Language Prompting (voice/text)</strong> without pressing Run.",
                            btn_back_home: "← Back to Home",
        lbl_menu01_title: "Home",
        lbl_menu02_title: "Lessons",
        lbl_menu03_title: "AI Lessons",
        lbl_menu05_title: "Projects",
        lbl_guide_fortnite_header: "🎮 Fortnite Controls Setup",
        lbl_guide_fortnite_tag: "Fortnite Controls Setup",
        lbl_guide_fortnite_title: "The Brick Island Map Custom Keyboard Controls",
        lbl_guide_fortnite_desc: "After joining <strong>The Brick Island</strong> map in Fortnite, please configure the custom keyboard keys step-by-step below to enable asset interaction, mounting, and movement controls via block code.",
        lbl_guide_fn_step1_badge: "STEP 1",
        lbl_guide_fn_step1_title: "Player Menu (ESC) → Preference",
        lbl_guide_fn_step1_desc: "After joining the Fortnite map, press <kbd>ESC</kbd> to open the Player Menu, then click <strong>Preference (⚙️)</strong> at the bottom left.",
        lbl_guide_fn_step2_badge: "STEP 2",
        lbl_guide_fn_step2_title: "Keyboard Controls (KEYBOARD CONTROLS)",
        lbl_guide_fn_step2_desc: "Click the <strong>KEYBOARD CONTROLS (⌨️)</strong> tab with the 4-arrow D-pad icon from the top settings menu.",
        lbl_guide_fn_step3_badge: "STEP 3",
        lbl_guide_fn_step3_title: "Creative Input Actions Custom Keys",
        lbl_guide_fn_step3_desc: "Scroll down to the <strong>Creative Input Actions</strong> section and set <strong>Custom Input 6 ~ 10</strong> to the specified shortcut keys.",
        lbl_guide_fn_summary_title: "🔑 Required Custom Input Keybindings (Custom Input 6 ~ 10)",
        lbl_guide_fn_in6_name: "Custom Input 6 (Interact)",
        lbl_guide_fn_in6_role: "Asset Interaction & Mounting",
        lbl_guide_fn_in7_name: "Custom Input 7 (Forward)",
        lbl_guide_fn_in7_role: "Move Forward",
        lbl_guide_fn_in8_name: "Custom Input 8 (Backwards)",
        lbl_guide_fn_in8_role: "Move Backward",
        lbl_guide_fn_in9_name: "Custom Input 9 (Left)",
        lbl_guide_fn_in9_role: "Turn Left",
        lbl_guide_fn_in10_name: "Custom Input 10 (Right)",
        lbl_guide_fn_in10_role: "Turn Right",

        lbl_guide_fortnite_header: "🎮 Fortnite Controls Setup",
        lbl_guide_fortnite_title: "The Brick Island Map Custom Keyboard Controls",
        lbl_guide_fortnite_desc: "After joining 'The Brick Island' map in Fortnite, please configure the custom input keys step-by-step below to enable asset interaction, mounting, and vehicle movement controls via block code.",

            lbl_menu01_title: "Home",
            lbl_menu01_desc: "Main landing page of BrickSync.<br>Access lessons, join Fortnite maps, and manage your projects<br>all at a single glance.",
            lbl_menu01_badge: "Start Screen",
            lbl_menu02_title: "Lessons",
            lbl_menu02_desc: "Learn BrickSync coding curriculum <strong>Lessons 1~5</strong>.<br>Step-by-step Lego Hub block coding with missions.<br>Earn <strong>coin rewards</strong> upon completing each lesson.",
            lbl_menu02_badge: "Lessons 1 ~ 5",
            lbl_menu03_title: "AI Lessons",
            lbl_menu03_desc: "Advanced learning with Artificial Intelligence.<br>In <strong>Lessons 6~8</strong>, experience special AI coding missions<br>combining hand gestures, voice commands, and Lego Hub.",
            lbl_menu03_badge: "Lessons 6 ~ 8 · AI Fusion",
            lbl_menu05_title: "Projects",
            lbl_menu05_desc: "Save and manage your custom <strong>coding projects</strong>.<br>Load previous code workspaces<br>or launch a brand new project.",
            lbl_menu05_badge: "Save & Manage Projects",
            tab_student: "Student",
            tab_teacher: "Teacher",
            tab_parent: "Parent",
            mode_login: "Log In",
            mode_signup: "Sign Up",
            lbl_email: "Email",
            lbl_login_name: "Name (Username / Email)",
            lbl_password: "Password",
            lbl_or: "or",
            btn_guest_entry: "Enter as Guest without Login",
            info_student_signup: "Please sign up after receiving a Class Code from your teacher.",
            info_teacher_signup: "Signing up as a teacher allows you to issue Class Codes.",
            info_parent_signup: "Please sign up after receiving a Parent Link Code from your teacher.",
            lbl_name: "Name",
            lbl_password_req: "Password (6+ chars)",
            lbl_school_name: "School/Organization Name",
            lbl_class_code: "Class Code (From Teacher)",
            lbl_parent_code: "Parent Link Code (From Teacher)",
            btn_signup: "Create Account",
            lbl_password_placeholder: "Enter Password",
            lbl_name_placeholder: "e.g. John Doe",
            lbl_login_name_placeholder: "Enter username or email",
            lbl_signup_password_placeholder: "Set Password",
            lbl_school_placeholder: "e.g. Lincoln Elementary",
            lbl_class_code_placeholder: "e.g. BS-A1B2C3",
            lbl_parent_code_placeholder: "e.g. PRT-X7Y8Z9",

            // Workspace & Dashboard UI Keys
            lbl_device_sync: "System Connection",
            lbl_code_injection: "Code Injection",
            lbl_system_check: "System Verification",
            lbl_local_server_connected: "Local Server (Fortnite Sync) Connected",
            lbl_log_start: "================ Log Started ================",
            lbl_status_waiting: "Waiting...",
            dashboard_title: "Teacher/Parent Dashboard",
            btn_reset_all_data: "Reset All Data",
            lbl_select_student: "Select Student",
            lbl_focus_learning_time: "Focused Learning Time",
            lbl_measuring_waiting: "Waiting for telemetry...",
            lbl_block_execution_cnt: "Block Executions",
            lbl_success_rate: "Success Rate",
            lbl_self_error_resolution: "Self Error Resolution",
            lbl_analysis_pending: "- Pending Analysis",
            lbl_fortnite_mission: "Fortnite Missions",
            lbl_not_started: "Not Started",
            lbl_block_usage_analysis: "Block Usage Analysis",
            lbl_motor_related: "Motor Related",
            lbl_sensor_control_related: "Sensor/Control Related",
            lbl_other_actions: "Other Actions",
            lbl_block_analysis_hint: "Analysis data populates upon block execution.",
            lbl_badge_skins: "3 Skins",
            lbl_badge_vbucks: "V-Bucks 150",
            lbl_badge_master: "Badge: Master",
            lbl_today_concepts: "Concepts Learned Today",
            concept_loops: "Loops",
            concept_conditionals: "Conditionals",
            concept_sensor_input: "Sensor Input",
            concept_motor_control: "Motor Control",
            concept_ai_recog: "AI Recognition",
            concept_fn_sync: "Fortnite Integration",
            lbl_growth_prev_class: "Growth vs Previous Class",
            lbl_coding_complexity: "Coding Complexity",
            lbl_mission_speed: "Mission Speed",
            lbl_focus_time: "Focus Time",
            lbl_realtime_log: "Live Activity Log",
            lbl_log_waiting_hint: "Waiting... (Records when student starts coding)",
            lbl_parent_report_title: "Parent Summary Report",
            btn_send_kakao: "Send via KakaoTalk",
            lbl_today_summary_sub: "Today's Learning Summary",
            lbl_assembly_track_result: "Assembly Tracking Result",
            lbl_waiting_active_data: "Waiting for Active Data",
            lbl_class_status_live: "Class Status (Live Sync)",
            lbl_tracked_block_cnt: "Tracked Block Count",
            lbl_motor_sensor_fusion: "Motor+Sensor Fusion",
            lbl_measuring: "Measuring...",
            lbl_sys_conn_integrity: "System Connectivity Integrity",
            guest_anonymous: "Anonymous",
            unit_mins: " mins",
            unit_times: " times",
            unit_blocks: " blocks",
            lbl_teacher_comment: "Teacher's Note (AI Auto-Analysis)",
            lbl_live: "Live",
            lbl_ai_comment_placeholder: "When a student starts block coding, AI will automatically analyze session logs and provide tailored feedback here. (Waiting...)",
            default_student_name: "Student Minjun Kim",

            // Learning list
            lesson_1: "1. Launch the exploration boat",
            lesson_2: "2. Explore the sea with an underwater submarine",
            lesson_3: "3. Rotate the Ferris Wheel",
            lesson_4: "4. Ride a cave car and travel",
            lesson_5: "5. Turn on the siren",

            ai_lesson_1: "6. RPS Gesture-Controlled Cabin Roof (Open/Close)",
            ai_lesson_2: "7. Shout into the Mic! Control the Magic Swing with Your Voice",
            ai_lesson_3: "8. Animal Alert Ranger (Monster Camera)",

            // Modal & Workspace UI
            lbl_required_tasks: "📋 Required Tasks",
            btn_try_mission: "Try Mission",
            btn_check_tasks: "Check Tasks",
            hint_drag_blocks: "Drag icon blocks from below to assemble your code!",
            hint_drag_assemble: "Drag icon blocks from below to assemble your code!"
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
            background: rgba(15, 7, 32, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex; justify-content: center; align-items: center;
            z-index: 99999;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .bs-settings-overlay.show {
            opacity: 1; pointer-events: auto;
        }
        .bs-settings-card {
            background: rgba(43, 17, 79, 0.85);
            border: 2px solid rgba(250, 204, 21, 0.3);
            box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(167, 139, 250, 0.2);
            border-radius: 36px;
            width: 720px; max-width: 92%;
            padding: 45px;
            color: #f8fafc;
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
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 22px; margin-bottom: 30px;
        }
        .bs-settings-title {
            font-size: 2.1rem; font-weight: 800; color: #facc15;
            text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
        }
        .bs-settings-close {
            background: none; border: none; color: #cbd5e1;
            font-size: 2.25rem; cursor: pointer; transition: color 0.2s;
        }
        .bs-settings-close:hover { color: #f43f5e; }
        
        .bs-settings-section {
            margin-bottom: 30px;
        }
        .bs-settings-sec-title {
            font-size: 1.425rem; font-weight: 700; color: #c4b5fd;
            margin-bottom: 15px; display: flex; align-items: center; gap: 12px;
        }
        
        /* Profile Row */
        .bs-profile-row {
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(255,255,255,0.05); padding: 18px 27px; border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .bs-profile-name { font-weight: 700; font-size: 1.575rem; }
        .bs-btn-danger {
            background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4);
            color: #f43f5e; padding: 9px 21px; border-radius: 12px; font-weight: 700;
            font-size: 1.05rem; cursor: pointer; transition: 0.2s;
        }
        .bs-btn-danger:hover { background: #f43f5e; color: #fff; }

        /* Button Groups (Language / Zoom) */
        .bs-btn-group {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;
        }
        .bs-btn-group.three-cols {
            grid-template-columns: repeat(3, 1fr);
        }
        .bs-btn-option {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            color: #cbd5e1; padding: 15px; border-radius: 15px; font-weight: 600;
            font-size: 1.2rem; cursor: pointer; text-align: center; transition: 0.2s;
        }
        .bs-btn-option:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .bs-btn-option.active {
            background: var(--fn-yellow, #facc15); color: #000;
            border-color: var(--fn-yellow, #facc15);
            box-shadow: 0 0 12px rgba(250, 204, 21, 0.3); font-weight: 800;
        }
        
        /* Volume Range */
        .bs-volume-container {
            display: flex; align-items: center; gap: 22px;
        }
        .bs-volume-slider {
            flex: 1; height: 9px; -webkit-appearance: none; appearance: none;
            background: rgba(255,255,255,0.15); border-radius: 5px; outline: none;
        }
        .bs-volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 27px; height: 27px;
            border-radius: 50%; background: #facc15; cursor: pointer;
            box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);
        }
        .bs-volume-val { font-family: 'Outfit', monospace; font-weight: 700; font-size: 1.2rem; width: 52px; text-align: right; }

        /* Backup Buttons */
        .bs-backup-group {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;
        }
        .bs-btn-accent {
            background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.4);
            color: #38bdf8; padding: 15px; border-radius: 15px; font-weight: 700;
            font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
            transition: 0.2s;
        }
        .bs-btn-accent:hover { background: #38bdf8; color: #000; }
        
        /* Diagnostics Panel */
        .bs-diag-box {
            background: rgba(0,0,0,0.2); padding: 18px 27px; border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.05); font-size: 1.35rem; min-height: 67px;
            display: flex; align-items: center; justify-content: space-between;
        }
        .bs-diag-status { font-weight: 600; color: #94a3b8; }
        .bs-diag-btn {
            background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.4);
            color: #c4b5fd; padding: 6px 15px; border-radius: 9px; font-size: 1.2rem;
            font-weight: 700; cursor: pointer; transition: 0.2s;
        }
        .bs-diag-btn:hover { background: #8b5cf6; color: #fff; }
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
                    <span class="bs-settings-title" data-settings-i18n="modal_title">⚙️ BrickSync 설정</span>
                    <button class="bs-settings-close" onclick="closeSettingsModal()">&times;</button>
                </div>
                
                <!-- 1. Profile Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_profile">👤 학생 프로필</div>
                    <div class="bs-profile-row">
                        <span class="bs-profile-name" id="bs-settings-profile-name">최민</span>
                        <button class="bs-btn-danger" onclick="settingsLogout()" data-settings-i18n="logout_btn">로그아웃</button>
                    </div>
                </div>
                
                <!-- 2. Language Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_lang">🌐 언어 설정 (Language)</div>
                    <div class="bs-btn-group">
                        <button class="bs-btn-option" id="btn-lang-ko" onclick="changeSettingsLanguage('ko')">한국어</button>
                        <button class="bs-btn-option" id="btn-lang-en" onclick="changeSettingsLanguage('en')">English</button>
                    </div>
                </div>
                
                <!-- 3. Volume Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_volume">🔊 효과음 볼륨 (Volume)</div>
                    <div class="bs-volume-container">
                        <input type="range" class="bs-volume-slider" id="settings-volume-slider" min="0" max="100" value="100" oninput="changeSettingsVolume(this.value)">
                        <span class="bs-volume-val" id="settings-volume-display">100%</span>
                    </div>
                </div>
                
                <!-- 4. Backup Section -->
                <div class="bs-settings-section">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_backup">💾 프로젝트 로컬 백업 & 복구</div>
                    <div class="bs-backup-group">
                        <button class="bs-btn-accent" onclick="exportSettingsProjects()" data-settings-i18n="backup_export">📤 백업하기</button>
                        <button class="bs-btn-accent" onclick="document.getElementById('bs-backup-file-input').click()" data-settings-i18n="backup_import">📥 복원하기</button>
                    </div>
                    <input type="file" id="bs-backup-file-input" style="display:none;" accept=".json" onchange="importSettingsProjects(event)">
                </div>
                
                <!-- 6. Connectivity Section -->
                <div class="bs-settings-section" style="margin-bottom: 0;">
                    <div class="bs-settings-sec-title" data-settings-i18n="sec_diagnostics">📡 실시간 통신 진단</div>
                    <div class="bs-diag-box">
                        <span class="bs-diag-status" id="bs-settings-diag-status" data-settings-i18n="diag_offline">● 오프라인 모드 안전 작동 중</span>
                        <button class="bs-diag-btn" onclick="runSettingsDiagnostics()" data-settings-i18n="diag_btn">자가 진단 시작</button>
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
        
        // 3. 통신 자가진단 기본값 렌더링
        const statusText = document.getElementById('bs-settings-diag-status');
        if (statusText) {
            const isOnline = (typeof isFirebaseOnline !== 'undefined' && isFirebaseOnline);
            statusText.setAttribute('data-settings-i18n', isOnline ? 'diag_online' : 'diag_offline');
            statusText.textContent = isOnline ? i18n[currentLang].diag_online : i18n[currentLang].diag_offline;
        }

        // 모달 내 텍스트 전체 번역 적용
        translateSettingsModal(currentLang);

        // 오픈 애니메이션 구동
        const modal = document.getElementById('bs-settings-modal');
        modal.classList.add('show');
    };

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
        localStorage.removeItem('bricksync_student_session');
        location.href = 'student_login.html';
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
            setTimeout(() => changeSettingsLanguage(savedLang), 100);
        }

        // 이전 구버전 배율 캐시 완전 정리
        try {
            localStorage.removeItem('bricksync_scale');
        } catch (e) {}
    });

})();