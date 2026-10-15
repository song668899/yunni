(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var CONFIG = {
    title: '元旦快乐',
    message: '元旦快乐',
    year: '2027',
    countFrom: 10,
    lines: [
      '新的一年，愿你眼里有光，心中有爱',
      '愿所求皆如愿，所行化坦途',
      '2027，万事顺遂，平安喜乐',
      '旧岁已展千重锦，新年再进百尺竿',
      '祝我们，年年皆胜意，岁岁都平安',
      '愿新年，胜旧年',
      '往后余生，愿你笑容明媚如初',
      '新的一年，去见想见的人，做想做的事',
      '愿你走出半生，归来仍是少年',
      '雪落成诗，新年如意',
      '一切美好，都在来的路上',
      '愿你三冬暖，愿你春不寒',
      '新岁启封，长乐未央',
      '山河远阔，人间星河，无一是你，无一不是你',
      '祝你，梦想成真，前程似锦',
      '新年的第一场雪，为你而落',
      '愿岁月温柔，时光不老',
      '跨过今晚，全是崭新的开始',
      '2027，请对我们好一点',
      '凡是过往，皆为序章；所有将来，皆为可盼'
    ],
    lineInterval: 3200,
    music: 'assets/music.mp3',
    palette: ['#ffd700', '#7ec8ff', '#e0e6ff', '#b388ff', '#8be9fd', '#fff1a8'],
    autoFirework: [0.7, 1.9],
    snowflakes: 70
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
    '新年快乐', '雪落成诗', '万事顺遂', '新岁启封', '好运连连',
    '长乐未央', '平安喜乐', '一切可期', '冬安', '星光璀璨',
    '愿望已收到', '新的一年加油', '暖暖的', '跨年快乐', '岁月常新',
    '万事胜意', '前程似锦', '雪中的浪漫', '初心不改', '未来可期'
  ];
  var SUPER_WORDS = ['新年快乐', '万事胜意', '梦想成真', '平安喜乐'];

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
    for (var i = 0; i < 6; i++) {
      (function (k) {
        setTimeout(function () {
          fireworks.click(W * (0.15 + Math.random() * 0.7), H * (0.10 + Math.random() * 0.3));
        }, k * 160);
      })(i);
    }
    /* 金色流星雨 */
    for (var j = 0; j < 24; j++) {
      (function (k) {
        setTimeout(function () {
          field.add({
            x: Math.random() * W,
            y: -12 - Math.random() * 40,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 2 + Math.random() * 2,
            size: 0.6 + Math.random() * 1,
            life: 1,
            decay: 0.004,
            gravity: 0.004,
            drag: 0.999,
            sway: 0.3,
            ph: Math.random() * Math.PI * 2,
            color: Math.random() < 0.6 ? '#ffd700' : '#fff1a8'
          });
        }, k * 70);
      })(j);
    }
    var el = document.createElement('div');
    el.className = 'super-word';
    el.textContent = pick(SUPER_WORDS);
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2500);
  }

  /* ==========================================================
     2. 渲染舞台 —— 画布、尺寸、主循环、精灵
     ========================================================== */
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var W = 0;
  var H = 0;
  var layers = [];
  var phase = 'idle'; /* idle → countdown → main */
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
      /* 半透明清屏形成拖尾（底色 #081020） */
      ctx.fillStyle = 'rgba(8,16,32,0.30)';
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
     3. 星空（冷色）
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
          c.fillStyle = '#cfe4ff';
          c.beginPath();
          c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    };
  }

  /* ==========================================================
     3.5 场景剪影 —— 雪丘 + 针叶树（冷色，预渲染离屏）
     ========================================================== */
  function createSkyline() {
    var off = null;
    var offW = 0;
    var offH = 0;

    function snowHill(g, w, h, height, wobble, color, ph) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, h);
      for (var x = 0; x <= w; x += 8) {
        var y = h - height
          - Math.sin(x / w * Math.PI * 1.5 + ph) * wobble
          - Math.sin(x / w * Math.PI * 4 + ph) * wobble * 0.3;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }

    function pineTree(g, x, baseY, size, color) {
      g.fillStyle = color;
      g.fillRect(x - size * 0.06, baseY - size * 0.15, size * 0.12, size * 0.2);
      for (var i = 0; i < 3; i++) {
        var ly = baseY - size * (0.18 + i * 0.26);
        var lw = size * (0.42 - i * 0.1);
        g.beginPath();
        g.moveTo(x, ly - size * 0.42);
        g.lineTo(x - lw, ly);
        g.lineTo(x + lw, ly);
        g.closePath();
        g.fill();
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

        snowHill(g, w, h, h * 0.09, h * 0.025, '#0e1830', 0.6);
        snowHill(g, w, h, h * 0.045, h * 0.018, '#0a1226', 2.4);

        /* 远处一排针叶树 */
        var n = Math.max(5, Math.floor(w / 110));
        for (var i = 0; i < n; i++) {
          var x = (i + 0.5) / n * w + (i % 2 ? 18 : -14);
          pineTree(g, x, h - h * 0.045, h * (0.07 + (i % 3) * 0.014), '#0c1526');
        }
        pineTree(g, w * 0.16, h - h * 0.04, h * 0.11, '#080f1d');
        pineTree(g, w * 0.85, h - h * 0.04, h * 0.12, '#080f1d');
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
     4. 通用粒子场（爆炸火星、雪花共用）
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
     5. 烟花 —— 火箭升空 + 到顶爆炸（正片才自动放）
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
     6. 雪花 —— 顶部飘落，落地重生循环
     ========================================================== */
  function createSnow() {
    var ready = false;

    function spawn(w, h, first) {
      field.add({
        x: Math.random() * w,
        y: first ? Math.random() * h : -12 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.5 + Math.random() * 0.9,
        size: 0.5 + Math.random() * 1.0,
        life: 1,
        decay: 0,
        gravity: 0,
        drag: 1,
        sway: 0.4 + Math.random() * 0.7,
        breathe: true,
        ph: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#dceaff' : '#ffffff',
        snow: true
      });
    }

    return {
      resize: function (w, h) {
        if (!ready) {
          ready = true;
          for (var i = 0; i < CONFIG.snowflakes; i++) spawn(w, h, true);
        }
      },
      update: function (now, ds) {
        var n = 0;
        for (var i = 0; i < field.items.length; i++) {
          if (field.items[i].snow) n++;
        }
        if (n < CONFIG.snowflakes) spawn(W, H, false);
        for (var j = field.items.length - 1; j >= 0; j--) {
          if (field.items[j].snow && field.items[j].y > H + 20) {
            field.items.splice(j, 1);
          }
        }
      }
    };
  }

  /* ==========================================================
     7. 组装 —— 粒子精灵、图层
     ========================================================== */
  var sprites = {};
  CONFIG.palette.concat(['#dceaff', '#ffffff']).forEach(function (c) {
    sprites[c] = makeSprite(c);
  });

  document.title = qMsg ? CONFIG.message : CONFIG.title;
  document.getElementById('mainText').textContent = CONFIG.message;
  document.getElementById('countLabel').textContent = '距离 ' + CONFIG.year;
  var toEl = document.getElementById('toText');
  if (qTo) { toEl.textContent = '致 ' + qTo; toEl.classList.add('show'); }
  var fromEl = document.getElementById('fromText');
  if (qFrom) { fromEl.textContent = '—— ' + qFrom; fromEl.classList.add('show'); }

  resize();

  var field = addLayer(createField(sprites));
  var fireworks = createFireworks(field);
  addLayer(fireworks);
  addLayer(createSnow());
  addLayer(createStarfield());
  addLayer(createSkyline());

  window.addEventListener('resize', resize);

  /* ==========================================================
     8. 倒数 —— 10 → 1，数字翻滚 + 每秒小烟花，可跳过
     ========================================================== */
  var countLayer = document.getElementById('countLayer');
  var countNum = document.getElementById('countNum');
  var skipBtn = document.getElementById('skipBtn');
  var countValue = CONFIG.countFrom;
  var countTimer = null;

  function repop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  function beginCountdown() {
    phase = 'countdown';
    countLayer.classList.add('show');
    skipBtn.classList.add('show');
    countNum.textContent = countValue;
    repop(countNum);
    countTimer = setInterval(function () {
      countValue--;
      if (countValue > 0) {
        countNum.textContent = countValue;
        repop(countNum);
        fireworks.click(W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.3));
      } else {
        finishCountdown();
      }
    }, 1000);
  }

  function startAutoFireworks() {
    fireworks.click(W * 0.3, H * 0.28);
    setTimeout(function () { fireworks.click(W * 0.7, H * 0.24); }, 300);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.36); }, 600);
    setTimeout(function () { fireworks.click(W * 0.5, H * 0.16); }, 1000);
  }

  function startLines() {
    var subEl = document.getElementById('subText');
    var bag = [];
    function nextLine() {
      if (!bag.length) {
        bag = CONFIG.lines.slice();
        for (var i = bag.length - 1; i > 0; i--) {
          var j = (Math.random() * (i + 1)) | 0;
          var t = bag[i];
          bag[i] = bag[j];
          bag[j] = t;
        }
      }
      return bag.pop();
    }
    subEl.textContent = nextLine();
    setInterval(function () {
      subEl.classList.add('fade');
      setTimeout(function () {
        subEl.textContent = nextLine();
        subEl.classList.remove('fade');
      }, 500);
    }, CONFIG.lineInterval);
  }

  function finishCountdown() {
    if (phase === 'main') return;
    phase = 'main';
    if (countTimer) {
      clearInterval(countTimer);
      countTimer = null;
    }
    countLayer.classList.remove('show');
    skipBtn.classList.remove('show');
    document.getElementById('message').classList.add('show');
    startAutoFireworks();
    startLines();
  }

  skipBtn.addEventListener('click', finishCountdown);

  /* 点击放烟花（启动后；点按钮不算）+ 正片阶段彩蛋/连击 */
  window.addEventListener('pointerdown', function (e) {
    if (phase === 'idle') return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    fireworks.click(e.clientX, e.clientY);
    if (phase === 'main') {
      sfx('sparkle');
      tapCombo();
      spawnPhrase(e.clientX, e.clientY);
    }
  });

  /* ==========================================================
     9. 启动与返回
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
    beginCountdown();
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