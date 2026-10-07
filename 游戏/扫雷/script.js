(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var LEVELS = [
    { id: 'easy', name: '简单', rows: 8, cols: 8, mines: 10 },
    { id: 'medium', name: '中等', rows: 12, cols: 12, mines: 25 },
    { id: 'hard', name: '困难', rows: 16, cols: 16, mines: 45 }
  ];

  var LONG_PRESS = 400;
  var MOVE_TOLERANCE = 12;
  var RESULT_DELAY = 900;
  var WAVE_MS = 24;          /* 波纹展开：每层间隔 */
  var CONFETTI_N = 42;       /* 胜利撒花数量 */
  var STORE_PREFIX = 'minesweeper.best.';
  var CONFETTI_COLORS = ['#ff5fa2', '#ffd700', '#7ec8ff', '#4ad16a', '#a06aff', '#ff8c00'];

  /* ==========================================================
     2. 状态
     ========================================================== */
  var levelIndex = 0;
  var ROWS = 0;
  var COLS = 0;
  var MINES = 0;
  var board = [];
  var revealed = [];
  var flagged = [];
  var cellEls = [];          /* 格子 DOM 缓存 */
  var mines = [];
  var gameOver = false;
  var firstClick = true;
  var elapsed = 0;
  var flagsPlaced = 0;
  var timerId = null;
  var resultTimer = null;
  var flagMode = false;
  var press = null;          /* 闭格：按下/长按状态 */
  var chordPress = null;     /* 已翻开数字格：和弦预览状态 */

  /* ==========================================================
     3. 元素
     ========================================================== */
  var levelsEl = document.getElementById('levels');
  var headEl = document.getElementById('head');
  var footEl = document.getElementById('foot');
  var boardEl = document.getElementById('board');
  var mineCountEl = document.getElementById('mineCount');
  var timeEl = document.getElementById('time');
  var restartEl = document.getElementById('restart');
  var flagModeEl = document.getElementById('flagMode');
  var modeTextEl = document.getElementById('modeText');
  var flashEl = document.getElementById('flash');
  var scrimEl = document.getElementById('scrim');
  var resultEl = document.getElementById('result');
  var resultTitleEl = document.getElementById('resultTitle');
  var resultMsgEl = document.getElementById('resultMsg');
  var resultTimeEl = document.getElementById('resultTime');
  var resultLevelEl = document.getElementById('resultLevel');
  var resultBestEl = document.getElementById('resultBest');

  /* ==========================================================
     4. 布局 —— 按屏幕和当前难度算格子尺寸
     ========================================================== */
  function layout() {
    var gap = 2;
    var pad = 6;
    var availW = Math.min(window.innerWidth - 16, 560) - pad * 2 - (COLS - 1) * gap;
    var availH = window.innerHeight - levelsEl.offsetHeight - headEl.offsetHeight
      - footEl.offsetHeight - 44 - pad * 2 - (ROWS - 1) * gap;

    var size = Math.floor(Math.min(availW / COLS, availH / ROWS));
    if (size < 14) size = 14;
    if (size > 64) size = 64;

    boardEl.style.gridTemplateColumns = 'repeat(' + COLS + ', ' + size + 'px)';
    boardEl.style.gridAutoRows = size + 'px';
    document.documentElement.style.setProperty('--cell', size + 'px');
    document.documentElement.style.setProperty('--font', Math.round(size * 0.46) + 'px');
  }

  /* ==========================================================
     5. 难度切换
     ========================================================== */
  var levelEls = LEVELS.map(function (lv, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = lv.name;
    b.addEventListener('click', function () {
      levelIndex = i;
      updateLevelTabs();
      vibrate(8);
      newGame();
    });
    levelsEl.appendChild(b);
    return b;
  });

  function updateLevelTabs() {
    for (var i = 0; i < levelEls.length; i++) {
      if (i === levelIndex) levelEls[i].classList.add('active');
      else levelEls[i].classList.remove('active');
    }
  }

  /* ==========================================================
     6. 开新局
     ========================================================== */
  function newGame() {
    var lv = LEVELS[levelIndex];
    ROWS = lv.rows;
    COLS = lv.cols;
    MINES = lv.mines;

    stopTimer();
    clearTimeout(resultTimer);
    hideResult();

    board = [];
    revealed = [];
    flagged = [];
    cellEls = [];
    mines = [];
    gameOver = false;
    firstClick = true;
    elapsed = 0;
    flagsPlaced = 0;
    press = null;
    chordPress = null;
    setFlagMode(false);
    mineCountEl.textContent = MINES;
    timeEl.textContent = '0';
    restartEl.textContent = '😊';
    boardEl.classList.remove('shake');
    boardEl.innerHTML = '';

    var frag = document.createDocumentFragment();
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      revealed[r] = [];
      flagged[r] = [];
      cellEls[r] = [];
      for (var c = 0; c < COLS; c++) {
        board[r][c] = 0;
        revealed[r][c] = false;
        flagged[r][c] = false;
        var cell = document.createElement('div');
        cell.className = 'cell closed';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cellEls[r][c] = cell;
        frag.appendChild(cell);
      }
    }
    boardEl.appendChild(frag);
    layout();
  }

  /* ==========================================================
     7. 交互 —— 触摸/鼠标统一；闭格长按或标记模式插旗；
        已翻开数字格按下进入和弦预览，松开执行和弦
     ========================================================== */
  function cellFrom(target) {
    var el = target;
    while (el && el !== boardEl) {
      if (el.classList && el.classList.contains('cell')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function chordTargets(r, c) {
    var list = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr;
        var nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (!revealed[nr][nc] && !flagged[nr][nc]) {
          list.push({ r: nr, c: nc, el: cellEls[nr][nc] });
        }
      }
    }
    return list;
  }

  function clearChordPreview(cp) {
    cp.cell.classList.remove('press');
    for (var i = 0; i < cp.targets.length; i++) {
      if (!revealed[cp.targets[i].r][cp.targets[i].c]) {
        cp.targets[i].el.classList.remove('press');
      }
    }
  }

  function onDown(e) {
    if (gameOver) return;
    var cell = cellFrom(e.target);
    if (!cell) return;

    var r = parseInt(cell.dataset.r);
    var c = parseInt(cell.dataset.c);

    if (e.pointerType === 'mouse' && e.button === 2) {
      doFlag(r, c);
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (revealed[r][c]) {
      if (!board[r][c]) return;
      /* 和弦预览：数字格按下 → 周围可翻格高亮 */
      chordPress = { cell: cell, r: r, c: c, x: e.clientX, y: e.clientY, targets: chordTargets(r, c) };
      cell.classList.add('press');
      for (var i = 0; i < chordPress.targets.length; i++) {
        chordPress.targets[i].el.classList.add('press');
      }
      return;
    }

    press = { cell: cell, r: r, c: c, x: e.clientX, y: e.clientY, fired: false };
    cell.classList.add('press');
    press.timer = setTimeout(function () {
      if (!press) return;
      press.fired = true;
      press.cell.classList.remove('press');
      doFlag(press.r, press.c);
    }, LONG_PRESS);
  }

  function onUp(e) {
    if (chordPress) {
      var cp = chordPress;
      chordPress = null;
      clearChordPreview(cp);
      var movedC = Math.abs(e.clientX - cp.x) + Math.abs(e.clientY - cp.y);
      if (movedC <= MOVE_TOLERANCE) doChord(cp.r, cp.c);
      return;
    }

    if (!press) return;
    var p = press;
    press = null;
    clearTimeout(p.timer);
    p.cell.classList.remove('press');
    if (p.fired) return;

    var moved = Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
    if (moved > MOVE_TOLERANCE) return;

    if (flagMode) doFlag(p.r, p.c);
    else doOpen(p.r, p.c);
  }

  function onCancel() {
    if (chordPress) {
      clearChordPreview(chordPress);
      chordPress = null;
    }
    if (!press) return;
    clearTimeout(press.timer);
    press.cell.classList.remove('press');
    press = null;
  }

  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  flagModeEl.addEventListener('click', function () {
    setFlagMode(!flagMode);
    vibrate(8);
  });

  restartEl.addEventListener('click', newGame);

  document.getElementById('againBtn').addEventListener('click', newGame);
  document.getElementById('closeBtn').addEventListener('click', hideResult);
  scrimEl.addEventListener('click', hideResult);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') newGame();
    else if (e.key === 'Escape') hideResult();
  });

  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

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
     8. 玩法
     ========================================================== */
  function setFlagMode(on) {
    flagMode = on;
    if (on) flagModeEl.classList.add('active');
    else flagModeEl.classList.remove('active');
    flagModeEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    modeTextEl.textContent = on ? '标记中' : '标记模式';
  }

  function doOpen(r, c) {
    if (gameOver || revealed[r][c] || flagged[r][c]) return;
    if (firstClick) {
      firstClick = false;
      startTimer();
      placeMines(r, c);
      calcNumbers();
    }
    if (board[r][c] === 'M') {
      boom(r, c);
      return;
    }
    var dur = animateReveal(bfsCollect(r, c));
    setTimeout(checkWin, dur + 80);
  }

  /* 和弦：数字格周围旗数 = 数字时，翻开其余未标记邻格 */
  function doChord(r, c) {
    if (gameOver) return;
    var n = board[r][c];
    if (!n || n === 'M') return;

    var f = 0;
    var closed = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr;
        var nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (flagged[nr][nc]) f++;
        else if (!revealed[nr][nc]) closed.push([nr, nc]);
      }
    }
    if (f !== n || !closed.length) return;

    var mineCell = null;
    var safe = [];
    for (var i = 0; i < closed.length; i++) {
      if (board[closed[i][0]][closed[i][1]] === 'M') mineCell = closed[i];
      else safe.push(closed[i]);
    }

    if (mineCell) {
      /* 踩雷：非雷格即时翻开，踩中的雷爆炸 */
      for (var j = 0; j < safe.length; j++) {
        revealed[safe[j][0]][safe[j][1]] = true;
        paintOpen(safe[j][0], safe[j][1]);
      }
      boom(mineCell[0], mineCell[1]);
      return;
    }

    var steps = [];
    for (var k = 0; k < safe.length; k++) {
      if (!revealed[safe[k][0]][safe[k][1]]) {
        steps = steps.concat(bfsCollect(safe[k][0], safe[k][1]));
      }
    }
    var dur = animateReveal(steps);
    setTimeout(checkWin, dur + 80);
  }

  function doFlag(r, c) {
    if (gameOver || revealed[r][c]) return;
    var cell = cellEls[r][c];
    flagged[r][c] = !flagged[r][c];
    if (flagged[r][c]) {
      cell.classList.add('flagged');
      flagsPlaced++;
      vibrate(12);
    } else {
      cell.classList.remove('flagged');
      flagsPlaced--;
      vibrate(6);
    }
    mineCountEl.textContent = Math.max(0, MINES - flagsPlaced);
  }

  /* 布雷：首点周围半径 2（5×5）禁雷 → 首点必为 0 格，开局大片展开；
     放不下时半径逐级退到 1、0 */
  function placeMines(safeR, safeC) {
    for (var radius = 2; radius >= 0; radius--) {
      var candidates = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (Math.max(Math.abs(r - safeR), Math.abs(c - safeC)) > radius) {
            candidates.push([r, c]);
          }
        }
      }
      if (candidates.length < MINES) continue;

      for (var i = candidates.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = t;
      }
      for (var k = 0; k < MINES; k++) {
        board[candidates[k][0]][candidates[k][1]] = 'M';
        mines.push(candidates[k]);
      }
      return;
    }
  }

  function calcNumbers() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] === 'M') continue;
        var n = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr;
            var nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === 'M') n++;
          }
        }
        board[r][c] = n;
      }
    }
  }

  /* BFS 收集：从 (sr,sc) 连通展开的所有格，带 BFS 距离（波纹用） */
  function bfsCollect(sr, sc) {
    var steps = [];
    var queue = [[sr, sc, 0]];
    var head = 0;
    while (head < queue.length) {
      var it = queue[head++];
      var r = it[0];
      var c = it[1];
      var d = it[2];
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (revealed[r][c] || flagged[r][c]) continue;
      revealed[r][c] = true;
      steps.push([r, c, d]);
      if (board[r][c] === 0) {
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            queue.push([r + dr, c + dc, d + 1]);
          }
        }
      }
    }
    return steps;
  }

  /* 波纹式翻开：按 BFS 距离逐层延迟上屏，返回动画总时长 */
  function animateReveal(steps) {
    var maxD = 0;
    for (var i = 0; i < steps.length; i++) {
      var r = steps[i][0];
      var c = steps[i][1];
      var delay = steps[i][2] * WAVE_MS;
      if (steps[i][2] > maxD) maxD = steps[i][2];
      (function (rr, cc, dd) {
        setTimeout(function () {
          paintOpen(rr, cc);
        }, dd);
      })(r, c, delay);
    }
    return maxD * WAVE_MS;
  }

  function paintOpen(r, c) {
    var cell = cellEls[r][c];
    cell.classList.remove('closed', 'press');
    cell.classList.add('revealed');
    if (board[r][c] > 0) {
      cell.dataset.n = board[r][c];
      cell.textContent = board[r][c];
    }
  }

  function boom(r, c) {
    gameOver = true;
    stopTimer();
    var cell = cellEls[r][c];
    cell.classList.remove('closed', 'press');
    cell.classList.add('mine-death');
    restartEl.textContent = '😵';
    vibrate([90, 50, 180]);
    revealAll(r, c);
    flashEl.classList.add('on');
    boardEl.classList.add('shake');
    setTimeout(function () {
      flashEl.classList.remove('on');
      boardEl.classList.remove('shake');
    }, 480);
    showResult(false, false);
  }

  function revealAll(deathR, deathC) {
    var r, c;

    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        if (flagged[r][c] && board[r][c] !== 'M') {
          cellEls[r][c].classList.add('misflagged');
        }
      }
    }

    for (var i = 0; i < mines.length; i++) {
      var mr = mines[i][0];
      var mc = mines[i][1];
      if (mr === deathR && mc === deathC) continue;
      if (flagged[mr][mc]) continue;
      cellEls[mr][mc].classList.remove('closed', 'press');
      cellEls[mr][mc].classList.add('revealed', 'mine');
    }
  }

  function checkWin() {
    if (gameOver) return;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] !== 'M' && !revealed[r][c]) return;
      }
    }

    gameOver = true;
    stopTimer();
    restartEl.textContent = '😎';

    for (var i = 0; i < mines.length; i++) {
      var mr = mines[i][0];
      var mc = mines[i][1];
      if (flagged[mr][mc]) continue;
      cellEls[mr][mc].classList.add('flagged');
    }
    flagsPlaced = MINES;
    mineCountEl.textContent = 0;

    vibrate([30, 60, 30, 60, 30]);
    celebrate();
    var isRecord = saveBest(elapsed);
    showResult(true, isRecord);
  }

  /* ==========================================================
     9. 胜利撒花
     ========================================================== */
  function celebrate() {
    for (var i = 0; i < CONFETTI_N; i++) {
      var el = document.createElement('span');
      el.className = 'confetto';
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.width = (5 + Math.random() * 7) + 'px';
      el.style.height = (8 + Math.random() * 8) + 'px';
      el.style.background = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
      el.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(el);
      (function (node) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 4200);
      })(el);
    }
  }

  /* ==========================================================
     10. 结算面板
     ========================================================== */
  function showResult(win, isRecord) {
    clearTimeout(resultTimer);
    resultTimer = setTimeout(function () {
      resultTitleEl.textContent = win ? '🎉 扫雷成功' : '💥 踩到雷了';
      if (win && isRecord) resultTitleEl.textContent = '🏆 新纪录！';
      resultMsgEl.textContent = win
        ? '一颗雷都没碰，厉害。'
        : '再来一局？这次会更好。';
      resultTimeEl.textContent = elapsed + ' 秒';
      resultLevelEl.textContent = LEVELS[levelIndex].name;
      var best = loadBest();
      resultBestEl.textContent = best ? best + ' 秒' : '--';
      scrimEl.classList.add('show');
      resultEl.classList.add('show');
    }, RESULT_DELAY);
  }

  function hideResult() {
    clearTimeout(resultTimer);
    scrimEl.classList.remove('show');
    resultEl.classList.remove('show');
  }

  /* ==========================================================
     11. 最佳记录（存在本机）
     ========================================================== */
  function bestKey() {
    return STORE_PREFIX + LEVELS[levelIndex].id;
  }

  function loadBest() {
    try {
      return parseInt(localStorage.getItem(bestKey()), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(sec) {
    try {
      var b = loadBest();
      if (!b || sec < b) {
        localStorage.setItem(bestKey(), String(sec));
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ==========================================================
     12. 计时、震动
     ========================================================== */
  function startTimer() {
    if (timerId) return;
    var t0 = Date.now() - elapsed * 1000;
    timerId = setInterval(function () {
      elapsed = Math.floor((Date.now() - t0) / 1000);
      timeEl.textContent = elapsed;
    }, 250);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  updateLevelTabs();
  newGame();
})();