/* BrickSync 블록 아이콘 세트 (인라인 SVG)
   - 툴박스 블록의 아이콘을 새 세트로 교체. 색은 CSS 변수(--a1~--a3, --k)로 지정(블록 테마 CSS의 data-bs-cat 참조)
   - 이 파일의 <script> 태그를 제거하면 기존 아이콘으로 복귀 */
(function () {
function svg(inner){return '<svg viewBox="0 0 40 40" width="40" height="40" style="filter:drop-shadow(0 2px 0 rgba(0,0,0,.2))" fill="none" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';}
var AR='M20 8l12 12h-7v12H15V20H8z';
function arrow(rot){return '<g transform="rotate('+rot+' 20 20)"><path d="'+AR+'" fill="#fff" stroke="#fff" stroke-width="4"/><path transform="translate(20 20.5) scale(.52) translate(-20 -20)" d="'+AR+'" fill="var(--a1)" stroke="var(--a1)" stroke-width="2"/></g>';}
function teeth(){var o='';for(var a=0;a<360;a+=45)o+='<rect x="17" y="3.5" width="6" height="9" rx="2.2" transform="rotate('+a+' 20 20)"/>';return o;}
function gearBody(){return '<g fill="#fff" stroke="#fff" stroke-width="1.5">'+teeth()+'<circle cx="20" cy="20" r="12.5"/></g><circle cx="20" cy="20" r="8" fill="var(--a1)"/><circle cx="20" cy="20" r="3.5" fill="#fff"/>';}
var ICON={
 start:svg('<path d="M14 9.5L31 20 14 30.5z" fill="var(--a1)" stroke="#fff" stroke-width="6"/>'),
 wait:svg('<circle cx="10" cy="9.5" r="4.5" fill="var(--a1)"/><circle cx="30" cy="9.5" r="4.5" fill="var(--a1)"/><circle cx="20" cy="22" r="13" fill="#fff"/><circle cx="20" cy="22" r="9.5" fill="none" stroke="var(--a2)" stroke-width="2.2"/><path d="M20 15.5V22l4.5 3" stroke="var(--k)" stroke-width="3"/>'),
 repeat:svg('<path d="M9.5 19.5A10.5 10.5 0 0 1 26.5 12" stroke="var(--a1)" stroke-width="5"/><path d="M30.5 20.5A10.5 10.5 0 0 1 13.5 28" stroke="#fff" stroke-width="5"/><path d="M21.5 3.5l11.5 8.5-12.5 5z" fill="var(--a1)" stroke="var(--a1)" stroke-width="2"/><path d="M18.5 36.5L7 28l12.5-5z" fill="#fff" stroke="#fff" stroke-width="2"/>'),
 forever:svg('<path d="M20 20C17 12 6 12 6 20S17 28 20 20" stroke="#fff" stroke-width="4.5"/><path d="M20 20C23 12 34 12 34 20S23 28 20 20" stroke="var(--a1)" stroke-width="4.5"/>'),
 fwd:svg(arrow(0)),back:svg(arrow(180)),
 left:svg('<path d="M29 32V23q0-7-7-7H15" stroke="#fff" stroke-width="6.5"/><path d="M29 32V23q0-7-7-7H17" stroke="var(--a1)" stroke-width="2.6"/><path d="M16 6l-11 10 11 10z" fill="#fff" stroke="#fff" stroke-width="3"/><path d="M14 11.5L9.5 16l4.500 4.500z" fill="var(--a1)" stroke="var(--a1)" stroke-width="2"/>'),
 right:svg('<path d="M11 32V23q0-7 7-7h7" stroke="#fff" stroke-width="6.5"/><path d="M11 32V23q0-7 7-7h8" stroke="var(--a1)" stroke-width="2.6"/><path d="M24 6l11 10-11 10z" fill="#fff" stroke="#fff" stroke-width="3"/><path d="M26 11.5l4.5 4.500-4.500 4.500z" fill="var(--a1)" stroke="var(--a1)" stroke-width="2"/>'),
 gauge:svg('<path d="M6.5 29a13.5 13.5 0 0 1 5-10.5" stroke="var(--a3)" stroke-width="5.5"/><path d="M14 16.5a13.5 13.5 0 0 1 12 0" stroke="var(--a1)" stroke-width="5.5"/><path d="M28.5 18.5a13.5 13.5 0 0 1 5 10.5" stroke="#fff" stroke-width="5.5"/><path d="M20 29l5.5-8.5" stroke="#fff" stroke-width="4"/><circle cx="20" cy="29" r="4.5" fill="#fff"/><circle cx="20" cy="29" r="1.8" fill="var(--k)"/>'),
 gear:svg('<g transform="translate(20 15.500) scale(.68) translate(-20 -20)">'+gearBody()+'</g><rect x="8" y="31" width="5" height="5" rx="1.500" fill="var(--a1)" stroke="none"/><rect x="14.500" y="28.500" width="5" height="7.500" rx="1.500" fill="var(--a1)" stroke="none"/><rect x="21" y="26" width="5" height="10" rx="1.500" fill="#fff" stroke="none"/><rect x="27.500" y="23.500" width="5" height="12.500" rx="1.500" fill="#fff" stroke="none"/>'),
 cw:svg('<g transform="translate(20 22) scale(.58) translate(-20 -20)">'+gearBody()+'</g><path d="M7.5 17a13.5 13.5 0 0 1 22-7" stroke="var(--a2)" stroke-width="3.5"/><path d="M26.5 2.5l9 5.5-9.5 4z" fill="var(--a2)" stroke="var(--a2)" stroke-width="1.5"/>'),
 ccw:svg('<g transform="translate(20 22) scale(.58) translate(-20 -20)">'+gearBody()+'</g><path d="M32.5 17a13.5 13.5 0 0 0-22-7" stroke="var(--a2)" stroke-width="3.5"/><path d="M13.5 2.5l-9 5.5 9.5 4z" fill="var(--a2)" stroke="var(--a2)" stroke-width="1.5"/>'),
 stop:svg('<g transform="translate(18 18) scale(.82) translate(-20 -20)">'+gearBody()+'</g><circle cx="31" cy="31" r="8.500" fill="var(--a2)" stroke="#fff" stroke-width="2.500"/><rect x="27" y="27" width="8" height="8" rx="2" fill="#fff" stroke="none"/>'),
 mic:svg('<rect x="14" y="5" width="12" height="19" rx="6" fill="#fff"/><rect x="14" y="12" width="12" height="5" fill="var(--a1)"/><path d="M9 19a11 11 0 0 0 22 0M20 30v5M14 35h12" stroke="#fff" stroke-width="3.5"/><circle cx="6" cy="9" r="2" fill="var(--a2)" stroke="none"/><circle cx="34" cy="9" r="2" fill="var(--a3)" stroke="none"/>'),
 hand:svg('<path d="M5 12V7h5M30 7h5v5M35 28v5h-5M10 33H5v-5" stroke="#fff" stroke-width="3"/><g fill="#fff" stroke="#fff" stroke-width="1"><rect x="12" y="11" width="3.5" height="11" rx="1.75"/><rect x="16.5" y="9" width="3.5" height="13" rx="1.75"/><rect x="21" y="9.5" width="3.5" height="12.5" rx="1.75"/><rect x="25.5" y="12" width="3.5" height="10" rx="1.75"/></g><path d="M14.500 27.500L10.500 21" stroke="#fff" stroke-width="4.500"/><circle cx="20.500" cy="25" r="8" fill="#fff" stroke="none"/><circle cx="20.500" cy="25.500" r="3" fill="var(--a1)" stroke="none"/>'),
 monster:svg('<path d="M5 12V7h5M30 7h5v5M35 28v5h-5M10 33H5v-5" stroke="#fff" stroke-width="3"/><path d="M13 14l-3-6 7 3zM27 14l3-6-7 3z" fill="var(--a1)" stroke="var(--a1)" stroke-width="2"/><circle cx="20" cy="22" r="9.5" fill="var(--a3)" stroke="#fff" stroke-width="2"/><circle cx="16.5" cy="20.5" r="3" fill="#fff" stroke="none"/><circle cx="23.5" cy="20.5" r="3" fill="#fff" stroke="none"/><circle cx="16.5" cy="21" r="1.4" fill="var(--k)" stroke="none"/><circle cx="23.5" cy="21" r="1.4" fill="var(--k)" stroke="none"/><path d="M16 26.5q4 3 8 0" stroke="var(--k)" stroke-width="2"/>'),
 sound:svg('<path d="M6 16h6l8-7v22l-8-7H6z" fill="#fff" stroke="#fff" stroke-width="3"/><path d="M26 14a8 8 0 0 1 0 12" stroke="var(--a1)" stroke-width="3.5"/><path d="M30.5 9.5a14 14 0 0 1 0 21" stroke="var(--a2)" stroke-width="3.5"/>'),
 mail:svg('<rect x="4" y="12" width="28" height="21" rx="5" fill="#fff"/><path d="M7.5 18l10.500 7.500L28.500 18" stroke="var(--a2)" stroke-width="3"/><circle cx="31" cy="11" r="8.500" fill="var(--a1)" stroke="#fff" stroke-width="2.500"/><path d="M31 6v9M27.200 11.800L31 15.600l3.800-3.800" stroke="#fff" stroke-width="2.800"/>'),
 send:svg('<rect x="4" y="12" width="28" height="21" rx="5" fill="#fff"/><path d="M7.5 18l10.500 7.500L28.500 18" stroke="var(--a2)" stroke-width="3"/><circle cx="31" cy="11" r="8.500" fill="var(--a3)" stroke="#fff" stroke-width="2.500"/><path d="M31 16V7M27.200 10.200L31 6.400l3.800 3.800" stroke="#fff" stroke-width="2.800"/>'),
 dist:svg('<path d="M7 28L28 7l5 5L12 33z" fill="#fff" stroke="#fff" stroke-width="3"/><path d="M13 22l3 3M18 17l2.5 2.5M23 12l3 3" stroke="var(--a2)" stroke-width="2.5"/><path d="M9.5 30.5L7 28l5-5 2.5 2.5z" fill="var(--a1)" stroke="var(--a1)" stroke-width="1.5"/>'),
 force:svg('<path d="M20 3v11M14.5 9.5L20 15l5.5-5.5" stroke="var(--a2)" stroke-width="3.5"/><rect x="10" y="19" width="20" height="8" rx="4" fill="var(--a1)" stroke="#fff" stroke-width="2"/><rect x="5" y="29" width="30" height="7" rx="3.5" fill="#fff"/><circle cx="13" cy="32.5" r="1.6" fill="var(--k)"/><circle cx="27" cy="32.5" r="1.6" fill="var(--k)"/>'),
 tilt:svg('<g transform="rotate(-22 20 21)"><rect x="9" y="11" width="22" height="20" rx="5" fill="#fff"/><circle cx="20" cy="21" r="4.5" fill="var(--a2)"/><rect x="12" y="14" width="6" height="2.5" rx="1.2" fill="var(--a1)"/></g><path d="M31 6a14 14 0 0 1 5 9" stroke="var(--a1)" stroke-width="3.2"/><path d="M38 20l-7-2 5-5z" fill="var(--a1)" stroke="var(--a1)" stroke-width="1"/>'),
 color:svg('<path d="M20 5C11 5 5 11 5 19c0 6 4 9 8 9 3 0 3 2.5 3 4.5S18 35 21 35c9 0 14-6 14-14C35 11 29 5 20 5z" fill="#fff"/><circle cx="13" cy="17" r="3" fill="var(--a1)"/><circle cx="20" cy="12.5" r="3" fill="var(--a2)"/><circle cx="27.5" cy="17" r="3" fill="var(--a3)"/>'),
 matrix:svg('<g><rect x="6" y="6" width="8" height="8" rx="2.5" fill="var(--a1)"/><rect x="16" y="6" width="8" height="8" rx="2.5" fill="#fff"/><rect x="26" y="6" width="8" height="8" rx="2.5" fill="var(--a2)"/><rect x="6" y="16" width="8" height="8" rx="2.5" fill="#fff"/><rect x="16" y="16" width="8" height="8" rx="2.5" fill="var(--a3)"/><rect x="26" y="16" width="8" height="8" rx="2.5" fill="#fff"/><rect x="6" y="26" width="8" height="8" rx="2.5" fill="var(--a2)"/><rect x="16" y="26" width="8" height="8" rx="2.5" fill="#fff"/><rect x="26" y="26" width="8" height="8" rx="2.5" fill="var(--a1)"/></g>')
};
ICON.forceUp = svg('<path d="M20 14V4M14.5 8.5L20 3l5.5 5.5" stroke="var(--a2)" stroke-width="3.5"/><rect x="10" y="14" width="20" height="8" rx="4" fill="var(--a1)" stroke="#fff" stroke-width="2"/><rect x="14" y="22" width="3.5" height="7" rx="1.5" fill="#fff" stroke="none"/><rect x="22.5" y="22" width="3.5" height="7" rx="1.5" fill="#fff" stroke="none"/><rect x="5" y="29" width="30" height="7" rx="3.5" fill="#fff"/><circle cx="13" cy="32.5" r="1.6" fill="var(--k)"/><circle cx="27" cy="32.5" r="1.6" fill="var(--k)"/>');

ICON.gearOnly = svg(gearBody());

/* 소리 재생: 스피커 + 소리 파동 + 음표 */
ICON.sound = svg('<path d="M3.5 25h5l8-6.5v19l-8-6.5h-5z" fill="#fff" stroke="#fff" stroke-width="3"/>' +
  '<path d="M21.500 26.500a5 5 0 0 1 0 8M26 23.500a10 10 0 0 1 0 14" stroke="var(--a2)" stroke-width="3.2"/>' +
  '<circle cx="25.5" cy="13" r="5.2" fill="var(--a1)" stroke="#fff" stroke-width="2.2"/><path d="M31 13V3l6 3" stroke="#fff" stroke-width="3.4"/>');

/* 힘 센서: 스프링이 눌림(pressed) / 펴짐(released) */
var FS_BASE = '<rect x="6" y="33" width="28" height="5" rx="2.5" fill="#fff"/>';
ICON.force = svg(FS_BASE +
  '<path d="M13 33L27 30.5L13 28L27 25.5" stroke="#fff" stroke-width="2.8"/>' +
  '<rect x="8" y="19" width="24" height="6" rx="3" fill="var(--a1)" stroke="#fff" stroke-width="2"/>' +
  '<path d="M20 2v11M14.5 8.5l5.5 5.5 5.5-5.5" stroke="var(--a2)" stroke-width="4"/>' +
  '<path d="M5 21l-3-2M35 21l3-2M4 27H1.5M36 27h2.5" stroke="var(--a2)" stroke-width="2.4"/>');
ICON.forceUp = svg(FS_BASE +
  '<path d="M13 33L27 29L13 25L27 21" stroke="#fff" stroke-width="2.8"/>' +
  '<rect x="8" y="14" width="24" height="6" rx="3" fill="var(--a1)" stroke="#fff" stroke-width="2"/>' +
  '<path d="M20 11V2M15 6l5-4 5 4" stroke="var(--a2)" stroke-width="4"/>');

var MAP = {
  start: ['ev', 'start'], flow_wait: ['ev', 'wait'], event_color_sensor: ['ev', 'color'],
  event_force_sensor: ['ev', 'force'], event_distance_sensor: ['ev', 'dist'], event_tilt_sensor: ['ev', 'tilt'],
  event_message_received: ['ev', 'mail'], action_send_message: ['ev', 'send'],
  control_repeat: ['lp', 'repeat'], control_forever: ['lp', 'forever'],
  car_speed_set: ['mv', 'gauge'], car_forward: ['mv', 'fwd'], car_backward: ['mv', 'back'], car_left: ['mv', 'left'], car_right: ['mv', 'right'],
  motor_speed_set: ['mo', 'gear'], motor_cw: ['mo', 'cw'], motor_ccw: ['mo', 'ccw'], motor_stop: ['mo', 'stop'],
  event_sound_level: ['ai', 'mic'], event_ai_gesture: ['ai', 'hand'], event_ai_vision: ['ai', 'monster'], sound_play: ['ai', 'sound']
};

function sized(html, px) {
  return html.replace('width="40" height="40"', 'width="' + px + '" height="' + px + '"');
}

function mountBlock(b) {
  var m = MAP[b.getAttribute('data-action')];
  if (!m || b.getAttribute('data-bs-icon')) return;
  b.setAttribute('data-bs-cat', m[0]);
  b.setAttribute('data-bs-icon', m[1]);
  var action = b.getAttribute('data-action');

  if (action === 'control_forever') {
    var head = b.querySelector('.loop-block-head');
    var tail = b.querySelector('.loop-block-tail');
    if (head) head.innerHTML = sized(ICON.forever, 46);
    if (tail) tail.innerHTML = '<div style="position:absolute;right:6px;bottom:22px;line-height:0">' + sized(ICON.repeat, 22) + '</div>';
    return;
  }

  var iconEl = b.querySelector(':scope > .block-icon');
  if (!iconEl) iconEl = Array.prototype.find.call(b.children, function (x) { return !x.classList.contains('block-param'); });
  if (!iconEl) return;

  /* 속도 블록: 두 번째 자식(속도 막대)을 기존 JS가 실시간으로 다시 그리므로 그대로 보존 */
  if (action === 'motor_speed_set' || action === 'car_speed_set') {
    var barsEl = iconEl.children[1];
    var sp = document.createElement('div');
    sp.className = 'block-icon';
    sp.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;margin-left:0';
    var main = document.createElement('div');
    main.style.cssText = 'line-height:0';
    main.innerHTML = sized(action === 'motor_speed_set' ? ICON.gearOnly : ICON.gauge, 34);
    sp.appendChild(main);
    sp.style.transform = 'translateY(-5px)';
    if (barsEl) {
      barsEl.style.transform = 'scale(1.3)';
      barsEl.style.transformOrigin = 'center top';
      barsEl.style.marginTop = '1px';
      sp.appendChild(barsEl);
    }
    iconEl.replaceWith(sp);
    return;
  }

  /* AI 블록: 단원별로 기존 JS가 두 번째 자식의 아이콘을 글리프로 바꾸므로, 바뀐 글리프를 새 아이콘으로 변환 */
  if (action === 'event_ai_gesture') {
    var ai = document.createElement('div');
    ai.className = 'block-icon';
    ai.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;margin-left:0';
    var spacer = document.createElement('div');
    spacer.style.display = 'none';
    var slot = document.createElement('div');
    slot.style.cssText = 'line-height:0';
    slot.innerHTML = sized(ICON.hand, 46);
    ai.appendChild(spacer);
    ai.appendChild(slot);
    new MutationObserver(function () {
      var h = slot.innerHTML, key = null;
      if (h.indexOf('fa-microphone') > -1) key = 'mic';
      else if (h.indexOf('fa-dragon') > -1) key = 'monster';
      else if (h.indexOf('fa-hand-sparkles') > -1) key = 'hand';
      if (key) slot.innerHTML = sized(ICON[key], 46);
    }).observe(slot, { childList: true });
    iconEl.replaceWith(ai);
    return;
  }

  var nd = document.createElement('div');
  nd.className = 'block-icon';
  nd.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;margin-left:0';
  nd.innerHTML = sized(ICON[m[1]], 46);

  if (action === 'event_color_sensor') {
    var brick = b.querySelector('.color-brick-icon');
    if (brick) {
      brick.style.right = '-3px';
      brick.style.bottom = '-3px';
      brick.style.width = '18px';
      brick.style.height = '18px';
      brick.style.borderRadius = '50%';
      brick.style.border = '2.5px solid #fff';
      brick.style.boxShadow = '0 2px 0 rgba(0,0,0,0.2)';
      Array.prototype.forEach.call(brick.children, function (c) {
        if (!c.classList.contains('no-color-slash')) c.style.display = 'none';
      });
      nd.appendChild(brick);
    }
    b.style.paddingBottom = '0';
  }
  if (action === 'event_force_sensor') nd.style.transform = 'translateY(-6px)';
  if (action === 'sound_play') nd.style.transform = 'translateY(-4px)';
  iconEl.replaceWith(nd);
}

function apply(root) {
  Array.prototype.forEach.call((root || document).querySelectorAll('.spike-block[data-action]'), mountBlock);
}

window.BS_ICONS = {
  ICON: ICON,
  apply: apply,
  forceBlock: function (type) { return sized(type === 'pressed' ? ICON.force : ICON.forceUp, 46); },
  /* 힘 센서 선택 팝업 안의 아이콘 (팝업은 .spike-block 밖이라 색 변수를 직접 지정) */
  forcePopup: function (type) {
    return '<span style="display:block;line-height:0;--k:#8A6200;--a1:#FF6B6B;--a2:#5B8DEF;--a3:#3DBE6B">' +
      sized(type === 'pressed' ? ICON.force : ICON.forceUp, 58) + '</span>';
  }
};

apply(document);
})();
