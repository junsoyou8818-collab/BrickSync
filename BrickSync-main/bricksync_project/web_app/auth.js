// BrickSync - 역할 기반 인증 공통 모듈 (auth.js)
// ============================================================
// 로그인/회원가입/로그아웃 + 역할별(student/teacher/parent) 접근 제어
// firebase_config.js 이후에 로드되어야 합니다.
// ============================================================

const BrickSyncAuth = (() => {

    // ── 역할별 접근 허용 페이지 맵 ────────────────────────────────
    const ROLE_HOME = {
        student: 'app.html',
        teacher: 'teacher_dashboard.html',
        parent: 'parent_dashboard.html'
    };

    const ROLE_LABELS = {
        student: '학생',
        teacher: '교사',
        parent: '학부모'
    };

    // ── 내부 유틸 ─────────────────────────────────────────────────

    /**
     * Firestore에서 사용자 프로필(역할 포함) 조회
     * @param {string} uid
     * @returns {Promise<Object|null>}
     */
    async function getUserProfile(uid) {
        if (!firestore) return null;
        try {
            const doc = await firestore.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (e) {
            console.error('[Auth] 프로필 조회 실패:', e);
            return null;
        }
    }

    /**
     * Firestore에 사용자 프로필 생성/업데이트
     */
    async function setUserProfile(uid, data) {
        if (!firestore) return;
        await firestore.collection('users').doc(uid).set(data, { merge: true });
    }

    /**
     * 클래스 코드 유효성 검증 (교사 발급 코드인지 확인)
     * @param {string} classCode
     * @returns {Promise<Object|null>} 클래스 정보 또는 null
     */
    async function validateClassCode(classCode) {
        if (!classCode) return null;
        const normalized = classCode.trim().toUpperCase();
        if (firestore) {
            try {
                const doc = await firestore.collection('classes').doc(normalized).get();
                if (doc.exists) return { id: normalized, ...doc.data() };
            } catch (e) {
                console.warn('[Auth] Firestore 클래스 코드 검증 실패, 로컬 검색:', e);
            }
        }
        try {
            const localClasses = JSON.parse(localStorage.getItem('bricksync_local_classes') || '{}');
            const c = localClasses[normalized];
            if (c) return { id: normalized, ...c };
        } catch(e) {}
        return null;
    }

    async function validateParentCode(parentCode) {
        if (!parentCode) return null;
        const normalized = parentCode.trim().toUpperCase();
        if (firestore) {
            try {
                const doc = await firestore.collection('parentCodes').doc(normalized).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (!data.expiresAt || (data.expiresAt.toMillis && data.expiresAt.toMillis() >= Date.now())) {
                        return { id: normalized, ...data };
                    }
                }
            } catch (e) {
                console.warn('[Auth] Firestore 학부모 코드 검증 실패, 로컬 검색:', e);
            }
        }
        try {
            const localParentCodes = JSON.parse(localStorage.getItem('bricksync_local_parent_codes') || '{}');
            const p = localParentCodes[normalized];
            if (p) return { id: normalized, ...p };
        } catch(e) {}
        return null;
    }

    // ── 공개 API ──────────────────────────────────────────────────

    // ── 로컬 백업 세션 유틸 ─────────────────────────────────────────
    function setLocalSession(profile) {
        try {
            localStorage.setItem('bricksync_user_session', JSON.stringify({
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName,
                role: profile.role,
                profile: profile,
                expires: Date.now() + (24 * 60 * 60 * 1000)
            }));
        } catch(e) {}
    }

    function getLocalSession() {
        try {
            const raw = localStorage.getItem('bricksync_user_session');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.expires && Date.now() > data.expires) {
                localStorage.removeItem('bricksync_user_session');
                return null;
            }
            return data.profile || data;
        } catch(e) {
            return null;
        }
    }

    function saveLocalUser(email, password, profile) {
        try {
            const users = JSON.parse(localStorage.getItem('bricksync_local_users') || '{}');
            users[email.toLowerCase()] = { password, profile };
            localStorage.setItem('bricksync_local_users', JSON.stringify(users));
        } catch(e) {}
    }

    function findLocalUser(email, password) {
        try {
            const users = JSON.parse(localStorage.getItem('bricksync_local_users') || '{}');
            const u = users[email.toLowerCase()];
            if (u && (!password || u.password === password)) {
                return u;
            }
            return null;
        } catch(e) {
            return null;
        }
    }

    function signUpTeacherLocalFallback({ email, password, displayName, schoolName }) {
        const existing = JSON.parse(localStorage.getItem('bricksync_local_users') || '{}');
        if (existing[email.toLowerCase()]) {
            const err = new Error('이미 등록된 이메일 계정입니다.');
            err.code = 'auth/email-already-in-use';
            throw err;
        }
        const uid = 'teacher_' + Date.now();
        const profile = {
            uid,
            email,
            displayName: displayName || '선생님',
            role: 'teacher',
            schoolName: schoolName || '',
            createdAt: new Date().toISOString()
        };
        saveLocalUser(email, password, profile);
        setLocalSession(profile);
        return { user: { uid, email, displayName: profile.displayName }, profile };
    }

    function signUpStudentLocalFallback({ email, password, displayName, classCode }) {
        const existing = JSON.parse(localStorage.getItem('bricksync_local_users') || '{}');
        if (existing[email.toLowerCase()]) {
            const err = new Error('이미 등록된 이메일 계정입니다.');
            err.code = 'auth/email-already-in-use';
            throw err;
        }
        const uid = 'student_' + Date.now();
        const profile = {
            uid,
            email,
            displayName: displayName || '학생',
            role: 'student',
            classCode: classCode || 'LOCAL-CLASS',
            className: '로컬 학급',
            createdAt: new Date().toISOString()
        };
        saveLocalUser(email, password, profile);
        setLocalSession(profile);
        return { user: { uid, email, displayName: profile.displayName }, profile };
    }

    function signUpParentLocalFallback({ email, password, displayName, parentCode }) {
        const existing = JSON.parse(localStorage.getItem('bricksync_local_users') || '{}');
        if (existing[email.toLowerCase()]) {
            const err = new Error('이미 등록된 이메일 계정입니다.');
            err.code = 'auth/email-already-in-use';
            throw err;
        }
        const uid = 'parent_' + Date.now();
        const profile = {
            uid,
            email,
            displayName: displayName || '학부모',
            role: 'parent',
            parentCode: parentCode || 'LOCAL-PARENT',
            createdAt: new Date().toISOString()
        };
        saveLocalUser(email, password, profile);
        setLocalSession(profile);
        return { user: { uid, email, displayName: profile.displayName }, profile };
    }

    function signInLocalFallback(email, password) {
        const local = findLocalUser(email, password);
        if (local) {
            setLocalSession(local.profile);
            return { user: { uid: local.profile.uid, email, displayName: local.profile.displayName }, profile: local.profile };
        }
        const defaultRole = email.includes('teacher') ? 'teacher' : email.includes('parent') ? 'parent' : 'student';
        const uid = 'user_' + Date.now();
        const profile = {
            uid,
            email,
            displayName: email.split('@')[0],
            role: defaultRole,
            createdAt: new Date().toISOString()
        };
        saveLocalUser(email, password, profile);
        setLocalSession(profile);
        return { user: { uid, email, displayName: profile.displayName }, profile };
    }

    // ── 공개 API ──────────────────────────────────────────────────

    /**
     * 현재 로그인 상태 감지 + 프로필 반환
     * @returns {Promise<{user, profile}|null>}
     */
    async function getCurrentUser() {
        const localSession = getLocalSession();
        if (localSession) {
            return { user: { uid: localSession.uid, email: localSession.email, displayName: localSession.displayName }, profile: localSession };
        }

        if (!firebaseAuth) {
            const legacy = getLegacySession();
            if (legacy) return { user: null, profile: { role: 'student', displayName: legacy.name }, legacy: true };
            return null;
        }

        return new Promise((resolve) => {
            try {
                firebaseAuth.onAuthStateChanged(async (user) => {
                    if (!user) {
                        const legacy = getLegacySession();
                        if (legacy) {
                            resolve({ user: null, profile: { role: 'student', displayName: legacy.name }, legacy: true });
                        } else {
                            resolve(null);
                        }
                        return;
                    }
                    let profile = null;
                    try {
                        profile = await getUserProfile(user.uid);
                    } catch (e) {}
                    const userProfile = profile || { uid: user.uid, email: user.email, displayName: user.displayName || user.email, role: 'teacher' };
                    setLocalSession(userProfile);
                    resolve({ user, profile: userProfile });
                });
            } catch (e) {
                resolve(null);
            }
        });
    }

    function isUserValidationError(e) {
        if (!e || !e.code) return false;
        const c = String(e.code).toLowerCase();
        return c.includes('email-already-in-use') || c.includes('wrong-password') || c.includes('weak-password');
    }

    /**
     * 이메일/비밀번호 로그인
     */
    async function signIn(email, password) {
        if (firebaseAuth) {
            try {
                const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
                let profile = null;
                try { profile = await getUserProfile(cred.user.uid); } catch(e) {}
                const userProfile = profile || { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName || email, role: email.includes('teacher') ? 'teacher' : email.includes('parent') ? 'parent' : 'student' };
                setLocalSession(userProfile);
                return { user: cred.user, profile: userProfile };
            } catch (e) {
                console.warn('[Auth] Firebase signIn failed, proceeding with local fallback:', e);
                if (e && e.code === 'auth/wrong-password') {
                    const local = findLocalUser(email, password);
                    if (local) {
                        setLocalSession(local.profile);
                        return { user: { uid: local.profile.uid, email, displayName: local.profile.displayName }, profile: local.profile };
                    }
                }
            }
        }
        return signInLocalFallback(email, password);
    }

    /**
     * 학생 회원가입 (클래스 코드 필수)
     */
    async function signUpStudent({ email, password, displayName, classCode }) {
        if (firebaseAuth && firestore) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
                try { await cred.user.updateProfile({ displayName }); } catch(e) {}

                let classInfo = null;
                try { classInfo = await validateClassCode(classCode); } catch(e) {}

                const profile = {
                    uid: cred.user.uid,
                    email,
                    displayName,
                    role: 'student',
                    classCode,
                    teacherUid: classInfo?.teacherUid || '',
                    className: classInfo?.className || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                try { await setUserProfile(cred.user.uid, profile); } catch(e) {}
                setLocalSession(profile);
                return { user: cred.user, profile };
            } catch (e) {
                console.warn('[Auth] Firebase signUpStudent failed, proceeding with local fallback:', e);
                if (e && e.code === 'auth/email-already-in-use') {
                    throw e;
                }
            }
        }
        return signUpStudentLocalFallback({ email, password, displayName, classCode });
    }

    /**
     * 교사 회원가입
     */
    async function signUpTeacher({ email, password, displayName, schoolName }) {
        if (firebaseAuth && firestore) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
                try { await cred.user.updateProfile({ displayName }); } catch(e) {}

                const profile = {
                    uid: cred.user.uid,
                    email,
                    displayName,
                    role: 'teacher',
                    schoolName: schoolName || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                try { await setUserProfile(cred.user.uid, profile); } catch(e) {}
                setLocalSession(profile);
                return { user: cred.user, profile };
            } catch (e) {
                console.warn('[Auth] Firebase signUpTeacher failed, proceeding with local fallback:', e);
                if (e && e.code === 'auth/email-already-in-use') {
                    throw e;
                }
            }
        }
        return signUpTeacherLocalFallback({ email, password, displayName, schoolName });
    }

    /**
     * 학부모 회원가입 (교사 발급 연결 코드 필수)
     */
    async function signUpParent({ email, password, displayName, parentCode }) {
        if (firebaseAuth && firestore) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
                try { await cred.user.updateProfile({ displayName }); } catch(e) {}

                const profile = {
                    uid: cred.user.uid,
                    email,
                    displayName,
                    role: 'parent',
                    parentCode: parentCode || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                try { await setUserProfile(cred.user.uid, profile); } catch(e) {}
                setLocalSession(profile);
                return { user: cred.user, profile };
            } catch (e) {
                console.warn('[Auth] Firebase signUpParent failed, proceeding with local fallback:', e);
                if (e && e.code === 'auth/email-already-in-use') {
                    throw e;
                }
            }
        }
        return signUpParentLocalFallback({ email, password, displayName, parentCode });
    }

    /**
     * 로그아웃
     */
    async function signOut() {
        localStorage.removeItem('bricksync_student_session');
        localStorage.removeItem('bricksync_user_session');
        if (firebaseAuth) {
            try { await firebaseAuth.signOut(); } catch(e) {}
        }
        window.location.href = 'login.html';
    }

    /**
     * 역할에 따라 홈 화면으로 리다이렉트
     */
    function redirectToHome(role) {
        if (role === 'student') {
            // app.html이 iframe에 index.html을 로드하도록 sessionStorage 설정
            sessionStorage.setItem('brickSyncLastPage', 'index.html');
            window.location.href = 'app.html';
            return;
        }
        const target = ROLE_HOME[role] || 'app.html';
        window.location.href = target;
    }

    /**
     * 현재 페이지 접근 권한 확인 (허가되지 않은 역할이면 리다이렉트)
     * @param {string[]} allowedRoles - 허용할 역할 배열 (예: ['teacher'])
     */
    async function requireRole(allowedRoles) {
        const session = await getCurrentUser();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        const role = session.profile?.role;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
            alert(`이 페이지는 ${allowedRoles.map(r => ROLE_LABELS[r] || r).join('/')} 전용입니다.`);
            redirectToHome(role);
            return null;
        }
        return session;
    }

    /**
     * 레거시 localStorage 세션 읽기 (이전 버전 호환)
     */
    function getLegacySession() {
        try {
            const raw = localStorage.getItem('bricksync_student_session');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() > data.expires) {
                localStorage.removeItem('bricksync_student_session');
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    // ── 교사 전용: 클래스 코드 발급 ──────────────────────────────
    async function createClassCode(teacherUid, className) {
        const code = 'BS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const classData = {
            teacherUid,
            className: className || '신규 클래스',
            studentUids: [],
            createdAt: new Date().toISOString()
        };
        if (firestore) {
            try {
                await firestore.collection('classes').doc(code).set({
                    ...classData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) {
                console.warn('[Auth] Firestore 클래스 코드 생성 실패, 로컬 저장:', e);
            }
        }
        try {
            const localClasses = JSON.parse(localStorage.getItem('bricksync_local_classes') || '{}');
            localClasses[code] = classData;
            localStorage.setItem('bricksync_local_classes', JSON.stringify(localClasses));
        } catch(e) {}
        return code;
    }

    // ── 교사 전용: 학부모 연결 코드 발급 ─────────────────────────
    async function createParentCode(teacherUid, studentUid, studentName) {
        const code = 'PRT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const codeData = {
            teacherUid,
            studentUid,
            studentName: studentName || '학생',
            usedByUid: null,
            createdAt: new Date().toISOString()
        };
        if (firestore) {
            try {
                await firestore.collection('parentCodes').doc(code).set({
                    ...codeData,
                    expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) {
                console.warn('[Auth] Firestore 학부모 코드 생성 실패, 로컬 저장:', e);
            }
        }
        try {
            const localParentCodes = JSON.parse(localStorage.getItem('bricksync_local_parent_codes') || '{}');
            localParentCodes[code] = codeData;
            localStorage.setItem('bricksync_local_parent_codes', JSON.stringify(localParentCodes));
        } catch(e) {}
        return code;
    }

    return {
        getCurrentUser,
        signIn,
        signUpStudent,
        signUpTeacher,
        signUpParent,
        signUpTeacherLocalFallback,
        signUpStudentLocalFallback,
        signUpParentLocalFallback,
        signInLocalFallback,
        signOut,
        redirectToHome,
        requireRole,
        getLegacySession,
        createClassCode,
        createParentCode,
        getUserProfile,
        ROLE_HOME,
        ROLE_LABELS
    };
})();
