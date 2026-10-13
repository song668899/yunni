(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var CONFIG = {
    title: '生日快乐',
    message: '生日快乐',
    lines: [
      '愿你许下的愿望，都会实现',
      '新的一岁，依然可爱，万事胜意',
      '祝你被这个世界，温柔以待',
      '眼里有光，心里有甜，未来可期',
      '生日快乐，要一直开心下去呀'
    ],
    lineInterval: 3200,
    music: 'assets/music.mp3',
    candles: 7,
    balloons: 5,
    confettiCount: 22,
    palette: ['#ffd700', '#ff9ec7', '#ffb347', '#c3a6ff', '#fff1a8'],
    autoFirework: [0.7, 1.9]
  };

  /* ==========================================================
     1.5 链接参数定制 —— ?to=寿星&msg=主文案&from=署名（由「定制」页生成）
     ========================================================== */
  var QUERY = new URLSearchParams(window.location.search);
  var qMsg = (QUERY.get('msg') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  var qTo = (QUERY.get('to') || '').trim().slice(0, 12);
  var qFrom = (QUERY.get('from') || '').trim().slice(0, 12);
  if (qMsg) CONFIG.message = qMsg;

  /* ==========================================================
     2. 渲染舞台 —— 画布、尺寸、主循环
     ========================================================== */
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var W = 0;
  var H = 0;
  var layers = [];
  var phase = 'idle'; /* idle → light → blow → main */
  var lastFrame = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].resize) layers[i].resize(W, H);
    }
  }

  function addLayer(layer) {
    layers.push(layer);
    if (layer.resize) layer.resize(W, H);
    return layer;
  }

  function tick(now) {
    if (!lastFrame) lastFrame = now;
    var dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    var ds = dt * 60;

    try {
      ctx.globalCompositeOperation = 'source-over';
      /* 半透明清屏形成拖尾（底色 #100916） */
      ctx.fillStyle = 'rgba(16,9,22,0.30)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].update) layers[i].update(now, ds);
        if (layers[i].draw) layers[i].draw(ctx, now);
      }
      ctx.globalCompositeOperation = 'source-over';
    } catch (err) {
      if (window.console && console.error) console.error(err);
    }

    requestAnimationFrame(tick);
  }

  function toRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function makeSprite(hex, core) {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,' + (core || 1) + ')');
    grad.addColorStop(0.18, toRgba(hex, 1));
    grad.addColorStop(0.45, toRgba(hex, 0.42));
    grad.addColorStop(1, toRgba(hex, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  /* ==========================================================
     3. 星空（暖色）
     ========================================================== */
  function createStarfield() {
    var stars = [];
    return {
      resize: function (w, h) {
        stars.length = 0;
        var n = Math.max(40, Math.round((w * h) / 9000));
        for (var i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 0.3 + Math.random() * 1.2,
            ph: Math.random() * Math.PI * 2,
            sp: 0.4 + Math.random()
          });
        }
      },
      draw: function (c, now) {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          c.globalAlpha = 0.10 + 0.30 * (0.5 + 0.5 * Math.sin(now * 0.001 * s.sp + s.ph));
          c.fillStyle = '#ffe4d6';
          c.beginPath();
          c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     4. 通用粒子场（爆炸火星、烟雾、火花、彩带共用）
     ========================================================== */
  function createField(sprites) {
    var items = [];
    return {
      items: items,
      add: function (p) { items.push(p); },
      update: function (now, ds) {
        for (var i = items.length - 1; i >= 0; i--) {
          var p = items[i];
          p.x += p.vx * ds;
          p.y += p.vy * ds;
          p.vy += (p.gravity || 0) * ds;
          if (p.drag) {
            var d = Math.pow(p.drag, ds);
            p.vx *= d;
            p.vy *= d;
          }
          if (p.sway) p.x += Math.sin(now * 0.002 + p.ph) * p.sway * ds;
          if (p.grow) p.size += p.grow * ds;
          p.life -= p.decay * ds;
          if (p.life <= 0 || p.y > H + 40) items.splice(i, 1);
        }
      },
      draw: function (c, now) {
        for (var i = 0; i < items.length; i++) {
          var p = items[i];
          var spr = sprites[p.color];
          if (!spr) continue;
          var s = p.size * (p.breathe ? (1 + 0.25 * Math.sin(now * 0.006 + p.ph)) : 1) * 6;
          c.globalAlpha = Math.max(0, Math.min(1, p.life));
          c.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
        }
        c.globalAlpha = 1;
      },
      burst: function (x, y, mainColor) {
        var count = 60 + ((Math.random() * 30) | 0);
        var ring = Math.random() < 0.5;
        var base = 3 + Math.random() * 3.4;
        for (var i = 0; i < count; i++) {
          var a = (i / count) * Math.PI * 2 + Math.random() * 0.14;
          var v = ring ? base * (0.85 + Math.random() * 0.3) : base * (0.35 + Math.random() * 0.75);
          var color = Math.random() < 0.25 ? '#fff1a8' : mainColor;
          items.push({
            x: x,
            y: y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            size: 1 + Math.random() * 1.7,
            life: 1,
            decay: 0.010 + Math.random() * 0.010,
            gravity: 0.042,
            drag: 0.982,
            color: color
          });
        }
      }
    };
  }

  /* ==========================================================
     5. 烟花 —— 火箭升空 + 到顶爆炸（正片才自动放）
     ========================================================== */
  function createFireworks(field) {
    var rockets = [];
    var nextAuto = 0;

    function launch(tx, ty) {
      rockets.push({
        x: tx + (Math.random() - 0.5) * 30,
        y: H + 12,
        tx: tx,
        ty: ty,
        v: -(9 + Math.random() * 4),
        color: pick(CONFIG.palette),
        ph: Math.random() * Math.PI * 2
      });
    }

    function autoLaunch() {
      var tx = W * (0.12 + Math.random() * 0.76);
      var ty = H * (0.14 + Math.random() * 0.34);
      launch(tx, ty);
    }

    return {
      click: function (x, y) { launch(x, Math.max(40, y)); },
      update: function (now, ds) {
        if (phase === 'main') {
          if (!nextAuto) nextAuto = now + 800;
          if (now >= nextAuto) {
            autoLaunch();
            nextAuto = now + (CONFIG.autoFirework[0] +
              Math.random() * (CONFIG.autoFirework[1] - CONFIG.autoFirework[0])) * 1000;
          }
        }
        for (var i = rockets.length - 1; i >= 0; i--) {
          var r = rockets[i];
          r.y += r.v * ds;
          r.x += Math.sin(now * 0.004 + r.ph) * 0.35 * ds;
          if (r.y <= r.ty) {
            field.burst(r.x, r.y, r.color);
            rockets.splice(i, 1);
          }
        }
      },
      draw: function (c, now) {
        for (var i = 0; i < rockets.length; i++) {
          var r = rockets[i];
          var spr = sprites[r.color];
          if (!spr) continue;
          var s = 14;
          c.globalAlpha = 0.95;
          c.drawImage(spr, r.x - s / 2, r.y - s / 2, s, s);
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     6. 气球 —— 正片才升起，到顶循环（与孔明灯区分：带摆线、粉彩配色）
     ========================================================== */
  var BALLOON_COLORS = ['#ff9ec7', '#ffd9a0', '#c3a6ff', '#8be9fd', '#ffb3c9'];

  function createBalloons(sprites) {
    var list = [];
    var ready = false;

    function spawn(w, h, first) {
      list.push({
        x: Math.random() * w,
        y: first ? Math.random() * h : h + 30 + Math.random() * 50,
        v: 0.20 + Math.random() * 0.30,
        size: 8 + Math.random() * 5,
        ph: Math.random() * Math.PI * 2,
        color: pick(BALLOON_COLORS)
      });
    }

    return {
      activate: function () {
        if (ready) return;
        ready = true;
        for (var i = 0; i < CONFIG.balloons; i++) spawn(W, H, true);
      },
      update: function (now, ds) {
        if (!ready) return;
        for (var i = 0; i < list.length; i++) {
          var b = list[i];
          b.y -= b.v * ds;
          b.x += Math.sin(now * 0.0012 + b.ph) * 0.4 * ds;
        }
        for (var j = list.length - 1; j >= 0; j--) {
          if (list[j].y < -60) {
            list.splice(j, 1);
            spawn(W, H, false);
          }
        }
      },
      draw: function (c, now) {
        if (!ready) return;
        for (var i = 0; i < list.length; i++) {
          var b = list[i];
          var spr = sprites[b.color];
          if (!spr) continue;
          var breath = 1 + 0.10 * Math.sin(now * 0.003 + b.ph);
          var bs = b.size * 6 * breath;

          c.globalCompositeOperation = 'source-over';
          c.strokeStyle = 'rgba(255,214,235,0.30)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(b.x, b.y + bs * 0.18);
          c.quadraticCurveTo(
            b.x + Math.sin(now * 0.002 + b.ph) * 8,
            b.y + bs * 0.35,
            b.x - Math.sin(now * 0.0015 + b.ph) * 6,
            b.y + bs * 0.35 + 46
          );
          c.stroke();
          c.globalCompositeOperation = 'lighter';

          c.globalAlpha = 0.85;
          c.drawImage(spr, b.x - bs / 2, b.y - bs / 2, bs, bs * 1.12);
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     7. 彩带 —— 正片才飘落，落地重生循环
     ========================================================== */
  function createConfetti(field) {
    var active = false;

    function spawn(w, h, first) {
      field.add({
        x: Math.random() * w,
        y: first ? Math.random() * h : -12 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.35 + Math.random() * 0.65,
        size: 0.7 + Math.random() * 1.1,
        life: 1,
        decay: 0,
        gravity: 0.0015,
        drag: 0.999,
        sway: 0.5 + Math.random() * 0.8,
        breathe: true,
        ph: Math.random() * Math.PI * 2,
        color: pick(CONFIG.palette),
        confetti: true
      });
    }

    return {
      activate: function () { active = true; },
      update: function (now, ds) {
        if (!active) return;
        var n = 0;
        for (var i = 0; i < field.items.length; i++) {
          if (field.items[i].confetti) n++;
        }
        if (n < CONFIG.confettiCount) spawn(W, H, false);
        /* 彩带不衰减，落地（field.update 里 y>H 判定）后由上面补生 */
        for (var j = field.items.length - 1; j >= 0; j--) {
          if (field.items[j].confetti && field.items[j].y > H + 20) {
            field.items.splice(j, 1);
          }
        }
      }
    };
  }

  /* ==========================================================
     8. 蛋糕与蜡烛 —— 三层蛋糕、彩带糖屑、滴落奶油、
        逐支点亮 / 长按吹灭（火焰摇摆加剧 → 逐支熄灭 + 烟雾 + 余烬）
     ========================================================== */
  function createCake(field, sprites) {
    var s = 8;                 /* 基准比例尺 */
    var cx = 0;
    var baseY = 0;
    var W1 = 19, H1 = 5.2;     /* 底层蛋糕宽高 */
    var W2 = 13, H2 = 4.6;     /* 顶层蛋糕宽高 */
    var CH = 3.1, CW = 0.66;   /* 蜡烛高宽 */
    var WICK = 0.45;           /* 烛芯长 */
    var candles = [];
    var sprinkles = [];
    var drips1 = [];
    var drips2 = [];
    var blowing = false;
    var allOutFired = false;
    var api = {};

    function buildGeometry() {
      s = Math.min(W, H) / 44;
      cx = W / 2;
      baseY = H * (H > W ? 0.72 : 0.66);
      baseY = Math.min(baseY, H - 2.4 * s);

      var n = CONFIG.candles;
      var span = W2 * s - 3.4 * s;
      var topY = baseY - (H1 + H2) * s;
      for (var i = 0; i < n; i++) {
        var cd = candles[i];
        if (!cd) {
          cd = candles[i] = {
            lit: false, out: false,
            ph: rnd(0, Math.PI * 2),
            lean: 0, leanDir: (i % 2 ? 1 : -1),
            blowAt: 0, emberLife: 0
          };
        }
        cd.x = cx - span / 2 + (n > 1 ? span * i / (n - 1) : span / 2);
        cd.topY = topY;
        cd.wickTopY = topY + 0.3 * s - CH * s - WICK * s;
      }

      /* 糖屑 / 滴落奶油：只在尺寸变化时重排 */
      if (!sprinkles.length) {
        for (var k = 0; k < 26; k++) {
          sprinkles.push({ t: 1, fx: Math.random(), fy: rnd(0.3, 0.92), rot: rnd(0, Math.PI), color: pick(CONFIG.palette.concat(['#ffffff'])) });
        }
        for (k = 0; k < 18; k++) {
          sprinkles.push({ t: 2, fx: Math.random(), fy: rnd(0.3, 0.92), rot: rnd(0, Math.PI), color: pick(CONFIG.palette.concat(['#ffffff'])) });
        }
        for (k = 0; k < 7; k++) drips1.push({ fx: rnd(0.05, 0.95), r: rnd(0.28, 0.55), drop: rnd(0.4, 1.1) });
        for (k = 0; k < 5; k++) drips2.push({ fx: rnd(0.07, 0.93), r: rnd(0.24, 0.5), drop: rnd(0.4, 1.0) });
      }
    }

    function litCount() {
      var n = 0;
      for (var i = 0; i < candles.length; i++) if (candles[i].lit) n++;
      return n;
    }

    function allLit() {
      for (var i = 0; i < candles.length; i++) {
        if (!candles[i].lit) return false;
      }
      return true;
    }

    function lightNext() {
      for (var i = 0; i < candles.length; i++) {
        var cd = candles[i];
        if (cd.lit || cd.out) continue;
        cd.lit = true;
        cd.ph = rnd(0, Math.PI * 2);
        /* 点燃火花 */
        for (var k = 0; k < 7; k++) {
          field.add({
            x: cd.x + rnd(-0.2, 0.2) * s,
            y: cd.wickTopY,
            vx: rnd(-0.9, 0.9),
            vy: -(0.8 + Math.random() * 1.6),
            size: rnd(0.35, 0.7),
            life: 1,
            decay: rnd(0.03, 0.06),
            gravity: 0.02,
            drag: 0.97,
            color: Math.random() < 0.5 ? '#ffd700' : '#fff1a8'
          });
        }
        vibrate(8);
        return true;
      }
      return false;
    }

    function beginBlow(now) {
      if (phase !== 'blow' || !litCount()) return;
      blowing = true;
      var order = 0;
      for (var i = 0; i < candles.length; i++) {
        if (candles[i].lit) {
          candles[i].blowAt = now + 380 + order * 240 + Math.random() * 180;
          order++;
        }
      }
    }

    function endBlow() {
      blowing = false;
    }

    function extinguish(cd) {
      cd.lit = false;
      cd.out = true;
      cd.blowAt = 0;
      cd.emberLife = 1;
      /* 烟雾 */
      for (var k = 0; k < 3; k++) {
        field.add({
          x: cd.x + rnd(-0.15, 0.15) * s,
          y: cd.wickTopY,
          vx: rnd(-0.12, 0.12),
          vy: -(0.5 + Math.random() * 0.5),
          size: rnd(0.5, 0.9),
          grow: 0.09,
          life: 1,
          decay: 0.006,
          drag: 0.996,
          sway: 0.25,
          ph: rnd(0, Math.PI * 2),
          color: '#cfc8da',
          smoke: true
        });
      }
      vibrate(10);
      var out = 0;
      for (var i = 0; i < candles.length; i++) if (candles[i].out) out++;
      if (out === candles.length && !allOutFired) {
        allOutFired = true;
        if (api.onAllOut) api.onAllOut();
      }
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    function drawTier(c, x, y, w, h, r, topColor, bottomColor, drips, tierIndex) {
      var grad = c.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);
      c.fillStyle = grad;
      roundRect(c, x, y, w, h, r);
      c.fill();

      /* 奶油滴落 */
      c.fillStyle = '#fff3d6';
      var bandH = 1.05 * s;
      roundRect(c, x - 0.15 * s, y - 0.08 * s, w + 0.3 * s, bandH, 0.5 * s);
      c.fill();
      for (var i = 0; i < drips.length; i++) {
        var d = drips[i];
        var dx = x + d.fx * w;
        var r2 = d.r * s;
        var bot = y + bandH - 0.08 * s;
        c.fillRect(dx - r2 * 0.55, bot - 0.2 * s, r2 * 1.1, d.drop * s + r2 * 0.4);
        c.beginPath();
        c.arc(dx, bot + d.drop * s + r2 * 0.3, r2, 0, Math.PI * 2);
        c.fill();
      }

      /* 糖屑 */
      for (var k = 0; k < sprinkles.length; k++) {
        var sp = sprinkles[k];
        if (sp.t !== tierIndex) continue;
        c.save();
        c.translate(x + sp.fx * w, y + sp.fy * h);
        c.rotate(sp.rot);
        c.fillStyle = sp.color;
        c.globalAlpha = 0.9;
        c.fillRect(-0.22 * s, -0.07 * s, 0.44 * s, 0.14 * s);
        c.restore();
      }
      c.globalAlpha = 1;
    }

    return api = {
      onAllOut: null,
      lightNext: lightNext,
      beginBlow: beginBlow,
      endBlow: endBlow,
      allLit: allLit,
      litCount: litCount,
      resize: function (w, h) { buildGeometry(); },
      update: function (now, ds) {
        var blowingNow = blowing && phase === 'blow';
        for (var i = 0; i < candles.length; i++) {
          var cd = candles[i];
          if (cd.lit) {
            cd.ph += (blowingNow ? 1.1 : 0.3) * ds;
            var target = blowingNow ? 0.5 : 0.04;
            cd.lean += (target - cd.lean) * Math.min(1, 0.10 * ds);
            if (blowingNow && cd.blowAt && now >= cd.blowAt) extinguish(cd);
          } else if (cd.emberLife > 0) {
            cd.emberLife -= 0.012 * ds;
          }
        }
      },
      draw: function (c, now) {
        var t1x = cx - W1 / 2 * s;
        var t1y = baseY - H1 * s;
        var t2x = cx - W2 / 2 * s;
        var t2y = baseY - (H1 + H2) * s;

        /* ---- 蛋糕本体（普通合成，遮住背后粒子） ---- */
        c.globalCompositeOperation = 'source-over';

        /* 盘底阴影 + 盘子 */
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath();
        c.ellipse(cx, baseY + 0.9 * s, (W1 / 2 + 1.6) * s, 1.0 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255,235,246,0.10)';
        c.beginPath();
        c.ellipse(cx, baseY + 0.55 * s, (W1 / 2 + 1.3) * s, 0.95 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,200,228,0.30)';
        c.lineWidth = 1;
        c.stroke();

        drawTier(c, t1x, t1y, W1 * s, H1 * s, 0.9 * s, '#ff8fbf', '#df669f', drips1, 1);
        drawTier(c, t2x, t2y, W2 * s, H2 * s, 0.8 * s, '#b9a6ff', '#9a82f0', drips2, 2);

        /* 顶面 */
        c.fillStyle = '#ffd7e8';
        c.beginPath();
        c.ellipse(cx, t2y, W2 / 2 * s, 0.85 * s, 0, 0, Math.PI * 2);
        c.fill();

        /* 樱桃两颗 */
        for (var side = -1; side <= 1; side += 2) {
          var chx = cx + side * (W2 / 2 - 0.9) * s;
          c.fillStyle = '#ff5f8f';
          c.beginPath();
          c.arc(chx, t2y - 0.35 * s, 0.42 * s, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.75)';
          c.beginPath();
          c.arc(chx - 0.12 * s, t2y - 0.47 * s, 0.10 * s, 0, Math.PI * 2);
          c.fill();
        }

        /* 蜡烛本体 + 条纹 + 烛芯 */
        for (var i = 0; i < candles.length; i++) {
          var cd = candles[i];
          var bodyBase = t2y + 0.3 * s - CH * s;
          c.fillStyle = i % 2 ? '#ff9ec7' : '#8be9fd';
          roundRect(c, cd.x - CW / 2 * s, bodyBase, CW * s, CH * s, 0.22 * s);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.75)';
          for (var st = 0; st < 3; st++) {
            c.fillRect(cd.x - CW / 2 * s, bodyBase + (0.5 + st * 0.9) * s, CW * s, 0.38 * s);
          }
          c.strokeStyle = '#6b4a4a';
          c.lineWidth = Math.max(1, 0.10 * s);
          c.beginPath();
          c.moveTo(cd.x, bodyBase);
          c.lineTo(cd.x, cd.wickTopY);
          c.stroke();
        }

        /* ---- 光效（加法合成） ---- */
        c.globalCompositeOperation = 'lighter';

        /* 蛋糕背后暖光 */
        var glowSpr = sprites['#ff9ec7'];
        if (glowSpr) {
          var gs0 = W1 * 1.5 * s;
          c.globalAlpha = 0.20;
          c.drawImage(glowSpr, cx - gs0 / 2, baseY - (H1 + H2) * s * 0.5 - gs0 / 2, gs0, gs0);
        }

        /* 火焰 / 余烬 */
        for (var j = 0; j < candles.length; j++) {
          var fl = candles[j];
          if (fl.lit) {
            var blowingNow = blowing && phase === 'blow';
            var fs = 1 + Math.sin(fl.ph * 6) * 0.13 + (blowingNow ? Math.sin(fl.ph * 23) * 0.20 : 0);
            var jx = blowingNow ? Math.sin(fl.ph * 31) * 0.14 * s : Math.sin(fl.ph * 9) * 0.04 * s;
            c.save();
            c.translate(fl.x + jx, fl.wickTopY);
            c.rotate(fl.lean * fl.leanDir);
            var glowSpr2 = sprites['#ffb347'];
            if (glowSpr2) {
              var gs = 2.4 * s * fs;
              c.globalAlpha = 0.75;
              c.drawImage(glowSpr2, -gs / 2, -gs / 2 - 0.2 * s, gs, gs);
            }
            c.globalAlpha = 0.9;
            c.fillStyle = '#ffb347';
            c.beginPath();
            c.ellipse(0, -0.42 * s * fs, 0.30 * s * fs, 0.50 * s * fs, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fff6d8';
            c.beginPath();
            c.ellipse(0, -0.34 * s * fs, 0.15 * s * fs, 0.27 * s * fs, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
          } else if (fl.emberLife > 0) {
            c.globalAlpha = Math.min(1, fl.emberLife) * 0.9;
            c.fillStyle = '#ff7a4d';
            c.beginPath();
            c.arc(fl.x, fl.wickTopY, 0.13 * s * (0.5 + 0.5 * fl.emberLife), 0, Math.PI * 2);
            c.fill();
          }
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     9. 组装 —— 粒子精灵、图层
     ========================================================== */
  var sprites = {};
  CONFIG.palette.concat(['#8be9fd', '#ffd9a0', '#ffb3c9', '#cfc8da']).forEach(function (c) {
    sprites[c] = makeSprite(c);
  });

  document.title = qMsg ? CONFIG.message : CONFIG.title;
  document.getElementById('mainText').textContent = CONFIG.message;
  var toEl = document.getElementById('toText');
  if (qTo) { toEl.textContent = '致 ' + qTo; toEl.classList.add('show'); }
  var fromEl = document.getElementById('fromText');
  if (qFrom) { fromEl.textContent = '—— ' + qFrom; fromEl.classList.add('show'); }

  resize();

  var field = addLayer(createField(sprites));
  var balloons = addLayer(createBalloons(sprites));
  addLayer(createConfetti(field));
  addLayer(createStarfield());
  var cake = addLayer(createCake(field, sprites));
  var fireworks = createFireworks(field);
  addLayer(fireworks);

  window.addEventListener('resize', resize);

  /* ==========================================================
     10. 引导文字与阶段流转
     ========================================================== */
  var guideEl = document.getElementById('guide');
  var wishTimer = null;

  function setGuide(text) {
    guideEl.textContent = text || '';
    if (text) guideEl.classList.add('show');
    else guideEl.classList.remove('show');
  }

  function startLines() {
    var subEl = document.getElementById('subText');
    var lineIndex = 0;
    subEl.textContent = CONFIG.lines[0];
    setInterval(function () {
      subEl.classList.add('fade');
      setTimeout(function () {
        lineIndex = (lineIndex + 1) % CONFIG.lines.length;
        subEl.textContent = CONFIG.lines[lineIndex];
        subEl.classList.remove('fade');
      }, 500);
    }, CONFIG.lineInterval);
  }

  function toMain() {
    if (phase === 'main') return;
    phase = 'main';
    setGuide('');
    document.getElementById('message').classList.add('show');
    startLines();
    /* 开场四连发 */
    fireworks.click(W * 0.3, H * 0.26);
    setTimeout(function () { fireworks.click(W * 0.7, H * 0.22); }, 300);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.34); }, 600);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.14); }, 1000);
  }

  cake.onAllOut = function () {
    vibrate([30, 60, 30, 60, 30]);
    setTimeout(toMain, 850);
  };

  /* ==========================================================
     11. 交互 —— 点蜡烛 / 长按吹灭 / 正片点烟花
     ========================================================== */
  window.addEventListener('pointerdown', function (e) {
    if (phase === 'idle') return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (phase === 'light') {
      if (cake.lightNext() && cake.allLit()) {
        phase = 'blow';
        setGuide('闭上眼睛，许个愿');
        clearTimeout(wishTimer);
        wishTimer = setTimeout(function () {
          if (phase === 'blow') setGuide('长按屏幕，吹灭蜡烛');
        }, 2400);
      }
    } else if (phase === 'blow') {
      cake.beginBlow(performance.now());
      setGuide('长按屏幕，吹灭蜡烛');
    } else if (phase === 'main') {
      fireworks.click(e.clientX, e.clientY);
    }
  });

  window.addEventListener('pointerup', function () {
    cake.endBlow();
  });

  window.addEventListener('pointercancel', function () {
    cake.endBlow();
  });

  /* ==========================================================
     12. 启动与返回
     ========================================================== */
  var startEl = document.getElementById('start');
  var bgm = document.getElementById('bgm');

  document.getElementById('startBtn').addEventListener('click', function () {
    if (phase !== 'idle') return;
    startEl.classList.add('hide');
    if (CONFIG.music) {
      bgm.src = CONFIG.music;
      var playing = bgm.play();
      if (playing && playing.catch) playing.catch(function () {});
    }
    phase = 'light';
    setGuide('点亮蛋糕上的蜡烛');
  });

  var backBtn = document.getElementById('backBtn');
  /* direct=1 = 从分享直达链接进入（封闭体验，不给返回入口）；独立打开同样隐藏 */
  var isDirect = new URLSearchParams(window.location.search).get('direct') === '1';
  if (window.top === window || isDirect) {
    backBtn.style.display = 'none';
  } else {
    backBtn.addEventListener('click', function () {
      window.top.postMessage({ nav: '?m=wish' }, '*');
    });
  }

  requestAnimationFrame(tick);
})();
