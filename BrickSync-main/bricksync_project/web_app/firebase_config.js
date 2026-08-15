// BrickSync - Firebase 통합 설정 파일 (Auth + Firestore)
// ============================================================
// [v2.0] Firebase Authentication + Firestore 기반 역할별 인증 시스템
// 프로젝트: bricksync-65781 (개인 소유)
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBzXYHE6JiVa31mhEQs5jXjriw-uoJ2xJo",
    authDomain: "bricksync-65781.firebaseapp.com",
    projectId: "bricksync-65781",
    storageBucket: "bricksync-65781.firebasestorage.app",
    messagingSenderId: "535108260222",
    appId: "1:535108260222:web:89664a949b18588f26632f",
    measurementId: "G-YWKZ2HF985"
};

// ── 전역 서비스 인스턴스 ──────────────────────────────────────
let database = null;        // Realtime DB (레거시 호환용)
let firestore = null;       // Firestore (신규 인증/데이터용)
let firebaseAuth = null;    // Firebase Authentication
let isFirebaseOnline = false;

try {
    if (typeof firebase !== 'undefined') {
        // 중복 초기화 방지
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Auth 초기화 (구글 파이어베이스 클라우드 인증 지원)
        if (typeof firebase.auth === 'function') {
            try {
                firebaseAuth = firebase.auth();
                console.log('[BrickSync] Firebase Auth 클라우드 서비스 초기화 완료');
            } catch (e) {
                console.warn('[BrickSync] Firebase Auth 초기화 경고 (로컬 모드 호환):', e);
                firebaseAuth = null;
            }
        }

        // Firestore 초기화
        if (typeof firebase.firestore === 'function') {
            firestore = firebase.firestore();
            console.log('[BrickSync] Firestore 초기화 완료');
        }

        // Realtime DB (기존 코드 호환성 유지)
        if (typeof firebase.database === 'function') {
            database = firebase.database();
            isFirebaseOnline = true;
            console.log('[BrickSync] Realtime DB 초기화 완료 (레거시 호환)');
        }

    } else {
        console.warn('[BrickSync] Firebase SDK 미로드 → 오프라인 모드');
    }
} catch (e) {
    console.error('[BrickSync] Firebase 초기화 오류 (오프라인 모드 전환):', e);
}
