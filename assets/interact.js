/* ============================================================
   interact.js — shared interactive behavior
   - per-poem like + favorite (poetry.html)
   - bookmark-page popover (footer, all pages)
   - tip coin animation + modal + wallet copy (index.html)
   ============================================================ */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = { liked:'kashiu:liked', favs:'kashiu:favs', coffee:'kashiu:coffee' };

  function getSet(k){ try{ return JSON.parse(localStorage.getItem(k) || '[]'); }catch(e){ return []; } }
  function setSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  /* deterministic pseudo base count so every poem shows a non-empty number */
  function hashCount(id){
    var h = 0;
    for (var i = 0; i < id.length; i++){ h = (h * 31 + id.charCodeAt(i)) >>> 0; }
    return 3 + (h % 37); /* 3 .. 39 */
  }

  /* ---------- copy helper ---------- */
  function copyText(text, btn){
    function done(){
      if (!btn) return;
      btn.classList.add('done');
      var target = btn.querySelector('.hint') || btn;
      var original = target.textContent;
      target.textContent = '已复制';
      setTimeout(function(){ btn.classList.remove('done'); target.textContent = original; }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
    function fallback(){
      try{
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); done();
      }catch(e){}
    }
  }

  /* ---------- per-poem like + favorite ---------- */
  var poems = document.querySelectorAll('.poem');
  if (poems.length){
    var liked = getSet(KEY.liked);
    var favs = getSet(KEY.favs);

    var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.3 2 5 5.2 5c2 0 3.3 1.1 4.1 2.2.4.5 1.4.5 1.8 0 .8-1.1 2.1-2.2 4.1-2.2 3.2 0 4.8 3.3 3.2 6.8C19.5 16.4 12 21 12 21z"/></svg>';
    var STAR  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9z"/></svg>';

    Array.prototype.forEach.call(poems, function(poem){
      var id = poem.id;
      if (!id) return;
      var base = hashCount(id);
      var isLiked = liked.indexOf(id) !== -1;
      var isFav = favs.indexOf(id) !== -1;

      var actions = document.createElement('div');
      actions.className = 'poem-actions';

      var likeBtn = document.createElement('button');
      likeBtn.type = 'button';
      likeBtn.className = 'pact like' + (isLiked ? ' is-on' : '');
      likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
      likeBtn.setAttribute('aria-label', '点赞');
      likeBtn.innerHTML = HEART + '<span class="count">' + (base + (isLiked ? 1 : 0)) + '</span>';
      likeBtn.addEventListener('click', function(){
        var on = likeBtn.classList.toggle('is-on');
        likeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var countEl = likeBtn.querySelector('.count');
        var n = parseInt(countEl.textContent, 10);
        if (on){
          liked.push(id);
          countEl.textContent = n + 1;
          popAnim(likeBtn); burstHearts(likeBtn); bump(countEl);
        } else {
          liked = liked.filter(function(x){ return x !== id; });
          countEl.textContent = n - 1;
        }
        setSet(KEY.liked, liked);
      });

      var favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'pact fav' + (isFav ? ' is-on' : '');
      favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      favBtn.setAttribute('aria-label', '收藏');
      favBtn.innerHTML = STAR;
      favBtn.addEventListener('click', function(){
        var on = favBtn.classList.toggle('is-on');
        favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on){ favs.push(id); popAnim(favBtn); }
        else { favs = favs.filter(function(x){ return x !== id; }); }
        setSet(KEY.favs, favs);
      });

      actions.appendChild(likeBtn);
      actions.appendChild(favBtn);

      var readNav = poem.querySelector('.poem-read-nav');
      if (readNav) poem.insertBefore(actions, readNav);
      else poem.appendChild(actions);
    });
  }

  function popAnim(btn){
    if (reduce) return;
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
    setTimeout(function(){ btn.classList.remove('pop'); }, 560);
  }
  function bump(el){
    if (reduce) return;
    el.style.transition = 'transform .22s var(--ease)';
    el.style.transform = 'translateY(-3px)';
    setTimeout(function(){ el.style.transform = ''; }, 240);
  }
  function burstHearts(btn){
    if (reduce) return;
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + 4;
    for (var i = 0; i < 5; i++){
      var p = document.createElement('span');
      p.className = 'particle ico';
      p.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.3 2 5 5.2 5c2 0 3.3 1.1 4.1 2.2.4.5 1.4.5 1.8 0 .8-1.1 2.1-2.2 4.1-2.2 3.2 0 4.8 3.3 3.2 6.8C19.5 16.4 12 21 12 21z"/></svg>';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      var dx = (Math.random() * 90 - 45).toFixed(0);
      var dy = (42 + Math.random() * 64).toFixed(0);
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.animation = 'floatUp ' + (0.9 + Math.random() * 0.5).toFixed(2) + 's ' + (Math.random() * 0.15).toFixed(2) + 's var(--ease) forwards';
      document.body.appendChild(p);
      (function(el){ setTimeout(function(){ el.remove(); }, 1700); })(p);
    }
  }

  /* ---------- bookmark this page ---------- */
  var bmBtns = document.querySelectorAll('.bookmark-btn');
  var bmPop = null, bmTimer = null;
  function ensureBmPop(){
    if (bmPop) return bmPop;
    bmPop = document.createElement('div');
    bmPop.className = 'bm-pop';
    bmPop.setAttribute('role', 'status');
    var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') || (navigator.userAgent || '').indexOf('Mac') !== -1;
    var mod = isMac ? '\u2318' : 'Ctrl';
    bmPop.innerHTML = '<p>\u6309 <kbd>' + mod + '</kbd> + <kbd>D</kbd> \u628a\u672c\u9875\u52a0\u5165\u4e66\u7b7e</p>' +
                      '<div class="bm-row"><button class="bm-copy" type="button">\u590d\u5236\u94fe\u63a5</button></div>';
    document.body.appendChild(bmPop);
    bmPop.querySelector('.bm-copy').addEventListener('click', function(){
      copyText(window.location.href, bmPop.querySelector('.bm-copy'));
    });
    return bmPop;
  }
  function hideBm(){ if (bmPop) bmPop.classList.remove('show'); }
  Array.prototype.forEach.call(bmBtns, function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var pop = ensureBmPop();
      var r = btn.getBoundingClientRect();
      pop.style.left = (r.left + r.width / 2) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      pop.classList.add('show');
      clearTimeout(bmTimer);
      bmTimer = setTimeout(hideBm, 6000);
    });
  });
  document.addEventListener('click', function(e){
    if (bmPop && !bmPop.contains(e.target) && !e.target.closest('.bookmark-btn')) hideBm();
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ hideBm(); } });

  /* ---------- tip: coffee counter + coin toss ---------- */
  var coffeeCountEl = document.getElementById('coffeeCount');
  if (coffeeCountEl){
    var stored = parseInt(localStorage.getItem(KEY.coffee) || '0', 10);
    coffeeCountEl.textContent = isNaN(stored) ? 0 : stored;
  }
  var coinBtn = document.getElementById('coinBtn');
  if (coinBtn){
    coinBtn.addEventListener('click', function(){
      var cur = parseInt(localStorage.getItem(KEY.coffee) || '0', 10) || 0;
      cur++;
      try{ localStorage.setItem(KEY.coffee, String(cur)); }catch(e){}
      if (coffeeCountEl){ coffeeCountEl.textContent = cur; bump(coffeeCountEl); }
      tossCoins(coinBtn);
    });
  }
  function tossCoins(btn){
    if (reduce) return;
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + 8;
    var glyphs = ['\u2615', '\uD83E\uDE99', '\u2661', '\u2728', '\uD83C\uDF6B'];
    for (var i = 0; i < 9; i++){
      var p = document.createElement('span');
      p.className = 'coin-particle';
      p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      var dx = (Math.random() * 240 - 120).toFixed(0);
      var dy = (90 + Math.random() * 150).toFixed(0);
      var rot = (Math.random() * 560 - 280).toFixed(0);
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--rot', rot + 'deg');
      p.style.animation = 'coinFly ' + (0.9 + Math.random() * 0.8).toFixed(2) + 's ' + (Math.random() * 0.12).toFixed(2) + 's ease-out forwards';
      document.body.appendChild(p);
      (function(el){ setTimeout(function(){ el.remove(); }, 2000); })(p);
    }
  }

  /* ---------- tip modal ---------- */
  var tipModal = document.getElementById('tipModal');
  var tipOpen = document.getElementById('tipOpen');
  function openTip(){
    if (!tipModal) return;
    tipModal.hidden = false;
    requestAnimationFrame(function(){ tipModal.classList.add('show'); });
    document.body.style.overflow = 'hidden';
  }
  function closeTip(){
    if (!tipModal) return;
    tipModal.classList.remove('show');
    setTimeout(function(){ if (!tipModal.classList.contains('show')) tipModal.hidden = true; }, 420);
    document.body.style.overflow = '';
  }
  if (tipOpen) tipOpen.addEventListener('click', openTip);
  if (tipModal){
    tipModal.addEventListener('click', function(e){
      if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) closeTip();
    });
  }
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closeTip(); } });

  var walletCopy = document.querySelector('.copy-btn[data-copy-target]');
  if (walletCopy){
    walletCopy.addEventListener('click', function(){
      var t = document.getElementById(walletCopy.getAttribute('data-copy-target'));
      if (t) copyText(t.textContent.trim(), walletCopy);
    });
  }
})();

/* ---------------- nav active state ---------------- */
(function(){
  var path = location.pathname.split('/').pop() || 'index.html';
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a, .menu-overlay nav a'));
  if (!links.length) return;

  function clear(){
    links.forEach(function(a){ a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
  }
  function mark(link, value){
    link.classList.add('is-active');
    link.setAttribute('aria-current', value || 'page');
  }

  var pageFor = { 'poetry.html':'04', 'hometown.html':'05', 'shelf.html':'06', 'about-me.html':'01' };
  var wanted = pageFor[path];
  if (wanted){
    links.forEach(function(a){
      var i = a.querySelector('i');
      if (i && i.textContent.trim() === wanted) mark(a);
    });
    return;
  }

  var sections = ['manifesto','ring','works','contact'].map(function(id){
    return document.getElementById(id);
  }).filter(Boolean);
  if (!sections.length) return;

  function update(){
    var line = window.innerHeight * 0.42;
    var current = null;
    sections.forEach(function(s){
      var r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = s.id;
    });
    if (!current){
      var last = sections[sections.length - 1];
      var r = last.getBoundingClientRect();
      if (r.bottom <= line) current = last.id;
    }
    clear();
    if (!current) return;
    var link = document.querySelector('.nav-links a[href="#' + current + '"], .menu-overlay nav a[href="#' + current + '"]');
    if (link) mark(link, 'true');
  }

  var ticking = false;
  window.addEventListener('scroll', function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ update(); ticking = false; });
  }, { passive:true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------------- back to top ---------------- */
(function(){
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', '回到顶部');
  btn.innerHTML = '<span aria-hidden="true">↑</span><em>Top</em>';
  document.body.appendChild(btn);
  function update(){ btn.classList.toggle('show', window.scrollY > 700); }
  var ticking = false;
  window.addEventListener('scroll', function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ update(); ticking = false; });
  }, { passive:true });
  update();
  btn.addEventListener('click', function(){
    window.scrollTo({ top:0, behavior: rm ? 'auto' : 'smooth' });
  });
})();

/* ---------------- 返回首页时回到离开的位置 ---------------- */
(function(){
  var path = location.pathname.split('/').pop() || 'index.html';
  var subs = ['about-me.html','poetry.html','hometown.html','shelf.html','tip.html'];

  if (path === 'index.html') {
    // 离开首页去子页时，记住当前滚动位置
    document.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var h = a.getAttribute('href') || '';
      for (var i = 0; i < subs.length; i++) {
        if (h.indexOf(subs[i]) === 0) {
          try { sessionStorage.setItem('kashiu:scroll', String(window.scrollY)); } catch(err){}
          return;
        }
      }
    }, true);

    // 从子页回到首页时，恢复位置（带 # 锚点则优先用锚点）
    if (!location.hash) {
      var ref = '';
      try { ref = new URL(document.referrer).pathname.split('/').pop(); } catch(err){}
      if (subs.indexOf(ref) !== -1) {
        var y = parseFloat(sessionStorage.getItem('kashiu:scroll') || '0');
        if (y > 0) {
          var restore = function(){
            window.scrollTo({ top: y, behavior: 'auto' });
            try { sessionStorage.removeItem('kashiu:scroll'); } catch(err){}
          };
          if (document.readyState === 'complete') setTimeout(restore, 80);
          else window.addEventListener('load', function(){ setTimeout(restore, 80); });
        }
      }
    }
  }
})();
