(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var CONFIG = {
    title: '国庆快乐',
    message: '国庆快乐',
    lines: [
      '此生无悔入华夏',
      '何其有幸，生于华夏',
      '如果信念有颜色，那一定是中国红',
      '山河虽无恙，吾辈当自强',
      '祖国有我，请放心',
      '愿山河锦绣，国泰民安',
      '目光所至皆为华夏，五星闪耀皆为信仰',
      '我追随的光，是五角星的星光',
      '华夏波澜壮阔，少年仍需向前',
      '以青春之名，书写清澈挚爱',
      '山河远阔，人间烟火',
      '盛世中华，如你所愿',
      '清澈的爱，只为中国',
      '五星红旗，你是我的骄傲',
      '这盛世，如你所愿',
      '山河为证，岁月为名',
      '千年文明，生生不息',
      '家是小小国，国是千万家',
      '愿祖国繁荣昌盛，愿你我前程似锦',
      '江山如画，岁月如歌'
    ],
    lineInterval: 3200,
    music: 'assets/music.mp3',
    palette: ['#ffd700', '#ff8c00', '#ff4d4d', '#ff2d55', '#ffb347', '#fff1a8'],
    autoFirework: [0.7, 1.9],
    lanterns: 5,
    confettiMax: 34
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
    '中国红', '山河无恙', '灯火里的中国', '盛世如你所愿', '吾辈自强',
    '生逢盛世', '不负韶华', '这很中国', '红星闪耀', '家国同庆',
    '岁月峥嵘', '江山如画', '五星闪耀', '灯火可亲', '山河锦绣',
    '国泰民安', '锦绣中华', '与你同行', '强国有我', '明月照山河'
  ];
  var SUPER_WORDS = ['盛世华诞', '山河无恙', '祖国万岁', '这盛世如你所愿'];

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
      /* 半透明清屏形成拖尾（底色 #0d0408） */
      ctx.fillStyle = 'rgba(13,4,8,0.30)';
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
     3.5 场景剪影 —— 城市天际线（楼块 + 暖色窗灯，预渲染离屏）
     ========================================================== */
  function createSkyline() {
    var off = null;
    var offW = 0;
    var offH = 0;

    function skylinePath(g, w, h, baseH, color, seed, lamps, lampColor) {
      g.fillStyle = color;
      var x = -10;
      var rnd = function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      while (x < w + 10) {
        var bw = 26 + rnd() * 46;
        var bh = baseH * (0.35 + rnd() * 0.9);
        g.fillRect(x, h - bh, bw, bh);
        /* 楼顶小天线 */
        if (rnd() > 0.72) {
          g.fillRect(x + bw / 2 - 1, h - bh - 12, 2, 12);
        }
        /* 窗灯 */
        if (lamps) {
          g.fillStyle = lampColor;
          for (var wx = x + 5; wx < x + bw - 5; wx += 11) {
            for (var wy = h - bh + 8; wy < h - 8; wy += 15) {
              if (rnd() > 0.55) g.fillRect(wx, wy, 3, 4);
            }
          }
          g.fillStyle = color;
        }
        x += bw + 4 + rnd() * 10;
      }
    }

    return {
      resize: function (w, h) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        offW = w;
        offH = h;
        off = document.createElement('canvas');
        off.width = Math.round(w * dpr);
        off.height = Math.round(h * dpr);
        var g = off.getContext('2d');
        g.scale(dpr, dpr);
        skylinePath(g, w, h, h * 0.16, '#1e0b0e', 12345, true, 'rgba(255,190,120,.5)');
        skylinePath(g, w, h, h * 0.09, '#150608', 54321, false);
      },
      draw: function (c) {
        if (!off) return;
        c.globalCompositeOperation = 'source-over';
        c.drawImage(off, 0, 0, offW, offH);
        c.globalCompositeOperation = 'lighter';
      }
    };
  }

  /* ==========================================================
     4. 通用粒子场（爆炸火星、金色彩带共用）
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
     6. 孔明灯 —— 底部升起，到顶循环
     ========================================================== */
  function createLanterns() {
    var lamps = [];
    var count = 0;

    function spawn(w, h, first) {
      lamps.push({
        x: Math.random() * w,
        y: first ? Math.random() * h : h + 20 + Math.random() * 40,
        v: 0.18 + Math.random() * 0.32,
        size: 7 + Math.random() * 6,
        ph: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.5 ? '#ffc46b' : '#ffab4a'
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
          l.x += Math.sin(now * 0.0012 + l.ph) * 0.35 * ds;
        }
        for (var j = lamps.length - 1; j >= 0; j--) {
          if (lamps[j].y < -40) {
            lamps.splice(j, 1);
            spawn(W, H, false);
          }
        }
      },
      draw: function (c, now) {
        for (var i = 0; i < lamps.length; i++) {
          var l = lamps[i];
          var spr = sprites[l.warm];
          if (!spr) continue;
          var breath = 1 + 0.18 * Math.sin(now * 0.004 + l.ph);
          var s = l.size * 6 * breath;
          c.globalAlpha = 0.5;
          c.drawImage(spr, l.x - s / 2, l.y - s / 2, s, s);
          c.globalAlpha = 0.9;
          c.drawImage(spr, l.x - s / 4, l.y - s / 4, s / 2, s / 2);
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     7. 金色彩带 —— 顶部飘落，落地重生循环
     ========================================================== */
  function createConfetti() {
    var ready = false;

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
        color: Math.random() < 0.55 ? '#ffd700' : '#ffb347',
        confetti: true
      });
    }

    return {
      resize: function (w, h) {
        if (!ready) {
          ready = true;
          for (var i = 0; i < 16; i++) spawn(w, h, true);
        }
      },
      rain: function (n) {
        for (var i = 0; i < n; i++) {
          field.add({
            x: Math.random() * W,
            y: -12 - Math.random() * 60,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.2 + Math.random() * 1.6,
            size: 0.7 + Math.random() * 1.3,
            life: 1,
            decay: 0,
            gravity: 0.002,
            drag: 0.999,
            sway: 0.6 + Math.random(),
            breathe: true,
            ph: Math.random() * Math.PI * 2,
            color: Math.random() < 0.55 ? '#ffd700' : '#ffb347',
            confetti: true
          });
        }
      },
      update: function (now, ds) {
        var n = 0;
        for (var i = 0; i < field.items.length; i++) {
          if (field.items[i].confetti) n++;
        }
        if (n < 16) spawn(W, H, false);
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
     8. 组装 —— 粒子精灵、图层、文字轮播
     ========================================================== */
  var sprites = {};
  CONFIG.palette.concat(['#ffc46b', '#ffab4a']).forEach(function (c) {
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
  addLayer(createLanterns());
  var fireworks = createFireworks(field);
  addLayer(fireworks);
  var confettiLayer = addLayer(createConfetti(field));
  addLayer(createStarfield());
  addLayer(createSkyline());

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
  window.addEventListener('pointerdown', function (e) {
    if (!started) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    fireworks.click(e.clientX, e.clientY);
    sfx('sparkle');
    tapCombo();
    spawnPhrase(e.clientX, e.clientY);
  });

  /* ==========================================================
     9. 启动与返回
     ========================================================== */
  var startEl = document.getElementById('start');
  var bgm = document.getElementById('bgm');

  document.getElementById('startBtn').addEventListener('click', function () {
    if (started) return;
    started = true;
    startEl.classList.add('hide');
    if (CONFIG.music) {
      bgm.src = CONFIG.music;
      var playing = bgm.play();
      if (playing && playing.catch) playing.catch(function () {});
    }
    /* 开场三连发 */
    fireworks.click(W * 0.3, H * 0.3);
    setTimeout(function () { fireworks.click(W * 0.7, H * 0.24); }, 350);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.36); }, 700);
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
