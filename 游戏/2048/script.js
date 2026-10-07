(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var N = 4;
  var GAP = 8;
  var PAD = 8;
  var SWIPE_MIN = 24;      /* 滑动判定最小位移 */
  var MERGE_MS = 150;      /* 合并动画时长 */
  var STORE_KEY = 'game2048.best';

  /* ==========================================================
     2. 状态
     ========================================================== */
  var grid = [];           /* N x N，存 tile 对象或 null */
  var bgEls = [];
  var score = 0;
  var best = 0;
  var over = false;
  var won = false;
  var size = 72;

  /* ==========================================================
     3. 元素
     ========================================================== */
  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var restartEl = document.getElementById('restart');
  var scrimEl = document.getElementById('scrim');
  var resultEl = document.getElementById('result');
  var resultTitleEl = document.getElementById('resultTitle');
  var resultMsgEl = document.getElementById('resultMsg');
  var resultScoreEl = document.getElementById('resultScore');
  var resultMaxEl = document.getElementById('resultMax');
  var resultBestEl = document.getElementById('resultBest');
  var againBtn = document.getElementById('againBtn');
  var continueBtn = document.getElementById('continueBtn');
  var closeBtn = document.getElementById('closeBtn');

  /* ==========================================================
     4. 布局 —— 按屏幕算棋盘尺寸，更新所有方块位置
     ========================================================== */
  function posXY(r, c) {
    return { x: PAD + c * (size + GAP), y: PAD + r * (size + GAP) };
  }

  function positionAt(el, r, c) {
    var p = posXY(r, c);
    el.style.setProperty('--tx', 'translate(' + p.x + 'px, ' + p.y + 'px)');
    el.style.transform = 'translate(' + p.x + 'px, ' + p.y + 'px)';
  }

  function layout() {
    var headEl = document.getElementById('head');
    var footEl = document.getElementById('foot');
    var availW = Math.min(window.innerWidth - 16, 480);
    var availH = window.innerHeight - headEl.offsetHeight - footEl.offsetHeight - 44;

    var s = Math.floor(Math.min((availW - PAD * 2 - GAP * 3) / N, (availH - PAD * 2 - GAP * 3) / N));
    if (s < 52) s = 52;
    if (s > 96) s = 96;
    size = s;

    document.documentElement.style.setProperty('--size', size + 'px');
    var total = PAD * 2 + GAP * 3 + size * N;
    boardEl.style.width = total + 'px';
    boardEl.style.height = total + 'px';

    for (var i = 0; i < bgEls.length; i++) {
      var p = posXY(Math.floor(i / N), i % N);
      bgEls[i].style.left = p.x + 'px';
      bgEls[i].style.top = p.y + 'px';
    }
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (grid[r] && grid[r][c]) positionAt(grid[r][c].el, r, c);
      }
    }
  }

  /* ==========================================================
     5. 新局
     ========================================================== */
  function buildBg() {
    bgEls = [];
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var el = document.createElement('div');
        el.className = 'bg-cell';
        var p = posXY(r, c);
        el.style.left = p.x + 'px';
        el.style.top = p.y + 'px';
        boardEl.appendChild(el);
        bgEls.push(el);
      }
    }
  }

  function newGame() {
    grid = [];
    for (var r = 0; r < N; r++) {
      grid[r] = [];
      for (var c = 0; c < N; c++) grid[r][c] = null;
    }

    score = 0;
    over = false;
    won = false;
    scoreEl.textContent = '0';
    best = loadBest();
    bestEl.textContent = best;
    hideResult();

    boardEl.innerHTML = '';
    buildBg();
    spawnTile();
    spawnTile();
  }

  /* ==========================================================
     6. 方块
     ========================================================== */
  function makeTile(r, c, v, spawn) {
    var el = document.createElement('div');
    el.className = 'tile' + (spawn ? ' spawn' : '');
    el.dataset.v = v;
    if (v >= 1024) el.classList.add('long');
    el.textContent = v;
    positionAt(el, r, c);
    boardEl.appendChild(el);
    return { r: r, c: c, v: v, el: el, mergedThisTurn: false };
  }

  function spawnTile() {
    var empty = [];
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (!grid[r][c]) empty.push([r, c]);
      }
    }
    if (!empty.length) return null;
    var rc = empty[(Math.random() * empty.length) | 0];
    var t = makeTile(rc[0], rc[1], Math.random() < 0.9 ? 2 : 4, true);
    grid[rc[0]][rc[1]] = t;
    return t;
  }

  /* ==========================================================
     7. 移动 —— 滑动方向压缩 + 合并（每块每回合只合一次）
     ========================================================== */
  function move(dir) {
    if (over) return;
    var V = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
    if (!V) return;

    var rows = [0, 1, 2, 3];
    var cols = [0, 1, 2, 3];
    if (V[0] === 1) rows.reverse();
    if (V[1] === 1) cols.reverse();

    var r, c;
    for (r = 0; r < N; r++) {
      for (c = 0; c < N; c++) {
        if (grid[r][c]) grid[r][c].mergedThisTurn = false;
      }
    }

    var moved = false;
    var gained = 0;
    var merges = [];

    for (var ri = 0; ri < N; ri++) {
      r = rows[ri];
      for (var ci = 0; ci < N; ci++) {
        c = cols[ci];
        var t = grid[r][c];
        if (!t) continue;

        var nr = r;
        var nc = c;
        while (true) {
          var ar = nr + V[0];
          var ac = nc + V[1];
          if (ar < 0 || ar >= N || ac < 0 || ac >= N || grid[ar][ac]) break;
          nr = ar;
          nc = ac;
        }
        var br = nr + V[0];
        var bc = nc + V[1];
        var next = (br >= 0 && br < N && bc >= 0 && bc < N) ? grid[br][bc] : null;

        if (next && next.v === t.v && !next.mergedThisTurn) {
          grid[r][c] = null;
          next.mergedThisTurn = true;
          next.v *= 2;
          gained += next.v;
          merges.push({ removed: t, kept: next });
          moved = true;
        } else if (nr !== r || nc !== c) {
          grid[r][c] = null;
          grid[nr][nc] = t;
          t.r = nr;
          t.c = nc;
          positionAt(t.el, nr, nc);
          moved = true;
        }
      }
    }

    if (!moved) return;

    /* 合并动画：保留块立即升级 + pop，被吃块滑过去后移除 */
    for (var i = 0; i < merges.length; i++) {
      var m = merges[i];
      positionAt(m.removed.el, m.kept.r, m.kept.c);
      m.removed.el.style.zIndex = 1;
      var k = m.kept;
      k.el.dataset.v = k.v;
      k.el.textContent = k.v;
      k.el.classList.toggle('long', k.v >= 1024);
      k.el.classList.remove('pop');
      void k.el.offsetWidth;
      k.el.classList.add('pop');
    }
    (function (list) {
      setTimeout(function () {
        for (var i = 0; i < list.length; i++) {
          if (list[i].removed.el.parentNode) list[i].removed.el.parentNode.removeChild(list[i].removed.el);
        }
      }, MERGE_MS);
    })(merges);

    if (gained) {
      score += gained;
      scoreEl.textContent = score;
      floatScore(gained);
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        saveBest(best);
      }
    }

    /* 胜利：本回合合并出 2048（只弹一次） */
    if (!won) {
      for (r = 0; r < N; r++) {
        for (c = 0; c < N; c++) {
          if (grid[r][c] && grid[r][c].v >= 2048 && grid[r][c].mergedThisTurn) {
            won = true;
            setTimeout(function () { showResult(true); }, 380);
          }
        }
      }
    }

    spawnTile();

    if (!movesAvailable()) {
      over = true;
      setTimeout(function () { showResult(false); }, 650);
    }
  }

  function movesAvailable() {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var t = grid[r][c];
        if (!t) return true;
        if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
    }
    return false;
  }

  function maxTile() {
    var mx = 0;
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (grid[r][c] && grid[r][c].v > mx) mx = grid[r][c].v;
      }
    }
    return mx;
  }

  function floatScore(gained) {
    var chip = scoreEl.parentNode;
    var el = document.createElement('span');
    el.className = 'score-float';
    el.textContent = '+' + gained;
    chip.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);
  }

  /* ==========================================================
     8. 结算面板
     ========================================================== */
  function showResult(win) {
    resultTitleEl.textContent = win ? '🎉 合成 2048！' : '💥 无路可走了';
    resultMsgEl.textContent = win ? '还可以继续，挑战更大的数字。' : '就差一点点，再来一局？';
    resultScoreEl.textContent = score;
    resultMaxEl.textContent = maxTile();
    resultBestEl.textContent = best;
    continueBtn.style.display = win ? '' : 'none';
    scrimEl.classList.add('show');
    resultEl.classList.add('show');
  }

  function hideResult() {
    scrimEl.classList.remove('show');
    resultEl.classList.remove('show');
  }

  /* ==========================================================
     9. 最佳记录（存在本机）
     ========================================================== */
  function loadBest() {
    try {
      return parseInt(localStorage.getItem(STORE_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(v) {
    try {
      localStorage.setItem(STORE_KEY, String(v));
    } catch (e) {}
  }

  /* ==========================================================
     10. 交互 —— 全屏滑动 + 键盘方向键/WASD
     ========================================================== */
  var sw = null;

  window.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    sw = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', function (e) {
    if (!sw) return;
    var dx = e.clientX - sw.x;
    var dy = e.clientY - sw.y;
    sw = null;
    var ax = Math.abs(dx);
    var ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_MIN) return;
    if (ax > ay) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  });

  window.addEventListener('pointercancel', function () { sw = null; });

  document.addEventListener('keydown', function (e) {
    var map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down'
    };
    var dir = map[e.key];
    if (dir) {
      e.preventDefault();
      move(dir);
    } else if (e.key === 'Escape') {
      hideResult();
    }
  });

  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  restartEl.addEventListener('click', newGame);
  againBtn.addEventListener('click', newGame);
  closeBtn.addEventListener('click', hideResult);
  scrimEl.addEventListener('click', hideResult);
  continueBtn.addEventListener('click', hideResult);

  /* 返回模块菜单（在 iframe 内时可用；独立打开或分享直达 direct=1 则隐藏） */
  var backBtn = document.getElementById('backBtn');
  var isDirect = new URLSearchParams(window.location.search).get('direct') === '1';
  if (window.top === window || isDirect) {
    backBtn.style.display = 'none';
  } else {
    backBtn.addEventListener('click', function () {
      window.top.postMessage({ nav: '?m=game' }, '*');
    });
  }

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () {
    setTimeout(layout, 150);
  });

  /* ==========================================================
     11. 启动
     ========================================================== */
  layout();
  newGame();
})();