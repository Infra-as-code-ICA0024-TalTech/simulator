/*
 * IaC concept simulator: the shared frame.
 *
 * A sim page loads assets/frame.css, assets/sims.js and this file, then calls Sim.create(def):
 *
 *   Sim.create({
 *     id: 'idempotence',                    // must match its entry in assets/sims.js
 *     size: [1200, 540],                    // drawing size (landscape), scaled to fit the stage
 *     portrait: [640, 900],                 // optional drawing size for phones / tall windows
 *     recap: {                              // shown by the (i) button; each part optional, HTML allowed
 *       remember: '...',                    //   Remember: the one-sentence takeaway
 *       mistake: '...',                     //   Common mistake
 *       simplified: '...',                  //   Simplified here: what the drawing leaves out
 *       lecture: 'Lecture 1'                //   Lecture: where the course covers it
 *     },
 *     state: function () { return {...} },  // a fresh state; called on load and on Reset
 *     init: function (sim) {},              // optional: build static elements once (sim.canvas)
 *     render: function (s, sim) {},         // draw state s; called after every change
 *     intro: { caption: '...', why: '...', code: '...', buttons: ['run'] },   // what step 0 shows
 *     steps: [                              // the trainer's story, played by Step / Auto
 *       { caption: '...', why: '...', code: '...', buttons: ['run'], run: async function (s, sim) {} },
 *     ],
 *     buttons: {                            // free buttons; steps pick which ones are visible
 *       run: { label: 'Run', caption: '...', why: '...', code: '...', run: async function (s, sim) {} },
 *     },
 *   });
 *
 * `why` (intro, steps, buttons): 1-3 plain sentences on why this matters. Lecture mode hides it behind
 * the "Why?" button beside the caption (key W; it closes on the next step); Study mode always shows it.
 * The mode is data-mode="lecture"|"study" on <html>, switched by the top-bar button or key S and
 * remembered in localStorage['iacsim-mode'].
 *
 * `sim` (passed to init, render and run) has:
 *   sim.canvas          the drawing element (absolute positioning, size sim.W x sim.H)
 *   sim.W, sim.H        current drawing size; sim.portrait is true for the portrait size
 *   sim.render()        draw now (call between animation phases inside a run)
 *   sim.wait(ms)        a Promise for animation pauses (instant during step-back replays)
 *   sim.say(caption, code, why)  change the caption, the "In code:" line and the why text; an argument
 *                       left undefined keeps what is shown (caption: also null), '' clears it
 *   sim.box(key, cls, parent)  inside render: the element for `key` (a div with class `k cls`),
 *                       created on first use (fades in), reused later (CSS transitions animate
 *                       left/top/width/height/colours), removed (fades out) when a render no
 *                       longer asks for it
 *   sim.place(el, x, y, w, h)  set left/top/width/height in drawing pixels
 *
 * Runs mutate `s` and may be async. Step back replays the steps from a fresh state, so steps
 * must be deterministic given the state. Keys: Right/Space step, Left back, R reset, A auto,
 * 1-3 the visible buttons, W why, S Lecture/Study, Esc back to all sims.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var MODE_KEY = 'iacsim-mode';
  var me = document.currentScript;
  var ASSETS = (me && me.src) ? me.src.replace(/[^\/]*$/, '') : '../assets/';
  var speed = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0.35 : 1;
  var q = /[?&]speed=([\d.]+)/.exec(location.search);
  if (q) speed = parseFloat(q[1]) || speed;

  function storedMode() {
    try { return localStorage.getItem(MODE_KEY) === 'study' ? 'study' : 'lecture'; } catch (e) { return 'lecture'; }
  }
  function getMode() { return root.dataset.mode === 'study' ? 'study' : 'lecture'; }
  function setMode(m) {
    root.dataset.mode = m;
    try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* private mode: not kept */ }
  }
  root.dataset.mode = storedMode();
  if (!document.querySelector('link[rel="icon"]')) {   // XA rose mark, inline (no favicon.ico request)
    var icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
      '<rect width="16" height="16" rx="3.5" fill="#3d496e"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="#d27079" ' +
      'stroke-width="2.4" stroke-linecap="round"/></svg>');
    document.head.appendChild(icon);
  }

  function registry() { return window.SIMS || []; }
  function nextReady(id) {
    var list = registry(), i = list.findIndex(function (x) { return x.id === id; });
    for (var j = i + 1; j < list.length; j++) if (list[j].status === 'ready') return list[j];
    return null;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var RECAP = [['remember', 'Remember'], ['mistake', 'Common mistake'], ['simplified', 'Simplified here'], ['lecture', 'Lecture']];
  function recapHtml(r) {
    return RECAP.filter(function (p) { return r[p[0]]; }).map(function (p) {
      return '<h3 class="' + p[0] + '">' + p[1] + '</h3><p>' + r[p[0]] + '</p>';
    }).join('');
  }

  function create(def) {
    var meta = registry().find(function (x) { return x.id === def.id; }) || { title: def.id };
    var steps = def.steps || [], buttons = def.buttons || {}, intro = def.intro || { caption: '' };
    var next = nextReady(def.id), recap = def.recap;
    var home = '../index.html' + (meta.group ? '#' + meta.group : '');   // back to this sim's group
    document.title = meta.title + ' · IaC concepts';
    document.body.classList.add('sim');
    document.body.insertAdjacentHTML('afterbegin',
      '<header class="topbar">' +
        '<a class="tb-home" href="' + esc(home) + '" title="All simulations (Esc)">' +
          '<img src="' + esc(ASSETS + 'logo.svg') + '" alt="eXtreme Automation: all simulations" height="26"></a>' +
        '<h1 class="tb-title">' + esc(meta.title) + '</h1>' +
        '<span class="tb-step"></span><span class="tb-spacer"></span>' +
        '<button class="tb-mode" title="Lecture or Study mode (S)">' +
          '<span data-m="lecture">Lecture</span><span data-m="study">Study</span></button>' +
        (recap ? '<button class="tb-icon tb-info" title="Recap: remember, common mistake, simplified here" aria-expanded="false">ⓘ</button>' : '') +
        (next ? '<a class="tb-next" href="' + esc(next.id) + '.html" title="Next simulation">' +
          '<span>' + esc(next.title) + ' </span>▶</a>' : '') +
      '</header>' +
      '<main class="stage"><div class="canvas"></div></main>' +
      '<footer class="bottombar">' +
        '<div class="capline">' +
          '<p class="caption" aria-live="polite"></p>' +
          '<button class="tb-why" title="Why this matters (W)" aria-expanded="false" hidden>Why?</button>' +
        '</div>' +
        '<p class="whyline" aria-live="polite" hidden></p>' +
        '<div class="controls">' +
          '<div class="actions"></div>' +
          '<div class="trainer">' +
            '<button class="btn ghost" data-t="reset" title="Reset (R)">↺ Reset</button>' +
            '<button class="btn ghost" data-t="auto" title="Auto-play (A)" aria-pressed="false">⏵ Auto</button>' +
            '<button class="btn step" data-t="step" title="Next step (→ or Space)">Step ▶</button>' +
          '</div>' +
        '</div>' +
        '<div class="codeline empty"><b>In code:</b> <code></code></div>' +
      '</footer>' +
      (recap ? '<div class="note" role="dialog" aria-label="Recap" hidden><button class="close" title="Close (Esc)">×</button>' +
        '<h2>Recap</h2>' + recapHtml(recap) + '</div>' : ''));
    var $ = function (sel) { return document.querySelector(sel); };
    var stage = $('.stage'), canvas = $('.canvas'), captionEl = $('.caption'), whyEl = $('.whyline'), whyBtn = $('.tb-why'),
        codeEl = $('.codeline'), actionsEl = $('.actions'), stepEl = $('.tb-step'), noteEl = $('.note'), modeBtn = $('.tb-mode');

    var state, idx = 0, busy = false, auto = false, gen = 0, instant = false, started = false;
    var keyed = new Map(), touched = null, currentButtons = [];
    var capTarget = null, whyTarget = '', textSeq = 0, whyOpen = false;

    var sim = {
      canvas: canvas, W: 0, H: 0, portrait: false,
      render: render,
      wait: function (ms) {
        var my = gen;
        if (instant) return my === gen ? Promise.resolve() : new Promise(function () {});
        return new Promise(function (res) { setTimeout(function () { if (my === gen) res(); }, ms * speed); });
      },
      say: say,
      box: function (key, cls, parent) {
        var el = keyed.get(key);
        if (!el) {
          el = document.createElement('div');
          el._new = !instant && started;
          (parent || canvas).appendChild(el);
          keyed.set(key, el);
          if (el._new) requestAnimationFrame(function () { requestAnimationFrame(function () { el._new = false; el.classList.remove('is-new'); }); });
        }
        el.className = 'k ' + (cls || '') + (el._new ? ' is-new' : '');
        if (touched) touched.add(key);
        return el;
      },
      place: function (el, x, y, w, h) {
        el.style.left = x + 'px'; el.style.top = y + 'px';
        if (w != null) el.style.width = w + 'px';
        if (h != null) el.style.height = h + 'px';
        return el;
      }
    };

    function render() {
      touched = new Set();
      def.render(state, sim);
      keyed.forEach(function (el, key) {
        if (touched.has(key)) return;
        keyed.delete(key);
        if (instant || !started) { el.remove(); return; }
        el.classList.add('is-gone');
        setTimeout(function () { el.remove(); }, 600);
      });
      touched = null;
    }

    /* The why line and its button follow the shown text, the mode and (Lecture) whether it was opened. */
    function updateWhy() {
      var has = whyEl.textContent !== '';
      whyBtn.hidden = !has;
      whyBtn.setAttribute('aria-expanded', String(has && whyOpen));
      whyEl.hidden = !(has && (getMode() === 'study' || whyOpen));
    }

    /* Caption and why change together after a short fade; only the latest call is applied, so a
       replay (step back) right after a step cannot be overwritten by the step's pending fade. */
    function say(caption, code, why) {
      var capChange = caption != null && caption !== capTarget;
      var whyChange = why !== undefined && (why || '') !== whyTarget;
      if (capChange) capTarget = caption;
      if (whyChange) whyTarget = why || '';
      if (capChange || whyChange) {
        var my = ++textSeq;
        var apply = function () {
          if (my !== textSeq) return;
          captionEl.textContent = capTarget == null ? '' : capTarget;
          whyEl.textContent = whyTarget;
          captionEl.classList.remove('swap'); whyEl.classList.remove('swap');
          updateWhy();
        };
        if (instant || !started) apply();
        else {
          if (capChange) captionEl.classList.add('swap');
          if (whyChange) whyEl.classList.add('swap');
          setTimeout(apply, 140);
        }
      }
      if (code !== undefined) {
        codeEl.querySelector('code').textContent = code || '';
        codeEl.classList.toggle('empty', !code);
        codeEl.title = code || '';
      }
    }

    function closeWhy() { if (whyOpen) { whyOpen = false; updateWhy(); } }
    function toggleWhy() {
      if (getMode() === 'study' || whyEl.textContent === '') return;
      whyOpen = !whyOpen; updateWhy();
    }
    function toggleMode() {
      setMode(getMode() === 'study' ? 'lecture' : 'study');
      whyOpen = false; updateWhy(); updateMode();
    }
    function updateMode() {
      var m = getMode();
      modeBtn.setAttribute('aria-label', 'Mode: ' + (m === 'study' ? 'Study' : 'Lecture') + '. Switch (S)');
    }

    function setButtons(ids) {
      currentButtons = ids || [];
      actionsEl.innerHTML = '';
      currentButtons.forEach(function (id, n) {
        var b = document.createElement('button');
        b.className = 'btn';
        b.textContent = buttons[id].label;
        b.title = (buttons[id].title || buttons[id].label) + ' (' + (n + 1) + ')';
        b.addEventListener('click', function () { b.blur(); press(id); });
        actionsEl.appendChild(b);
      });
    }

    function updateBar() {
      stepEl.textContent = 'Step ' + idx + ' / ' + steps.length;
      $('[data-t="step"]').disabled = idx >= steps.length;
      var a = $('[data-t="auto"]');
      a.setAttribute('aria-pressed', auto ? 'true' : 'false');
      a.textContent = auto ? '⏸ Pause' : '⏵ Auto';
      if (busy) root.setAttribute('data-busy', ''); else root.removeAttribute('data-busy');
      root.setAttribute('data-step', String(idx));
    }

    function run(fn) {
      var my = gen;
      busy = true; updateBar();
      function done() { if (my !== gen) return; busy = false; render(); updateBar(); }
      return Promise.resolve()
        .then(function () { return fn ? fn(state, sim) : null; })
        .then(done, function (err) { done(); console.error(err); });
    }

    function stepForward() {
      if (busy || idx >= steps.length) return Promise.resolve();
      var st = steps[idx++];
      closeWhy();
      say(st.caption, st.code, st.why || '');
      if (st.buttons) setButtons(st.buttons);
      return run(st.run);
    }

    function shownAfter(k) {
      var b = intro.buttons || [];
      for (var i = 0; i < k; i++) if (steps[i].buttons) b = steps[i].buttons;
      var src = k ? steps[k - 1] : intro;
      return { caption: src.caption, code: src.code || '', why: src.why || '', buttons: b };
    }

    /* Start again from a fresh state and apply the first k steps without animation. */
    function replay(k) {
      var my = ++gen;
      auto = false; busy = true; instant = true; idx = 0;
      whyOpen = false;
      root.classList.add('instant');
      state = def.state();
      var p = Promise.resolve();
      steps.slice(0, k).forEach(function (st) {
        p = p.then(function () { if (my !== gen) return; idx++; return st.run && st.run(state, sim); });
      });
      return p.then(function () {
        if (my !== gen) return;
        render();
        var shown = shownAfter(k);
        say(shown.caption, shown.code, shown.why); setButtons(shown.buttons);
        updateWhy();
        void canvas.offsetWidth;
        instant = false; busy = false; started = true;
        requestAnimationFrame(function () { if (!instant) root.classList.remove('instant'); });
        updateBar();
      }).catch(function (err) { console.error(err); });
    }

    function press(id) {
      if (busy || !buttons[id]) return;
      stopAuto();
      var b = buttons[id];
      // a button with its own caption also brings its own why (none = cleared)
      var why = b.caption != null ? (b.why || '') : b.why;
      if (b.caption != null || b.code !== undefined || why !== undefined) say(b.caption, b.code, why);
      run(b.run);
    }
    function stopAuto() { if (auto) { auto = false; updateBar(); } }
    function autoLoop() {
      var my = gen;
      if (!auto || my !== gen) return;
      if (idx >= steps.length) { auto = false; updateBar(); return; }
      stepForward().then(function () {
        setTimeout(function () { if (auto && my === gen) autoLoop(); }, (def.autoDelay || 2600) * speed);
      });
    }
    function toggleAuto() {
      auto = !auto; updateBar();
      if (auto) { if (idx >= steps.length) replay(0).then(function () { auto = true; updateBar(); autoLoop(); }); else autoLoop(); }
    }

    /* Fit the drawing into the stage. On narrow screens the stage takes the drawing's height. */
    function layout() {
      var narrow = window.innerWidth < 700;
      var sw = stage.clientWidth;
      var tall = narrow || stage.clientWidth < stage.clientHeight;
      var size = (tall && def.portrait) ? def.portrait : (def.size || [1200, 540]);
      var sh;
      if (narrow) { sh = Math.round(sw * size[1] / size[0]); stage.style.height = sh + 'px'; }
      else { stage.style.height = ''; sh = stage.clientHeight; }
      var k = Math.min(sw / size[0], sh / size[1]);
      canvas.style.width = size[0] + 'px'; canvas.style.height = size[1] + 'px';
      canvas.style.transform = 'translate(' + ((sw - size[0] * k) / 2) + 'px,' + ((sh - size[1] * k) / 2) + 'px) scale(' + k + ')';
      if (size[0] !== sim.W || size[1] !== sim.H) {
        sim.W = size[0]; sim.H = size[1]; sim.portrait = size === def.portrait;
        if (started) { root.classList.add('instant'); render(); void canvas.offsetWidth; requestAnimationFrame(function () { if (!instant) root.classList.remove('instant'); }); }
      }
    }

    // wiring
    $('[data-t="step"]').addEventListener('click', function (e) { e.currentTarget.blur(); stopAuto(); stepForward(); });
    $('[data-t="reset"]').addEventListener('click', function (e) { e.currentTarget.blur(); replay(0); });
    $('[data-t="auto"]').addEventListener('click', function (e) { e.currentTarget.blur(); toggleAuto(); });
    whyBtn.addEventListener('click', function (e) { e.currentTarget.blur(); toggleWhy(); });
    modeBtn.addEventListener('click', function (e) { e.currentTarget.blur(); toggleMode(); });
    function toggleNote(open) {
      if (!noteEl) return;
      noteEl.hidden = open === undefined ? !noteEl.hidden : !open;
      $('.tb-info').setAttribute('aria-expanded', String(!noteEl.hidden));
    }
    if (noteEl) {
      $('.tb-info').addEventListener('click', function (e) { e.currentTarget.blur(); toggleNote(); });
      noteEl.querySelector('.close').addEventListener('click', function () { toggleNote(false); });
    }
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'Spacebar') { e.preventDefault(); stopAuto(); stepForward(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); if (idx > 0) replay(idx - 1); }
      else if (k === 'r' || k === 'R') replay(0);
      else if (k === 'a' || k === 'A') toggleAuto();
      else if (k === 'w' || k === 'W') toggleWhy();
      else if (k === 's' || k === 'S') toggleMode();
      else if (k >= '1' && k <= '9' && currentButtons[k - 1]) press(currentButtons[k - 1]);
      else if (k === 'Escape') { if (noteEl && !noteEl.hidden) toggleNote(false); else location.href = home; }
    });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);
    window.addEventListener('resize', layout);

    updateMode();
    layout();
    if (def.init) def.init(sim);
    replay(0);
    return sim;
  }

  window.Sim = { create: create, registry: registry };
})();
