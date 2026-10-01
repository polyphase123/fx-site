(() => {
  const FX = window.FX, I18N = window.FX_I18N;
  let APPS = (window.FX_APPS || []).slice();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pageUrl = r => `https://${FX.github}.github.io/${r}/`;
  const codeUrl = r => `https://github.com/${FX.github}/${r}`;
  const thumb = r => `thumbs/${r}.jpg`;
  const byRepo = r => APPS.find(a => a.r === r);

  /* ---------- language ---------- */
  let lang = 'en';
  try {
    const saved = localStorage.getItem('fx-lang');
    lang = saved ? (saved === 'fil' ? 'fil' : 'en') : (/^(fil|tl)\b/i.test(navigator.language || '') ? 'fil' : 'en');
  } catch (e) { lang = /^(fil|tl)\b/i.test(navigator.language || '') ? 'fil' : 'en'; }
  const T = (k, vars = {}) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
  const L = o => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[lang] ?? o.en) : o;
  const fmtMonth = d => new Date(d + 'T00:00:00').toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-PH', { month: 'short', year: 'numeric' });

  /* ---------- tags ---------- */
  function tagApp(a) {
    const s = `${a.r} ${a.t} ${a.b}`;
    a.tags = FX.tags.filter(([, re]) => re.test(s)).map(([t]) => t);
  }
  APPS.forEach(tagApp);

  /* ---------- seeded sketch boxes ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function side(x1, y1, x2, y2, r, j) {
    const n = 3 + Math.floor(r() * 2), pts = [];
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([x1 + (x2 - x1) * t + (r() - .5) * j, y1 + (y2 - y1) * t + (r() - .5) * j]); }
    pts.push([x2 + (r() - .5) * j, y2 + (r() - .5) * j]);
    return pts.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  }
  function sketchRect(w, h, seed) {
    const r = rng(seed), o = 7, j = 3.2, ov = () => (r() * 6 + 2);
    const a = [o + (r() - .5) * 4, o + (r() - .5) * 4];
    return [
      `M${(a[0] - ov()).toFixed(1)} ${a[1].toFixed(1)} ` + side(a[0], a[1], w + o, o + (r() - .5) * 4, r, j) + ` l${ov().toFixed(1)} ${(r() - .5) * 2}`,
      `M${(w + o + (r() - .5) * 3).toFixed(1)} ${(o - ov()).toFixed(1)} ` + side(w + o, o, w + o + (r() - .5) * 4, h + o, r, j) + ` l${(r() - .5) * 2} ${ov().toFixed(1)}`,
      `M${(w + o + ov()).toFixed(1)} ${(h + o + (r() - .5) * 3).toFixed(1)} ` + side(w + o, h + o, o + (r() - .5) * 3, h + o + (r() - .5) * 4, r, j) + ` l${-ov()} ${(r() - .5) * 2}`,
      `M${(o + (r() - .5) * 3).toFixed(1)} ${(h + o + ov()).toFixed(1)} ` + side(o, h + o, o + (r() - .5) * 4, o, r, j) + ` l${(r() - .5) * 2} ${-ov()}`,
    ].join(' ');
  }
  function drawSketch(el, bump = 0) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    let svg = el.querySelector(':scope > svg.sk-line');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'sk-line'); svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      el.appendChild(svg);
    }
    svg.setAttribute('viewBox', `0 0 ${w + 14} ${h + 14}`);
    svg.firstChild.setAttribute('d', sketchRect(w, h, (+el.dataset.seed || 7) + bump));
  }
  const ro = new ResizeObserver(es => es.forEach(e => drawSketch(e.target)));
  function sketchAll(root = document) { $$('.sk', root).forEach(el => { drawSketch(el); ro.observe(el); }); }
  function wiggle(el) {
    if (reduce) return;
    let k = 0; const id = setInterval(() => { drawSketch(el, ++k * 97); if (k > 2) { clearInterval(id); drawSketch(el); } }, 90);
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.cat, .note, .svc');
    if (el && !el.contains(e.relatedTarget)) wiggle(el);
  });

  /* image with graceful fallback (thumbnail missing → hand-lettered placeholder) */
  window.fxImgFail = img => { img.parentElement.classList.add('noimg'); img.remove(); };
  const img = (r, cls = 'th', alt = '') => `<span class="${cls}"><img src="${thumb(r)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="fxImgFail(this)"><span class="ph" aria-hidden="true">${esc((byRepo(r)?.t || r).slice(0, 18))}</span></span>`;

  /* ---------- stats ---------- */
  function renderStats() {
    const dates = APPS.map(a => a.d).sort();
    const first = new Date(dates[0]), last = new Date(dates[dates.length - 1]);
    const weeks = Math.max(1, (last - first) / 6048e5);
    const months = Math.round((last - first) / 2629.8e6) + 1;
    const items = [
      [APPS.length, T('stat.apps')], [(APPS.length / weeks).toFixed(1), T('stat.pace')], [months, T('stat.span')],
      ['6,433', T('stat.views')], ['3,886', T('stat.followers')], ['7', T('stat.gea')],
    ];
    $('#stats').innerHTML = items.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join('');
    $$('.nApps').forEach(el => el.textContent = APPS.length);
  }

  /* ---------- spotlight ---------- */
  let spotI = 0, spotTimer = 0;
  const spots = FX.spot.filter(s => byRepo(s.r));
  function renderSpot() {
    const s = spots[spotI], a = byRepo(s.r);
    $('#spotIn').innerHTML = `
      <a class="spot-img" href="${pageUrl(a.r)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img(a.r, 'th big', a.t)}</a>
      <div class="spot-txt">
        <span class="spot-k">✶ ${String(spotI + 1).padStart(2, '0')} / ${String(spots.length).padStart(2, '0')} · ${fmtMonth(a.d)}</span>
        <h3>${esc(a.t)}</h3>
        <p>${esc(L(s.why))}</p>
        <div class="spot-acts"><a class="big-link" href="${pageUrl(a.r)}" target="_blank" rel="noopener">[${T('spot.open')}]</a><a class="small-link" href="${codeUrl(a.r)}" target="_blank" rel="noopener">${T('spot.code')}</a></div>
      </div>`;
    $('#spotDots').innerHTML = spots.map((_, i) => `<button type="button" class="dot${i === spotI ? ' on' : ''}" data-i="${i}" aria-label="Featured ${i + 1}"></button>`).join('');
  }
  function go(i) { spotI = (i + spots.length) % spots.length; renderSpot(); }
  let spotTouched = false, spotVisible = true;
  function auto(on) {
    clearInterval(spotTimer);
    if (on === false) spotTouched = true;
    if (!spotTouched && spotVisible && !reduce && !document.hidden) spotTimer = setInterval(() => go(spotI + 1), 7000);
  }
  new IntersectionObserver(es => { spotVisible = es[0].isIntersecting; auto(); }, { threshold: .25 }).observe($('#spot'));
  document.addEventListener('visibilitychange', () => auto());
  $('#spotPrev').onclick = () => { go(spotI - 1); auto(false); };
  $('#spotNext').onclick = () => { go(spotI + 1); auto(false); };
  $('#spotDots').onclick = e => { const b = e.target.closest('.dot'); if (b) { go(+b.dataset.i); auto(false); } };
  $('#spot').addEventListener('mouseenter', () => auto(false));
  $('#spot').addEventListener('focusin', () => auto(false));
  let sx = null;
  $('#spot').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  $('#spot').addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { go(spotI + (dx < 0 ? 1 : -1)); auto(false); } sx = null; }, { passive: true });

  /* ---------- tags chips ---------- */
  function renderChips() {
    const counts = FX.tags.map(([t]) => [t, APPS.filter(a => a.tags.includes(t)).length]).filter(([, n]) => n > 1);
    $('#chips').innerHTML = counts.map(([t, n]) => `<button type="button" class="chip" data-tag="${t}">#${t} <small>${n}</small></button>`).join('');
  }
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) openList({ tag: b.dataset.tag }, b); });

  /* ---------- drawers ---------- */
  function cats() { return APPS.some(a => a.c === 'new') ? [...FX.cats, FX.newCat] : FX.cats; }
  function renderCats() {
    $('#cats').innerHTML = cats().map((c, i) => {
      const n = APPS.filter(a => a.c === c.id).length, nm = L(c.nm);
      return `<button class="cat sk${c.id === 'new' ? ' is-new' : ''}" data-seed="${21 + i * 13}" data-cat="${c.id}" aria-label="${nm.join(' ')}, ${n} ${T('cat.apps')}">
        <span class="mk ${c.shape}" aria-hidden="true"></span><span class="nm">${nm.join('<br>')}</span><span class="ct">${n} ${T('cat.apps')}</span></button>`;
    }).join('');
    sketchAll($('#cats'));
  }
  $('#cats').addEventListener('click', e => { const b = e.target.closest('.cat'); if (b) openList({ cat: b.dataset.cat }, b); });

  /* ---------- timeline ---------- */
  let pick = null;
  function renderTimeline() {
    const sorted = APPS.slice().sort((a, b) => a.d.localeCompare(b.d));
    const start = new Date(sorted[0].d.slice(0, 7) + '-01T00:00:00'), end = new Date(sorted[sorted.length - 1].d.slice(0, 7) + '-01T00:00:00');
    const months = [];
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) months.push(d.toISOString().slice(0, 7));
    const shapeOf = Object.fromEntries([...FX.cats, FX.newCat].map(c => [c.id, c.shape]));
    $('#tlChart').innerHTML = months.map(m => {
      const list = sorted.filter(a => a.d.startsWith(m));
      const lbl = new Date(m + '-01T00:00:00').toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-PH', { month: 'short' });
      const yr = m.endsWith('-01') || m === months[0] ? `<em>${m.slice(0, 4)}</em>` : '';
      return `<div class="tl-col"><div class="tl-stack">${list.map(a => `<button type="button" class="dotbtn${pick === a.r ? ' on' : ''}" data-r="${a.r}" aria-label="${esc(a.t)}, ${fmtMonth(a.d)}"><span class="mk ${shapeOf[a.c]}"></span></button>`).join('')}</div><span class="tl-n">${list.length || ''}</span><span class="tl-m">${lbl}${yr}</span></div>`;
    }).join('');
    $('#tlSub').textContent = T('tl.sub', { n: APPS.length, a: fmtMonth(sorted[0].d), b: fmtMonth(sorted[sorted.length - 1].d) });
    $('#tlLegend').innerHTML = cats().map(c => `<span><span class="mk ${c.shape}" aria-hidden="true"></span>${L(c.nm).join(' ').replace('- ', '')}</span>`).join('');
    if (!pick) pick = sorted[sorted.length - 1].r;
    showPick(pick);
    const sc = $('.tl-scroll'); sc.scrollLeft = sc.scrollWidth;
  }
  function showPick(r) {
    pick = r; const a = byRepo(r); if (!a) return;
    $$('#tlChart .dotbtn').forEach(b => { const on = b.dataset.r === r; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('#tlPick').innerHTML = `${img(a.r, 'th sm', a.t)}<div class="tp-t"><span class="d">${fmtMonth(a.d)}</span><h4><a href="${pageUrl(a.r)}" target="_blank" rel="noopener">${esc(a.t)}</a></h4><p>${esc(a.b)}</p><div class="acts"><a href="${pageUrl(a.r)}" target="_blank" rel="noopener">${T('app.open')}</a><a href="${codeUrl(a.r)}" target="_blank" rel="noopener">${T('app.code')}</a></div></div>`;
  }
  $('#tlChart').addEventListener('click', e => { const b = e.target.closest('.dotbtn'); if (b) showPick(b.dataset.r); });

  /* ---------- notes ---------- */
  function renderNotes() {
    $('#notesGrid').innerHTML = FX.notes.map((n, i) => {
      const href = n.r ? pageUrl(n.r) : n.href;
      const media = n.video
        ? `<span class="th vid"><video src="${n.video}" muted loop playsinline autoplay preload="metadata" onerror="this.parentElement.remove()"></video></span>`
        : (n.r ? img(n.r, 'th', n.t) : '');
      return `<a class="note sk" data-seed="${70 + i * 5}" href="${href}" target="_blank" rel="noopener">${media}
        <span class="when"><span>${n.when}</span><span>${n.stat}</span></span>
        <h3>${esc(n.t)}</h3><p>${esc(L(n.b))}</p><span class="go">${n.r ? T('notes.app') : T('notes.post')} ↗</span></a>`;
    }).join('');
    // a video that never loads (file not added yet) leaves no empty box
    $$('#notesGrid video').forEach(v => {
      v.addEventListener('error', () => v.parentElement && v.parentElement.remove());
    });
    sketchAll($('#notesGrid'));
  }

  /* ---------- cases ---------- */
  function renderCases() {
    $('#casesList').innerHTML = FX.cases.map((c, i) => `
      <article class="case">
        <div class="case-head"><span class="case-n">${['I', 'II', 'III'][i]}.</span><div><h3>${esc(c.t)}</h3><span class="case-meta">${esc(c.meta)}</span></div></div>
        <div class="case-body">
          <a class="case-img sk" data-seed="${120 + i * 7}" href="${pageUrl(c.r)}" target="_blank" rel="noopener" aria-label="${esc(c.t)}">${img(c.r, 'th', c.t)}</a>
          <dl>${L(c.rows).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        </div>
        <a class="big-link" href="${pageUrl(c.r)}" target="_blank" rel="noopener">${T('cases.open')}</a>
      </article>`).join('');
    sketchAll($('#casesList'));
  }

  /* ---------- services ---------- */
  function renderServices() {
    $('#services').innerHTML = FX.services.map((s, i) => `<div class="svc sk" data-seed="${150 + i * 9}"><h3>${esc(L(s.t))}</h3><p>${esc(L(s.b))}</p></div>`).join('');
    sketchAll($('#services'));
  }

  /* ---------- modal list ---------- */
  const modal = $('#modal'), list = $('#mList'), q = $('#q');
  let current = null, lastFocus = null;
  function matches(a) {
    if (current.cat && current.cat !== 'all' && a.c !== current.cat) return false;
    if (current.tag && !a.tags.includes(current.tag)) return false;
    const term = q.value.trim().toLowerCase();
    return !term || `${a.t} ${a.b} ${a.r} ${a.tags.join(' ')}`.toLowerCase().includes(term);
  }
  function renderList() {
    const items = APPS.filter(matches).sort((a, b) => (b.f - a.f) || b.d.localeCompare(a.d));
    list.innerHTML = items.length ? items.map(a => `<article class="app">
        <a class="app-img" href="${pageUrl(a.r)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img(a.r, 'th', '')}</a>
        <div class="app-txt">
          <div class="top"><h4><a href="${pageUrl(a.r)}" target="_blank" rel="noopener">${esc(a.t)}</a>${a.f ? ' <span class="star" title="Featured">✶</span>' : ''}${a.c === 'new' ? ` <span class="newb">${T('app.new')}</span>` : ''}</h4><span class="d">${fmtMonth(a.d)}</span></div>
          <p>${esc(a.b)}</p>
          <div class="acts"><a href="${pageUrl(a.r)}" target="_blank" rel="noopener">${T('app.open')}</a><a href="${codeUrl(a.r)}" target="_blank" rel="noopener">${T('app.code')}</a>${a.tags.slice(0, 3).map(t => `<span class="mini">#${t}</span>`).join('')}</div>
        </div></article>`).join('')
      : `<p class="empty">${esc(T('empty', { q: q.value }))}</p>`;
  }
  function openList(sel, opener, term = '') {
    current = sel; lastFocus = opener || document.activeElement;
    if (sel.cat && sel.cat !== 'all') {
      const c = cats().find(c => c.id === sel.cat);
      $('#mTitle').textContent = L(c.nm).join(' ').replace('- ', '');
      $('#mLead').textContent = L(c.lead);
      $('#qLabel').textContent = T('filter.drawer');
    } else if (sel.tag) {
      $('#mTitle').textContent = '#' + sel.tag;
      $('#mLead').textContent = T('tag.lead', { t: sel.tag });
      $('#qLabel').textContent = T('filter.drawer');
    } else {
      $('#mTitle').textContent = T('all.title');
      $('#mLead').textContent = T('all.lead');
      $('#qLabel').textContent = T('filter.all');
    }
    q.value = term; renderList();
    if (modal.hidden) {
      lockScroll(true);
      try { history.pushState({ fxModal: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }
    modal.hidden = false;
    requestAnimationFrame(() => { modal.classList.add('open'); list.scrollTop = 0; $('#mClose').focus({ preventScroll: true }); });
  }
  let pushed = false, savedY = 0;
  function lockScroll(on) {
    const b = document.body;
    if (on) { savedY = scrollY; b.style.top = `-${savedY}px`; b.classList.add('locked'); }
    else { b.classList.remove('locked'); b.style.top = ''; scrollTo({ top: savedY, behavior: 'instant' }); }
  }
  window.addEventListener('popstate', () => { if (!modal.hidden) { pushed = false; closeModal(true); } });
  function closeModal(fromPop) {
    if (modal.hidden) return;
    if (!fromPop && pushed) { pushed = false; history.back(); return; }
    modal.classList.remove('open'); lockScroll(false);
    setTimeout(() => { modal.hidden = true; }, reduce ? 0 : 200);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $('#mClose').addEventListener('click', () => closeModal());
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = $$('button, input, a[href]:not([tabindex="-1"])', modal);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  q.addEventListener('input', renderList);
  $('#allForm').addEventListener('submit', e => { e.preventDefault(); openList({ cat: 'all' }, $('#allQ'), $('#allQ').value.trim()); });
  $('#randBtn').addEventListener('click', () => {
    const a = APPS[Math.floor(Math.random() * APPS.length)];
    pick = a.r; showPick(a.r);
    $('.tl').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const dot = $(`#tlChart .dotbtn[data-r="${CSS.escape(a.r)}"]`);
    if (dot) dot.scrollIntoView({ block: 'nearest', inline: 'center' });
  });

  /* ---------- language apply ---------- */
  function applyLang() {
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n; if (!(k in I18N.en)) return;
      el.innerHTML = T(k, { n: APPS.length });
    });
    $('#langBtn').innerHTML = lang === 'en' ? '[<b>EN</b> | FIL]' : '[EN | <b>FIL</b>]';
    $('#langBtn').setAttribute('aria-label', lang === 'en' ? 'Lumipat sa Filipino' : 'Switch to English');
    $('#humBtn').textContent = T(humOn ? 'hum.on' : 'hum.off');
    renderStats(); renderSpot(); renderChips(); renderCats(); renderTimeline(); renderNotes(); renderCases(); renderServices();
    if (!modal.hidden && current) openList(current, lastFocus, q.value);
  }
  $('#langBtn').addEventListener('click', () => {
    lang = lang === 'en' ? 'fil' : 'en';
    try { localStorage.setItem('fx-lang', lang); } catch (e) {}
    applyLang();
  });

  /* ---------- hum (Web Audio, starts only on tap) ---------- */
  let humOn = false, actx = null, master = null;
  function startHum() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
      // 60 Hz mains: phone speakers can't reproduce the fundamental, so its harmonics carry the sound
      [[60, .5], [120, .35], [180, .18], [240, .08], [300, .04]].forEach(([f, g]) => {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = 'sine'; o.frequency.value = f; gn.gain.value = g; o.connect(gn).connect(master); o.start();
      });
    }
    actx.resume();
    const t = actx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(.06, t + .6);
  }
  function stopHum() {
    if (!actx) return;
    const t = actx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + .4);
    setTimeout(() => { if (!humOn) actx.suspend(); }, 500);
  }
  $('#humBtn').addEventListener('click', () => {
    humOn = !humOn;
    try { humOn ? startHum() : stopHum(); } catch (e) { humOn = false; }
    $('#humBtn').setAttribute('aria-pressed', humOn);
    $('#humBtn').textContent = T(humOn ? 'hum.on' : 'hum.off');
  });
  document.addEventListener('visibilitychange', () => { if (actx) { if (document.hidden) actx.suspend(); else if (humOn) actx.resume(); } });

  /* ---------- active nav ---------- */
  const navLinks = $$('.nav a');
  const secFor = { work: 'work', notes: 'work', cases: 'cases', hire: 'hire', about: 'about' };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const key = secFor[e.target.id];
    navLinks.forEach(a => a.classList.toggle('on', !!key && a.dataset.sec === key));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'work', 'notes', 'cases', 'hire', 'about'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });

  /* ---------- three-phase chalk waveform ---------- */
  const cv = $('#phase'), ctx = cv.getContext('2d');
  let W = 0, H = 0, t0 = performance.now(), running = true, raf = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  let lastDraw = 0;
  function frame(now) {
    if (running && !reduce && now - lastDraw < 32) { raf = requestAnimationFrame(frame); return; }
    lastDraw = now;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    const c = getComputedStyle(cv.parentElement).color, mid = H * .5, amp = H * .36, cycles = W < 500 ? 1.4 : 2.2;
    const speed = humOn ? 1.6 : .9;
    ctx.strokeStyle = c; ctx.lineCap = 'round';
    ctx.globalAlpha = .18; ctx.lineWidth = 1; ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke(); ctx.setLineDash([]);
    [0, -2 * Math.PI / 3, 2 * Math.PI / 3].forEach((ph, k) => {
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass ? .08 : .2 - k * .03; ctx.lineWidth = pass ? 4 : 1.6;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const th = (x / W) * cycles * 2 * Math.PI - t * speed + ph;
          const y = mid + Math.sin(th) * amp + (pass ? 0 : Math.sin(x * .9 + k) * .6);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    if (running && !reduce) raf = requestAnimationFrame(frame);
  }
  size(); frame(performance.now());
  new ResizeObserver(() => { size(); if (reduce || !running) frame(performance.now()); }).observe(cv);
  new IntersectionObserver(es => {
    running = es[0].isIntersecting;
    cancelAnimationFrame(raf); if (running && !reduce) raf = requestAnimationFrame(frame);
  }).observe(cv);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf); if (!document.hidden && running && !reduce) raf = requestAnimationFrame(frame);
  });

  /* ---------- first paint ---------- */
  applyLang();
  sketchAll();
  auto();

  /* ---------- live GitHub check (works once hosted on the open web) ----------
     New GitHub Pages repos that aren't in data.js show up in a "Fresh off the bench" drawer. */
  (async () => {
    try {
      const known = new Set(APPS.map(a => a.r).concat(FX.skip));
      let fresh = [], cached = null;
      try { cached = JSON.parse(sessionStorage.getItem('fx-gh') || 'null'); } catch (e) {}
      if (cached && Date.now() - cached.at < 36e5) fresh = cached.list.filter(x => !known.has(x.name));
      else for (let p = 1; p <= 5; p++) {
        const r = await fetch(`https://api.github.com/users/${FX.github}/repos?per_page=100&page=${p}&sort=created`);
        if (!r.ok) return;
        const page = await r.json();
        if (!Array.isArray(page) || !page.length) break;
        fresh = fresh.concat(page.filter(x => x.has_pages && !x.fork && !known.has(x.name)));
        if (page.length < 100) break;
      }
      if (!cached || Date.now() - cached.at >= 36e5) {
        fresh = fresh.map(x => ({ name: x.name, description: x.description, created_at: x.created_at }));
        try { sessionStorage.setItem('fx-gh', JSON.stringify({ at: Date.now(), list: fresh })); } catch (e) {}
      }
      if (!fresh.length) return;
      fresh.forEach(x => {
        const a = { r: x.name, t: x.name.replace(/\.github\.io$/, '').replace(/[-_]/g, ' '), b: x.description || 'New project. Description coming soon.', c: 'new', f: 0, d: x.created_at.slice(0, 10) };
        tagApp(a); APPS.push(a);
      });
      applyLang();
    } catch (e) { /* offline or blocked: keep the saved list */ }
  })();
})();
