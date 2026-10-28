/* 翻页、分步显示、数字滚动、总览与风格切换 */
(() => {
  const THEMES = [['dark', '夜幕'], ['light', '极简白'], ['editorial', '编辑部'], ['brutal', '波普']];
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const total = slides.length;
  const bar = document.querySelector('.progress i');
  const tb = document.querySelector('.toolbar');
  const pad = n => String(n).padStart(2, '0');
  let cur = 0;

  // 章节页底部的进度格
  const dividers = slides.filter(s => s.classList.contains('divider'));
  dividers.forEach((d, di) => {
    const map = d.querySelector('.dv-map');
    if (!map) return;
    map.innerHTML = dividers.map((x, j) =>
      `<li class="${j < di ? 'done' : j === di ? 'now' : ''}"><span>${x.dataset.label.split(' ')[0]}</span></li>`).join('');
  });

  // 页脚、总览序号、入场顺序
  let label = '';
  slides.forEach((s, k) => {
    if (s.dataset.label) label = s.dataset.label;
    s.querySelectorAll('.a, .st > *, .hd > *').forEach((el, i) => el.style.setProperty('--i', i));
    const num = document.createElement('span');
    num.className = 'ov-num';
    num.textContent = k + 1;
    s.appendChild(num);
    if (s.matches('.cover, .divider, .end, .nofoot')) return;
    const ft = document.createElement('footer');
    ft.className = 'ft';
    ft.innerHTML = `<span>${label}</span><span>${pad(k + 1)} / ${pad(total)}</span>`;
    s.appendChild(ft);
  });

  // 数字从 0 滚到目标值；元素里原本的文字就是最终值
  const countUp = s => {
    s.querySelectorAll('[data-count]').forEach(el => {
      const raw = el.dataset.count;
      const target = parseFloat(raw);
      const dec = (raw.split('.')[1] || '').length;
      const fmt = v => 'sep' in el.dataset
        ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : v.toFixed(dec);
      const t0 = performance.now() + 300, dur = 1300;
      cancelAnimationFrame(el._raf);
      const tick = now => {
        const p = Math.max(0, Math.min(1, (now - t0) / dur));
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) el._raf = requestAnimationFrame(tick);
      };
      el.textContent = fmt(0);
      el._raf = requestAnimationFrame(tick);
    });
  };

  const frags = s => [...s.querySelectorAll('.frag')];
  const show = (n, revealAll = false) => {
    cur = Math.max(0, Math.min(total - 1, n));
    slides.forEach((s, k) => {
      s.classList.toggle('active', k === cur);
      s.classList.toggle('past', k < cur);
    });
    frags(slides[cur]).forEach(f => f.classList.toggle('on', revealAll));
    countUp(slides[cur]);
    bar.style.width = (cur + 1) / total * 100 + '%';
    history.replaceState(null, '', '#' + (cur + 1));
  };
  // 同一个 data-step 的 .frag 一起出现；没写 data-step 的各自一步
  const step = (f, i) => f.dataset.step ?? 'i' + i;
  const next = () => {
    const fs = frags(slides[cur]);
    const i = fs.findIndex(f => !f.classList.contains('on'));
    if (i < 0) { if (cur < total - 1) show(cur + 1); return; }
    const s = step(fs[i], i);
    fs.forEach((f, j) => { if (step(f, j) === s) f.classList.add('on'); });
  };
  const prev = () => {
    const fs = frags(slides[cur]);
    const on = fs.map((f, j) => [f, j]).filter(([f]) => f.classList.contains('on'));
    if (!on.length) { if (cur > 0) show(cur - 1, true); return; }
    const s = step(...on[on.length - 1]);
    on.forEach(([f, j]) => { if (step(f, j) === s) f.classList.remove('on'); });
  };

  const fit = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  };
  const isOverview = () => document.body.classList.contains('overview');
  const overview = on => {
    document.body.classList.toggle('overview', on);
    tb.querySelector('[data-ov]').setAttribute('aria-pressed', on);
    if (on) slides[cur].scrollIntoView({ block: 'center' });
    else fit();
  };

  const setTheme = t => {
    root.dataset.theme = t;
    tb.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
    try { localStorage.setItem('deck-theme', t); } catch (e) {}
  };

  // 工具条
  const hint = tb.querySelector('.hint');
  THEMES.forEach(([t, name], k) => {
    const b = document.createElement('button');
    b.dataset.t = t;
    b.textContent = `${k + 1} ${name}`;
    b.onclick = e => { e.stopPropagation(); setTheme(t); };
    tb.insertBefore(b, hint);
  });
  const sep = document.createElement('span');
  sep.className = 'sep';
  tb.insertBefore(sep, hint);
  const ov = document.createElement('button');
  ov.dataset.ov = '';
  ov.textContent = '总览 O';
  ov.onclick = e => { e.stopPropagation(); overview(!isOverview()); };
  tb.insertBefore(ov, hint);

  const has = t => THEMES.some(x => x[0] === t);
  let saved = null;
  try { saved = localStorage.getItem('deck-theme'); } catch (e) {}
  const q = new URLSearchParams(location.search).get('theme');
  setTheme(has(q) ? q : has(saved) ? saved : 'dark');
  show((parseInt(location.hash.slice(1), 10) || 1) - 1);
  fit();
  addEventListener('resize', () => { if (!isOverview()) fit(); });

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'o' || k === 'O') return overview(!isOverview());
    if (k === 'Escape') return overview(false);
    if (/^[1-9]$/.test(k) && THEMES[k - 1]) return setTheme(THEMES[k - 1][0]);
    if (k === 't' || k === 'T') {
      const i = THEMES.findIndex(x => x[0] === root.dataset.theme);
      return setTheme(THEMES[(i + 1) % THEMES.length][0]);
    }
    if (isOverview()) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(total - 1, true);
    else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.();
  });

  stage.addEventListener('click', e => {
    if (isOverview()) {
      const s = e.target.closest('.slide');
      if (s) { show(slides.indexOf(s), true); overview(false); }
      return;
    }
    if (getSelection().toString()) return;
    e.clientX < innerWidth * 0.3 ? prev() : next();
  });

  let x0 = null;
  addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => {
    if (x0 === null || isOverview()) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    x0 = null;
  });

  let idle;
  const wake = () => {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add('idle'), 2500);
  };
  addEventListener('mousemove', wake);
  wake();
})();
