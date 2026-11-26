/* ============================================================
   KASHIU — 首屏到星图的连续叙事
   一条星空：hero 星野 → 星图停靠 → 携带星落入作品 01
   仅首页加载；无依赖；prefers-reduced-motion 下保留选择状态。
   ============================================================ */
(function(){
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EN = {hessarion:'HESSARION',ins:'INS',ying:'YING',l:'L DOMAIN',q:'Q DOMAIN',w:'W DOMAIN'};

  function scrollY(){ return window.scrollY || window.pageYOffset || 0; }
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(t){ return t * t * (3 - 2 * t); }
  function smoother(t){ return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t){ return a + (b - a) * t; }

  /* ---------- 作品 01：星域状态 ---------- */
  var bridge = (function(){
    var row = document.querySelector('.work-row[data-no="01"]');
    var orbit = document.getElementById('workOrbit');
    var label = document.getElementById('workOrbitLabel');
    var defaultHref = row ? row.getAttribute('href') : 'ring.html';

    function apply(key, name){
      if (!row || !orbit || !label) return;
      if (key){
        label.textContent = EN[key] || String(name || '').toUpperCase();
        row.classList.add('has-domain');
        orbit.classList.add('has-domain');
        row.setAttribute('href', 'ring.html?atlas=' + key);
        row.setAttribute('aria-label', '环 · Ring，当前标记：' + name);
      } else {
        label.textContent = 'STAR MAP';
        row.classList.remove('has-domain');
        orbit.classList.remove('has-domain');
        row.setAttribute('href', defaultHref);
        row.removeAttribute('aria-label');
      }
    }

    return {apply:apply, row:row, orbit:orbit};
  })();

  var state = {
    sy: 0,
    dock: 0,
    dockT: 0,
    carry: 0,
    carryT: 0,
    anchor: null,
    domain: null,
    mx: 0,
    my: 0,
    tx: 0,
    ty: 0,
    t: 0,
    landed: false
  };

  document.addEventListener('ring:domainchange', function(e){
    var d = e.detail || {};
    state.domain = d.key ? {key:d.key, label:d.label} : null;
    bridge.apply(d.key || null, d.label || '');
    if (!d.key) state.anchor = null;
  }, false);

  if (reduce){
    docEl.classList.add('sky-reduced');
    return;
  }

  var canvas = document.getElementById('narrative-sky');
  var fore = document.getElementById('narrative-fore');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var fctx = (fore && fore.getContext) ? fore.getContext('2d') : null;
  var ringEl = document.getElementById('ring');

  var W = 0, H = 0, DPR = 1;
  var raf = 0;
  var layers = {base:null, extra:null, pad:24};
  var twinkles = [];
  var anchors = {hero:null, ring:null, map:null, works:null, orbit:null, nodes:[]};
  var bounds = {dockStart:0, dockEnd:1, carryStart:0, carryEnd:1};

  function viewW(){ return Math.max(1, window.innerWidth); }
  function viewH(){
    var vv = window.visualViewport;
    return Math.max(1, Math.round(vv && vv.height ? vv.height : window.innerHeight));
  }

  function rectDoc(el){
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var sy = scrollY();
    return {
      left: r.left,
      top: r.top + sy,
      right: r.right,
      bottom: r.bottom + sy,
      width: r.width,
      height: r.height,
      cx: r.left + r.width / 2,
      cy: r.top + sy + r.height / 2
    };
  }

  /* ---------- 尺寸与星野 ---------- */
  function resize(){
    var w = viewW();
    var h = viewH();
    var dpr = Math.min(window.devicePixelRatio || 1, w <= 900 ? 1.5 : 2);
    if (w === W && h === H && dpr === DPR) return false;
    W = w; H = h; DPR = dpr;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (fore && fctx){
      fore.width = Math.round(w * dpr);
      fore.height = Math.round(h * dpr);
      fore.style.width = w + 'px';
      fore.style.height = h + 'px';
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fore._dirty = false;
    }

    buildStars();
    return true;
  }

  function paintLayer(list){
    var pad = layers.pad;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((W + pad * 2) * DPR));
    c.height = Math.max(1, Math.round((H + pad * 2) * DPR));
    var g = c.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (var i = 0; i < list.length; i++){
      var st = list[i];
      g.beginPath();
      g.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(239,235,226,' + st.a + ')';
      g.fill();
    }
    return c;
  }

  function buildStars(){
    var pad = layers.pad;
    var mobile = W <= 900;
    var n = Math.min(mobile ? 60 : 110, Math.max(30, Math.round(W * H / (mobile ? 22000 : 16000))));
    var extraCount = Math.round(n * 0.3);
    var stars = [];
    for (var i = 0; i < n; i++){
      stars.push({
        x: Math.random() * (W + pad * 2),
        y: Math.random() * (H + pad * 2),
        r: Math.random() * 1.1 + 0.3,
        a: Math.random() * 0.4 + 0.12,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.012 + 0.003
      });
    }
    layers.base = paintLayer(stars.slice(0, n - extraCount));
    layers.extra = paintLayer(stars.slice(n - extraCount));
    twinkles = stars.slice(0, Math.min(24, stars.length));
  }

  /* ---------- 锚点与进度 ---------- */
  function measure(){
    anchors.hero = rectDoc(document.getElementById('hero'));
    anchors.ring = rectDoc(document.getElementById('ring'));
    anchors.map = rectDoc(document.querySelector('.mini-map'));
    anchors.works = rectDoc(document.getElementById('works'));
    anchors.orbit = rectDoc(document.getElementById('workOrbit'));

    anchors.nodes = [];
    var nodes = document.querySelectorAll('#miniOverview [data-mini].main');
    for (var i = 0; i < nodes.length; i++){
      var r = nodes[i].getBoundingClientRect();
      anchors.nodes.push({
        key: nodes[i].getAttribute('data-mini'),
        x: r.left + r.width / 2,
        y: r.top + scrollY() + r.height / 2
      });
    }

    var vh = viewH();
    if (anchors.ring && anchors.map){
      bounds.dockStart = anchors.ring.top - vh * 0.55;
      bounds.dockEnd = anchors.map.top - vh * 0.22;
    }
    if (anchors.map && anchors.orbit && anchors.works){
      bounds.carryStart = anchors.map.bottom - vh * 0.55;
      bounds.carryEnd = anchors.works.top - vh * 0.2;
    }

    if (state.domain && !state.anchor){
      for (var j = 0; j < anchors.nodes.length; j++){
        if (anchors.nodes[j].key === state.domain.key){
          state.anchor = {x: anchors.nodes[j].x, y: anchors.nodes[j].y};
          break;
        }
      }
    }
  }

  function updateTargets(sy){
    state.sy = sy;
    var span = bounds.dockEnd - bounds.dockStart;
    state.dockT = span > 1 ? smoother(clamp01((sy - bounds.dockStart) / span)) : 0;
    span = bounds.carryEnd - bounds.carryStart;
    state.carryT = span > 1 ? smooth(clamp01((sy - bounds.carryStart) / span)) : 0;
  }

  /* ---------- 绘制 ---------- */
  function drawStars(){
    if (!layers.base) return;
    var pad = layers.pad;
    var par = W > 900 ? 1 : 0;
    var ox = -pad + state.mx * 8 * par;
    var oy = -pad + state.my * 6 * par;
    var fade = 1 - 0.45 * state.dock;
    var dw = W + pad * 2;
    var dh = H + pad * 2;

    ctx.globalAlpha = fade;
    ctx.drawImage(layers.base, ox, oy, dw, dh);
    if (layers.extra){
      ctx.globalAlpha = fade * (1 - state.dock);
      ctx.drawImage(layers.extra, ox, oy, dw, dh);
    }

    ctx.globalAlpha = fade;
    for (var i = 0; i < twinkles.length; i++){
      var st = twinkles[i];
      var a = st.a + Math.sin(state.t * st.s * 5 + st.p) * 0.12;
      if (a < 0.03) a = 0.03;
      ctx.beginPath();
      ctx.arc(ox + st.x, oy + st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,235,226,' + a + ')';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRings(sy){
    if (!anchors.map) return;
    var m = Math.min(W, H);
    var cx0 = W > 900 ? W * 0.7 : W * 0.5;
    var cy0 = H * (W > 900 ? 0.47 : 0.4);
    var mapX = anchors.map.cx;
    var mapY = anchors.map.cy - sy;
    var R = Math.max(anchors.map.width, anchors.map.height) * 0.7;
    var small = W <= 640;
    var guide = small ? 0.45 : 1;
    var dock = state.dock;

    var configs = [
      {rx:m * 0.52, ry:m * 0.20, rot:-0.35, sp:0.00018, dash:[1, 9], col:'239,235,226', a:0.20, dot:'216,80,47', tr:R,      ta:0.17},
      {rx:m * 0.42, ry:m * 0.16, rot:0.42,  sp:-0.00024, dash:[1, 7], col:'199,167,108', a:0.20, dot:'199,167,108', tr:R * 0.62, ta:0},
      {rx:m * 0.30, ry:m * 0.115, rot:1.15, sp:0.00032, dash:[1, 6], col:'239,235,226', a:0.14, dot:'216,80,47', tr:R * 0.42, ta:0}
    ];
    if (small) configs = configs.slice(0, 2);

    for (var i = 0; i < configs.length; i++){
      var c = configs[i];
      var cx = lerp(cx0, mapX, dock);
      var cy = lerp(cy0, mapY, dock);
      var rx = Math.max(1, lerp(c.rx, c.tr, dock));
      var ry = Math.max(1, lerp(c.ry, c.tr, dock));
      var rot = (c.rot + state.t * c.sp) * (1 - dock);
      var alpha = lerp(c.a, c.ta, dock) * guide;
      if (alpha <= 0.005) continue;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + c.col + ',' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash(c.dash);
      ctx.lineDashOffset = -state.t * 0.05;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      var a = state.t * c.sp * 3 + i * 2.1;
      var ex = Math.cos(a) * rx;
      var ey = Math.sin(a) * ry;
      var px = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
      var py = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
      ctx.beginPath();
      ctx.arc(px, py, i === 1 ? 2 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c.dot + ',' + Math.min(1, alpha * 4.2) + ')';
      ctx.shadowColor = 'rgba(' + c.dot + ',.9)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function updateLanded(){
    var landed = state.carry > 0.92;
    if (landed === state.landed) return;
    state.landed = landed;
    if (bridge.orbit) bridge.orbit.classList.toggle('is-landed', landed);
  }

  function drawCarried(sy){
    if (!fore || !fctx) return;
    var t = state.carry;
    var show = t > 0.001 && t < 1.02;
    var out = 1 - clamp01((t - 0.88) / 0.12);

    if (!show || out <= 0.01){
      if (fore._dirty){
        fctx.clearRect(0, 0, W, H);
        fore.style.opacity = '0';
        fore._dirty = false;
      }
      return;
    }

    fore._dirty = true;
    fore.style.opacity = '1';
    fctx.clearRect(0, 0, W, H);

    var src = state.anchor;
    if (!src && anchors.map){
      src = {x: anchors.map.cx + anchors.map.width * 0.5, y: anchors.map.cy};
    }
    if (!src || !anchors.orbit) return;

    var sx = src.x;
    var sy0 = src.y - sy;
    var tx;
    var ty;
    if (bridge.orbit){
      var or = bridge.orbit.getBoundingClientRect();
      tx = or.left + or.width / 2;
      ty = or.top + or.height / 2;
    } else {
      tx = anchors.orbit.cx;
      ty = anchors.orbit.cy - sy;
    }
    var bow = W <= 640 ? 0 : W * 0.12;
    var cx = (sx + tx) / 2 + bow;
    var cy = (sy0 + ty) / 2;
    var u = 1 - t;
    var px = u * u * sx + 2 * u * t * cx + t * t * tx;
    var py = u * u * sy0 + 2 * u * t * cy + t * t * ty;
    var r = t < 0.5 ? lerp(1.6, 3.4, t / 0.5) : lerp(3.4, 2.6, (t - 0.5) / 0.5);

    fctx.save();
    fctx.globalAlpha = out;
    fctx.beginPath();
    fctx.arc(px, py, r, 0, Math.PI * 2);
    fctx.fillStyle = 'rgba(216,80,47,.95)';
    fctx.shadowColor = 'rgba(216,80,47,.95)';
    fctx.shadowBlur = 14;
    fctx.fill();
    fctx.restore();

    if (t > 0.86){
      var lp = (t - 0.86) / 0.14;
      fctx.beginPath();
      fctx.arc(tx, ty, 6 + lp * 20, 0, Math.PI * 2);
      fctx.strokeStyle = 'rgba(216,80,47,' + (0.7 * (1 - lp) * out) + ')';
      fctx.lineWidth = 1;
      fctx.stroke();
    }
  }

  function render(sy){
    var stopFade = 1;
    if (anchors.works){
      var ws = anchors.works.top - H * 0.55;
      stopFade = 1 - clamp01((sy - ws) / (H * 0.75));
    }

    var base = W <= 900 ? 0.4 : 0.46;
    var op = (base * stopFade).toFixed(3);
    if (canvas._op !== op){
      canvas._op = op;
      canvas.style.opacity = op;
    }

    if (stopFade > 0){
      ctx.clearRect(0, 0, W, H);
      drawStars();
      drawRings(sy);
    }

    if (ringEl){
      if (!ringEl._live && state.dock > 0.62){
        ringEl._live = true;
        ringEl.classList.add('atlas-live');
      } else if (ringEl._live && state.dock < 0.5){
        ringEl._live = false;
        ringEl.classList.remove('atlas-live');
      }
    }

    updateLanded();
    drawCarried(sy);
  }

  /* ---------- 循环 ---------- */
  function needLoop(){
    if (document.hidden) return false;
    var stop = anchors.works ? anchors.works.top + H * 0.25 : Infinity;
    return state.sy <= stop;
  }

  function tick(){
    raf = 0;
    if (document.hidden) return;

    var sy = scrollY();
    updateTargets(sy);

    state.dock += (state.dockT - state.dock) * 0.16;
    state.carry += (state.carryT - state.carry) * 0.16;
    if (Math.abs(state.dockT - state.dock) < 0.0008) state.dock = state.dockT;
    if (Math.abs(state.carryT - state.carry) < 0.0008) state.carry = state.carryT;

    state.mx += (state.tx - state.mx) * 0.04;
    state.my += (state.ty - state.my) * 0.04;
    state.t += 1;

    var loop = needLoop();
    if (!loop){
      state.dock = state.dockT;
      state.carry = state.carryT;
    }

    render(sy);

    if (loop) schedule();
  }

  function schedule(){
    if (!raf) raf = requestAnimationFrame(tick);
  }

  /* ---------- 事件 ---------- */
  window.addEventListener('scroll', schedule, {passive:true});

  var rz = 0;
  function onResize(){
    clearTimeout(rz);
    rz = setTimeout(function(){
      resize();
      measure();
      schedule();
    }, 120);
  }
  window.addEventListener('resize', onResize, {passive:true});
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', onResize, {passive:true});
  }
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) schedule();
  });

  window.addEventListener('pointermove', function(e){
    if (W <= 900) return;
    state.tx = e.clientX / Math.max(1, window.innerWidth) - 0.5;
    state.ty = e.clientY / Math.max(1, window.innerHeight) - 0.5;
  }, {passive:true});

  /* 点击星域时冻结节点位置（before the atlas zooms & hides it） */
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var node = t.closest('#miniOverview [data-mini]');
    if (node){
      var r = node.getBoundingClientRect();
      state.anchor = {
        x: r.left + r.width / 2,
        y: r.top + scrollY() + r.height / 2
      };
    }
    if (t.closest('#miniBack')) state.anchor = null;
  }, true);

  /* ---------- 启动 ---------- */
  resize();
  measure();
  updateTargets(scrollY());
  state.dock = state.dockT;
  state.carry = state.carryT;
  render(scrollY());
  schedule();

  function fontsReady(){
    measure();
    docEl.classList.add('sky-ready');
    schedule();
  }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then){
    var settled = false;
    var timer = setTimeout(function(){
      if (settled) return;
      settled = true;
      fontsReady();
    }, 1200);
    document.fonts.ready.then(function(){
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fontsReady();
    });
  } else {
    setTimeout(fontsReady, 0);
  }
})();
