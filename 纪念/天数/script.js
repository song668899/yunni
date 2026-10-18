(function () {
  'use strict';

  var STORE_KEY = 'mem.days';
  var sp = new URLSearchParams(window.location.search);
  var isDirect = sp.get('direct') === '1';

  var showEl = document.getElementById('show');
  var editEl = document.getElementById('edit');
  var bigNumEl = document.getElementById('bigNum');
  var unitEl = document.getElementById('unit');
  var subEl = document.getElementById('sub');
  var toEl = document.getElementById('to');
  var msgEl = document.getElementById('msg');
  var fromEl = document.getElementById('from');
  var dateInput = document.getElementById('dateInput');
  var toInput = document.getElementById('toInput');
  var msgInput = document.getElementById('msgInput');
  var fromInput = document.getElementById('fromInput');
  var backBtn = document.getElementById('backBtn');
  var toastEl = document.getElementById('toast');

  /* 状态：优先 URL 参数，其次 localStorage */
  var cfg = loadCfg();

  function loadCfg() {
    var c = {};
    var date = sp.get('date');
    var to = sp.get('to');
    var msg = sp.get('msg');
    var from = sp.get('from');
    if (date) c.date = date;
    if (to) c.to = to;
    if (msg) c.msg = msg;
    if (from) c.from = from;
    if (!c.date) {
      try {
        var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (saved) {
          c.date = c.date || saved.date;
          c.to = c.to || saved.to;
          c.msg = c.msg || saved.msg;
          c.from = c.from || saved.from;
        }
      } catch (e) {}
    }
    return c;
  }

  function saveCfg() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  /* 精确年月日差（to 相对 from） */
  function diffYMD(from, to) {
    var y = to.getFullYear() - from.getFullYear();
    var mo = to.getMonth() - from.getMonth();
    var d = to.getDate() - from.getDate();
    if (d < 0) {
      mo--;
      var prev = new Date(to.getFullYear(), to.getMonth(), 0);
      d += prev.getDate();
    }
    if (mo < 0) { y--; mo += 12; }
    return { y: y, mo: mo, d: d };
  }

  function daysBetween(a, b) {
    var ms = Math.abs(b.getTime() - a.getTime());
    return Math.floor(ms / 86400000);
  }

  function fmtDate(d) {
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '.' + mm + '.' + dd;
  }

  function render() {
    var d = parseDate(cfg.date);
    if (!d) { showEdit(); return; }

    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = daysBetween(d, today);
    var ymd = diffYMD(d, today);
    var isPast = d.getTime() <= today.getTime();

    showEl.hidden = false;
    editEl.hidden = true;

    bigNumEl.textContent = diff;
    unitEl.textContent = '天';

    if (isPast) {
      var parts = [];
      if (ymd.y) parts.push(ymd.y + ' 年');
      if (ymd.mo) parts.push(ymd.mo + ' 个月');
      if (ymd.d || parts.length === 0) parts.push(ymd.d + ' 天');
      subEl.textContent = '自 ' + fmtDate(d) + ' 起 · ' + parts.join(' ');
    } else {
      subEl.textContent = '距离 ' + fmtDate(d) + ' 还有';
    }

    toEl.textContent = cfg.to ? ('致 ' + cfg.to) : '';
    toEl.style.display = cfg.to ? '' : 'none';
    var defMsg = isPast ? '自那天起，我们一起走过的每一天' : '那个特别的日子，正在靠近';
    msgEl.textContent = cfg.msg || defMsg;
    fromEl.textContent = cfg.from ? ('—— ' + cfg.from) : '';
    fromEl.style.display = cfg.from ? '' : 'none';

    document.title = (cfg.to ? (cfg.to + ' · ') : '') +
      (isPast ? ('第 ' + diff + ' 天') : ('还有 ' + diff + ' 天'));
  }

  function showEdit() {
    showEl.hidden = true;
    editEl.hidden = false;
    if (cfg.date) dateInput.value = cfg.date;
    if (cfg.to) toInput.value = cfg.to;
    if (cfg.msg) msgInput.value = cfg.msg;
    if (cfg.from) fromInput.value = cfg.from;
  }

  function toast(t) {
    toastEl.textContent = t;
    toastEl.classList.add('show');
    setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  /* 轻量星空背景 */
  var canvas = document.getElementById('bg');
  var ctx = canvas.getContext('2d');
  var stars = [];
  var W = 0, H = 0;
  var lastT = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = [];
    var n = Math.min(90, Math.floor(W * H / 12000));
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.02 + 0.005
      });
    }
  }

  function loop(now) {
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.a += st.s * (dt * 60);
      if (st.a > 1 || st.a < 0.15) st.s *= -1;
      ctx.globalAlpha = Math.max(0.15, Math.min(1, st.a));
      ctx.fillStyle = '#cfd6ff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }

  resize();
  initStars();
  requestAnimationFrame(loop);

  /* 分享链接：退到项目根，拼接 m=mem&p=days + 定制参数 */
  function buildShareUrl() {
    var parts = location.pathname.split('/').filter(Boolean);
    parts = parts.slice(0, -3); /* 去掉 天数/index.html */
    var root = location.origin + '/' + parts.join('/');
    if (root.charAt(root.length - 1) !== '/') root += '/';
    var q = '?m=mem&p=days';
    if (cfg.date) q += '&date=' + encodeURIComponent(cfg.date);
    if (cfg.to) q += '&to=' + encodeURIComponent(cfg.to);
    if (cfg.msg) q += '&msg=' + encodeURIComponent(cfg.msg);
    if (cfg.from) q += '&from=' + encodeURIComponent(cfg.from);
    return root + q;
  }

  function fallbackCopy(url) {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('链接已复制，去分享吧');
    } catch (e) {
      toast('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
  }

  /* 事件 */
  document.getElementById('editBtn').addEventListener('click', showEdit);

  document.getElementById('saveBtn').addEventListener('click', function () {
    var v = dateInput.value;
    if (!parseDate(v)) { toast('请先选一个有效日期'); return; }
    cfg.date = v;
    cfg.to = (toInput.value || '').trim();
    cfg.msg = (msgInput.value || '').trim();
    cfg.from = (fromInput.value || '').trim();
    saveCfg();
    render();
    toast('已保存');
  });

  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = buildShareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { toast('链接已复制，去分享吧'); },
        function () { fallbackCopy(url); }
      );
    } else {
      fallbackCopy(url);
    }
  });

  /* 返回（iframe 内可用；独立打开或分享直达 direct=1 隐藏） */
  if (window.top === window || isDirect) {
    backBtn.style.display = 'none';
  } else {
    backBtn.addEventListener('click', function () {
      window.top.postMessage({ nav: '?m=mem' }, '*');
    });
  }

  window.addEventListener('resize', function () { resize(); initStars(); });

  render();
})();
