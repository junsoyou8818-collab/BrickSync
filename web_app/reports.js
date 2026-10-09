/* BrickSync 교사 리포트 / 학부모 리뷰 저장소
 *   교사가 학생에 대한 서술형 리포트를 남기고, 학부모가 리포트마다 별점(1~5)과 리뷰를 남긴다.
 *   Firestore (teacherReports, parentFeedback) + 이 기기 localStorage 를 함께 쓴다. 클라우드가 막혀도 화면은 멈추지 않는다.
 */
const BrickSyncReports = (function () {
    const LS_REPORTS = 'bricksync_local_reports';
    const LS_FEEDBACK = 'bricksync_local_feedback';
    const CLOUD_TIMEOUT = 6000;

    function readLocal(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch (e) { return fallback; }
    }
    function writeLocal(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
    function withTimeout(p, ms) {
        return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    }
    function db() { return (typeof firestore !== 'undefined' && firestore) ? firestore : null; }
    function byNewest(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }

    // ── 교사 리포트 ────────────────────────────────────────────
    async function addReport({ teacherUid, teacherName, studentUid, studentName, text }) {
        const id = 'rp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const data = {
            teacherUid: teacherUid || '', teacherName: teacherName || '선생님',
            studentUid: studentUid || '', studentName: studentName || '',
            text: String(text || '').trim(),
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        let cloudOk = false;
        if (db()) {
            try { await withTimeout(db().collection('teacherReports').doc(id).set(data), CLOUD_TIMEOUT); cloudOk = true; }
            catch (e) { console.warn('[Reports] 클라우드 저장 실패, 이 기기에 저장:', e); }
        }
        const local = readLocal(LS_REPORTS, {});
        local[id] = data; writeLocal(LS_REPORTS, local);
        return { id, cloudOk };
    }

    async function updateReport(id, text) {
        const patch = { text: String(text || '').trim(), updatedAt: new Date().toISOString() };
        let cloudOk = false;
        if (db()) {
            try { await withTimeout(db().collection('teacherReports').doc(id).update(patch), CLOUD_TIMEOUT); cloudOk = true; }
            catch (e) { console.warn('[Reports] 클라우드 수정 실패:', e); }
        }
        const local = readLocal(LS_REPORTS, {});
        if (local[id]) { Object.assign(local[id], patch); writeLocal(LS_REPORTS, local); }
        return { cloudOk };
    }

    async function deleteReport(id) {
        if (db()) {
            try { await withTimeout(db().collection('teacherReports').doc(id).delete(), CLOUD_TIMEOUT); }
            catch (e) { console.warn('[Reports] 클라우드 삭제 실패:', e); }
        }
        const local = readLocal(LS_REPORTS, {});
        delete local[id]; writeLocal(LS_REPORTS, local);
    }

    async function listReports(studentUid) {
        const map = {}; let failed = !db();
        if (db() && studentUid) {
            try {
                const snap = await withTimeout(db().collection('teacherReports').where('studentUid', '==', studentUid).get(), CLOUD_TIMEOUT);
                snap.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
            } catch (e) { failed = true; console.warn('[Reports] 리포트 조회 실패:', e); }
        }
        const local = readLocal(LS_REPORTS, {});
        Object.keys(local).forEach(id => { if (local[id].studentUid === studentUid && !map[id]) map[id] = { id, ...local[id] }; });
        return { list: Object.values(map).sort(byNewest), failed };
    }

    // ── 학부모 리뷰 (리포트마다 한 명당 하나, 다시 저장하면 수정) ──
    async function saveFeedback({ reportId, studentUid, teacherUid, parentUid, parentName, rating, text }) {
        const id = reportId + '__' + parentUid;
        const data = {
            reportId, studentUid: studentUid || '', teacherUid: teacherUid || '',
            parentUid, parentName: parentName || '학부모',
            rating: Math.max(1, Math.min(5, Number(rating) || 0)),
            text: String(text || '').trim(),
            updatedAt: new Date().toISOString()
        };
        let cloudOk = false;
        if (db()) {
            try { await withTimeout(db().collection('parentFeedback').doc(id).set(data), CLOUD_TIMEOUT); cloudOk = true; }
            catch (e) { console.warn('[Reports] 리뷰 클라우드 저장 실패, 이 기기에 저장:', e); }
        }
        const local = readLocal(LS_FEEDBACK, {});
        local[id] = data; writeLocal(LS_FEEDBACK, local);
        return { id, cloudOk };
    }

    async function listFeedback(studentUid) {
        const map = {}; let failed = !db();
        if (db() && studentUid) {
            try {
                const snap = await withTimeout(db().collection('parentFeedback').where('studentUid', '==', studentUid).get(), CLOUD_TIMEOUT);
                snap.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
            } catch (e) { failed = true; console.warn('[Reports] 리뷰 조회 실패:', e); }
        }
        const local = readLocal(LS_FEEDBACK, {});
        Object.keys(local).forEach(id => { if (local[id].studentUid === studentUid && !map[id]) map[id] = { id, ...local[id] }; });
        return { list: Object.values(map).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))), failed };
    }

    // ── 화면 도우미: 별점 ──────────────────────────────────────
    const STAR_PATH = 'M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5 6.2 20.6l1.1-6.4L2.6 9.6l6.5-.9z';
    function starIcon(filled, size) {
        const s = size || 20;
        return '<svg class="bs-star' + (filled ? ' on' : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';
    }
    function starsText(rating, size) {
        let h = '<span class="bs-stars" role="img" aria-label="5점 만점에 ' + rating + '점">';
        for (let i = 1; i <= 5; i++) h += starIcon(i <= rating, size || 16);
        return h + '</span>';
    }
    const STAR_CSS = '.bs-stars{display:inline-flex;gap:2px;vertical-align:middle}.bs-star{fill:#e2dff0;stroke:#cfc9e6;stroke-width:1}.bs-star.on{fill:#f6b73c;stroke:#e09a14}' +
        '.bs-rate{display:inline-flex;gap:4px}.bs-rate button{background:none;border:none;padding:2px;cursor:pointer;line-height:0}.bs-rate button:focus-visible{outline:3px solid #a5b1d7;border-radius:6px}';

    return { addReport, updateReport, deleteReport, listReports, saveFeedback, listFeedback, starIcon, starsText, STAR_CSS };
})();
