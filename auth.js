/**
 * BrickSync - Firestore Cloud Authentication Engine (v3.7 Smart Login)
 * ============================================================
 * Google Firestore Cloud Database 기반 실시간 계정/클래스 연동 시스템
 * 이메일(student01@gmail.com) 및 아이디(student01) 겸용 간편 로그인 지원
 */

const BrickSyncAuth = (function () {
    const ROLE_HOME = {
        student: 'index.html',
        teacher: 'teacher_dashboard.html',
        parent: 'parent_dashboard.html'
    };

    const ROLE_LABELS = {
        student: '학생',
        teacher: '교사',
        parent: '학부모'
    };

    const LOCAL_USERS_KEY = 'bricksync_local_users';
    const LOCAL_SESSION_KEY = 'bricksync_user_session';
    const LOCAL_CLASSES_KEY = 'bricksync_local_classes';
    const LOCAL_PARENT_CODES_KEY = 'bricksync_local_parent_codes';

    function setLocalSession(profile) {
        try {
            const sessionData = {
                ...profile,
                sessionExpires: Date.now() + 24 * 60 * 60 * 1000
            };
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionData));
            localStorage.setItem('bricksync_student_session', JSON.stringify({
                name: profile.displayName || profile.email || '학생',
                displayName: profile.displayName || profile.email || '학생',
                email: profile.email,
                role: profile.role || 'student',
                expires: Date.now() + 24 * 60 * 60 * 1000,
                loginTime: Date.now()
            }));
        } catch (e) {
            console.warn('[Auth] 세션 저장 실패:', e);
        }
    }

    function getLocalSession() {
        try {
            const raw = localStorage.getItem(LOCAL_SESSION_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.sessionExpires && data.sessionExpires < Date.now()) {
                localStorage.removeItem(LOCAL_SESSION_KEY);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    function saveLocalUser(email, password, profile) {
        try {
            const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
            users[email.toLowerCase()] = { password, profile };
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        } catch (e) {
            console.warn('[Auth] 로컬 사용자 저장 실패:', e);
        }
    }

    function findLocalUser(email, password) {
        try {
            const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
            const user = users[email.toLowerCase()];
            if (user) {
                if (password && user.password !== password) return null;
                return user;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async function getUserProfileFromFirestore(uid) {
        if (!firestore) return null;
        try {
            const doc = await firestore.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (e) {
            console.warn('[Auth] Firestore 프로필 조회 실패:', e);
            return null;
        }
    }

    async function findUserByEmailFromFirestore(email) {
        if (!firestore) return null;
        try {
            const snap = await firestore.collection('users')
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();
            if (!snap.empty) {
                const doc = snap.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (e) {
            console.warn('[Auth] Firestore 이메일 조회 실패:', e);
            return null;
        }
    }

    async function saveUserProfileToFirestore(uid, profile) {
        if (!firestore) return;
        try {
            await firestore.collection('users').doc(uid).set({
                ...profile,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn('[Auth] Firestore 프로필 저장 실패:', e);
        }
    }

    async function validateClassCode(classCode) {
        if (!classCode) return null;
        const normalized = classCode.trim().toUpperCase();
        if (firestore) {
            try {
                const doc = await firestore.collection('classes').doc(normalized).get();
                if (doc.exists) return { id: normalized, ...doc.data() };
            } catch (e) {
                console.warn('[Auth] Firestore 클래스 코드 검증 실패, 로컬 확인:', e);
            }
        }
        try {
            const localClasses = JSON.parse(localStorage.getItem(LOCAL_CLASSES_KEY) || '{}');
            const c = localClasses[normalized];
            if (c) return { id: normalized, ...c };
        } catch (e) {}
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
                    if (isParentCodeExpired(data)) return null;
                    return { id: normalized, ...data };
                }
            } catch (e) {
                console.warn('[Auth] Firestore 학부모 코드 검증 실패, 로컬 확인:', e);
            }
        }
        try {
            const localParentCodes = JSON.parse(localStorage.getItem(LOCAL_PARENT_CODES_KEY) || '{}');
            const p = localParentCodes[normalized];
            if (p && !isParentCodeExpired(p)) return { id: normalized, ...p };
        } catch (e) {}
        return null;
    }

    // 학부모 코드는 발급 후 7일간만 유효하다 (아직 쓰이지 않은 코드 기준)
    const PARENT_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    function isParentCodeExpired(data) {
        if (!data || data.usedByUid || !data.createdAt) return false;
        const t0 = Date.parse(data.createdAt);
        return !isNaN(t0) && (Date.now() - t0) > PARENT_CODE_TTL_MS;
    }

    async function getCurrentUser() {
        const session = getLocalSession();
        if (session) {
            return {
                user: { uid: session.uid, email: session.email, displayName: session.displayName },
                profile: session
            };
        }
        const legacy = localStorage.getItem('bricksync_student_session');
        if (legacy) {
            try {
                const parsed = JSON.parse(legacy);
                if (parsed.expires > Date.now()) {
                    return { user: null, profile: { role: 'student', displayName: parsed.name }, legacy: true };
                }
            } catch (e) {}
        }
        return null;
    }

    // ── 스마트 로그인 (이메일 및 아이디 겸용) ───────────────────────
    async function signIn(emailInput, password) {
        let cleanInput = emailInput.trim().toLowerCase();
        let candidateEmails = [cleanInput];
        
        if (!cleanInput.includes('@')) {
            candidateEmails.push(cleanInput + '@gmail.com');
            candidateEmails.push(cleanInput + '@bricksync.com');
        }

        // 1. Check Firestore Cloud DB for candidate emails or displayName
        if (firestore) {
            try {
                for (const em of candidateEmails) {
                    const cloudUser = await findUserByEmailFromFirestore(em);
                    if (cloudUser) {
                        if (cloudUser.password && cloudUser.password !== password) {
                            const err = new Error('비밀번호가 올바르지 않습니다.');
                            err.code = 'auth/wrong-password';
                            throw err;
                        }
                        setLocalSession(cloudUser);
                        saveLocalUser(em, password, cloudUser);
                        return { user: { uid: cloudUser.uid || cloudUser.id, email: em, displayName: cloudUser.displayName }, profile: cloudUser };
                    }
                }
                
                // Check by displayName
                const snapName = await firestore.collection('users')
                    .where('displayName', '==', emailInput.trim())
                    .limit(1)
                    .get();
                if (!snapName.empty) {
                    const cloudUser = snapName.docs[0].data();
                    if (cloudUser.password && cloudUser.password !== password) {
                        const err = new Error('비밀번호가 올바르지 않습니다.');
                        err.code = 'auth/wrong-password';
                        throw err;
                    }
                    setLocalSession(cloudUser);
                    saveLocalUser(cloudUser.email, password, cloudUser);
                    return { user: { uid: cloudUser.uid, email: cloudUser.email, displayName: cloudUser.displayName }, profile: cloudUser };
                }
            } catch (e) {
                if (e.code === 'auth/wrong-password') throw e;
            }
        }

        // 2. Check local users
        for (const em of candidateEmails) {
            const local = findLocalUser(em, password);
            if (local) {
                setLocalSession(local.profile);
                return { user: { uid: local.profile.uid, email: em, displayName: local.profile.displayName }, profile: local.profile };
            }
        }

        const err = new Error('등록되지 않은 계정입니다. 회원가입 후 이용해 주세요.');
        err.code = 'auth/user-not-found';
        throw err;
    }

    async function signUpTeacher({ email, password, displayName, schoolName }) {
        const cleanEmail = email.trim().toLowerCase();

        try {
            const existingCloud = await findUserByEmailFromFirestore(cleanEmail);
            if (existingCloud) {
                const err = new Error('이미 등록된 이메일 계정입니다.');
                err.code = 'auth/email-already-in-use';
                throw err;
            }
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') throw e;
        }

        if (firebaseAuth) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, password);
                if (cred && cred.user) {
                    const profile = {
                        uid: cred.user.uid,
                        email: cleanEmail,
                        password,
                        displayName: displayName || '선생님',
                        role: 'teacher',
                        schoolName: schoolName || '',
                        createdAt: new Date().toISOString()
                    };
                    await saveUserProfileToFirestore(cred.user.uid, profile);
                    saveLocalUser(cleanEmail, password, profile);
                    setLocalSession(profile);
                    return { user: cred.user, profile };
                }
            } catch (fbErr) {
                console.warn('[Auth] Firebase Auth 에러 감지 -> Firestore Cloud Engine으로 전환:', fbErr);
            }
        }

        const uid = 'teacher_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const profile = {
            uid,
            email: cleanEmail,
            password,
            displayName: displayName || '선생님',
            role: 'teacher',
            schoolName: schoolName || '',
            createdAt: new Date().toISOString()
        };

        await saveUserProfileToFirestore(uid, profile);
        saveLocalUser(cleanEmail, password, profile);
        setLocalSession(profile);

        return { user: { uid, email: cleanEmail, displayName: profile.displayName }, profile };
    }

    async function signUpStudent({ email, password, displayName, classCode }) {
        const cleanEmail = email.trim().toLowerCase();
        const classInfo = await validateClassCode(classCode);

        try {
            const existingCloud = await findUserByEmailFromFirestore(cleanEmail);
            if (existingCloud) {
                const err = new Error('이미 등록된 이메일 계정입니다.');
                err.code = 'auth/email-already-in-use';
                throw err;
            }
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') throw e;
        }

        if (firebaseAuth) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, password);
                if (cred && cred.user) {
                    const profile = {
                        uid: cred.user.uid,
                        email: cleanEmail,
                        password,
                        displayName: displayName || '학생',
                        role: 'student',
                        classCode: classCode ? classCode.trim().toUpperCase() : 'FREE-CLASS',
                        teacherUid: classInfo?.teacherUid || '',
                        className: classInfo?.className || '일반 학급',
                        createdAt: new Date().toISOString()
                    };
                    await saveUserProfileToFirestore(cred.user.uid, profile);
                    saveLocalUser(cleanEmail, password, profile);
                    setLocalSession(profile);
                    return { user: cred.user, profile };
                }
            } catch (fbErr) {
                console.warn('[Auth] Firebase Auth 에러 감지 -> Firestore Cloud Engine으로 전환:', fbErr);
            }
        }

        const uid = 'student_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const profile = {
            uid,
            email: cleanEmail,
            password,
            displayName: displayName || '학생',
            role: 'student',
            classCode: classCode ? classCode.trim().toUpperCase() : 'FREE-CLASS',
            teacherUid: classInfo?.teacherUid || '',
            className: classInfo?.className || '일반 학급',
            createdAt: new Date().toISOString()
        };

        await saveUserProfileToFirestore(uid, profile);

        if (firestore && classInfo) {
            try {
                await firestore.collection('classes').doc(classInfo.id).update({
                    studentUids: firebase.firestore.FieldValue.arrayUnion(uid)
                });
            } catch (e) {}
        }

        saveLocalUser(cleanEmail, password, profile);
        setLocalSession(profile);

        return { user: { uid, email: cleanEmail, displayName: profile.displayName }, profile };
    }

    async function signUpParent({ email, password, displayName, parentCode }) {
        const cleanEmail = email.trim().toLowerCase();

        // Stale local cache auto-purge
        try {
            const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
            if (users[cleanEmail]) {
                delete users[cleanEmail];
                localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
            }
        } catch (e) {}

        const parentInfo = await validateParentCode(parentCode);
        const codeText = (parentCode || '').trim().toUpperCase();
        if (!parentInfo) {
            const err = new Error(codeText.startsWith('BS-')
                ? 'BS-로 시작하는 것은 클래스 코드예요. 선생님께 받은 PRT-로 시작하는 학부모 코드를 입력해 주세요.'
                : '유효하지 않거나 만료된 학부모 코드예요. 선생님께 새 코드를 받아 주세요.');
            err.code = 'bs/invalid-parent-code';
            throw err;
        }
        if (parentInfo.usedByUid) {
            const err = new Error('이미 사용된 학부모 코드예요. 선생님께 새 코드를 받아 주세요.');
            err.code = 'bs/used-parent-code';
            throw err;
        }

        try {
            const existingCloud = await findUserByEmailFromFirestore(cleanEmail);
            if (existingCloud) {
                const err = new Error('이미 등록된 이메일 계정입니다.');
                err.code = 'auth/email-already-in-use';
                throw err;
            }
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') throw e;
        }

        if (firebaseAuth) {
            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, password);
                if (cred && cred.user) {
                    const profile = {
                        uid: cred.user.uid,
                        email: cleanEmail,
                        password,
                        displayName: displayName || '학부모',
                        role: 'parent',
                        parentCode: parentCode ? parentCode.trim().toUpperCase() : '',
                        linkedStudentUid: parentInfo?.studentUid || '',
                        linkedStudentName: parentInfo?.studentName || '',
                        linkedClassName: parentInfo?.className || '',
                        teacherUid: parentInfo?.teacherUid || '',
                        createdAt: new Date().toISOString()
                    };
                    await saveUserProfileToFirestore(cred.user.uid, profile);
                    await markParentCodeUsed(codeText, cred.user.uid);
                    saveLocalUser(cleanEmail, password, profile);
                    setLocalSession(profile);
                    return { user: cred.user, profile };
                }
            } catch (fbErr) {
                console.warn('[Auth] Firebase Auth 에러 감지 -> Firestore Cloud Engine으로 전환:', fbErr);
            }
        }

        const uid = 'parent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const profile = {
            uid,
            email: cleanEmail,
            password,
            displayName: displayName || '학부모',
            role: 'parent',
            parentCode: parentCode ? parentCode.trim().toUpperCase() : '',
            linkedStudentUid: parentInfo?.studentUid || '',
            linkedStudentName: parentInfo?.studentName || '',
            linkedClassName: parentInfo?.className || '',
            teacherUid: parentInfo?.teacherUid || '',
            createdAt: new Date().toISOString()
        };

        await saveUserProfileToFirestore(uid, profile);
        await markParentCodeUsed(codeText, uid);
        saveLocalUser(cleanEmail, password, profile);
        setLocalSession(profile);

        return { user: { uid, email: cleanEmail, displayName: profile.displayName }, profile };
    }

    async function signOut() {
        localStorage.removeItem('bricksync_student_session');
        localStorage.removeItem(LOCAL_SESSION_KEY);
        try { sessionStorage.removeItem('brickSyncLastPage'); sessionStorage.removeItem('bs_entered'); } catch (e) { }
        // 앱 틀(app.html) 안쪽 화면에서 불려도 바깥 창 전체를 로그인 화면으로 보낸다
        try { window.top.location.href = 'login.html'; } catch (e) { window.location.href = 'login.html'; }
    }

    function redirectToHome(role) {
        // 로그인 화면을 거쳐 들어왔다는 표시 (새 탭에서 주소만 입력해 들어온 경우와 구분: 그때는 인트로부터 시작)
        try { sessionStorage.setItem('bs_entered', '1'); } catch (e) { }
        const dest = ROLE_HOME[role] || 'index.html';
        window.location.href = dest;
    }

    async function requireRole(allowedRoles) {
        const result = await getCurrentUser();
        if (!result) {
            window.location.href = 'login.html';
            return null;
        }
        if (allowedRoles && !allowedRoles.includes(result.profile.role)) {
            redirectToHome(result.profile.role);
            return null;
        }
        return result;
    }

    async function createClassCode(teacherUid, className) {
        const code = 'BS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const classData = {
            teacherUid: teacherUid || 'teacher',
            className: className || '신규 클래스',
            studentUids: [],
            createdAt: new Date().toISOString()
        };
        if (firestore) {
            try {
                await firestore.collection('classes').doc(code).set(classData);
            } catch (e) {
                console.warn('[Auth] Firestore 클래스 코드 발급 실패, 로컬 저장:', e);
            }
        }
        try {
            const localClasses = JSON.parse(localStorage.getItem(LOCAL_CLASSES_KEY) || '{}');
            localClasses[code] = classData;
            localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(localClasses));
        } catch (e) {}
        return code;
    }

    // 마지막 학부모 코드 발급이 클라우드에 저장되지 못했는지 (규칙/연결 문제 알림용)
    let parentCodeCloudFailed = false;

    async function createParentCode(teacherUid, studentUid, studentName, className) {
        const code = 'PRT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        const codeData = {
            teacherUid: teacherUid || 'teacher',
            studentUid: studentUid || '',
            studentName: studentName || '학생',
            className: className || '',
            usedByUid: null,
            createdAt: new Date().toISOString()
        };
        if (firestore) {
            try {
                await firestore.collection('parentCodes').doc(code).set(codeData);
                parentCodeCloudFailed = false;
            } catch (e) {
                parentCodeCloudFailed = true;
                console.warn('[Auth] Firestore 학부모 코드 발급 실패, 로컬 저장:', e);
            }
        } else { parentCodeCloudFailed = true; }
        try {
            const localParentCodes = JSON.parse(localStorage.getItem(LOCAL_PARENT_CODES_KEY) || '{}');
            localParentCodes[code] = codeData;
            localStorage.setItem(LOCAL_PARENT_CODES_KEY, JSON.stringify(localParentCodes));
        } catch (e) {}
        return code;
    }

    // 학부모가 가입하면 코드를 사용 처리한다 (한 코드는 한 번만)
    async function markParentCodeUsed(code, parentUid) {
        if (!code) return;
        if (firestore) {
            try { await firestore.collection('parentCodes').doc(code).update({ usedByUid: parentUid, usedAt: new Date().toISOString() }); }
            catch (e) { console.warn('[Auth] Firestore 학부모 코드 사용 처리 실패:', e); }
        }
        try {
            const m = JSON.parse(localStorage.getItem(LOCAL_PARENT_CODES_KEY) || '{}');
            if (m[code]) { m[code].usedByUid = parentUid; localStorage.setItem(LOCAL_PARENT_CODES_KEY, JSON.stringify(m)); }
        } catch (e) {}
    }

    // 아직 쓰이지 않은 학부모 코드를 지운다 (학생 한 명당 유효 코드 하나 유지용)
    async function revokeParentCode(code) {
        if (!code) return;
        const id = String(code).trim().toUpperCase();
        if (firestore) {
            try { await firestore.collection('parentCodes').doc(id).delete(); }
            catch (e) { console.warn('[Auth] Firestore 학부모 코드 삭제 실패:', e); }
        }
        try {
            const m = JSON.parse(localStorage.getItem(LOCAL_PARENT_CODES_KEY) || '{}');
            delete m[id];
            localStorage.setItem(LOCAL_PARENT_CODES_KEY, JSON.stringify(m));
        } catch (e) {}
    }

    return {
        getCurrentUser,
        signIn,
        signUpStudent,
        signUpTeacher,
        signUpParent,
        signOut,
        redirectToHome,
        requireRole,
        createClassCode,
        createParentCode,
        revokeParentCode,
        parentCodeCloudFailed: () => parentCodeCloudFailed,
        isParentCodeExpired,
        getUserProfile: getUserProfileFromFirestore,
        validateClassCode,
        validateParentCode,
        ROLE_HOME,
        ROLE_LABELS
    };
})();
