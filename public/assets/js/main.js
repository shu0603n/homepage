/* EMORISLINK – site script */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- ページ遷移（読み込み時にベールを上げ、内部リンク移動時に下ろす） ----------
  const showPage = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  if (document.readyState === 'complete') showPage();
  else window.addEventListener('load', showPage);
  setTimeout(showPage, 2500); // 読み込みが遅くても表示する
  window.addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('is-leaving'); });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || reduceMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^(mailto|tel):/.test(a.href)) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (/\.(pdf|jpg|png|mov|mp4)$/i.test(url.pathname)) return;
    e.preventDefault();
    root.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 520);
  });

  // ---------- スクロール連動（ヘッダー・進捗・パララックス） ----------
  let lastY = window.scrollY;
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    body.classList.toggle('is-scrolled', y > 40);
    body.classList.toggle('is-hidden-header', y > 300 && y > lastY && !body.classList.contains('menu-open'));
    lastY = y;

    if (!reduceMotion) {
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translateY(${(center * parseFloat(el.dataset.parallax)).toFixed(1)}px)`;
      });
    }
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---------- サービス：無限ループのカルーセル ----------
  const carousel = document.querySelector('.carousel');
  if (carousel) {
    const section = carousel.closest('.svc');
    const viewport = carousel.querySelector('.carousel__viewport');
    const track = carousel.querySelector('.carousel__track');
    const slides = [...track.children];
    const count = slides.length;
    const CLONES = 2; // 前後に複製を置き、端でも左右の見切れを保つ
    const nowEl = section.querySelector('.svc__now');
    const status = carousel.querySelector('.carousel__status');
    const fill = carousel.querySelector('.carousel__fill');
    const timer = carousel.querySelector('.carousel__timer');
    const dots = [...carousel.querySelectorAll('.carousel__dots button')];
    const AUTOPLAY = 6000;

    const makeClone = (el) => {
      const c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('tabindex', '-1');
      c.classList.add('is-clone');
      c.querySelectorAll('a, button').forEach((x) => x.setAttribute('tabindex', '-1'));
      return c;
    };
    slides.slice(-CLONES).forEach((s) => track.insertBefore(makeClone(s), track.firstChild));
    slides.slice(0, CLONES).forEach((s) => track.appendChild(makeClone(s)));
    const all = [...track.children];
    slides.forEach((s, i) => s.setAttribute('aria-label', `${i + 1} / ${count}：${s.querySelector('.svc-panel__title').textContent}`));

    let pos = 0; // 本物のスライドの番号（範囲外＝複製の位置にいる状態）
    let dragX = 0;

    const offsetFor = (p) => {
      const el = all[p + CLONES];
      return viewport.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2) + dragX;
    };
    const render = (animate) => {
      track.classList.toggle('is-anim', animate);
      track.style.transform = `translate3d(${offsetFor(pos).toFixed(1)}px,0,0)`;
      const real = ((pos % count) + count) % count;
      // 中央にあるスライドを強調（複製へ移動中は複製側を強調し、戻した後と見た目をそろえる）
      all.forEach((el, i) => el.classList.toggle('is-current', ((i - CLONES) % count + count) % count === real && Math.abs(i - CLONES - pos) < count));
      nowEl.textContent = String(real + 1).padStart(2, '0');
      fill.style.setProperty('--pos', ((real + 1) / count).toFixed(4));
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === real)));
      slides.forEach((s, i) => { s.tabIndex = i === real ? 0 : -1; });
      status.textContent = `${real + 1} / ${count}：${slides[real].querySelector('.svc-panel__title').textContent}`;
    };
    // 複製の位置で止まったら、同じ見た目の本物の位置へ瞬時に戻す（無限ループ）
    track.addEventListener('transitionend', (e) => {
      if (e.target !== track) return;
      if (pos < 0 || pos >= count) {
        pos = ((pos % count) + count) % count;
        render(false);
      }
    });

    let auto = null;
    const restartTimer = () => {
      timer.classList.remove('is-run');
      void timer.offsetWidth; // アニメーションを最初から
      if (!reduceMotion) timer.classList.add('is-run');
    };
    const go = (to, user = false) => {
      if (pos < 0 || pos >= count) { pos = ((pos % count) + count) % count; render(false); void track.offsetWidth; }
      pos = to;
      render(true);
      if (user) startAuto();
    };
    const next = (user) => go(pos + 1, user);
    const prev = (user) => go(pos - 1, user);
    function startAuto() {
      clearInterval(auto);
      if (reduceMotion) return;
      restartTimer();
      auto = setInterval(() => { next(false); restartTimer(); }, AUTOPLAY);
    }
    carousel.style.setProperty('--dur', `${AUTOPLAY}ms`);

    section.querySelector('.car-btn--next').addEventListener('click', () => next(true));
    section.querySelector('.car-btn--prev').addEventListener('click', () => prev(true));
    dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.go), true)));
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(true); }
    });

    // マウスを乗せている間・フォーカス中は自動送りを止める
    const pause = (on) => {
      carousel.classList.toggle('is-paused', on);
      if (on) clearInterval(auto);
      else startAuto();
    };
    section.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pause(true); });
    section.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pause(false); });
    section.addEventListener('focusin', () => pause(true));
    section.addEventListener('focusout', (e) => { if (!section.contains(e.relatedTarget)) pause(false); });

    // スワイプ・ドラッグで移動
    let startX = 0, startY = 0, dragging = false, moved = false;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true; moved = false; startX = e.clientX; startY = e.clientY; dragX = 0;
      clearInterval(auto);
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - startY)) { moved = true; viewport.classList.add('is-dragging'); }
      if (moved) { dragX = dx; render(false); }
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      const dx = dragX;
      dragX = 0;
      if (dx < -60) next(true);
      else if (dx > 60) prev(true);
      else { render(true); startAuto(); }
    });
    // ドラッグ後はリンクのクリックを無効にする
    viewport.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    // 画面外では自動送りを止める
    new IntersectionObserver(([en]) => { if (en.isIntersecting) startAuto(); else { clearInterval(auto); timer.classList.remove('is-run'); } }).observe(carousel);
    window.addEventListener('resize', () => render(false));
    window.addEventListener('load', () => render(false));
    render(false);
  }

  // ---------- メニュー ----------
  const menuBtn = document.querySelector('.menu-btn');
  const drawer = document.getElementById('drawer');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    drawer.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  };
  menuBtn?.addEventListener('click', () => setMenu(drawer.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer && !drawer.hidden) setMenu(false); });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // ---------- 見出しを1文字ずつに分割 ----------
  document.querySelectorAll('.split').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          let prev = null;
          [...child.textContent].forEach((c) => {
            if (!c.trim() && c !== ' ' && c !== '　') return;
            // 句読点・閉じ括弧は直前の文字とまとめ、行頭に来ないようにする（禁則）
            if (prev && /[、。，．」』）】！？!?ー〜ぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(c)) { prev.textContent += c; return; }
            const s = document.createElement('span');
            prev = s;
            s.className = 'ch';
            s.style.setProperty('--i', i++);
            s.textContent = c;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ''));
    walk(el);
    [...el.querySelectorAll('.ch')].forEach((s) => s.setAttribute('aria-hidden', 'true'));
  });
  // 読み込み直後に出す見出し
  const revealLoad = () => document.querySelectorAll('.split--load').forEach((el) => setTimeout(() => el.classList.add('is-in'), 350));
  if (root.classList.contains('is-loaded')) revealLoad();
  else window.addEventListener('load', revealLoad);
  setTimeout(revealLoad, 2600);

  // ---------- 画面に入ったら表示 ----------
  // 数字のカウントアップ：グループ内の数字はすべて0から同時に始まり、同時に出そろう
  const COUNT_DUR = 2000;
  const countFmt = (el, n) => {
    const target = parseInt(el.dataset.count, 10);
    // 西暦はそのまま、それ以外の4桁以上はカンマ区切り
    const isYear = target >= 1900 && target <= 2100;
    return isYear ? String(n) : n.toLocaleString('ja-JP');
  };
  const countUp = (els) => {
    // 数字が変わるだけで位置は動かないため、動きを減らす設定でもカウントアップする
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / COUNT_DUR);
      const e = 1 - Math.pow(1 - k, 3);
      els.forEach((el) => { el.textContent = countFmt(el, Math.round(parseInt(el.dataset.count, 10) * e)); });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // 動きを止める設定でなければ、表示前は0にしておく（HTMLには最終値が入っているのでJSなしでも正しく表示される）
  if ('IntersectionObserver' in window) {
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = '0'; });
  }
  const groupOf = (el) => el.closest('[data-count-group]');
  const targets = document.querySelectorAll('.fade, .split:not(.split--load), .reveal-img, .equation, .equation__result, [data-count-group], [data-count]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-count-group')) countUp([...el.querySelectorAll('[data-count]')]);
        else if (el.dataset.count && !groupOf(el)) countUp([el]);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    // 並んだカードは順番に表示
    document.querySelectorAll('.fade').forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('fade'));
      if (sibs.length > 1) el.style.setProperty('--d', `${sibs.indexOf(el) * 0.09}s`);
    });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }

  // ---------- ヒーロー：言葉の切り替え ----------
  const rot = document.querySelector('.rotator');
  if (rot && !reduceMotion) {
    const words = [...rot.children];
    let k = 0;
    rot.style.width = `${Math.max(...words.map((w) => w.scrollWidth)) + 32}px`;
    setInterval(() => {
      const cur = words[k];
      k = (k + 1) % words.length;
      cur.classList.remove('is-active');
      cur.classList.add('is-out');
      setTimeout(() => cur.classList.remove('is-out'), 700);
      words[k].classList.add('is-active');
    }, 2600);
  }

  // ---------- ヒーロー：人と企業がつながるネットワーク ----------
  const canvas = document.querySelector('.hero__net');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const colors = ['#ff6fb1', '#ffb36b', '#8fd65a', '#3aafb9', '#1fa0d8'];
    let w, h, dpr, nodes = [];
    const mouse = { x: -9999, y: -9999 };
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 16000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2.2 + 1.2, c: colors[Math.floor(Math.random() * colors.length)],
      }));
    };
    const LINK = 130;
    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 180) { p.x += dx * 0.012; p.y += dy * 0.012; }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(0, 73, 104, ${(1 - d / LINK) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const p = nodes[i];
        const md = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(58, 175, 185, ${(1 - md / 180) * 0.6})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([en]) => {
      const was = running;
      running = en.isIntersecting;
      if (running && !was) requestAnimationFrame(draw);
    }).observe(hero);
    requestAnimationFrame(draw);
  }

  // ---------- LINK MAP：ピン／一覧を選ぶと説明カードを切り替え ----------
  const mapCard = document.getElementById('map-card');
  if (mapCard) {
    const items = [...document.querySelectorAll('.map__item')];
    const pins = [...document.querySelectorAll('.map-pin')];
    const links = [...document.querySelectorAll('.map-link')];
    const ids = items.map((b) => b.dataset.pin);
    let current = null;
    let auto = null;
    const select = (id, fromUser) => {
      if (id === current) return;
      current = id;
      const src = items.find((b) => b.dataset.pin === id);
      items.forEach((b) => b.classList.toggle('is-active', b === src));
      pins.forEach((p) => p.classList.toggle('is-active', p.dataset.pin === id));
      // 本社以外を選んだら、本社からその拠点への線を強調
      links.forEach((l, i) => l.classList.toggle('is-active', ids[i + 1] === id));
      mapCard.classList.add('is-swap');
      setTimeout(() => {
        mapCard.style.setProperty('--c', src.style.getPropertyValue('--c'));
        mapCard.querySelector('.map-card__no').textContent = src.querySelector('.map__no').textContent;
        mapCard.querySelector('.map-card__en').textContent = src.dataset.en;
        mapCard.querySelector('.map-card__title').textContent = src.dataset.title;
        mapCard.querySelector('.map-card__text').textContent = src.dataset.text;
        const a = mapCard.querySelector('.map-card__link');
        a.href = src.dataset.href;
        a.querySelector('span').textContent = src.dataset.link;
        mapCard.classList.remove('is-swap');
      }, fromUser ? 180 : 260);
      if (fromUser && auto) { clearInterval(auto); auto = null; }
    };
    [...items, ...pins].forEach((el) => {
      el.addEventListener('click', () => select(el.dataset.pin, true));
      if (finePointer) el.addEventListener('pointerenter', () => select(el.dataset.pin, true));
    });
    select(ids[0], false);
    // 操作されるまでは、数秒ごとに順番に案内する
    if (!reduceMotion) {
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !auto && current !== null && !mapCard.dataset.touched) {
          auto = setInterval(() => select(ids[(ids.indexOf(current) + 1) % ids.length], false), 3800);
        } else if (!en.isIntersecting && auto) { clearInterval(auto); auto = null; }
      }, { threshold: 0.3 }).observe(mapCard.closest('.map'));
      mapCard.closest('.map').addEventListener('pointerdown', () => { mapCard.dataset.touched = '1'; });
    }
  }

  // ---------- 帯テキスト：スクロールの速さで加速 ----------
  const ticker = document.querySelector('.ticker__track');
  if (ticker && !reduceMotion) {
    let x = 0, prevY = window.scrollY, boost = 0, visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(ticker);
    const loop = () => {
      const y = window.scrollY;
      boost = boost * 0.9 + Math.min(40, Math.abs(y - prevY)) * 0.1;
      prevY = y;
      if (visible) {
        x -= 0.6 + boost * 0.5;
        const half = ticker.scrollWidth / 2;
        if (-x >= half) x += half;
        ticker.style.transform = `translate3d(${x}px,0,0)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------- カーソルに反応する演出（マウス操作時のみ） ----------
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    document.querySelectorAll('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  // ---------- 動画：画面外では停止（会社の実写映像はコンテンツなので、動きを減らす設定でも再生する） ----------
  document.querySelectorAll('video').forEach((video) => {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }).observe(video);
  });

  // フッター付近ではフローティングバナーを隠す
  const floating = document.querySelector('.floating-banner');
  const ctaBlock = document.querySelector('.contact-cta');
  if (floating && ctaBlock && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => floating.classList.toggle('is-hidden', en.isIntersecting || en.boundingClientRect.top < 0)).observe(ctaBlock);
  }

  // ---------- 募集ページの「応募する」から来た場合は希望職種を選択しておく ----------
  const jobParam = new URLSearchParams(location.search).get('job');
  if (jobParam) {
    const presets = {
      engineer: ['エンジニア', 'システムエンジニア職に応募します。\n'],
      coordinator: ['その他', '人材コーディネーター職に応募します。\n'],
    };
    const [jobValue, text] = presets[jobParam] || [];
    const radio = jobValue && document.querySelector(`input[name="job"][value="${jobValue}"]`);
    if (radio) {
      radio.checked = true;
      const msg = radio.form.querySelector('[name="message"]');
      if (msg && !msg.value) msg.value = text;
    }
  }

  // ---------- お問い合わせフォーム（PHP不使用：外部フォームサービスへ送信／未設定時はメール作成） ----------
  document.querySelectorAll('form[data-contact]').forEach((form) => {
    const status = form.querySelector('.form__status');
    const submit = form.querySelector('[type="submit"]');
    const agree = form.querySelector('[name="agree"]');
    const syncAgree = () => { submit.disabled = !agree.checked; };
    agree.addEventListener('change', syncAgree);
    syncAgree();

    const showStatus = (msg, ok) => {
      status.hidden = false;
      status.textContent = msg;
      status.className = `form__status ${ok ? 'is-ok' : 'is-ng'}`;
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const validate = () => {
      let firstBad = null;
      form.querySelectorAll('.form__error').forEach((el) => el.remove());
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      form.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.type === 'radio' || el.type === 'checkbox' || el.classList.contains('hp')) return;
        if (!el.checkValidity()) {
          el.setAttribute('aria-invalid', 'true');
          const msg = document.createElement('span');
          msg.className = 'form__error';
          msg.textContent = el.validity.valueMissing ? '入力してください。' : '入力内容をご確認ください。';
          el.insertAdjacentElement('afterend', msg);
          firstBad ||= el;
        }
      });
      form.querySelectorAll('fieldset[data-required]').forEach((fs) => {
        if (!fs.querySelector('input:checked')) {
          const msg = document.createElement('span');
          msg.className = 'form__error';
          msg.textContent = '選択してください。';
          fs.appendChild(msg);
          firstBad ||= fs.querySelector('input');
        }
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    const toText = (fd) => {
      const lines = [];
      for (const [k, v] of fd.entries()) {
        if (k === 'agree' || k === '_gotcha' || k === '_subject') continue;
        const label = form.querySelector(`[name="${k}"]`)?.dataset.label || k;
        lines.push(`【${label}】\n${v}\n`);
      }
      return lines.join('\n');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const fd = new FormData(form);
      if (fd.get('_gotcha')) return; // スパム対策
      const endpoint = form.dataset.endpoint;

      if (!endpoint) {
        const subject = encodeURIComponent(form.dataset.subject || 'お問い合わせ');
        const text = encodeURIComponent(toText(fd));
        window.location.href = `mailto:${form.dataset.mailto}?subject=${subject}&body=${text}`;
        showStatus('メールソフトが起動します。内容をご確認のうえ送信してください。起動しない場合は ' + form.dataset.mailto + ' までご連絡ください。', true);
        return;
      }

      submit.disabled = true;
      try {
        const res = await fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        syncAgree();
        showStatus('お問い合わせありがとうございます。内容を確認のうえ、担当者より順次ご連絡いたします。', true);
      } catch {
        submit.disabled = false;
        showStatus('送信に失敗しました。時間をおいて再度お試しいただくか、お電話にてお問い合わせください。', false);
      }
    });
  });
})();
