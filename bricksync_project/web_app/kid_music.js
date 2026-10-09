/* BrickSync 소리 1~8 : 아이들이 좋아하는 노래 8곡 (각 약 10초, 반주·드럼·울림이 있는 편곡)
 *   KidMusic.play(번호, { pan:-100~100, vol:0~100, pitch:센트 })  -> 끝나면 resolve 되는 Promise
 *   KidMusic.stop(), KidMusic.duration(번호)  (초), KidMusic.update({vol, pan})
 *   KidMusic.panControl(요소)  -> 좌우 균형을 끌어서 정하는 막대 (요소의 data-pan 에 저장)
 * 1 반짝반짝 작은 별  2 메리의 어린 양  3 환희의 송가  4 프레르 자크(돌림노래)  5 징글벨  6 저어라 노를 저어라(돌림노래)
 * 7 우주 탐험(창작)  8 신나는 달리기(창작) — 1~6번은 널리 알려진 전래·클래식 동요입니다.
 * 소리는 모두 웹오디오로 합성하며, 악기(피아노·오르골·마림바·플루트·현악기·벨·신스·드럼 등)와 울림(리버브)을 쓴다.
 */
(function () {
    'use strict';
    var ctx = null, active = [], master = null, endTimer = null, impulse = null, noiseBuf = null;

    function ac() {
        try {
            if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) { ctx = null; }
        return ctx;
    }

    /* ---------- 악보 ---------- */
    var NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function midiOf(n) {
        var m = /^([A-G])(#?)(\d)$/.exec(n);
        return m ? 12 * (parseInt(m[3], 10) + 1) + NAMES[m[1]] + (m[2] ? 1 : 0) : -1;
    }
    function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    function R(s, n) { var a = []; for (var i = 0; i < n; i++) a.push(s); return a.join(' '); }
    // 'C4:1 D4:.5 r:1 @Am:4 k:1' -> [{n,b}]
    function parse(str) {
        return String(str || '').trim().split(/\s+/).filter(Boolean).map(function (tk) {
            var p = tk.split(':'); return { n: p[0], b: parseFloat(p[1]) };
        });
    }
    var CHORD_TYPES = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] };
    function chordMidis(name, oct) {
        var m = /^([A-G])(m7|m|7)?$/.exec(name);
        if (!m) return [];
        var root = 12 * (oct + 1) + NAMES[m[1]];
        return CHORD_TYPES[m[2] || ''].map(function (i) { return root + i; });
    }

    // inst: 악기, vol: 세기, notes: 음표 / chords: 코드, style: 코드 연주 방식, oct: 코드 옥타브, offset: 시작 박(돌림노래용)
    var TUNES = {
        1: { gain: 0.78, bpm: 108, layers: [
            { inst: 'musicbox', vol: 1, notes: 'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 C5:2' },
            { inst: 'harp', vol: .55, style: 'arp', oct: 3, chords: '@C:4 @F:2 @C:2 @F:2 @C:2 @G:2 @C:2 @C:2' },
            { inst: 'piano', vol: .38, style: 'pulse', oct: 3, chords: '@C:4 @F:2 @C:2 @F:2 @C:2 @G:2 @C:2 @C:2' },
            { inst: 'drums', vol: .4, notes: R('k:2', 9) },
            { inst: 'pluckbass', vol: .7, notes: 'C2:2 C2:2 F2:2 C2:2 F2:2 C2:2 G2:2 C2:2 C2:2' },
            { inst: 'bell', vol: .4, notes: 'r:4 C6:.5 r:3.5 E6:.5 r:3.5 G6:.5 r:3 C7:1 r:.5 G6:.5' },
            { inst: 'drums', vol: .5, notes: R('x:.5', 36) }
        ] },
        2: { gain: 0.67, bpm: 144, layers: [
            { inst: 'marimba', vol: 1, notes: 'E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 C4:4' },
            { inst: 'guitar', vol: .75, style: 'strum', oct: 3, chords: '@C:8 @G:4 @C:4 @C:4 @C:4' },
            { inst: 'pluckbass', vol: .8, notes: 'C2:2 G2:2 C2:2 G2:2 G2:2 D2:2 C2:2 G2:2 C2:2 G2:2 C2:4' },
            { inst: 'drums', vol: .7, notes: R('k:1 t:1 s:1 t:1', 6) },
            { inst: 'bell', vol: .35, notes: 'r:20 C6:.5 E6:.5 G6:.5 C7:2.5' }
        ] },
        3: { gain: 0.7, bpm: 120, layers: [
            { inst: 'piano', vol: 1, notes: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 E4:1 D4:1 C4:2' },
            { inst: 'harp', vol: .6, style: 'arp', oct: 3, chords: '@C:4 @G:4 @C:4 @G:4 @G:2 @C:2' },
            { inst: 'piano', vol: .42, style: 'pulse', oct: 3, chords: '@C:4 @G:4 @C:4 @G:4 @G:2 @C:2' },
            { inst: 'pluckbass', vol: .8, notes: 'C2:2 C2:2 G2:2 G2:2 C2:2 C2:2 G2:2 G2:2 G2:2 C2:2' },
            { inst: 'drums', vol: .6, notes: R('k:2', 8) + ' k:2 o:2' },
            { inst: 'brass', vol: .5, style: 'block', oct: 3, chords: 'r:16 @C:4' },
            { inst: 'bell', vol: .4, notes: 'r:16 C6:.5 E6:.5 G6:.5 C7:2.5' }
        ] },
        4: { gain: 0.55, bpm: 144, layers: [
            { inst: 'flute', vol: 1, notes: 'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4:1 C4:1 G4:.5 A4:.5 G4:.5 F4:.5 E4:1 C4:1' },
            { inst: 'reed', vol: .75, notes: 'r:8 C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2' },
            { inst: 'bell', vol: .45, notes: 'r:16 C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1' },
            { inst: 'harp', vol: .55, style: 'arp', oct: 3, chords: '@C:8 @C:4 @F:4 @C:4 @G:4' },
            { inst: 'guitar', vol: .4, style: 'strum', oct: 3, chords: '@C:8 @C:4 @F:4 @C:4 @G:4' },
            { inst: 'pluckbass', vol: .7, notes: 'C2:4 G2:4 C2:4 F2:4 C2:4 G2:4' },
            { inst: 'drums', vol: .4, notes: R('x:1', 24) }
        ] },
        5: { gain: 0.76, bpm: 132, layers: [
            { inst: 'bell', vol: 1, notes: 'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 G4:1 G4:1 F4:1 D4:1 C4:2' },
            { inst: 'brass', vol: .5, style: 'pulse', oct: 3, chords: '@C:4 @C:4 @C:4 @C:4 @G:2 @G:2 @C:2' },
            { inst: 'guitar', vol: .55, style: 'strum', oct: 3, chords: '@C:4 @C:4 @C:4 @C:4 @G:2 @G:2 @C:2' },
            { inst: 'pluckbass', vol: .8, notes: R('C2:1 G2:1', 8) + ' G2:2 G2:2 C2:2' },
            { inst: 'drums', vol: .7, notes: R('k:1 t:1', 11) },
            { inst: 'drums', vol: .55, notes: R('x:.5', 44) }
        ] },
        6: { gain: 0.66, bpm: 144, layers: [
            { inst: 'pluck', vol: 1, notes: 'C4:1 C4:1 C4:.75 D4:.25 E4:1 E4:.75 D4:.25 E4:.75 F4:.25 G4:2 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4:.75 F4:.25 E4:.75 D4:.25 C4:2' },
            { inst: 'marimba', vol: .85, notes: 'r:6 C4:1 C4:1 C4:.75 D4:.25 E4:1 E4:.75 D4:.25 E4:.75 F4:.25 G4:2 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4:.75 F4:.25 E4:.75 D4:.25 C4:2' },
            { inst: 'harp', vol: .55, style: 'arp', oct: 3, chords: '@C:6 @C:6 @C:6 @G:3 @C:3' },
            { inst: 'piano', vol: .38, style: 'pulse', oct: 3, chords: '@C:6 @C:6 @C:6 @G:3 @C:3' },
            { inst: 'pluckbass', vol: .75, notes: 'C2:3 G2:3 C2:3 G2:3 C2:3 F2:3 G2:3 C2:3' },
            { inst: 'drums', vol: .5, notes: R('k:3', 8) },
            { inst: 'drums', vol: .4, notes: R('x:.75', 32) },
            { inst: 'bell', vol: .35, notes: 'r:22 C6:.5 G6:.5 C7:1' }
        ] },
        7: { gain: 0.5, bpm: 96, layers: [
            { inst: 'synth', vol: .7, notes: 'E5:2 G5:1 A5:1 C6:2 B5:1 A5:1 G5:2 E5:1 D5:1 E5:4' },
            { inst: 'strings', vol: .6, style: 'block', oct: 3, chords: '@Am:4 @F:4 @C:4 @G:4' },
            { inst: 'synth', vol: .35, style: 'arp', oct: 4, chords: '@Am:4 @F:4 @C:4 @G:4' },
            { inst: 'sub', vol: .9, notes: 'A1:4 F1:4 C2:4 G1:4' },
            { inst: 'bell', vol: .55, notes: 'r:2 E6:.5 r:1.5 G6:.5 r:3.5 C7:.5 r:3.5 E6:.5 r:2 G6:1' },
            { inst: 'drums', vol: .5, notes: R('k:2', 8) }
        ] },
        8: { gain: 1, bpm: 144, layers: [
            { inst: 'chip', vol: .6, notes: 'G4:.5 G4:.5 A4:.5 G4:.5 C5:1 B4:1 G4:.5 G4:.5 A4:.5 G4:.5 D5:1 C5:1 G4:.5 G4:.5 G5:.5 E5:.5 C5:.5 B4:.5 A4:1 F5:.5 F5:.5 E5:.5 C5:.5 D5:.5 C5:1.5 C5:.5 D5:.5 E5:1 G5:1 E5:1 D5:.5 C5:.5 D5:1 C5:2' },
            { inst: 'synth', vol: .45, style: 'pulse', oct: 3, chords: '@C:4 @G:4 @Am:4 @F:4 @C:4 @G:2 @C:2' },
            { inst: 'bass', vol: .85, style: 'bass', oct: 2, chords: '@C:4 @G:4 @Am:4 @F:4 @C:4 @G:2 @C:2' },
            { inst: 'drums', vol: .8, notes: R('k:1 h:.5 h:.5 s:1 h:.5 h:.5', 6) },
            { inst: 'drums', vol: .55, notes: R('r:1 c:1', 12) },
            { inst: 'bell', vol: .35, notes: 'r:22 C6:.5 E6:.5 G6:.5 C7:.5' }
        ] }
    };
    var NAME_KO = { 1: '반짝반짝 작은 별', 2: '메리의 어린 양', 3: '환희의 송가', 4: '프레르 자크', 5: '징글벨', 6: '저어라 노를 저어라', 7: '우주 탐험', 8: '신나는 달리기' };

    function layerBeats(l) {
        var s = 0; parse(l.chords || l.notes).forEach(function (x) { s += x.b; });
        return s + (l.offset || 0);
    }
    function duration(n) {
        var t = TUNES[n]; if (!t) return 0;
        var beats = 0; t.layers.forEach(function (l) { beats = Math.max(beats, layerBeats(l)); });
        return beats * 60 / t.bpm;
    }

    /* ---------- 소리 만들기 ---------- */
    function noise() {
        if (noiseBuf) return noiseBuf;
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return noiseBuf;
    }
    function reverbIR() {                     // 은은한 공간 울림
        if (impulse) return impulse;
        var len = Math.floor(ctx.sampleRate * 1.8);
        impulse = ctx.createBuffer(2, len, ctx.sampleRate);
        for (var c = 0; c < 2; c++) {
            var d = impulse.getChannelData(c);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        }
        return impulse;
    }
    function osc(type, f, t0, t1, g, dest, detune) {
        var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
        o.connect(g); g.connect(dest); o.start(t0); o.stop(t1); active.push(o); return o;
    }
    // 소리가 커졌다가(atk) 서서히 사라지는(끝 end) 크기 곡선
    function env(t0, atk, peak, end) {
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        return g;
    }
    // 길이 dur 동안 유지했다가 release 로 끝나는 곡선
    function sustain(t0, atk, peak, dur, rel) {
        var g = ctx.createGain(), e = t0 + Math.max(dur, atk + 0.05);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + atk);
        g.gain.setValueAtTime(peak, e);
        g.gain.exponentialRampToValueAtTime(0.0001, e + rel);
        return { g: g, end: e + rel };
    }
    function lp(freq, dest) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.connect(dest); return f; }
    function nburst(t0, dur, vol, ftype, freq, q, dest) {
        var src = ctx.createBufferSource(); src.buffer = noise();
        var fl = ctx.createBiquadFilter(), g = ctx.createGain();
        fl.type = ftype; fl.frequency.value = freq; fl.Q.value = q || 1;
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(fl); fl.connect(g); g.connect(dest); src.start(t0); src.stop(t0 + dur + 0.02); active.push(src);
    }

    // 악기 하나의 소리 (f: 주파수, dur: 길이(초))
    function voice(inst, f, t0, dur, vol, dest) {
        var e, k, g, o, p;
        switch (inst) {
            case 'piano': {                                             // 배음이 겹친 피아노
                var amps = [1, .46, .28, .17, .09, .05], len = Math.max(dur, .35) + .9;
                for (k = 0; k < amps.length; k++) {
                    e = t0 + len - k * .09;
                    osc('sine', f * (k + 1) * (1 + k * 0.0004), t0, e, env(t0, .004, .5 * vol * amps[k], e), dest);
                }
                nburst(t0, .035, .06 * vol, 'bandpass', 2200, .8, dest);
                break;
            }
            case 'musicbox': {                                          // 오르골/첼레스타
                e = t0 + Math.max(dur, .4) + .9;
                osc('sine', f, t0, e, env(t0, .003, .42 * vol, e), dest);
                osc('sine', f * 2.01, t0, e, env(t0, .003, .2 * vol, t0 + .8), dest);
                osc('sine', f * 4.03, t0, e, env(t0, .003, .09 * vol, t0 + .4), dest);
                osc('sine', f * 6.2, t0, t0 + .3, env(t0, .002, .04 * vol, t0 + .25), dest);
                break;
            }
            case 'marimba': {
                e = t0 + .6;
                osc('sine', f, t0, e, env(t0, .003, .6 * vol, e), dest);
                osc('sine', f * 3.93, t0, e, env(t0, .002, .2 * vol, t0 + .12), dest);
                osc('sine', f * 9.2, t0, e, env(t0, .002, .05 * vol, t0 + .05), dest);
                break;
            }
            case 'harp': case 'pluck': case 'guitar': {                 // 뜯는 현악기
                var dec = inst === 'harp' ? .9 : (inst === 'guitar' ? .55 : .5);
                e = t0 + dec;
                var fl = lp(inst === 'guitar' ? 2600 : 4200, dest);
                osc('triangle', f, t0, e, env(t0, .003, .55 * vol, e), fl);
                osc('sine', f * 2, t0, e, env(t0, .003, .22 * vol, t0 + dec * .6), fl);
                osc('sawtooth', f, t0, e, env(t0, .003, .08 * vol, t0 + .18), fl);
                break;
            }
            case 'pluckbass': case 'bass': {
                e = t0 + (inst === 'bass' ? Math.max(.18, dur * .9) : Math.min(.9, Math.max(.3, dur * .8)));
                osc('sine', f, t0, e, env(t0, .005, .6 * vol, e), dest);
                osc('triangle', f * 2, t0, e, env(t0, .005, .2 * vol, t0 + .18), dest);
                break;
            }
            case 'sub': case 'soft': {
                p = sustain(t0, .06, (inst === 'sub' ? .5 : .3) * vol, dur - .1, .2);
                osc('sine', f, t0, p.end, p.g, dest); p.g.connect(dest);
                break;
            }
            case 'flute': {                                             // 숨소리가 섞인 플루트
                p = sustain(t0, .06, .34 * vol, dur * .92, .12);
                o = osc('sine', f, t0, p.end, p.g, dest);
                var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.3; lg.gain.value = 7;
                lfo.connect(lg); lg.connect(o.detune); lfo.start(t0); lfo.stop(p.end); active.push(lfo);
                osc('sine', f * 2, t0, p.end, p.g, dest);
                nburst(t0, Math.max(.15, dur * .8), .035 * vol, 'bandpass', f * 2, 1.2, dest);
                break;
            }
            case 'reed': {                                              // 클라리넷 느낌
                p = sustain(t0, .04, .22 * vol, dur * .92, .1);
                var rf = lp(1500, dest);
                osc('square', f, t0, p.end, p.g, rf); p.g.connect(rf);
                break;
            }
            case 'strings': case 'pad': {                               // 부드러운 현악 합주
                p = sustain(t0, .3, .16 * vol, dur, .45);
                var sf = lp(1700, dest);
                osc('sawtooth', f, t0, p.end, p.g, sf, -9); osc('sawtooth', f, t0, p.end, p.g, sf, 9); osc('sawtooth', f * .5, t0, p.end, p.g, sf, 0);
                break;
            }
            case 'brass': {
                p = sustain(t0, .06, .2 * vol, dur, .25);
                var bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.connect(dest);
                bf.frequency.setValueAtTime(700, t0); bf.frequency.linearRampToValueAtTime(2600, t0 + .12);
                osc('sawtooth', f, t0, p.end, p.g, bf, -5); osc('sawtooth', f, t0, p.end, p.g, bf, 5);
                break;
            }
            case 'synth': {
                p = sustain(t0, .02, .3 * vol, dur, .3);
                var yf = ctx.createBiquadFilter(); yf.type = 'lowpass'; yf.Q.value = 3; yf.connect(dest);
                yf.frequency.setValueAtTime(5000, t0); yf.frequency.exponentialRampToValueAtTime(1300, t0 + Math.max(.3, dur));
                osc('sawtooth', f, t0, p.end, p.g, yf, -7); osc('sawtooth', f, t0, p.end, p.g, yf, 7);
                break;
            }
            case 'bell': {
                e = t0 + 1.5;
                osc('sine', f, t0, e, env(t0, .002, .4 * vol, e), dest);
                osc('sine', f * 2.76, t0, e, env(t0, .002, .17 * vol, t0 + .9), dest);
                osc('sine', f * 5.4, t0, e, env(t0, .002, .07 * vol, t0 + .35), dest);
                break;
            }
            case 'chip': {                                              // 8비트 느낌
                e = t0 + Math.max(.1, dur * .9);
                var cl = lp(5200, dest);
                osc('square', f, t0, e, env(t0, .004, .2 * vol, e), cl);
                osc('square', f * 2, t0, e, env(t0, .004, .05 * vol, e), cl, 6);
                break;
            }
            default: break;
        }
    }
    function drum(tok, t0, vol, dest) {
        var g, o;
        if (tok === 'k') {                                              // 큰북
            o = ctx.createOscillator(); g = ctx.createGain();
            o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + .13);
            g.gain.setValueAtTime(.9 * vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .3);
            o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + .32); active.push(o);
        } else if (tok === 's') {                                       // 작은북
            nburst(t0, .2, .5 * vol, 'bandpass', 1900, .7, dest);
            o = ctx.createOscillator(); g = ctx.createGain(); o.frequency.value = 185;
            g.gain.setValueAtTime(.35 * vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .12);
            o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + .14); active.push(o);
        } else if (tok === 'h') nburst(t0, .06, .22 * vol, 'highpass', 8000, 1, dest);
        else if (tok === 'o') nburst(t0, .6, .3 * vol, 'highpass', 6500, .7, dest);
        else if (tok === 'c') { nburst(t0, .05, .35 * vol, 'bandpass', 1500, .8, dest); nburst(t0 + .012, .05, .3 * vol, 'bandpass', 1500, .8, dest); nburst(t0 + .026, .16, .35 * vol, 'bandpass', 1500, .8, dest); }
        else if (tok === 't') nburst(t0, .14, .26 * vol, 'bandpass', 6200, 1.6, dest);
        else if (tok === 'x') nburst(t0, .09, .22 * vol, 'bandpass', 5200, 1.2, dest);
    }

    function stop() {
        clearTimeout(endTimer);
        active.forEach(function (s) { try { s.stop(); } catch (e) { } });
        active = [];
        if (master) { try { master.disconnect(); } catch (e) { } master = null; }
    }

    // 한 층(악기 하나)을 시간표대로 연주
    function playLayer(l, t00, spb, pitchMul, dest) {
        var toks = parse(l.chords || l.notes), t = t00 + (l.offset || 0) * spb, vol = l.vol === undefined ? 1 : l.vol;
        toks.forEach(function (tk) {
            var d = tk.b * spb;
            if (tk.n === 'r') { t += d; return; }
            if (l.inst === 'drums') { drum(tk.n, t, vol, dest); t += d; return; }
            if (tk.n.charAt(0) === '@') {
                var notes = chordMidis(tk.n.slice(1), l.oct || 3), style = l.style || 'block', i;
                if (style === 'block') notes.forEach(function (m) { voice(l.inst, hz(m) * pitchMul, t, d, vol, dest); });
                else if (style === 'strum') {
                    for (var b = 0; b < tk.b; b++) notes.forEach(function (m, j) { voice(l.inst, hz(m) * pitchMul, t + b * spb + j * .02, spb * .95, vol * .8, dest); });
                } else if (style === 'arp') {
                    var arp = notes.concat([notes[0] + 12]), idx = [0, 1, 2, 3, 2, 1];
                    for (i = 0; i < tk.b * 2; i++) voice(l.inst, hz(arp[idx[i % idx.length]]) * pitchMul, t + i * spb / 2, spb * .9, vol, dest);
                } else if (style === 'pulse') {
                    for (i = 0; i < tk.b; i++) notes.forEach(function (m) { voice(l.inst, hz(m) * pitchMul, t + (i + .5) * spb, spb * .28, vol, dest); });
                } else if (style === 'bass') {
                    var root = notes[0], fifth = notes[0] + 7;
                    for (i = 0; i < tk.b * 2; i++) voice(l.inst, hz(i % 4 === 3 ? fifth : root) * pitchMul, t + i * spb / 2, spb / 2, vol, dest);
                }
            } else {
                var m = midiOf(tk.n);
                if (m >= 0) voice(l.inst, hz(m) * pitchMul, t, d, vol, dest);
            }
            t += d;
        });
    }

    // fx: { pan:-100~100, vol:0~100, pitch:센트 }
    function play(n, fx) {
        fx = fx || {};
        var tune = TUNES[parseInt(n, 10)];
        var c = ac();
        if (!tune || !c) return Promise.resolve();
        stop();
        var saved = null; try { saved = localStorage.getItem('bricksync_volume'); } catch (e) { }
        var userVol = saved !== null && !isNaN(parseFloat(saved)) ? parseFloat(saved) : 1;
        var vol = (fx.vol === undefined ? 1 : Math.max(0, Math.min(100, fx.vol)) / 100) * userVol;
        // 연주 → 압축기 → (원음 + 울림) → 좌우 균형 → 스피커
        master = c.createGain(); master.gain.value = 0.85 * vol * (tune.gain || 1); master.__base = 0.85 * (tune.gain || 1);
        var comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
        var mix = c.createGain(), wet = c.createGain(), conv = c.createConvolver();
        conv.buffer = reverbIR(); wet.gain.value = .26;
        master.connect(comp); comp.connect(mix); comp.connect(conv); conv.connect(wet); wet.connect(mix);
        if (c.createStereoPanner) {
            var pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, (fx.pan || 0) / 100));
            mix.connect(pn); pn.connect(c.destination); master.__pan = pn;
        } else mix.connect(c.destination);
        var spb = 60 / tune.bpm, pitchMul = Math.pow(2, (fx.pitch || 0) / 1200), t00 = c.currentTime + 0.08;
        tune.layers.forEach(function (l) { playLayer(l, t00, spb, pitchMul, master); });
        var total = duration(n);
        return new Promise(function (res) { endTimer = setTimeout(res, total * 1000 + 50); });
    }

    // 재생 중인 소리의 좌우 균형/볼륨을 바로 바꾼다 (음높이는 새로 시작하는 소리부터)
    function update(fx) {
        if (!master || !fx) return;
        var saved = null; try { saved = localStorage.getItem('bricksync_volume'); } catch (e) { }
        var userVol = saved !== null && !isNaN(parseFloat(saved)) ? parseFloat(saved) : 1;
        if (fx.vol !== undefined) master.gain.value = (master.__base || 0.85) * userVol * Math.max(0, Math.min(100, fx.vol)) / 100;
        if (fx.pan !== undefined && master.__pan) master.__pan.pan.value = Math.max(-1, Math.min(1, fx.pan / 100));
    }

    /* ---------- 좌우 균형 막대 ---------- */
    // el: data-pan(-100~100)을 저장할 요소(블록의 값 칸). 반환: 팝업에 붙일 막대 DOM
    function panControl(el, onChange) {
        var en = false; try { en = localStorage.getItem('bricksync_lang') === 'en'; } catch (e) { }
        var pan = parseFloat(el.getAttribute('data-pan')); if (isNaN(pan)) pan = 0;
        var box = document.createElement('div');
        box.style.cssText = 'margin-top: 12px; padding: 8px 10px 6px; border-radius: 14px; background: rgba(255,255,255,0.18); user-select: none; -webkit-user-select: none; width: 184px; box-sizing: border-box;';
        var top = document.createElement('div');
        top.style.cssText = 'display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 6px;';
        var lt = document.createElement('span'), rt = document.createElement('span');
        top.appendChild(lt); top.appendChild(rt);
        var track = document.createElement('div');
        track.style.cssText = 'position: relative; height: 26px; touch-action: none; cursor: pointer;';
        var rail = document.createElement('div');
        rail.style.cssText = 'position: absolute; left: 4px; right: 4px; top: 10px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.4);';
        var mid = document.createElement('div');
        mid.style.cssText = 'position: absolute; left: 50%; top: 5px; width: 2px; height: 16px; margin-left: -1px; background: rgba(255,255,255,0.8); border-radius: 1px;';
        var knob = document.createElement('div');
        knob.style.cssText = 'position: absolute; top: 0; width: 26px; height: 26px; margin-left: -13px; border-radius: 50%; background: #fff; color: #5B8DEF; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 0 rgba(0,0,0,0.2); cursor: grab;';
        track.appendChild(rail); track.appendChild(mid); track.appendChild(knob);
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size: 11px; color: rgba(255,255,255,0.85); text-align: center; margin-top: 2px;';
        hint.textContent = en ? 'Drag to split left / right' : '끌어서 왼쪽 / 오른쪽 나누기';
        box.appendChild(top); box.appendChild(track); box.appendChild(hint);
        function show() {
            var rPct = Math.round(50 + pan / 2), lPct = 100 - rPct;
            lt.textContent = (en ? 'L ' : '왼쪽 ') + lPct + '%';
            rt.textContent = (en ? 'R ' : '오른쪽 ') + rPct + '%';
            knob.style.left = (4 + (track.clientWidth ? (track.clientWidth - 8) : 150) * (pan + 100) / 200) + 'px';
            knob.textContent = pan === 0 ? '' : (pan < 0 ? 'L' : 'R');
        }
        function setPan(v) {
            pan = Math.max(-100, Math.min(100, Math.round(v / 5) * 5));
            if (Math.abs(pan) <= 5) pan = 0;                       // 가운데 근처는 가운데로 붙는다
            el.setAttribute('data-pan', String(pan));
            show(); if (onChange) onChange(pan);
        }
        function fromEvent(ev) {
            var r = track.getBoundingClientRect(), w = Math.max(1, r.width - 8);
            setPan(((ev.clientX - r.left - 4) / w * 2 - 1) * 100);
        }
        track.addEventListener('pointerdown', function (ev) {
            ev.preventDefault(); ev.stopPropagation();
            try { track.setPointerCapture(ev.pointerId); } catch (e) { }
            fromEvent(ev);
            var mv = function (e2) { fromEvent(e2); };
            var up = function () { track.removeEventListener('pointermove', mv); track.removeEventListener('pointerup', up); };
            track.addEventListener('pointermove', mv); track.addEventListener('pointerup', up);
        });
        ['click', 'mousedown', 'mouseup'].forEach(function (n) { box.addEventListener(n, function (e) { e.stopPropagation(); }); });
        setTimeout(show, 0); setTimeout(show, 60);
        return box;
    }

    window.KidMusic = { play: play, update: update, stop: stop, duration: duration, names: NAME_KO, panControl: panControl, count: 8 };
})();
