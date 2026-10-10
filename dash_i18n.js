/* 교사·학부모 대시보드 영어 표시
 *   영어 모드(localStorage bricksync_lang = 'en')일 때만 화면에 보이는 한글 문구를 영어로 바꿔 보여 준다.
 *   - 글자(텍스트 노드)와 placeholder / title / aria-label 을 대상으로, 사전에 있는 문구만 바꾼다.
 *   - 새로 그려지는 화면(innerHTML, 알림창, 토스트)도 MutationObserver 가 따라가며 바꾼다.
 *   - 학생 이름, 선생님이 쓴 리포트 본문, 학부모 의견은 그대로 둔다.
 *   - 한국어 모드에서는 아무것도 하지 않는다. 언어를 바꾸면(bricksync-language-changed) 즉시 다시 맞춘다.
 */
(function () {
    'use strict';
    if (window.__bsDashI18n) return;
    window.__bsDashI18n = true;

    var HAN = /[가-힣]/;
    function isEn() { try { return localStorage.getItem('bricksync_lang') === 'en'; } catch (e) { return false; } }

    var NAMES = { '선생님': 'Teacher', '학부모': 'Parent', '학생': 'Student', '학부모님': 'Parent' };
    function nm(x) { return NAMES[x] || x; }
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    /* 문장 전체가 같을 때 */
    var EXACT = {
        // 공통
        '로딩 중...': 'Loading...', '불러오는 중...': 'Loading...', '로그아웃': 'Log out',
        '복사': 'Copy', '발급': 'Issue', '삭제': 'Delete', '수정': 'Edit', '학생': 'Student', '학부모': 'Parent', '선생님': 'Teacher',
        '클라우드에 연결하지 못해 이 기기에 저장된 정보만 보여드려요.': "Couldn't connect to the cloud, so only information saved on this device is shown.",
        // 교사 사이드바 / 홈
        '교사 관리 대시보드': 'Teacher Dashboard', '홈': 'Home', '학생 관리': 'Students', '클래스 코드': 'Class Codes', '학부모 코드': 'Parent Code',
        '교사 계정': 'Teacher Account', '교사 대시보드': 'Teacher Dashboard',
        '오늘도 BrickSync와 함께 즐거운 수업을 만들어보세요!': "Let's make another fun class with BrickSync today!",
        '총 학생 수': 'Total Students', '클래스 수': 'Classes', '유효한 학부모 코드': 'Valid Parent Codes',
        '클래스 코드 발급': 'Issue Class Code', '최근 등록 학생': 'Recently Added Students',
        '클래스명 (예: 2025년 3반)': 'Class name (e.g. Class 3, 2025)', '클래스명 입력': 'Enter class name',
        '관리 중인 학생이 없습니다': 'No students yet',
        '클래스명을 입력해주세요.': 'Please enter a class name.', '클래스 코드 발급 완료!': 'Class code issued!',
        // 학생 관리
        '학생 관리 ': 'Student Management',
        '내 클래스에 연결된 학생 목록입니다. 학생을 누르면 아래로 학습 현황과 리포트가 펼쳐져요.': 'Students linked to your classes. Click a student to expand their learning status and reports below.',
        '전체 학생 목록': 'All Students', '관리 중인 학생 없음': 'No students yet', '클래스 코드를 발급해 학생을 초대하세요.': 'Issue a class code to invite students.',
        '학습 현황': 'Learning Status',
        '선생님 리포트': 'Teacher Report',
        '예: 이번 주에는 반복문 블록을 스스로 활용해 자동차를 움직였어요. 집중력이 좋아졌습니다.': 'e.g. This week, the student used loop blocks on their own to move the car. Their focus has improved.',
        '수정 취소': 'Cancel Edit', '리포트 저장': 'Save Report', '수정 저장': 'Save Changes',
        '리포트 내용을 입력해주세요.': 'Please enter the report content.', '리포트를 저장했어요.': 'Report saved.',
        '이 기기에만 저장됐어요. 학부모님께 보이려면 인터넷 연결과 Firestore 규칙(teacherReports)을 확인해 주세요.': 'Saved on this device only. To show it to parents, check your internet connection and the Firestore rules (teacherReports).',
        '이 리포트를 삭제할까요?': 'Delete this report?', '학부모 화면에서도 사라지고 되돌릴 수 없어요.': "It will also disappear from the parent's screen and can't be undone.",
        '리포트를 삭제했어요.': 'Report deleted.',
        '아직 학부모 리뷰가 없어요.': 'No parent reviews yet.', '작성한 리포트가 없어요.': 'No reports written yet.',
        '이 리포트에 대한 학부모 리뷰는 아직 없어요.': 'No parent review for this report yet.',
        // 클래스 코드
        '클래스 코드 관리': 'Class Code Management',
        '발급한 클래스 코드 목록입니다. 학생에게 코드를 공유하면 가입할 수 있습니다.': 'Your issued class codes. Share a code with students so they can sign up.',
        '새 클래스 코드 발급': 'Issue New Class Code', '발급된 코드 목록': 'Issued Codes', '발급된 클래스 코드가 없습니다.': 'No class codes issued yet.',
        // 학부모 코드
        '학부모 연결 코드': 'Parent Link Code',
        '클래스와 학생을 고르면 학부모 연결 코드를 만들어 드려요. 학생 한 명당 유효한 코드는 하나이고, 7일간 쓸 수 있어요.': 'Pick a class and a student to create a parent link code. Each student can have one valid code, usable for 7 days.',
        '학부모 코드 발급': 'Issue Parent Code', '클래스 선택': 'Select class', '학생 선택': 'Select student', '이 클래스에 학생이 없어요': 'No students in this class',
        '발급된 학부모 코드가 없습니다.': 'No parent codes issued yet.', '위에서 클래스와 학생을 고른 뒤 발급하세요.': 'Pick a class and a student above, then issue a code.',
        '클래스 미지정': 'No class', '신규 클래스': 'New class', '사용됨': 'Used', '만료': 'Expired', '사용 가능': 'Available',
        '클래스를 먼저 선택해주세요.': 'Please select a class first.', '학생을 선택해주세요.': 'Please select a student.',
        '새로 발급하면 이전 코드는 더 이상 쓸 수 없게 돼요.': 'Issuing a new code will make the previous one unusable.', '새로 발급': 'Issue New',
        '코드는 7일간 유효합니다.': 'The code is valid for 7 days.', '발급하기': 'Issue',
        '코드를 클라우드에 저장하지 못했어요': "Couldn't save the code to the cloud",
        '이 기기에만 저장되어, 학부모님이 다른 기기에서 가입하면 코드를 찾지 못해요. 인터넷 연결과 Firestore 규칙(parentCodes)을 확인한 뒤 다시 발급해 주세요.': "It was saved on this device only, so parents signing up from another device won't find the code. Check your internet connection and the Firestore rules (parentCodes), then issue it again.",
        '이 코드를 학부모님께 전달하세요. (7일 유효)': 'Give this code to the parent. (Valid for 7 days)',
        // 학부모
        '학부모 리포트': 'Parent Report', '학습 리포트': 'Learning Report', '학부모 계정': 'Parent Account',
        '자녀 정보 없음': 'No child information', '연결된 학생이 없습니다. 선생님께 받은 학부모 코드로 다시 가입해 주세요.': 'No linked student. Please sign up again with the parent code from the teacher.',
        '연결됨 ✓': 'Connected ✓',
        '자녀의 학습 현황과 선생님 리포트를 확인하고, 만족도와 의견을 남겨 주세요.': "Check your child's learning status and the teacher's reports, and leave your rating and feedback.",
        '아직 선생님이 남긴 리포트가 없습니다.': 'The teacher has not left any reports yet.',
        '이 리포트에 대한 만족도': 'Your satisfaction with this report',
        '선생님께 전하고 싶은 의견을 적어 주세요. (선택)': 'Write any feedback you would like to share with the teacher. (Optional)',
        '수정하기': 'Edit', '남기기': 'Submit', '별점을 먼저 선택해 주세요.': 'Please select a star rating first.', '소중한 의견 감사합니다.': 'Thank you for your valuable feedback.',
        '이 기기에만 저장됐어요. 선생님께 보이려면 인터넷 연결을 확인해 주세요.': 'Saved on this device only. To show it to the teacher, please check your internet connection.',
        '만족도 별점': 'Satisfaction rating',
        // 학습 현황(dashboard_v2) 안쪽
        '학생이 블록 코딩을 시작하면 해당 세션의 로그를 AI가 자동 분석하여 맞춤형 코멘트를 이곳에 작성합니다. (대기 중...)': 'When a student starts block coding, AI will automatically analyze session logs and provide tailored feedback here. (Waiting...)',
        '모든 학생의 실시간 학습 데이터를 초기화하시겠습니까?': "Reset all students' real-time learning data?",
        '과거 누적된 블록 횟수와 집중 시간 및 로그가 리셋됩니다.': 'Accumulated block counts, focus time and logs will be reset.',
        '초기화하기': 'Reset', '모든 학생의 학습 이력이 성공적으로 초기화되었습니다.': "All students' learning history has been reset.",
        '탐험보트를 출발시켜요': 'Launch the Exploration Boat', '바닷속 잠수함으로 바다를 탐험해요': 'Explore the Sea with a Submarine',
        '대관람차 회전하기': 'Rotate the Ferris Wheel', '탐험 자동차를 만들어요': 'Ride a Cave Car and Travel', '사이렌을 켜줘': 'Turn on the Siren',
        '가위, 바위, 보로 여닫는 오두막 지붕': 'RPS Gesture-Controlled Cabin Roof', '마이크에 대고 외쳐봐! 목소리로 조종하는 요술 그네': 'Voice-Controlled Magic Swing',
        '몬스터를 보여줘! 경보 알림켜기': 'Animal Alert Ranger (Monster Camera)',
        '대기 중...': 'Waiting...', '접속한 학생 없음': 'No connected students',
        // 로그
        '이벤트 감지: UI 조작 및 블록 제어 트리거 됨': 'Event detected: UI interaction and block control triggered'
    };
    delete EXACT['학생 관리 '];

    /* 정규식으로 바꾸는 문구 (동적 값이 낀 것) — 문장 전체가 맞을 때 */
    var PAT = [
        [/^안녕하세요, (.+)$/, function (m) { return 'Hello, ' + nm(m[1]); }],
        [/^클래스 코드 발급 완료: (.+)$/, function (m) { return 'Class code issued: ' + m[1]; }],
        [/^오류: (.*)$/, function (m) { return 'Error: ' + tr(m[1], true); }],
        [/^저장하지 못했어요: (.*)$/, function (m) { return "Couldn't save: " + tr(m[1], true); }],
        [/^(.+) 학생에 대해 학부모님께 전하고 싶은 내용을 적어 주세요\. 저장하면 학부모 화면에서 볼 수 있어요\.$/, function (m) { return 'Write what you would like to tell the parents about ' + m[1] + '. Once saved, parents can see it on their screen.'; }],
        [/^(.+) 학습 현황$/, function (m) { return m[1] + ' – Learning Status'; }],
        [/^(\d+)명 가입$/, function (m) { return m[1] + (m[1] === '1' ? ' member joined' : ' members joined'); }],
        [/^(.+) 발급$/, function (m) { return 'Issued ' + m[1]; }],
        [/^(.+) 저장됨$/, function (m) { return 'Saved ' + m[1]; }],
        [/^(\d+)점$/, function (m) { return m[1] + (m[1] === '1' ? ' star' : ' stars'); }],
        [/^5점 만점에 (\d+)점$/, function (m) { return m[1] + ' out of 5 stars'; }],
        [/^(.+) 학생에게는 이미 사용 가능한 코드가 있어요$/, function (m) { return m[1] + ' already has an available code'; }],
        [/^(.+) 학생의 학부모 연결 코드를 발급할까요\?$/, function (m) { return 'Issue a parent link code for ' + m[1] + '?'; }],
        [/^(클래스 코드|학부모 코드) 복사 완료: (.+)$/, function (m) { return (m[1] === '클래스 코드' ? 'Class code' : 'Parent code') + ' copied: ' + m[2]; }],
        [/^(\d+)년 (\d+)월 (\d+)일$/, function (m) { var mo = MONTHS[(+m[2]) - 1]; return mo ? mo + ' ' + (+m[3]) + ', ' + m[1] : null; }],
        [/^0000년 0월 0일$/, function () { return '0000-00-00'; }],
        [/^(.+) 학생 데이터 로드 완료$/, function (m) { return m[1] + ' data loaded'; }],
        [/^\+(\d+)분$/, function (m) { return '+' + m[1] + ' mins'; }]
    ];

    /* 문장 안쪽 조각 바꾸기 — 모두 바꾼 뒤 한글이 남지 않아야(로그는 이름이 남아도) 반영한다. 긴 것부터 */
    var FRAG = [
        [/미션 (\d+) 완료! 고양이 먹이 주기 성공/g, 'Mission $1 complete! Cat feeding success'],
        [/미션 (\d+) 완료!/g, 'Mission $1 complete!'],
        [/이벤트 감지: UI 조작 및 블록 제어 트리거 됨/g, 'Event detected: UI interaction and block control triggered'],
        [/하트비트: 집중 학습 중/g, 'Heartbeat: focused learning'],
        [/레고 스파이크 허브 USB 연결 성공/g, 'LEGO SPIKE Hub USB connected'],
        [/레고 스파이크 허브 블루투스 연결 성공/g, 'LEGO SPIKE Hub Bluetooth connected'],
        [/레고 허브 모터: 반시계방향 ([\d.]+)바퀴/g, 'LEGO Hub motor: counter-clockwise $1 turns'],
        [/레고 허브 모터: 시계방향 ([\d.]+)바퀴/g, 'LEGO Hub motor: clockwise $1 turns'],
        [/레고 허브 모터:/g, 'LEGO Hub motor:'],
        [/레고 허브 신호 송출:/g, 'LEGO Hub signal sent:'],
        [/모터 속도 설정: (\d+)단/g, 'Motor speed set: level $1'],
        [/속도:/g, 'speed:'],
        [/학부모 만족도/g, 'Parent satisfaction'],
        [/리뷰 (\d+)건/g, '$1 review(s)'],
        [/\(수정됨\)/g, '(edited)'],
        [/선생님/g, 'Teacher'],
        [/학부모/g, 'Parent']
    ];

    function tr(text, loose) {
        if (!text || !HAN.test(text)) return text;
        var lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
        var core = text.slice(lead.length, text.length - tail.length).replace(/\s+/g, ' ');
        if (!core) return text;
        var out = null, i, m;
        if (Object.prototype.hasOwnProperty.call(EXACT, core)) out = EXACT[core];
        if (out == null) {
            for (i = 0; i < PAT.length; i++) {
                m = PAT[i][0].exec(core);
                if (m) { var r = PAT[i][1](m); if (r != null) { out = r; break; } }
            }
        }
        if (out == null) {
            var s = core;
            for (i = 0; i < FRAG.length; i++) s = s.replace(FRAG[i][0], FRAG[i][1]);
            if (s !== core && (loose || !HAN.test(s))) out = s;
        }
        return out == null ? text : lead + out + tail;
    }

    var SKIP_TAG = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1 };
    var SKIP_SEL = '.rp-body, .s-name, .avatar-s, [data-no-i18n]';
    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    var translated = []; // 되돌리기용 { node, ko } / { el, attr, ko }

    function skipped(el) {
        if (!el || el.nodeType !== 1) return false;
        if (SKIP_TAG[el.tagName]) return true;
        return !!(el.closest && el.closest(SKIP_SEL));
    }

    function doText(node) {
        var p = node.parentNode;
        if (!p || skipped(p)) return;
        var s = node.nodeValue;
        if (!HAN.test(s)) return;
        var loose = !!(p.classList && p.classList.contains('msg'));
        var t = tr(s, loose);
        if (t !== s) { translated.push({ node: node, ko: s }); node.nodeValue = t; }
    }
    function doAttrs(el) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || (el.closest && el.closest(SKIP_SEL))) return;
        for (var i = 0; i < ATTRS.length; i++) {
            var v = el.getAttribute(ATTRS[i]);
            if (v && HAN.test(v)) {
                var t = tr(v);
                if (t !== v) { translated.push({ el: el, attr: ATTRS[i], ko: v }); el.setAttribute(ATTRS[i], t); }
            }
        }
    }
    function scan(root) {
        if (!root) return;
        if (root.nodeType === 3) { doText(root); return; }
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.nodeType === 1) { if (skipped(root)) return; doAttrs(root); }
        var w = document.createTreeWalker(root, 1 | 4, null), n;
        while ((n = w.nextNode())) {
            if (n.nodeType === 3) doText(n); else doAttrs(n);
        }
    }
    function scanTitle() {
        if (document.title && HAN.test(document.title)) {
            var t = tr(document.title.replace(/BrickSync\s*[—-]\s*/, ''));
            if (t !== document.title.replace(/BrickSync\s*[—-]\s*/, '')) { translated.push({ title: true, ko: document.title }); document.title = 'BrickSync — ' + t; }
        }
    }
    function restore() {
        for (var i = 0; i < translated.length; i++) {
            var r = translated[i];
            if (r.title) document.title = r.ko;
            else if (r.node) { if (r.node.isConnected) r.node.nodeValue = r.ko; }
            else if (r.el && r.el.isConnected) r.el.setAttribute(r.attr, r.ko);
        }
        translated = [];
    }
    function apply() { if (document.body) { scan(document.body); scanTitle(); } }

    var obs = new MutationObserver(function (list) {
        if (!isEn()) return;
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]); }
            else if (m.type === 'characterData') doText(m.target);
            else if (m.type === 'attributes') doAttrs(m.target);
        }
    });
    function start() {
        obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        if (isEn()) apply();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

    window.addEventListener('bricksync-language-changed', function () {
        if (isEn()) apply(); else restore();
    });
    window.bsDashTr = function (s) { return isEn() ? tr(s) : s; };
})();
