(function () {
  'use strict';

  /* ==========================================================
     1. 配置 —— 常改的东西都在这里
     ========================================================== */
  var LEVELS = [
    { id: 'easy', name: '简单', cols: 4, rows: 3 },
    { id: 'medium', name: '中等', cols: 4, rows: 4 },
    { id: 'hard', name: '困难', cols: 6, rows: 5 }
  ];

  var MODES = [
    { id: 'solo', name: '单人' },
    { id: 'duo', name: '双人' }
  ];

  var EMOJI = ['❤️', '🌸', '🍓', '🐱', '⭐', '🎂', '🍀', '🌈', '🐰', '💎', '🐝', '🍎', '🌙', '🌻', '🦊', '🍩', '🐧', '🦋'];
  var MISMATCH_MS = 850;   /* 失配停留时长 */
  var STORE_PREFIX = 'memory.best.';
  var RESULT_DELAY = 650;

  /* ==========================================================
     2. 状态
     ========================================================== */
  var modeIndex = 0;
  var levelIndex = 1;
  var COLS = 0;
  var ROWS = 0;
  var PAIRS = 0;
  var faces = [];          /* 每张卡的图案 */
  var flipped = [];        /* 是否翻开（含已配对） */
  var matched = [];        /* 是否已配对 */
  var cardEls = [];        /* DOM 缓存 */
  var first = -1;          /* 本回合第一张下标 */
  var lock = false;        /* 判定期间锁定 */
  var moves = 0;
  var score = [0, 0];      /* 双人各得对数 */
  var turn = 0;            /* 双人当前玩家 */
  var matchedCount = 0;
  var elapsed = 0;
  var timerId = null;
  var timerOn = false;
  var resultTimer = null;

  /* ==========================================================
     3. 元素
     ========================================================== */
  var modeEl = document.getElementById('modeTabs');
  var levelEl = document.getElementById('levelTabs');
  var boardEl = document.getElementById('board');
  var movesEl = document.getElementById('moves');
  var timeEl = document.getElementById('time');
  var s1El = document.getElementById('s1');
  var s2El = document.getElementById('s2');
  var p1El = document.getElementById('p1');
  var p2El = document.getElementById('p2');
  var resultEl = document.getElementById('result');
  var resultTitleEl = document.getElementById('resultTitle');
  var resultMsgEl = document.getElementById('resultMsg');
  var resultRowsEl = document.getElementById('resultRows');
  var scrimEl = document.getElementById('scrim');

  /* ==========================================================
     4. tab 构建
     ========================================================== */
  var modeBtns = MODES.map(function (m, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.name;
    b.addEventListener('click', function () {
      modeIndex = i;
      updateTabs();
      newGame();
    });
    modeEl.appendChild(b);
    return b;
  });

  var levelBtns = LEVELS.map(function (lv, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = lv.name;
    b.addEventListener('click', function () {
      levelIndex = i;
      updateTabs();
      newGame();
    });
    levelEl.appendChild(b);
    return b;
  });

  function updateTabs() {
    for (var i = 0; i < MODES.length; i++) modeBtns[i].classList.toggle('active', i === modeIndex);
    for (var j = 0; j < LEVELS.length; j++) levelBtns[j].classList.toggle('active', j === levelIndex);
  }

  /* ==========================================================
     5. 布局 —— 按屏幕算卡片尺寸
     ========================================================== */
  function layout() {
    var headEl = document.getElementById('head');
    var gap = Math.max(6, Math.min(10, Math.round(window.innerWidth / 60)));
    var availW = Math.min(window.innerWidth - 16, 560) - gap * (COLS - 1);
    var availH = window.innerHeight
      - document.getElementById('modeTabs').offsetHeight
      - document.getElementById('levelTabs').offsetHeight
      - headEl.offsetHeight - 44 - gap * (ROWS - 1);

    var size = Math.floor(Math.min(availW / COLS, availH / ROWS));
    if (size < 40) size = 40;
    if (size > 96) size = 96;

    boardEl.style.setProperty('--gap', gap + 'px');
    boardEl.style.setProperty('--cell', size + 'px');
    boardEl.style.gridTemplateColumns = 'repeat(' + COLS + ', ' + size + 'px)';
    boardEl.style.gridAutoRows = size + 'px';
  }

  /* ==========================================================
     6. 开新局
     ========================================================== */
  function newGame() {
    var lv = LEVELS[levelIndex];
    COLS = lv.cols;
    ROWS = lv.rows;
    PAIRS = COLS * ROWS / 2;

    stopTimer();
    clearTimeout(resultTimer);
    hideResult();

    first = -1;
    lock = false;
    moves = 0;
    score = [0, 0];
    turn = 0;
    matchedCount = 0;
    elapsed = 0;
    timerOn = false;
    movesEl.textContent = '0';
    timeEl.textContent = '0';
    s1El.textContent = '0';
    s2El.textContent = '0';
    p1El.classList.add('active');
    p2El.classList.remove('active');

    /* 牌面：从池里抽 PAIRS 种，各一对，洗牌 */
    var pool = EMOJI.slice();
    shuffle(pool);
    var deck = pool.slice(0, PAIRS);
    deck = deck.concat(deck);
    shuffle(deck);

    faces = [];
    flipped = [];
    matched = [];
    cardEls = [];
    boardEl.innerHTML = '';

    var frag = document.createDocumentFragment();
    for (var i = 0; i < deck.length; i++) {
      faces.push(deck[i]);
      flipped.push(false);
      matched.push(false);

      var card = document.createElement('div');
      card.className = 'card';
      card.dataset.i = i;
      var inner = document.createElement('div');
      inner.className = 'card-inner';
      var back = document.createElement('div');
      back.className = 'face back';
      var front = document.createElement('div');
      front.className = 'face front';
      front.textContent = deck[i];
      inner.appendChild(back);
      inner.appendChild(front);
      card.appendChild(inner);
      cardEls.push(card);
      frag.appendChild(card);
    }
    boardEl.appendChild(frag);

    document.body.classList.toggle('duo-on', MODES[modeIndex].id === 'duo');
    layout();
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }

  /* ==========================================================
     7. 翻牌逻辑 —— 两张判定：配对亮起继续，失配翻回换人
     ========================================================== */
  function onCardClick(e) {
    var el = e.target;
    while (el && el !== boardEl && !el.classList.contains('card')) el = el.parentNode;
    if (!el || el === boardEl) return;

    var i = parseInt(el.dataset.i, 10);
    if (lock || matched[i] || flipped[i]) return;

    if (!timerOn) {
      timerOn = true;
      startTimer();
    }

    flip(el, i, true);

    if (first < 0) {
      first = i;
      return;
    }

    /* 第二张 */
    moves++;
    movesEl.textContent = moves;
    var a = first;
    var b = i;
    first = -1;

    if (faces[a] === faces[b]) {
      matched[a] = true;
      matched[b] = true;
      flipped[b] = true;
      cardEls[a].classList.add('matched');
      cardEls[b].classList.add('matched');
      cardEls[a].classList.remove('flipped');
      cardEls[b].classList.remove('flipped');
      matchedCount++;
      if (MODES[modeIndex].id === 'duo') {
        score[turn]++;
        (turn === 0 ? s1El : s2El).textContent = score[turn];
        vibrate(15);
      } else {
        vibrate(10);
      }
      if (matchedCount === PAIRS) {
        gameOver();
      }
    } else {
      lock = true;
      flipped[b] = true;   /* 锁定期间禁止再点 */
      cardEls[a].classList.add('wrong');
      cardEls[b].classList.add('wrong');
      (function (x, y) {
        setTimeout(function () {
          flipped[y] = false;
          flip(cardEls[x], x, false);
          flip(cardEls[y], y, false);
          cardEls[x].classList.remove('wrong');
          cardEls[y].classList.remove('wrong');
          lock = false;
          if (MODES[modeIndex].id === 'duo') {
            turn = 1 - turn;
            p1El.classList.toggle('active', turn === 0);
            p2El.classList.toggle('active', turn === 1);
          }
        }, MISMATCH_MS);
      })(a, b);
    }
  }

  function flip(el, i, open) {
    flipped[i] = open;
    if (open) el.classList.add('flipped');
    else el.classList.remove('flipped');
  }

  boardEl.addEventListener('click', onCardClick);

  /* ==========================================================
     8. 结束与结算
     ========================================================== */
  function gameOver() {
    stopTimer();
    vibrate([30, 60, 30]);
    resultTimer = setTimeout(showResult, RESULT_DELAY);
  }

  function showResult() {
    var duo = MODES[modeIndex].id === 'duo';
    resultRowsEl.innerHTML = '';

    if (duo) {
      var win = score[0] > score[1] ? '🎉 玩家1 获胜！'
        : score[1] > score[0] ? '🎉 玩家2 获胜！'
        : '🤝 平局！';
      resultTitleEl.textContent = win;
      resultMsgEl.textContent = '配对成功可以继续翻，下次手要稳。';
      addRow('玩家1', score[0] + ' 对');
      addRow('玩家2', score[1] + ' 对');
      addRow('总步数', moves + '');
    } else {
      var isRecord = saveBest(elapsed);
      resultTitleEl.textContent = isRecord ? '🏆 新纪录！' : '🎉 全部配对！';
      resultMsgEl.textContent = isRecord ? '这个难度你是真的稳。' : '记忆不错，要不要再快一点？';
      addRow('用时', elapsed + ' 秒');
      addRow('步数', moves + '');
      addRow('最佳', (loadBest() || '--') + ' 秒');
    }

    scrimEl.classList.add('show');
    resultEl.classList.add('show');
  }

  function addRow(label, value) {
    var row = document.createElement('div');
    row.className = 'row';
    var b = document.createElement('b');
    row.textContent = label;
    b.textContent = value;
    row.appendChild(b);
    resultRowsEl.appendChild(row);
  }

  function hideResult() {
    scrimEl.classList.remove('show');
    resultEl.classList.remove('show');
  }

  document.getElementById('againBtn').addEventListener('click', newGame);
  document.getElementById('closeBtn').addEventListener('click', hideResult);
  scrimEl.addEventListener('click', hideResult);
  document.getElementById('restart').addEventListener('click', newGame);
  document.getElementById('restart2').addEventListener('click', newGame);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') newGame();
    else if (e.key === 'Escape') hideResult();
  });

  /* ==========================================================
     9. 最佳记录（单人，按难度存本机）
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
     10. 计时、震动
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

  /* ==========================================================
     11. 返回模块菜单（在 iframe 内时可用；独立打开或分享直达 direct=1 则隐藏）
     ========================================================== */
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

  updateTabs();
  newGame();
})();
