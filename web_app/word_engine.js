/* BrickSync 워드 블록 작업 공간 엔진 (2단계)
   - 블록은 데이터(JSON)로 보관하고 화면은 그 데이터를 그린다.
   - 세로 이어 붙이기, 끼워 넣는 반복(ㄷ자), 입력칸 팝업, 드래그, 휴지통, 저장/불러오기
   - 실행(런타임)은 이후 단계에서 연결한다. */
(function () {
    'use strict';

    var WB = window.WORD_BLOCKS;
    var area = document.getElementById('workspaceArea');       // 5000x5000 작업판(.coding-area)
    var palette = document.getElementById('wPalette');
    var palList = document.getElementById('wPalList');
    var palTabs = document.getElementById('wPalTabs');
    var trash = document.getElementById('trashArea');
    var hint = document.querySelector('.hint-text');
    var popEl = document.getElementById('wPop');
    var dragLayer = document.getElementById('wDragLayer');
    var indEl = document.getElementById('wDropInd');

    var unit = new URLSearchParams(location.search).get('unit') || '1';
    var state = { stacks: [], vars: [], lists: [], myblocks: [] };
    var uid = 0;
    var selectedId = null;
    var activeCat = WB.CATS[0].id;
    var zoom = 1;                       // 작업판 확대/축소 배율 (0.3 ~ 2.0)
    var ZOOM_MIN = 0.3, ZOOM_MAX = 2.0, ZOOM_STEP = 0.05;

    /* ---------- 공통 ---------- */
    function lang() {
        try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; }
    }
    function nid() { uid += 1; return 'n' + Date.now().toString(36) + uid; }
    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function studentName() {
        try {
            var raw = localStorage.getItem('bricksync_student_session');
            if (raw) { var s = JSON.parse(raw); if (Date.now() < s.expires) return s.name; }
        } catch (e) { }
        return 'Guest_익명';
    }
    function storageKey() { return studentName() + '_project_word_unit_' + unit; }

    function shapeOf(def) { return def.shape || 'stack'; }
    function isValueNode(n) { return !!(n && typeof n === 'object' && n.type && WB.byType[n.type]); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function newNode(type, extra) {
        var def = WB.byType[type];
        var vals = {};
        Object.keys(def.slots).forEach(function (k) {
            var s = def.slots[k];
            vals[k] = (s.kind === 'var' && !s.def) ? (state.vars[0] || '') : ((s.kind === 'lst' && !s.def) ? (state.lists[0] || '') : s.def);
        });
        if (extra) Object.keys(extra).forEach(function (k) { vals[k] = extra[k]; });
        var n = { id: nid(), type: type, vals: vals, kids: def.container ? [] : undefined };
        if (def.arms === 2) n.kids2 = [];
        return n;
    }

    /* ---------- 아이콘 배지 (흰 원 + 색 바꾼 아이콘) ---------- */
    function badgeSvg(key) {
        var src = (window.BS_ICONS && BS_ICONS.ICON[key]) ? BS_ICONS.ICON[key] : '';
        return src.replace(/#fff/g, '@@W@@').replace(/var\(--k\)/g, '#fff').replace(/@@W@@/g, 'var(--k)');
    }
    function colorVars(cat) {
        var m = WB.COLORS[cat];
        return '--c:' + m.c + ';--tx:' + m.tx + ';--k:' + m.k + ';--a1:' + m.a[0] + ';--a2:' + m.a[1] + ';--a3:' + m.a[2];
    }

    /* ---------- 블록 그리기 ---------- */
    function optLabel(opts, v) {
        for (var i = 0; i < opts.length; i++) if (opts[i].v === v) return opts[i][lang()] || opts[i].ko;
        if (typeof v === 'string' && v.indexOf('rec:') === 0) return lang() === 'en' ? '🎤 (deleted sound)' : '🎤 (지운 소리)';
        return v;
    }

    function colorOpt(opts, v) {
        for (var i = 0; i < opts.length; i++) if (opts[i].v === v) return opts[i];
        return opts[0];
    }

    // 방향 값(−100~100)을 "오른쪽: 30" 같은 글로
    function steerLabel(v) {
        v = Math.round(parseFloat(v)); if (isNaN(v)) v = 0;
        var en = lang() === 'en';
        if (v === 0) return (en ? 'Straight' : '직진') + ': 0';
        return (v < 0 ? (en ? 'Left' : '왼쪽') : (en ? 'Right' : '오른쪽')) + ': ' + Math.abs(v);
    }

    var PAT_CODE = { p: 'pink', v: 'violet', b: 'blue', a: 'azure', g: 'green', y: 'yellow', o: 'orange', r: 'red', w: 'white' };
    function patCodeOf(colorName) { for (var k in PAT_CODE) if (PAT_CODE[k] === colorName) return k; return 'w'; }
    function patHex(ch, node) {                      // 한 칸의 색 (꺼져 있으면 null)
        if (ch === '0' || ch === undefined) return null;
        var nm = ch === '1' ? ((node && node.vals && node.vals.c) || 'white') : PAT_CODE[ch];
        return colorOpt(WB.LIGHT_COLORS, nm || 'white').hex;
    }

    function chipHtml(def, name, val, ownerId, node) {
        var s = def.slots[name];
        var own = ' data-owner="' + ownerId + '"';
        if (s.kind === 'fixed') return '<span class="wfix" style="color:' + s.ink + '">' + (s.label[lang()] || s.label.ko) + '</span>';
        if (s.kind === 'bool') return '<span class="wch whole" data-slot="' + name + '"' + own + ' data-accept="b"></span>';
        if (s.kind === 'num') return '<span class="wch" data-slot="' + name + '"' + own + ' data-accept="v">' + val + '</span>';
        if (s.kind === 'text') return '<span class="wch wch-txt" data-slot="' + name + '"' + own + ' data-accept="v">' + esc(val) + '</span>';
        if (s.kind === 'var') return '<span class="wch wch-var" data-slot="' + name + '"' + own + '>' + esc(val || (lang() === 'en' ? 'variable' : '변수')) + ' <i>▾</i></span>';
        if (s.kind === 'lst') return '<span class="wch wch-var" data-slot="' + name + '"' + own + '>' + esc(val || (lang() === 'en' ? 'list' : '리스트')) + ' <i>▾</i></span>';
        if (s.kind === 'pname') return name === 'n' ? esc(val) : '';
        if (s.kind === 'steer') return '<span class="wch" data-slot="' + name + '"' + own + ' data-accept="v">' + steerLabel(val) + ' <i>▾</i></span>';
        if (s.kind === 'pattern') {
            var cells = '';
            for (var i = 0; i < 9; i++) { var ph = patHex(String(val).charAt(i), node); cells += '<u' + (ph ? ' class="on" style="background:' + ph + '"' : '') + '></u>'; }
            return '<span class="wch wch-pat" data-slot="' + name + '"' + own + '><em class="wpat">' + cells + '</em> <i>▾</i></span>';
        }
        if (s.kind === 'color') {
            var co = colorOpt(s.opts, val);
            return '<span class="wch wch-col" data-slot="' + name + '"' + own + '><em class="wdot' + (co.none ? ' none' : '') + '" style="background:' + co.hex + '"></em>' + (co[lang()] || co.ko) + ' <i>▾</i></span>';
        }
        if (s.kind === 'dir') {
            var glyph = '';
            s.opts.forEach(function (o) { if (o.v === val) glyph = o.glyph; });
            return '<span class="wch wch-dir" data-slot="' + name + '"' + own + '><b>' + glyph + '</b> ' + optLabel(s.opts, val) + ' <i>▾</i></span>';
        }
        return '<span class="wch" data-slot="' + name + '"' + own + '>' + optLabel(s.opts, val) + ' <i>▾</i></span>';
    }

    // 끼워 넣은 값/조건 블록 (둥근 / 육각)
    function reporterHtml(vn) {
        var vd = WB.byType[vn.type];
        var rbd = (vd.repIcon || vd.repIconSvg) ? '<span class="bd rbd">' + (vd.repIconSvg || badgeSvg(vd.repIcon)) + '</span>' : '';       // 센서 값 블록 앞의 작은 아이콘
        return '<span class="wrep wr-' + shapeOf(vd) + (rbd ? ' wr-ic' : '') + '" data-id="' + vn.id + '" style="' + colorVars(vd.color) + '">' + rbd + sentenceHtml(vn) + '</span>';
    }

    function sentenceHtml(node) {
        var def = WB.byType[node.type];
        if (def.myDef) {
            return def.parts.map(function (p, i) {
                if (p.k === 'label') return esc(p.text);
                return '<span class="wpar wpar-' + p.k + '" data-param="a' + i + '" data-kind="' + p.k + '" data-label="' + esc(p.name) + '">' + esc(p.name) + '</span>';
            }).join(' ');
        }
        var text = def[lang()] || def.ko;
        return text.replace(/\{(\w+)\}/g, function (m, name) {
            if (!def.slots[name]) return m;
            var v = node.vals[name];
            if (isValueNode(v)) return reporterHtml(v);
            if (name === 'pt' && allowed) return '';             // 미션 중에는 포트 칸을 숨긴다 (자동)
            return chipHtml(def, name, v, node.id, node);
        });
    }

    function headEl(node, isTop, isPalette) {
        var def = WB.byType[node.type];
        var h = el('div', 'wb' + (isTop ? ' top' : '') + (def.container ? ' hd' : ''));
        h.setAttribute('style', colorVars(def.color));
        // 내가 만드는 변수/리스트/블록(내 블록 탭)은 아이콘 없이 글자만
        var plain = def.tab === 'my';
        h.innerHTML = (plain ? '' : '<span class="bd">' + (def.iconSvg || badgeSvg(def.icon)) + '</span>') + '<span class="wt">' + sentenceHtml(node) + '</span>';
        if (plain) h.classList.add('wb-plain');
        h.dataset.id = node.id;
        if (isPalette) { h.dataset.pal = def.type; if (def.type === 'var') h.dataset.varname = node.vals.name; }
        return h;
    }

    function blockEl(node, isTop, isPalette) {
        var def = WB.byType[node.type];
        if (shapeOf(def) !== 'stack') {                 // 값/조건 블록: 둥근/육각 모양 하나
            var rw = el('div', 'wblk wrblk');
            rw.dataset.id = node.id;
            rw.innerHTML = reporterHtml(node);
            if (isPalette) { rw.dataset.pal = def.type; if (def.type === 'var') rw.dataset.varname = node.vals.name; }
            return rw;
        }
        if (!def.container) {
            var b = headEl(node, isTop, isPalette);
            b.classList.add('wblk');
            return b;
        }
        var c = el('div', 'wcnt wblk');
        c.dataset.id = node.id;
        c.setAttribute('style', colorVars(def.color));
        c.appendChild(headEl(node, isTop, isPalette));
        var arm = el('div', 'warm');
        var list = el('div', 'wlist');
        list.__list = node.kids;
        (node.kids || []).forEach(function (k) { list.appendChild(blockEl(k, false, false)); });
        arm.appendChild(list);
        c.appendChild(arm);
        if (def.arms === 2) {                           // 아니면 칸
            c.appendChild(el('div', 'wmid', '<span>' + (lang() === 'en' ? def.midEn : def.midKo) + '</span>'));
            var arm2 = el('div', 'warm');
            var list2 = el('div', 'wlist');
            list2.__list = node.kids2;
            (node.kids2 || []).forEach(function (k) { list2.appendChild(blockEl(k, false, false)); });
            arm2.appendChild(list2);
            c.appendChild(arm2);
        }
        c.appendChild(el('div', 'wbot'));
        return c;
    }

    function renderStacks() {
        // 스택만 다시 그린다 (힌트/드래그 요소는 유지)
        Array.prototype.slice.call(area.querySelectorAll('.wstack')).forEach(function (n) { n.remove(); });
        state.stacks.forEach(function (st) {
            var s = el('div', 'wstack');
            s.dataset.sid = st.id;
            s.style.left = st.x + 'px';
            s.style.top = st.y + 'px';
            var list = el('div', 'wlist wroot');
            list.__list = st.blocks;
            st.blocks.forEach(function (n, i) { list.appendChild(blockEl(n, i === 0, false)); });
            s.appendChild(list);
            area.appendChild(s);
        });
        if (selectedId) {
            var sel = area.querySelector('[data-id="' + selectedId + '"]');
            if (sel) sel.classList.add('wsel');
        }
        if (hint) hint.style.display = state.stacks.length ? 'none' : '';
    }

    // 보관 칸에 보여 줄 블록: 단원 전용 블록 + (미션 중이면) 미션에 쓰는 블록만
    var allowed = null;
    function visibleBlocks() {
        return WB.BLOCKS.filter(function (b) {
            return !b.hidden && !(b.freeHidden && !allowed) && (!b.units || b.units.indexOf(unit) >= 0) && (!allowed || allowed.indexOf(b.type) >= 0);
        });
    }

    function renderPalette() {
        palTabs.innerHTML = '';
        var vis = visibleBlocks();
        if (allowed) {                                  // 미션 중: 탭 없이, 필요한 블록만 세로로 한눈에
            palTabs.style.display = 'none';
            palList.innerHTML = '';
            allowed.forEach(function (type) {
                var def = WB.byType[type];
                if (!def || vis.indexOf(def) < 0) return;
                var wrap = el('div', 'wpitem');
                wrap.appendChild(blockEl(newNode(def.type), false, true));
                palList.appendChild(wrap);
            });
            return;
        }
        palTabs.style.display = '';
        var cats = WB.CATS.filter(function (c) { return vis.some(function (b) { return catOf(b) === c.id; }); });
        activeIsVars = false;
        if (cats.length && !cats.some(function (c) { return c.id === activeCat; })) activeCat = cats[0].id;
        cats.forEach(function (c) {
            var t = el('button', 'wtab' + (c.id === activeCat ? ' on' : ''), c[lang()] || c.ko);
            t.setAttribute('type', 'button');
            t.style.setProperty('--tabc', WB.COLORS[c.color].c);
            t.onclick = function () { activeCat = c.id; renderPalette(); };
            palTabs.appendChild(t);
        });
        palList.innerHTML = '';
        if (activeCat === 'my') { renderVarsPalette(vis); renderMyPalette(); return; }
        vis.filter(function (b) { return catOf(b) === activeCat; }).forEach(function (def) {
            var node = newNode(def.type);
            var wrap = el('div', 'wpitem');
            var b = blockEl(node, false, true);
            wrap.appendChild(b);
            palList.appendChild(wrap);
        });
        if (activeCat === 'sound' && window.SoundLib) {         // 내 소리: 녹음/편집 창 열기
            palList.appendChild(el('div', 'wsec', lang() === 'en' ? 'My Sounds' : '내 소리'));
            var rb = el('button', 'wmakevar', '🎤 ' + (lang() === 'en' ? 'Record / edit sounds' : '소리 녹음·편집'));
            rb.type = 'button';
            rb.onclick = function () { SoundLib.openStudio(); };
            var rw = el('div', 'wpitem'); rw.appendChild(rb); palList.appendChild(rw);
            var recs = SoundLib.list();
            if (recs.length) palList.appendChild(el('div', 'wsec', recs.map(function (s) { return '🎤 ' + s.num + ' ' + (s.name || ''); }).join('  ·  ')));
        }
    }
    if (window.SoundLib) SoundLib.onChange(function () { try { renderPalette(); } catch (e) { } });

    /* ---------- 변수 탭: "변수 만들기" + 만든 변수들 ---------- */
    var activeIsVars = false;
    function renderVarsPalette(vis) {
        palList.appendChild(el('div', 'wsec', lang() === 'en' ? 'Variables' : '변수'));
        var mk = el('button', 'wmakevar', (lang() === 'en' ? 'Make a variable' : '변수 만들기'));
        mk.type = 'button';
        mk.onclick = function () { openMakeName(mk, 'vars', lang() === 'en' ? 'variable name' : '변수 이름'); };
        var first = el('div', 'wpitem');
        first.appendChild(mk);
        palList.appendChild(first);
        state.vars.forEach(function (name) {
            var wrap = el('div', 'wpitem wvarrow');
            wrap.appendChild(blockEl(newNode('var', { name: name }), false, true));
            var del = el('button', 'wvardel', '×');
            del.type = 'button';
            del.title = lang() === 'en' ? 'Delete variable' : '변수 지우기';
            del.onclick = function () {
                state.vars = state.vars.filter(function (n) { return n !== name; });
                scheduleSave(); renderPalette();
            };
            wrap.appendChild(del);
            palList.appendChild(wrap);
        });
        if (state.vars.length) {
            ['var_set', 'var_change'].forEach(function (type) {
                var wrap = el('div', 'wpitem');
                wrap.appendChild(blockEl(newNode(type), false, true));
                palList.appendChild(wrap);
            });
        }

        /* 리스트 */
        palList.appendChild(el('div', 'wsec', lang() === 'en' ? 'Lists' : '리스트'));
        var mkl = el('button', 'wmakevar', (lang() === 'en' ? 'Make a list' : '리스트 만들기'));
        mkl.type = 'button';
        mkl.onclick = function () { openMakeName(mkl, 'lists', lang() === 'en' ? 'list name' : '리스트 이름'); };
        var firstL = el('div', 'wpitem');
        firstL.appendChild(mkl);
        palList.appendChild(firstL);
        state.lists.forEach(function (name) {
            var wrap = el('div', 'wpitem wvarrow');
            wrap.appendChild(blockEl(newNode('lst_val', { l: name }), false, true));
            var del = el('button', 'wvardel', '×');
            del.type = 'button';
            del.title = lang() === 'en' ? 'Delete list' : '리스트 지우기';
            del.onclick = function () {
                state.lists = state.lists.filter(function (n) { return n !== name; });
                scheduleSave(); renderPalette();
            };
            wrap.appendChild(del);
            palList.appendChild(wrap);
        });
        if (state.lists.length) {
            ['lst_add', 'lst_delete', 'lst_clear', 'lst_insert', 'lst_replace', 'lst_item', 'lst_index', 'lst_length', 'lst_contains'].forEach(function (type) {
                var wrap = el('div', 'wpitem');
                wrap.appendChild(blockEl(newNode(type), false, true));
                palList.appendChild(wrap);
            });
        }
    }

    /* ---------- 내 블록 ---------- */
    function registerMy(mb) {
        var slots = {}, parts = [];
        mb.parts.forEach(function (p, i) {
            if (p.k === 'label') { parts.push(String(p.text).replace(/[{}]/g, '')); return; }
            slots['a' + i] = p.k === 'bool' ? { kind: 'bool', def: null } : { kind: 'num', def: 0, min: -99999, max: 99999, step: 1 };
            parts.push('{a' + i + '}');
        });
        var sentence = parts.join(' ');
        WB.byType['my_call_' + mb.id] = { type: 'my_call_' + mb.id, tab: 'my', color: 'my', icon: 'gear', ko: sentence, en: sentence, slots: slots, myCall: mb.id };
        WB.byType['my_def_' + mb.id] = { type: 'my_def_' + mb.id, tab: 'my', color: 'my', icon: 'gear', hat: true, myDef: true, parts: mb.parts, ko: '', en: '', slots: {} };
    }

    function purgeTypes(types) {
        function clean(list) {
            for (var i = list.length - 1; i >= 0; i--) {
                var n = list[i];
                if (types.indexOf(n.type) >= 0) { list.splice(i, 1); continue; }
                if (n.kids) clean(n.kids);
                if (n.kids2) clean(n.kids2);
            }
        }
        state.stacks.forEach(function (s) { clean(s.blocks); });
        state.stacks = state.stacks.filter(function (s) { return s.blocks.length; });
    }

    function renderMyPalette() {
        palList.appendChild(el('div', 'wsec', lang() === 'en' ? 'My Blocks' : '내 블록'));
        var mk = el('button', 'wmakevar wmakemy', (lang() === 'en' ? 'Make a Block' : '블록 만들기'));
        mk.type = 'button';
        mk.onclick = function () { openMakeBlock(); };
        var first = el('div', 'wpitem');
        first.appendChild(mk);
        palList.appendChild(first);
        state.myblocks.forEach(function (mb) {
            var wrap = el('div', 'wpitem wvarrow');
            wrap.appendChild(blockEl(newNode('my_call_' + mb.id), false, true));
            var del = el('button', 'wvardel', '×');
            del.type = 'button';
            del.title = lang() === 'en' ? 'Delete block' : '블록 지우기';
            del.onclick = function () {
                state.myblocks = state.myblocks.filter(function (b) { return b.id !== mb.id; });
                purgeTypes(['my_call_' + mb.id, 'my_def_' + mb.id]);
                delete WB.byType['my_call_' + mb.id]; delete WB.byType['my_def_' + mb.id];
                changed(); renderPalette();
            };
            wrap.appendChild(del);
            palList.appendChild(wrap);
        });
    }

    // "블록 만들기" 창: 이름(레이블), 입력(숫자/글자, 참/거짓) 추가
    function openMakeBlock() {
        closePop();
        var en = lang() === 'en';
        var parts = [{ k: 'label', text: en ? 'block name' : '블록 이름' }];
        var ov = el('div', 'wmb-overlay');
        var box = el('div', 'wmb-box');
        ov.appendChild(box);
        var close = function () { ov.remove(); };
        box.innerHTML = '<div class="wmb-title">' + (en ? 'Make a Block' : '블록 만들기') + '</div><button type="button" class="wmb-x" aria-label="close">✕</button>' +
            '<div class="wmb-prev"><div class="wmb-hat" id="wmbHat"></div></div>' +
            '<div class="wmb-add">' +
            '<button type="button" data-add="num"><i class="wmb-ic wmb-ic-v"></i><b>' + (en ? 'Add an input' : '입력 추가') + '</b><span>' + (en ? 'number or text' : '숫자 또는 글자') + '</span></button>' +
            '<button type="button" data-add="bool"><i class="wmb-ic wmb-ic-b"></i><b>' + (en ? 'Add an input' : '입력 추가') + '</b><span>' + (en ? 'true / false' : '참 / 거짓') + '</span></button>' +
            '<button type="button" data-add="label"><i class="wmb-ic wmb-ic-t">text</i><b>' + (en ? 'Add a label' : '글자 추가') + '</b><span>&nbsp;</span></button>' +
            '</div>' +
            '<div class="wmb-foot"><button type="button" class="wmb-cancel">' + (en ? 'Cancel' : '취소') + '</button><button type="button" class="wmb-save">' + (en ? 'Save' : '저장') + '</button></div>';
        var hat = box.querySelector('#wmbHat');
        var draw = function (focusIdx) {
            hat.innerHTML = '';
            parts.forEach(function (p, i) {
                var cell = el('span', 'wmb-part wmb-' + p.k);
                var input = el('input', 'wmb-in');
                input.type = 'text'; input.maxLength = 14;
                input.value = p.k === 'label' ? p.text : p.name;
                input.oninput = function () { if (p.k === 'label') p.text = input.value; else p.name = input.value; input.style.width = Math.max(6, input.value.length * 1.9 + 2) + 'ch'; };
                input.style.width = Math.max(6, input.value.length * 1.9 + 2) + 'ch';
                cell.appendChild(input);
                if (parts.length > 1) {
                    var rm = el('button', 'wmb-rm', '×');
                    rm.type = 'button';
                    rm.onclick = function () { parts.splice(i, 1); draw(); };
                    cell.appendChild(rm);
                }
                hat.appendChild(cell);
                if (focusIdx === i) setTimeout(function () { input.focus(); input.select(); }, 0);
            });
        };
        draw(0);
        box.querySelector('.wmb-x').onclick = close;
        box.querySelector('.wmb-cancel').onclick = close;
        Array.prototype.forEach.call(box.querySelectorAll('[data-add]'), function (b) {
            b.onclick = function () {
                var kind = b.dataset.add, n = parts.filter(function (p) { return p.k !== 'label'; }).length + 1;
                if (kind === 'label') parts.push({ k: 'label', text: en ? 'label' : '글자' });
                else parts.push({ k: kind, name: (en ? 'input' : '입력') + n });
                draw(parts.length - 1);
            };
        });
        box.querySelector('.wmb-save').onclick = function () {
            parts = parts.filter(function (p) { return p.k !== 'label' || p.text.trim(); });
            parts.forEach(function (p) { if (p.k === 'label') p.text = p.text.trim(); else if (!p.name.trim()) p.name = en ? 'input' : '입력'; else p.name = p.name.trim(); });
            if (!parts.some(function (p) { return p.k === 'label'; })) { parts.unshift({ k: 'label', text: en ? 'block' : '블록' }); }
            var mb = { id: 'mb' + Date.now().toString(36), parts: parts };
            registerMy(mb);
            state.myblocks.push(mb);
            var host = area.parentElement.getBoundingClientRect();
            var left = parseFloat(area.style.left) || 0, top = parseFloat(area.style.top) || 0;
            var defs = state.stacks.filter(function (s) { return s.blocks[0] && s.blocks[0].type.indexOf('my_def_') === 0; }).length;
            state.stacks.push({ id: nid(), x: Math.round((-left + 70) / zoom), y: Math.round((-top + 60) / zoom + 90 * defs), blocks: [newNode('my_def_' + mb.id)] });
            activeCat = 'my';
            close();
            changed(); renderPalette();
        };
        ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        document.body.appendChild(ov);
    }

    // 이름 하나만 받아서 변수/리스트 목록에 추가하는 작은 팝업
    function openMakeName(anchor, key, placeholder) {
        popEl.innerHTML = '';
        var wrap = el('div', 'wnum');
        var input = el('input', 'wni wni-text');
        input.type = 'text'; input.maxLength = 16; input.placeholder = placeholder;
        var ok = el('button', 'wok', '✓');
        var add = function () {
            var name = input.value.trim();
            if (!name || state[key].indexOf(name) >= 0) { input.focus(); return; }
            state[key].push(name);
            closePop(); scheduleSave(); renderPalette();
        };
        ok.onclick = add;
        input.onkeydown = function (ev) { if (ev.key === 'Enter') add(); };
        wrap.appendChild(input); wrap.appendChild(ok);
        popEl.appendChild(wrap);
        placePop(anchor);
        input.focus();
    }

    function openMakeVar(anchor) {
        popEl.innerHTML = '';
        var wrap = el('div', 'wnum');
        var input = el('input', 'wni wni-text');
        input.type = 'text'; input.maxLength = 16;
        input.placeholder = lang() === 'en' ? 'variable name' : '변수 이름';
        var ok = el('button', 'wok', '✓');
        var add = function () {
            var name = input.value.trim();
            if (!name || state.vars.indexOf(name) >= 0) { input.focus(); return; }
            state.vars.push(name);
            closePop(); scheduleSave(); renderPalette();
        };
        ok.onclick = add;
        input.onkeydown = function (ev) { if (ev.key === 'Enter') add(); };
        wrap.appendChild(input); wrap.appendChild(ok);
        popEl.appendChild(wrap);
        placePop(anchor);
        input.focus();
    }

    // 블록의 소속 카테고리 탭: 정의된 cat 의 이름으로 탭을 찾는다 (색 카테고리와 탭 카테고리를 분리)
    function catOf(def) { return def.tab; }

    /* ---------- 저장 / 불러오기 ---------- */
    var saveTimer = null;
    function scheduleSave() {
        try { window.dispatchEvent(new Event('wordblocks:changed')); } catch (e) { }
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 250);
    }
    function save() {
        try {
            if (!state.stacks.length && !state.vars.length && !state.lists.length && !state.myblocks.length) { localStorage.removeItem(storageKey()); return; }
            localStorage.setItem(storageKey(), JSON.stringify({
                mode: 'word', unit: unit, stacks: state.stacks, vars: state.vars, lists: state.lists, myblocks: state.myblocks, updatedAt: Date.now()
            }));
        } catch (e) { }
    }
    function load() {
        try {
            var raw = localStorage.getItem(storageKey());
            if (!raw) return;
            var data = JSON.parse(raw);
            if (data && data.stacks) {
                state.myblocks = (Array.isArray(data.myblocks) ? data.myblocks : []).filter(function (mb) { return mb && mb.id && Array.isArray(mb.parts); });
                state.myblocks.forEach(registerMy);
                var fixNode = function (n) {
                    if (!n || !WB.byType[n.type]) return null;
                    var def = WB.byType[n.type];
                    var vals = {};
                    Object.keys(def.slots).forEach(function (k) {
                        var v = (n.vals && n.vals[k] !== undefined) ? n.vals[k] : def.slots[k].def;
                        if (v && typeof v === 'object') v = fixNode(v) || def.slots[k].def;
                        vals[k] = v;
                    });
                    var out = { id: nid(), type: n.type, vals: vals, kids: def.container ? fixList(n.kids) : undefined };
                    if (def.arms === 2) out.kids2 = fixList(n.kids2);
                    return out;
                };
                var fixList = function (list) { return (list || []).map(fixNode).filter(Boolean); };
                state.vars = Array.isArray(data.vars) ? data.vars.filter(function (v) { return typeof v === 'string' && v; }) : [];
                state.lists = Array.isArray(data.lists) ? data.lists.filter(function (v) { return typeof v === 'string' && v; }) : [];
                state.stacks = data.stacks.map(function (s) {
                    return { id: nid(), x: s.x, y: s.y, blocks: fixList(s.blocks) };
                }).filter(function (s) { return s.blocks.length; });
            }
        } catch (e) { }
    }
    function changed() { renderStacks(); scheduleSave(); }
    window.addEventListener('beforeunload', save);

    /* ---------- 찾기 도우미 ---------- */
    // id 로 블록을 찾아 {node, list, index, stack} 반환
    function locate(id) {
        var res = null;
        function walk(list, stack) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) { res = { node: list[i], list: list, index: i, stack: stack }; return true; }
                if (list[i].kids && walk(list[i].kids, stack)) return true;
                if (list[i].kids2 && walk(list[i].kids2, stack)) return true;
            }
            return false;
        }
        for (var s = 0; s < state.stacks.length; s++) if (walk(state.stacks[s].blocks, state.stacks[s])) break;
        return res;
    }

    // 칸에 끼워 넣은 블록까지 포함해 id 로 블록 찾기
    function findAny(id) {
        var res = null;
        function visit(n) {
            if (!n || res) return;
            if (n.id === id) { res = n; return; }
            Object.keys(n.vals || {}).forEach(function (k) { var v = n.vals[k]; if (v && typeof v === 'object') visit(v); });
            (n.kids || []).forEach(visit);
            (n.kids2 || []).forEach(visit);
        }
        state.stacks.forEach(function (s) { s.blocks.forEach(visit); });
        return res;
    }
    // 칸에 끼워진 블록의 주인 블록과 칸 이름
    function findSlotOwner(id) {
        var res = null;
        function visit(n) {
            if (res) return;
            Object.keys(n.vals || {}).forEach(function (k) {
                var v = n.vals[k];
                if (v && typeof v === 'object') {
                    if (v.id === id) { res = { owner: n, slot: k, node: v }; return; }
                    visit(v);
                }
            });
            (n.kids || []).forEach(visit);
            (n.kids2 || []).forEach(visit);
        }
        state.stacks.forEach(function (s) { s.blocks.forEach(visit); });
        return res;
    }

    /* ---------- 드래그 ---------- */
    var drag = null;   // { list:[nodes], ghost, offX, offY, from:'palette'|'move', startX, startY, started, target }

    function nodeFromEvent(e) {
        var b = e.target.closest('.wblk');
        return b;
    }

    function onPointerDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        if (popEl.style.display === 'block' && !e.target.closest('#wPop')) closePop();

        var palBlock = e.target.closest('#wPalList .wblk');
        var wsBlock = e.target.closest('.wstack .wblk');
        var chip = e.target.closest('.wch');
        var par = e.target.closest('.wpar');
        if (par && wsBlock) {                       // 내 블록 정의의 입력 알약: 복사본을 끌어낸다
            drag = {
                from: 'param', el: par, chip: null,
                startX: e.clientX, startY: e.clientY, started: false, list: null, ghost: null, target: null
            };
            var pr = par.getBoundingClientRect();
            drag.offX = e.clientX - pr.left; drag.offY = e.clientY - pr.top;
            drag.pid = e.pointerId;
            e.preventDefault();
            return;
        }
        var nestedRep = e.target.closest('.wrep');
        if (nestedRep && !nestedRep.closest('.wstack .wb')) nestedRep = null;      // 블록 머리 안에 끼워진 것만
        if (nestedRep && wsBlock) {
            drag = {
                from: 'slot', el: nestedRep, chip: chip && nestedRep.contains(chip) ? chip : null,
                startX: e.clientX, startY: e.clientY, started: false, list: null, ghost: null, target: null
            };
            var rr = nestedRep.getBoundingClientRect();
            drag.offX = e.clientX - rr.left; drag.offY = e.clientY - rr.top;
            drag.pid = e.pointerId;
            e.preventDefault();
            return;
        }
        if (!palBlock && !wsBlock) {
            // 빈 곳: 작업판 이동(팬)
            if (e.target === area || e.target.closest('.main-layout') && !e.target.closest('.wpal') && !e.target.closest('#trashArea')) {
                startPan(e);
            }
            return;
        }
        // 가장 안쪽 블록 찾기 (컨테이너 안의 블록)
        var target = (palBlock || wsBlock);
        var inner = e.target.closest('.wblk');
        if (inner) target = inner;

        drag = {
            from: palBlock ? 'palette' : 'move',
            el: target,
            chip: chip && wsBlock ? chip : null,
            startX: e.clientX, startY: e.clientY,
            started: false, list: null, ghost: null, target: null
        };
        var r = target.getBoundingClientRect();
        drag.offX = (e.clientX - r.left) * (palBlock ? zoom : 1);
        drag.offY = (e.clientY - r.top) * (palBlock ? zoom : 1);
        drag.pid = e.pointerId;
        e.preventDefault();
    }

    function beginDrag() {
        var d = drag;
        d.started = true;
        if (d.from === 'param') {
            d.list = [newNode(d.el.dataset.kind === 'bool' ? 'my_param_b' : 'my_param_v', { pid: d.el.dataset.param, n: d.el.dataset.label })];
        } else if (d.from === 'slot') {
            var so = findSlotOwner(d.el.dataset.id);
            if (!so) { drag = null; return; }
            var sdef = WB.byType[so.owner.type].slots[so.slot];
            so.owner.vals[so.slot] = sdef.def;
            d.list = [so.node];
            renderStacks();
        } else if (d.from === 'palette') {
            var pel = d.el.dataset.pal ? d.el : d.el.querySelector('[data-pal]');
            var def = WB.byType[pel.dataset.pal];
            d.list = [newNode(def.type, pel.dataset.varname ? { name: pel.dataset.varname } : null)];
        } else {
            var found = locate(d.el.dataset.id);
            if (!found) { drag = null; return; }
            // 이 블록과 아래에 이어진 블록 전체를 함께 가져간다
            var moved = found.list.splice(found.index, found.list.length - found.index);
            d.list = moved;
            d.origin = found;
            // 빈 스택 정리 후 다시 그림
            state.stacks = state.stacks.filter(function (s) { return s.blocks.length; });
            if (selectedId) selectedId = null;
            renderStacks();
        }
        // 고스트
        var g = el('div', 'wghost');
        d.list.forEach(function (n, i) { g.appendChild(blockEl(n, i === 0, false)); });
        g.style.transform = 'scale(' + zoom + ')';
        g.style.transformOrigin = '0 0';
        dragLayer.appendChild(g);
        d.ghost = g;
        document.body.classList.add('wdragging');
    }

    function onPointerMove(e) {
        if (panState) { doPan(e); return; }
        if (!drag) return;
        if (!drag.started) {
            if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 6) return;
            beginDrag();
            if (!drag) return;
        }
        drag.ghost.style.left = (e.clientX - drag.offX) + 'px';
        drag.ghost.style.top = (e.clientY - drag.offY) + 'px';

        var overTrash = hit(trash, e.clientX, e.clientY) || hit(palette, e.clientX, e.clientY);
        trash.classList.toggle('drag-over', overTrash);
        drag.overTrash = overTrash;
        var shape = shapeOf(WB.byType[drag.list[0].type]);
        if (shape !== 'stack') {                     // 값/조건 블록은 칸에 끼운다
            drag.target = null;
            showIndicator(null);
            setHole(overTrash ? null : findHole(e.clientX, e.clientY, shape));
            return;
        }
        drag.target = overTrash ? null : findTarget(e.clientX - drag.offX, e.clientY - drag.offY);
        showIndicator(drag.target);
    }

    function findHole(px, py, shape) {
        var want = shape === 'bool' ? 'b' : 'v';
        var best = null, bestArea = 1e12;
        Array.prototype.forEach.call(area.querySelectorAll('[data-accept="' + want + '"]'), function (h) {
            var r = h.getBoundingClientRect(), m = 8;
            if (px >= r.left - m && px <= r.right + m && py >= r.top - m && py <= r.bottom + m) {
                var a = r.width * r.height;
                if (a < bestArea) { bestArea = a; best = h; }
            }
        });
        return best;
    }
    function setHole(h) {
        if (drag && drag.hole && drag.hole !== h) drag.hole.classList.remove('whl-hot');
        if (drag) drag.hole = h;
        if (h) h.classList.add('whl-hot');
    }

    function hit(node, x, y) {
        var r = node.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    function allowedHere(list, index, isRoot, stackBlocks) {
        var first = drag.list[0];
        var firstDef = WB.byType[first.type];
        if (firstDef.hat) {
            // 시작 블록: 가장 위(작업판 스택의 맨 앞)에만, 이미 시작 블록이 있으면 불가
            if (!isRoot || index !== 0) return false;
            var head = list[0];
            return !(head && WB.byType[head.type].hat);
        }
        // 일반 블록: 시작 블록 위로는 올 수 없다
        if (isRoot && index === 0 && list[0] && WB.byType[list[0].type].hat) return false;
        return true;
    }

    function findTarget(gx, gy) {
        var best = null, bestScore = 1e9;
        var lists = area.querySelectorAll('.wlist');
        Array.prototype.forEach.call(lists, function (le) {
            var arr = le.__list;
            if (!arr) return;
            if (arr.length && shapeOf(WB.byType[arr[0].type]) !== 'stack') return;      // 값 블록 옆에는 이어 붙이지 않는다
            var isRoot = le.classList.contains('wroot');
            var r = le.getBoundingClientRect();
            var kids = Array.prototype.filter.call(le.children, function (c) { return c.classList.contains('wblk'); });
            for (var i = 0; i <= arr.length; i++) {
                if (!allowedHere(arr, i, isRoot)) continue;
                var y;
                if (kids.length === 0) y = r.top;
                else if (i < kids.length) y = kids[i].getBoundingClientRect().top;
                else y = kids[kids.length - 1].getBoundingClientRect().bottom;
                var dx = Math.abs(gx - r.left), dy = Math.abs(gy - y);
                if (dx > 90 || dy > 40) continue;
                var score = dx * 0.6 + dy;
                if (score < bestScore) {
                    bestScore = score;
                    best = { arr: arr, index: i, left: r.left, top: y, width: Math.max(r.width, 160) };
                }
            }
        });
        return best;
    }

    function showIndicator(t) {
        if (!t) { indEl.style.display = 'none'; return; }
        indEl.style.display = 'block';
        indEl.style.left = t.left + 'px';
        indEl.style.top = (t.top - 3) + 'px';
        indEl.style.width = t.width + 'px';
    }

    function endDrag(e) {
        if (panState) { panState = null; document.body.classList.remove('wpanning'); return; }
        if (!drag) return;
        var d = drag;
        drag = null;
        if (!d.started) {
            // 클릭: 입력칸이면 팝업, 아니면 블록 선택
            if (d.chip && d.from !== 'palette') {
                var ow = findAny(d.chip.dataset.owner);
                if (ow) openSlotPopup(d.chip, ow, d.chip.dataset.slot);
                return;
            }
            if (d.from === 'move') {
                var found = locate(d.el.dataset.id);
                if (found) {
                    selectedId = (selectedId === found.node.id) ? null : found.node.id;
                    renderStacks();
                }
            }
            return;
        }
        trash.classList.remove('drag-over');
        indEl.style.display = 'none';
        document.body.classList.remove('wdragging');
        var ghostRect = d.ghost.getBoundingClientRect();
        d.ghost.remove();

        if (d.hole) d.hole.classList.remove('whl-hot');
        if (d.overTrash) { changed(); return; }       // 삭제 (이미 데이터에서 빠져 있음)
        if (d.hole) {                                  // 값/조건 블록을 칸에 끼우기
            var owner = findAny(d.hole.dataset.owner);
            if (owner) { owner.vals[d.hole.dataset.slot] = d.list[0]; changed(); return; }
        }
        if (d.target) {
            Array.prototype.splice.apply(d.target.arr, [d.target.index, 0].concat(d.list));
            changed();
            return;
        }
        // 빈 곳에 놓기: 새 스택
        var ar = area.getBoundingClientRect();
        state.stacks.push({ id: nid(), x: Math.max(0, Math.round((ghostRect.left - ar.left) / zoom)), y: Math.max(0, Math.round((ghostRect.top - ar.top) / zoom)), blocks: d.list });
        changed();
    }

    /* ---------- 작업판 이동 (팬) ---------- */
    var panState = null;
    function startPan(e) {
        panState = { x: e.clientX, y: e.clientY, left: parseFloat(area.style.left) || 0, top: parseFloat(area.style.top) || 0 };
        document.body.classList.add('wpanning');
        if (selectedId) { selectedId = null; renderStacks(); }
        e.preventDefault();
    }
    function doPan(e) {
        var host = area.parentElement.getBoundingClientRect();
        var nl = panState.left + (e.clientX - panState.x);
        var nt = panState.top + (e.clientY - panState.y);
        nl = Math.min(0, Math.max(host.width - 5000 * zoom, nl));
        nt = Math.min(0, Math.max(host.height - 5000 * zoom, nt));
        area.style.left = nl + 'px';
        area.style.top = nt + 'px';
    }
    function centerCamera() {
        var host = area.parentElement.getBoundingClientRect();
        area.style.left = Math.min(0, -(2500 * zoom - host.width / 2 + 160)) + 'px';
        area.style.top = Math.min(0, -(2500 * zoom - host.height / 2)) + 'px';
    }

    /* ---------- 마우스 휠 줌 (커서 위치 기준) ---------- */
    function applyZoom(newZoom, cx, cy) {
        var host = area.parentElement.getBoundingClientRect();
        newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(newZoom * 100) / 100));
        if (newZoom === zoom) return;
        var left = parseFloat(area.style.left) || 0, top = parseFloat(area.style.top) || 0;
        var mx = cx - host.left, my = cy - host.top;
        var lx = (mx - left) / zoom, ly = (my - top) / zoom;
        zoom = newZoom;
        left = mx - lx * zoom; top = my - ly * zoom;
        left = Math.min(0, Math.max(host.width - 5000 * zoom, left));
        top = Math.min(0, Math.max(host.height - 5000 * zoom, top));
        area.style.transform = 'scale(' + zoom + ')';
        area.style.left = left + 'px';
        area.style.top = top + 'px';
        closePop();
    }
    area.parentElement.addEventListener('wheel', function (e) {
        if (e.target.closest('#wPalette') || e.target.closest('#trashArea')) return;
        e.preventDefault();
        applyZoom(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), e.clientX, e.clientY);
    }, { passive: false });

    /* ---------- 입력칸 팝업 ---------- */
    function closePop() { popEl.style.display = 'none'; popEl.innerHTML = ''; }

    function placePop(chip) {
        var r = chip.getBoundingClientRect();
        popEl.style.display = 'block';
        var pw = popEl.offsetWidth, ph = popEl.offsetHeight;
        var left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
        var top = r.bottom + 10;
        if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 10);
        popEl.style.left = left + 'px';
        popEl.style.top = top + 'px';
    }

    function openSlotPopup(chip, node, slotName) {
        var def = WB.byType[node.type];
        var slot = def.slots[slotName];
        popEl.innerHTML = '';
        if (slot.kind === 'bool' || slot.kind === 'pname' || slot.kind === 'fixed') return;
        if (slot.kind === 'text') {
            var tw = el('div', 'wnum');
            var tin = el('input', 'wni wni-text');
            tin.type = 'text'; tin.value = node.vals[slotName]; tin.maxLength = 40;
            var tok = el('button', 'wok', '✓');
            var tapply = function () { node.vals[slotName] = tin.value; closePop(); changed(); };
            tok.onclick = tapply;
            tin.onkeydown = function (ev) { if (ev.key === 'Enter') tapply(); };
            tw.appendChild(tin); tw.appendChild(tok);
            popEl.appendChild(tw);
            placePop(chip);
            tin.focus(); tin.select();
            return;
        }
        if (slot.kind === 'lst') {
            var ll = el('div', 'wopts');
            if (!state.lists.length) ll.appendChild(el('div', 'wopt', lang() === 'en' ? 'Make a list first' : '먼저 리스트를 만들어 주세요'));
            state.lists.forEach(function (name) {
                var lb = el('button', 'wopt' + (node.vals[slotName] === name ? ' on' : ''), esc(name));
                lb.type = 'button';
                lb.onclick = function () { node.vals[slotName] = name; closePop(); changed(); };
                ll.appendChild(lb);
            });
            popEl.appendChild(ll);
            placePop(chip);
            return;
        }
        if (slot.kind === 'var') {
            var vl = el('div', 'wopts');
            if (!state.vars.length) vl.appendChild(el('div', 'wopt', lang() === 'en' ? 'Make a variable first' : '먼저 변수를 만들어 주세요'));
            state.vars.forEach(function (name) {
                var vb = el('button', 'wopt' + (node.vals[slotName] === name ? ' on' : ''), esc(name));
                vb.type = 'button';
                vb.onclick = function () { node.vals[slotName] = name; closePop(); changed(); };
                vl.appendChild(vb);
            });
            popEl.appendChild(vl);
            placePop(chip);
            return;
        }
        if (slot.kind === 'num') {
            var wrap = el('div', 'wnum');
            var minus = el('button', 'wnb', '−');
            var plus = el('button', 'wnb', '+');
            var input = el('input', 'wni');
            input.type = 'number';
            input.value = node.vals[slotName];
            input.min = slot.min; input.max = slot.max; input.step = slot.step || (slot.min < 1 ? 0.1 : 1);
            var apply = function (v) {
                if (slot.def === '' && (v === '' || v === null || isNaN(parseFloat(v)))) {         // 비워 둘 수 있는 칸
                    node.vals[slotName] = ''; input.value = ''; chip.textContent = ''; scheduleSave(); return;
                }
                v = parseFloat(v);
                if (isNaN(v)) v = slot.def;
                v = Math.max(slot.min, Math.min(slot.max, v));
                v = Math.round(v * 100) / 100;
                node.vals[slotName] = v;
                input.value = v;
                chip.textContent = v;
                scheduleSave();
            };
            var stepv = parseFloat(input.step) || 1;
            minus.onclick = function () { apply((parseFloat(input.value) || 0) - stepv); };
            plus.onclick = function () { apply((parseFloat(input.value) || 0) + stepv); };
            input.oninput = function () { };
            input.onchange = function () { apply(input.value); };
            input.onkeydown = function (ev) { if (ev.key === 'Enter') { apply(input.value); closePop(); renderStacks(); } };
            var ok = el('button', 'wok', '✓');
            ok.onclick = function () { apply(input.value); closePop(); renderStacks(); };
            wrap.appendChild(minus); wrap.appendChild(input); wrap.appendChild(plus); wrap.appendChild(ok);
            popEl.appendChild(wrap);
            placePop(chip);
            input.focus(); input.select();
            return;
        }
        if (slot.kind === 'steer') {
            var sw = el('div', 'wdial');
            sw.style.background = WB.COLORS[def.color].c;
            var R = 66, C = 85, SPAN = 135;                       // 반지름, 중심, 좌우로 돌 수 있는 각도
            var ticks = '';
            for (var tk = -SPAN; tk <= SPAN; tk += 27) {
                var tr = tk * Math.PI / 180;
                ticks += '<line x1="' + (C + (R - 9) * Math.sin(tr)) + '" y1="' + (C - (R - 9) * Math.cos(tr)) + '" x2="' + (C + (R - 3) * Math.sin(tr)) + '" y2="' + (C - (R - 3) * Math.cos(tr)) + '" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>';
            }
            sw.innerHTML = '<svg class="wd-svg" viewBox="0 0 170 170" width="170" height="170">' +
                '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="rgba(255,255,255,.14)" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>' + ticks +
                '<path class="wd-sector" d="" fill="#fff" fill-opacity=".2"/>' +
                '<g class="wd-wheel" style="cursor:pointer"><g class="wd-turn">' +
                '<circle cx="' + C + '" cy="' + C + '" r="33" fill="none" stroke="#fff" stroke-width="9"/>' +
                '<circle cx="' + C + '" cy="' + C + '" r="28.2" fill="none" stroke="' + WB.COLORS[def.color].c + '" stroke-opacity=".28" stroke-width="1.4"/>' +
                '<path d="M' + (C - 29) + ' ' + (C - 4) + 'C' + (C - 18) + ' ' + (C - 9) + ' ' + (C - 10) + ' ' + (C - 8) + ' ' + (C - 6) + ' ' + (C - 5) + 'L' + (C - 6) + ' ' + (C + 5) + 'C' + (C - 14) + ' ' + (C + 6) + ' ' + (C - 22) + ' ' + (C + 8) + ' ' + (C - 29) + ' ' + (C + 4) + 'Z" fill="#fff"/>' +
                '<path d="M' + (C + 29) + ' ' + (C - 4) + 'C' + (C + 18) + ' ' + (C - 9) + ' ' + (C + 10) + ' ' + (C - 8) + ' ' + (C + 6) + ' ' + (C - 5) + 'L' + (C + 6) + ' ' + (C + 5) + 'C' + (C + 14) + ' ' + (C + 6) + ' ' + (C + 22) + ' ' + (C + 8) + ' ' + (C + 29) + ' ' + (C + 4) + 'Z" fill="#fff"/>' +
                '<path d="M' + (C - 5) + ' ' + (C + 5) + 'L' + (C - 4) + ' ' + (C + 30) + 'L' + (C + 4) + ' ' + (C + 30) + 'L' + (C + 5) + ' ' + (C + 5) + 'Z" fill="#fff"/>' +
                '<circle cx="' + C + '" cy="' + C + '" r="10.5" fill="#fff"/>' +
                '<circle cx="' + C + '" cy="' + C + '" r="5.6" fill="' + WB.COLORS[def.color].c + '" fill-opacity=".9"/>' +
                '<rect x="' + (C - 3.2) + '" y="' + (C - 38) + '" width="6.4" height="9" rx="3.2" fill="' + WB.COLORS[def.color].c + '"/>' +
                '</g></g>' +
                '<g class="wd-knob" style="cursor:grab"><circle r="13" fill="#fff"/><path d="M0 5.5V-5.5M-4.6 -1.2L0 -5.8L4.6 -1.2" stroke="' + WB.COLORS[def.color].c + '" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>' +
                '<div class="wd-row"><button type="button" class="wd-b" data-d="-5">−</button><b class="wd-lbl"></b><button type="button" class="wd-b" data-d="5">+</button></div>';
            var turn = sw.querySelector('.wd-turn'), sector = sw.querySelector('.wd-sector'), knob = sw.querySelector('.wd-knob'), lbl = sw.querySelector('.wd-lbl'), svg = sw.querySelector('.wd-svg');
            var setSteer = function (v) {
                v = parseFloat(v);
                if (isNaN(v)) v = 0;
                v = Math.max(-100, Math.min(100, Math.round(v / 5) * 5));
                node.vals[slotName] = v;
                var degv = v * SPAN / 100, th = degv * Math.PI / 180;
                knob.setAttribute('transform', 'translate(' + (C + R * Math.sin(th)) + ' ' + (C - R * Math.cos(th)) + ') rotate(' + degv + ')');
                turn.setAttribute('transform', 'rotate(' + degv + ' ' + C + ' ' + C + ')');            // 운전대도 같이 돈다
                sector.setAttribute('d', v === 0 ? '' : 'M' + C + ' ' + C + 'L' + C + ' ' + (C - R) + 'A' + R + ' ' + R + ' 0 0 ' + (v > 0 ? 1 : 0) + ' ' + (C + R * Math.sin(th)) + ' ' + (C - R * Math.cos(th)) + 'Z');
                lbl.textContent = steerLabel(v);
                chip.innerHTML = steerLabel(v) + ' <i>▾</i>';
                scheduleSave();
            };
            var dragDial = function (ev) {
                var r = svg.getBoundingClientRect(), sc = r.width / 170;
                var dx = ev.clientX - (r.left + C * sc), dy = ev.clientY - (r.top + C * sc);
                var deg = Math.atan2(dx, -dy) * 180 / Math.PI;            // 위쪽이 0°, 오른쪽이 +
                deg = Math.max(-SPAN, Math.min(SPAN, deg));
                setSteer(deg / SPAN * 100);
            };
            svg.addEventListener('pointerdown', function (ev) {
                if (ev.target.closest('.wd-wheel')) { setSteer(0); return; }
                ev.preventDefault(); ev.stopPropagation();
                try { svg.setPointerCapture(ev.pointerId); } catch (x) { }
                dragDial(ev);
                var mv = function (e2) { dragDial(e2); };
                var up = function () { svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); };
                svg.addEventListener('pointermove', mv); svg.addEventListener('pointerup', up);
            });
            Array.prototype.forEach.call(sw.querySelectorAll('.wd-b'), function (b) {
                b.onclick = function () { setSteer((parseFloat(node.vals[slotName]) || 0) + parseFloat(b.dataset.d)); };
            });
            setSteer(node.vals[slotName]);
            popEl.appendChild(sw);
            placePop(chip);
            return;
        }
        if (slot.kind === 'pattern') {
            var pw = el('div', 'wpatpop');
            var grid = el('div', 'wpatgrid');
            var hasColor = node.vals.c !== undefined;
            var brush = patCodeOf(node.vals.c || 'white');               // 지금 칠하는 색
            // 예전 방식('1' = 블록 전체 색)은 칸마다 색 글자로 바꿔 둔다
            var bits = String(node.vals[slotName]).split('').map(function (b) { return b === '1' ? brush : b; });
            var refresh = function () {
                node.vals[slotName] = bits.join('');
                Array.prototype.forEach.call(grid.children, function (c, i) {
                    var hx = patHex(bits[i], node);
                    c.style.background = hx || ''; c.style.boxShadow = hx ? '0 0 10px ' + hx : ''; c.classList.toggle('on', !!hx);
                });
                var mini = chip.querySelector('.wpat');
                if (mini) Array.prototype.forEach.call(mini.children, function (c, i) {
                    var hx = patHex(bits[i], node); c.className = hx ? 'on' : ''; c.style.background = hx || '';
                });
                scheduleSave();
            };
            for (var pi = 0; pi < 9; pi++) {
                (function (i) {
                    var c = el('button', 'wpc');
                    c.type = 'button';
                    // 같은 색이면 끄고, 아니면 지금 고른 색으로 칠한다 (칸마다 다른 색을 섞을 수 있다)
                    c.onclick = function () { bits[i] = bits[i] === brush ? '0' : brush; refresh(); };
                    grid.appendChild(c);
                })(pi);
            }
            var acts = el('div', 'wpatacts');
            var mk = function (label, fn) { var b = el('button', 'wopt', label); b.type = 'button'; b.onclick = fn; acts.appendChild(b); };
            mk(lang() === 'en' ? 'Clear' : '모두 끄기', function () { bits = '000000000'.split(''); refresh(); });
            mk(lang() === 'en' ? 'All on' : '모두 켜기', function () { bits = '000000000'.split('').map(function () { return brush; }); refresh(); });
            mk(lang() === 'en' ? 'Invert' : '반전', function () { bits = bits.map(function (b) { return b === '0' ? brush : '0'; }); refresh(); });
            var colorRow = null;
            if (hasColor) {
                colorRow = el('div', 'wpatcols');
                WB.LIGHT_COLORS.filter(function (c) { return c.v !== 'black'; }).forEach(function (co) {
                    var sw = el('button', 'wsw wsw-s' + (patCodeOf(co.v) === brush ? ' on' : ''));
                    sw.type = 'button'; sw.title = co[lang()] || co.ko; sw.style.background = co.hex;
                    sw.onclick = function () {
                        brush = patCodeOf(co.v); node.vals.c = co.v;           // 이제부터 이 색으로 칠한다
                        Array.prototype.forEach.call(colorRow.children, function (x) { x.classList.toggle('on', x === sw); });
                        scheduleSave();
                    };
                    colorRow.appendChild(sw);
                });
            }
            pw.appendChild(grid); if (colorRow) pw.appendChild(colorRow); pw.appendChild(acts);
            popEl.appendChild(pw);
            refresh();
            placePop(chip);
            return;
        }
        if (slot.kind === 'color') {
            var cg = el('div', 'wcolgrid');
            slot.opts.forEach(function (o) {
                var b = el('button', 'wsw' + (node.vals[slotName] === o.v ? ' on' : '') + (o.none ? ' none' : ''));
                b.type = 'button';
                b.title = o[lang()] || o.ko;
                b.style.background = o.hex;
                b.onclick = function () { node.vals[slotName] = o.v; closePop(); changed(); };
                cg.appendChild(b);
            });
            popEl.appendChild(cg);
            placePop(chip);
            return;
        }
        var list = el('div', slot.kind === 'dir' ? 'wdirs' : 'wopts');
        slot.opts.forEach(function (o) {
            var b = el('button', (slot.kind === 'dir' ? 'wdir' : 'wopt') + (node.vals[slotName] === o.v ? ' on' : ''));
            b.type = 'button';
            b.innerHTML = slot.kind === 'dir' ? '<b>' + o.glyph + '</b><span>' + (o[lang()] || o.ko) + '</span>' : (o[lang()] || o.ko);
            b.onclick = function () {
                node.vals[slotName] = o.v;
                closePop();
                changed();
            };
            list.appendChild(b);
        });
        // 소리 고르기 목록 맨 아래: 녹음하러 가기 (아이콘 모드의 마이크 버튼과 같은 역할)
        if ((node.type === 'so_play' || node.type === 'so_play_wait') && slotName === 's' && window.SoundLib) {
            var recB = el('button', 'wopt wopt-rec', '<svg viewBox="0 0 384 512" width="15" height="15" fill="currentColor" aria-hidden="true" style="vertical-align:-2px"><path d="M192 0C139 0 96 43 96 96v160c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM48 216c0-13.300-10.700-24-24-24S0 202.700 0 216v40c0 89.100 66.200 162.700 152 174.400V464h-48c-13.300 0-24 10.700-24 24s10.700 24 24 24h160c13.300 0 24-10.700 24-24s-10.700-24-24-24h-48v-33.600C317.800 418.700 384 345.100 384 256v-40c0-13.300-10.700-24-24-24s-24 10.700-24 24v40c0 70.700-57.300 128-128 128S64 326.700 64 256v-40z"/></svg> ' + (lang() === 'en' ? 'Record a sound' : '소리 녹음하기'));
            recB.type = 'button';
            recB.onclick = function () { closePop(); SoundLib.openStudio(); };
            list.appendChild(recB);
        }
        popEl.appendChild(list);
        placePop(chip);
    }

    /* ---------- 키보드 ---------- */
    document.addEventListener('keydown', function (e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            var f = locate(selectedId);
            if (f) {
                f.list.splice(f.index, 1);
                state.stacks = state.stacks.filter(function (s) { return s.blocks.length; });
                selectedId = null;
                changed();
                e.preventDefault();
            }
        }
        if (e.key === 'Escape') closePop();
    });

    /* ---------- 시작 ---------- */
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    function init() {
        load();
        renderPalette();
        renderStacks();
        centerCamera();
        // 저장된 스택이 있으면 첫 스택이 보이도록 카메라 이동
        if (state.stacks.length) {
            var s = state.stacks[0];
            var host = area.parentElement.getBoundingClientRect();
            area.style.left = Math.min(0, Math.max(host.width - 5000, -(s.x - 60))) + 'px';
            area.style.top = Math.min(0, Math.max(host.height - 5000, -(s.y - 60))) + 'px';
        }
    }

    window.addEventListener('bricksync-language-changed', function () { renderPalette(); renderStacks(); });
    window.WORD_ENGINE = {
        state: state,
        render: function () { renderPalette(); renderStacks(); },
        save: save,
        findAny: findAny,
        clear: function () { state.stacks = []; selectedId = null; changed(); },
        // 미션 시작: 하던 작업은 따로 보관해 두고, 작업 공간을 비우고, 보관 칸을 미션용 블록만 남긴다
        startMission: function (list) {
            try {
                if (state.stacks.length) {
                    localStorage.setItem(studentName() + '_before_mission_word_unit_' + unit, JSON.stringify({ stacks: state.stacks, savedAt: Date.now() }));
                }
            } catch (e) { }
            allowed = list || null;
            state.stacks = []; selectedId = null;
            closePop();
            renderPalette();
            changed();
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
