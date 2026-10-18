(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var CONFIG = {
    title: '新春快乐',
    message: '新春快乐',
    lines: [
      '爆竹声中一岁除，春风送暖入屠苏',
      '千门万户曈曈日，总把新桃换旧符',
      '愿新年，胜旧年',
      '愿所求皆如愿，所行化坦途',
      '岁岁常欢愉，年年皆胜意',
      '愿家人闲坐，灯火可亲',
      '恭喜发财，红包拿来',
      '山河锦绣，国泰民安',
      '瑞雪兆丰年，红梅报新春',
      '一夜连双岁，五更分二年',
      '辞暮尔尔，烟火年年',
      '春风送暖，福满人间',
      '新岁序开，同赴前程',
      '年年有余，岁岁安康',
      '福星高照，喜气盈门',
      '花开花落，皆是春天',
      '愿你我，岁岁年年，万喜万般宜',
      '辞旧迎新，奔赴山海',
      '爆竹升平，国泰民安',
      '岁岁常喜乐，年年皆顺意'
    ],
    lineInterval: 3400,
    music: '', /* 音乐为可选：把 mp3 放到 祝福/assets/ 并填路径即可 */
    palette: ['#ff3b3b', '#ff7a18', '#ffd700', '#ff5252', '#ff9a3c', '#ffe08a'],
    autoFirework: [0.7, 1.9],
    lanterns: 6,          /* 上升红灯笼数量 */
    hanging: 6,           /* 屋檐下挂的红灯笼数量 */
    fallingMax: 14        /* 背景飘落福字/财字数量上限 */
  };

  /* ==========================================================
     1.5 链接参数定制 —— ?to=收件人&msg=主文案&from=署名（由「定制」页生成）
     ========================================================== */
  var QUERY = new URLSearchParams(window.location.search);
  var qMsg = (QUERY.get('msg') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  var qTo = (QUERY.get('to') || '').trim().slice(0, 12);
  var qFrom = (QUERY.get('from') || '').trim().slice(0, 12);
  if (qMsg) CONFIG.message = qMsg;

  /* ==========================================================
     1.6 体验增强 —— 点击文字彩蛋 + 连击彩蛋（音效走 ../sfx.js）
     ========================================================== */
  function sfx(name) { if (window.SFX) window.SFX.play(name); }

  var PHRASES = [
    '新年快乐', '恭喜发财', '万事如意', '阖家欢乐', '岁岁平安',
    '福星高照', '吉祥如意', '招财进宝', '心想事成', '步步高升',
    '红红火火', '迎春接福', '金玉满堂', '花开富贵', '国泰民安',
    '年年有余', '四季平安', '福满人间', '五福临门', '鹏程万里'
  ];
  var SUPER_WORDS = ['新春大吉', '恭喜发财', '福满人间', '迎春接福'];

  var phraseBag = [];
  function nextPhrase() {
    if (!phraseBag.length) {
      phraseBag = PHRASES.slice();
      for (var i = phraseBag.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = phraseBag[i];
        phraseBag[i] = phraseBag[j];
        phraseBag[j] = t;
      }
    }
    return phraseBag.pop();
  }

  function spawnPhrase(x, y) {
    if (Math.random() > 0.45) return;
    var el = document.createElement('div');
    el.className = 'phrase-pop';
    el.textContent = nextPhrase();
    el.style.left = Math.min(Math.max(x, 60), W - 60) + 'px';
    el.style.top = Math.max(y - 20, 60) + 'px';
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2300);
  }

  var combo = { n: 0, at: 0, cool: 0 };
  function tapCombo() {
    var now = performance.now();
    if (now < combo.cool) return;
    if (now - combo.at > 2600) combo.n = 0;
    combo.at = now;
    combo.n++;
    if (combo.n >= 5) {
      combo.n = 0;
      combo.cool = now + 8000;
      superBurst();
    }
  }

  function superBurst() {
    sfx('chime');
    for (var i = 0; i < 7; i++) {
      (function (k) {
        setTimeout(function () {
          fireworks.click(W * (0.10 + Math.random() * 0.8), H * (0.10 + Math.random() * 0.32));
        }, k * 150);
      })(i);
    }
    if (confettiLayer) confettiLayer.rain(20);
    var el = document.createElement('div');
    el.className = 'super-word';
    el.textContent = pick(SUPER_WORDS);
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2500);
  }

  /* ==========================================================
     2. 渲染舞台 —— 画布、尺寸、主循环、指针
     ========================================================== */
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var W = 0;
  var H = 0;
  var layers = [];
  var started = false;
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
      /* 半透明清屏形成拖尾（红金夜空底色） */
      ctx.fillStyle = 'rgba(30,6,8,0.30)';
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

  /* 带文字的圆角方块精灵（福字 / 财字） */
  function makeLabelSprite(bg, fg, text) {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = bg;
    roundRect(g, 6, 6, size - 12, size - 12, 12);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = fg;
    roundRect(g, 6, 6, size - 12, size - 12, 12);
    g.stroke();
    g.fillStyle = fg;
    g.font = 'bold 36px "PingFang SC","Microsoft YaHei",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, size / 2, size / 2 + 2);
    return c;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  /* 灯笼绘制（屋檐悬挂 / 上升红灯笼共用） */
  function drawLantern(c, x, y, r, now, ph) {
    var sway = Math.sin(now * 0.0016 + ph) * r * 0.14;
    var lx = x + sway;
    /* 挂线 */
    c.strokeStyle = 'rgba(255,200,120,.5)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y - r * 1.7);
    c.lineTo(lx, y - r * 0.62);
    c.stroke();
    /* 主体 */
    c.fillStyle = '#e01717';
    c.beginPath();
    c.ellipse(lx, y, r * 0.86, r, 0, 0, Math.PI * 2);
    c.fill();
    /* 竖纹 */
    c.strokeStyle = 'rgba(180,10,10,.55)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(lx - r * 0.4, y - r * 0.8);
    c.lineTo(lx - r * 0.4, y + r * 0.8);
    c.moveTo(lx + r * 0.4, y - r * 0.8);
    c.lineTo(lx + r * 0.4, y + r * 0.8);
    c.stroke();
    /* 金顶 / 金底 */
    c.fillStyle = '#ffd34d';
    c.fillRect(lx - r * 0.5, y - r * 1.05, r, r * 0.32);
    c.fillRect(lx - r * 0.5, y + r * 0.74, r, r * 0.32);
    /* 流苏 */
    c.strokeStyle = '#ffd34d';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(lx, y + r * 1.06);
    c.lineTo(lx, y + r * 1.55);
    c.stroke();
    /* 高光 */
    c.fillStyle = 'rgba(255,205,130,.4)';
    c.beginPath();
    c.ellipse(lx - r * 0.3, y - r * 0.2, r * 0.16, r * 0.42, 0, 0, Math.PI * 2);
    c.fill();
  }

  /* ==========================================================
     3. 星空
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
          c.globalAlpha = 0.10 + 0.32 * (0.5 + 0.5 * Math.sin(now * 0.001 * s.sp + s.ph));
          c.fillStyle = '#ffe9c0';
          c.beginPath();
          c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     3.5 场景剪影 —— 中式屋檐/城墙 + 顶部悬挂红灯笼
     ========================================================== */
  function createSilhouette() {
    var off = null;
    var offW = 0;
    var offH = 0;
    function build(w, h) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      offW = w;
      offH = h;
      off = document.createElement('canvas');
      off.width = Math.round(w * dpr);
      off.height = Math.round(h * dpr);
      var g = off.getContext('2d');
      g.scale(dpr, dpr);
      var baseH = h * 0.14;
      /* 城墙底座 */
      g.fillStyle = '#160406';
      g.fillRect(0, h - baseH, w, baseH);
      /* 垛口 */
      g.fillStyle = '#160406';
      for (var x = 0; x < w; x += 48) {
        if (((x / 48) | 0) % 2 === 0) g.fillRect(x, h - baseH - 12, 26, 12);
      }
      /* 几个翘角屋脊 */
      var rnd = (function () {
        var seed = 7788;
        return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      })();
      for (var k = 0; k < w + 200; k += 150 + rnd() * 90) {
        var ew = 60 + rnd() * 50;
        var ey = h - baseH - 10;
        g.fillStyle = '#160406';
        g.beginPath();
        g.moveTo(k - 10, ey);
        g.quadraticCurveTo(k + ew / 2, ey - 34, k + ew + 10, ey);
        g.lineTo(k + ew + 10, ey + 8);
        g.lineTo(k - 10, ey + 8);
        g.closePath();
        g.fill();
      }
    }
    return {
      resize: function (w, h) { build(w, h); },
      draw: function (c, now) {
        if (!off) return;
        c.globalCompositeOperation = 'source-over';
        c.drawImage(off, 0, 0, offW, offH);
        /* 屋檐下悬挂红灯笼（微晃） */
        var n = CONFIG.hanging;
        var gap = offW / (n + 1);
        for (var i = 0; i < n; i++) {
          var lx = gap * (i + 1);
          var ly = offH - offH * 0.14 - 14;
          drawLantern(c, lx, ly, 13, now, i * 1.7);
        }
        c.globalCompositeOperation = 'lighter';
      }
    };
  }

  /* ==========================================================
     4. 通用粒子场（爆炸火星、飘落福字/财字共用）
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
          c.globalAlpha = Math.max(0, p.life);
          c.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
        }
        c.globalAlpha = 1;
      },
      burst: function (x, y, mainColor) {
        sfx('boom');
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
     5. 烟花 —— 火箭升空 + 到顶爆炸
     ========================================================== */
  function createFireworks(field) {
    var rockets = [];
    var nextAuto = 0;

    function launch(tx, ty) {
      sfx('whoosh');
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
        if (started) {
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
     6. 红灯笼 —— 底部缓缓升起，到顶循环（祈福灯）
     ========================================================== */
  function createRisingLanterns() {
    var lamps = [];
    var count = 0;

    function spawn(w, h, first) {
      lamps.push({
        x: Math.random() * w,
        y: first ? Math.random() * h : h + 20 + Math.random() * 40,
        v: 0.16 + Math.random() * 0.30,
        size: 8 + Math.random() * 6,
        ph: Math.random() * Math.PI * 2
      });
    }

    return {
      resize: function (w, h) {
        if (!count) {
          count = CONFIG.lanterns;
          for (var i = 0; i < count; i++) spawn(w, h, true);
        }
      },
      update: function (now, ds) {
        for (var i = 0; i < lamps.length; i++) {
          var l = lamps[i];
          l.y -= l.v * ds;
        }
        for (var j = lamps.length - 1; j >= 0; j--) {
          if (lamps[j].y < -50) {
            lamps.splice(j, 1);
            spawn(W, H, false);
          }
        }
      },
      draw: function (c, now) {
        for (var i = 0; i < lamps.length; i++) {
          drawLantern(c, lamps[i].x, lamps[i].y, lamps[i].size, now, lamps[i].ph);
        }
      }
    };
  }

  /* ==========================================================
     7. 背景飘落 —— 福字 / 财字（红金，循环）
     ========================================================== */
  function createFalling() {
    var ready = false;

    function spawn(w, h, first) {
      field.add({
        x: Math.random() * w,
        y: first ? Math.random() * h : -12 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.35 + Math.random() * 0.65,
        size: 0.8 + Math.random() * 0.9,
        life: 1,
        decay: 0,
        gravity: 0.0015,
        drag: 0.999,
        sway: 0.5 + Math.random() * 0.8,
        breathe: true,
        ph: Math.random() * Math.PI * 2,
        color: Math.random() < 0.6 ? 'fu' : 'coin',
        confetti: true
      });
    }

    return {
      resize: function (w, h) {
        if (!ready) {
          ready = true;
          for (var i = 0; i < 14; i++) spawn(w, h, true);
        }
      },
      rain: function (n) {
        for (var i = 0; i < n; i++) {
          field.add({
            x: Math.random() * W,
            y: -12 - Math.random() * 60,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.2 + Math.random() * 1.6,
            size: 0.8 + Math.random() * 1.0,
            life: 1,
            decay: 0,
            gravity: 0.002,
            drag: 0.999,
            sway: 0.6 + Math.random(),
            breathe: true,
            ph: Math.random() * Math.PI * 2,
            color: Math.random() < 0.6 ? 'fu' : 'coin',
            confetti: true
          });
        }
      },
      update: function (now, ds) {
        var n = 0;
        for (var i = 0; i < field.items.length; i++) {
          if (field.items[i].confetti) n++;
        }
        if (n < CONFIG.fallingMax) spawn(W, H, false);
        for (var j = field.items.length - 1; j >= 0; j--) {
          if (field.items[j].confetti && field.items[j].y > H + 20) {
            field.items.splice(j, 1);
          }
        }
      }
    };
  }

  /* ==========================================================
     8. 组装 —— 粒子精灵、图层、文字轮播
     ========================================================== */
  var sprites = {};
  CONFIG.palette.concat(['#ffc46b', '#ffab4a', '#fff1a8']).forEach(function (c) {
    sprites[c] = makeSprite(c);
  });
  sprites['fu'] = makeLabelSprite('#e01717', '#ffd34d', '福');
  sprites['coin'] = makeLabelSprite('#ffd34d', '#c0392b', '财');

  document.title = qMsg ? CONFIG.message : CONFIG.title;
  document.getElementById('mainText').textContent = CONFIG.message;
  var toEl = document.getElementById('toText');
  if (qTo) { toEl.textContent = '致 ' + qTo; toEl.classList.add('show'); }
  var fromEl = document.getElementById('fromText');
  if (qFrom) { fromEl.textContent = '—— ' + qFrom; fromEl.classList.add('show'); }

  resize();

  var field = addLayer(createField(sprites));
  addLayer(createRisingLanterns());
  var fireworks = createFireworks(field);
  addLayer(fireworks);
  var confettiLayer = addLayer(createFalling());
  addLayer(createStarfield());
  addLayer(createSilhouette());

  window.addEventListener('resize', resize);

  /* 文字轮播（洗牌不重复） */
  var subEl = document.getElementById('subText');
  var lineBag = [];
  function nextLine() {
    if (!lineBag.length) {
      lineBag = CONFIG.lines.slice();
      for (var i = lineBag.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = lineBag[i];
        lineBag[i] = lineBag[j];
        lineBag[j] = t;
      }
    }
    return lineBag.pop();
  }
  subEl.textContent = nextLine();
  setInterval(function () {
    subEl.classList.add('fade');
    setTimeout(function () {
      subEl.textContent = nextLine();
      subEl.classList.remove('fade');
    }, 500);
  }, CONFIG.lineInterval);

  /* 点击放烟花（启动后；点按钮不算）+ 彩蛋/连击 */
  var gameOn = false;
  window.addEventListener('pointerdown', function (e) {
    if (!started || gameOn) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    fireworks.click(e.clientX, e.clientY);
    sfx('sparkle');
    tapCombo();
    spawnPhrase(e.clientX, e.clientY);
  });

  /* ==========================================================
     9. 接福气小游戏 —— DOM + rAF（篮子接红包，30 秒挑战）
     ========================================================== */
  function createGame() {
    var gameEl = document.getElementById('game');
    var basketEl = document.getElementById('basket');
    var scoreEl = document.getElementById('gameScore');
    var timeEl = document.getElementById('gameTime');
    var resultEl = document.getElementById('gameResult');
    var grScore = document.getElementById('grScore');
    var grBest = document.getElementById('grBest');
    var grAgain = document.getElementById('grAgain');
    var grBack = document.getElementById('grBack');
    var gameBtn = document.getElementById('gameBtn');

    var active = false, raf = 0, spawnTimer = 0, lastTs = 0;
    var items = [];
    var score = 0, combo = 0, bestCombo = 0, timeLeft = 30, startTime = 0;
    var bgW = 0, bgH = 0, basketX = 0, basketHalf = 26, basketY = 0;
    var TYPES = ['🧧', '🧧', '🧧', '🪙', '🏮', '💰'];

    function resizeGame() {
      bgW = window.innerWidth;
      bgH = window.innerHeight;
      basketY = bgH - 64 - 23;
    }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function spawnItem() {
      var el = document.createElement('div');
      el.className = 'fall-item';
      el.textContent = TYPES[(Math.random() * TYPES.length) | 0];
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.fontSize = (28 + Math.random() * 12) + 'px';
      var x = Math.random() * (bgW - 60) + 30;
      var y = -60;
      var vy = 2.2 + Math.random() * 1.6 + Math.min(2.2, (30 - timeLeft) * 0.06);
      items.push({ el: el, x: x, y: y, vy: vy });
      el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      gameEl.appendChild(el);
    }

    function removeItem(i) {
      if (items[i].el && items[i].el.parentNode) items[i].el.parentNode.removeChild(items[i].el);
      items.splice(i, 1);
    }

    function clearItems() {
      items.forEach(function (it) { if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el); });
      items = [];
    }

    function showCombo(n) {
      var el = document.createElement('div');
      el.className = 'super-word';
      el.textContent = '连击 x' + n;
      gameEl.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
    }

    function popShake() {
      gameEl.classList.add('shake');
      setTimeout(function () { gameEl.classList.remove('shake'); }, 320);
    }

    function step(ts) {
      if (!active) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      var ds = dt * 60;

      spawnTimer += dt;
      var interval = 0.62 - Math.min(0.30, (30 - timeLeft) * 0.012);
      if (spawnTimer >= interval) { spawnTimer = 0; spawnItem(); }

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy * ds * 1.4;
        it.el.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px)';
        if (it.y > basketY - 44 && it.y < basketY + 30 && Math.abs(it.x - basketX) < basketHalf + 20) {
          score++;
          combo++;
          if (combo > bestCombo) bestCombo = combo;
          scoreEl.textContent = score;
          sfx('sparkle');
          if (combo >= 5) { sfx('chime'); showCombo(combo); }
          if (combo >= 4) popShake();
          removeItem(i);
          continue;
        }
        if (it.y > bgH + 40) {
          combo = 0;
          removeItem(i);
        }
      }

      var elapsed = (performance.now() - startTime) / 1000;
      timeLeft = Math.max(0, 30 - elapsed);
      timeEl.textContent = Math.ceil(timeLeft);
      if (timeLeft <= 0) { endGame(); return; }
      raf = requestAnimationFrame(step);
    }

    function openGame() {
      if (!started) start();
      active = true;
      gameOn = true;
      clearItems();
      score = 0; combo = 0; bestCombo = 0; timeLeft = 30;
      scoreEl.textContent = '0';
      timeEl.textContent = '30';
      resultEl.classList.remove('show');
      spawnTimer = 0; lastTs = 0;
      startTime = performance.now();
      resizeGame();
      basketX = bgW / 2;
      basketEl.style.left = '0px';
      basketEl.style.transform = 'translate(' + basketX + 'px,-50%)';
      gameEl.classList.add('on');
      gameBtn.classList.remove('show');
      raf = requestAnimationFrame(step);
    }

    function closeGame() {
      active = false;
      gameOn = false;
      cancelAnimationFrame(raf);
      clearItems();
      gameEl.classList.remove('on');
      if (started) gameBtn.classList.add('show');
    }

    function endGame() {
      active = false;
      gameOn = false;
      cancelAnimationFrame(raf);
      clearItems();
      grScore.textContent = score;
      grBest.textContent = bestCombo;
      resultEl.classList.add('show');
    }

    function onMove(e) {
      if (!active) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      basketX = clamp(x, basketHalf + 10, bgW - basketHalf - 10);
      basketEl.style.transform = 'translate(' + basketX + 'px,-50%)';
    }

    gameEl.addEventListener('pointermove', onMove);
    gameEl.addEventListener('pointerdown', onMove);
    grAgain.addEventListener('click', function (e) { e.stopPropagation(); openGame(); });
    grBack.addEventListener('click', function (e) { e.stopPropagation(); closeGame(); });

    return { open: openGame, close: closeGame };
  }

  /* ==========================================================
     10. 启动与返回
     ========================================================== */
  var startEl = document.getElementById('start');
  var bgm = document.getElementById('bgm');
  var gameBtn = document.getElementById('gameBtn');
  var game = createGame();

  function start() {
    if (started) return;
    started = true;
    startEl.classList.add('hide');
    if (CONFIG.music) {
      bgm.src = CONFIG.music;
      var playing = bgm.play();
      if (playing && playing.catch) playing.catch(function () {});
    }
    gameBtn.classList.add('show');
    /* 开场三连发 */
    fireworks.click(W * 0.3, H * 0.3);
    setTimeout(function () { fireworks.click(W * 0.7, H * 0.24); }, 350);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.36); }, 700);
  }

  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('startGameBtn').addEventListener('click', function () { start(); game.open(); });
  gameBtn.addEventListener('click', function () { game.open(); });

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
