(function () {
  'use strict';

  /* ==========================================================
     1. 可定制的祝福玩法（id 与祝福模块 ITEMS 对应）
     ========================================================== */
  var TYPES = [
    { id: 'birthday', name: '🎂 生日', desc: '点蜡烛许愿，吹灭进正片', defMsg: '生日快乐' },
    { id: 'love', name: '❤️ 表白', desc: '粒子爱心，文案写在心上', defMsg: '遇见你，真好' },
    { id: 'guoqing', name: '🎆 国庆', desc: '烟花之夜，点击放烟花', defMsg: '国庆快乐' },
    { id: 'yuandan', name: '❄️ 元旦', desc: '跨年倒数，雪夜烟花', defMsg: '元旦快乐' }
  ];

  var TO_MAX = 12;
  var MSG_MAX = 60;
  var FROM_MAX = 12;

  /* ==========================================================
     2. 元素
     ========================================================== */
  var typesEl = document.getElementById('types');
  var toInput = document.getElementById('toInput');
  var msgInput = document.getElementById('msgInput');
  var fromInput = document.getElementById('fromInput');
  var linkText = document.getElementById('linkText');
  var copyBtn = document.getElementById('copyBtn');
  var previewBtn = document.getElementById('previewBtn');
  var copyTip = document.getElementById('copyTip');

  var selIndex = 0;

  /* ==========================================================
     3. 项目根地址（本地 = http://127.0.0.1:8123/，线上 = …/yunni/）
        定制页在 祝福/定制/ 下，向上退三级即项目根
     ========================================================== */
  var base = location.origin + location.pathname.split('/').slice(0, -3).join('/') + '/';

  /* ==========================================================
     4. 生成链接
     ========================================================== */
  function buildLink() {
    var t = TYPES[selIndex];
    var qs = ['m=wish', 'p=' + t.id];

    var to = toInput.value.trim().slice(0, TO_MAX);
    var msg = msgInput.value.trim().replace(/\s+/g, ' ').slice(0, MSG_MAX);
    var from = fromInput.value.trim().slice(0, FROM_MAX);

    if (to) qs.push('to=' + encodeURIComponent(to));
    if (msg) qs.push('msg=' + encodeURIComponent(msg));
    if (from) qs.push('from=' + encodeURIComponent(from));

    return base + '?' + qs.join('&');
  }

  function refresh() {
    msgInput.placeholder = '留空 = ' + TYPES[selIndex].defMsg;
    linkText.textContent = buildLink();
    copyTip.classList.remove('ok');
    copyTip.textContent = '微信里粘贴给对方即可';
  }

  /* ==========================================================
     5. 组装
     ========================================================== */
  var typeEls = TYPES.map(function (t, i) {
    var el = document.createElement('div');
    el.className = 'type' + (i === selIndex ? ' active' : '');

    var name = document.createElement('div');
    name.className = 'name';
    name.textContent = t.name;
    var desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = t.desc;

    el.appendChild(name);
    el.appendChild(desc);

    el.addEventListener('click', function () {
      selIndex = i;
      for (var j = 0; j < typeEls.length; j++) {
        typeEls[j].classList.toggle('active', j === i);
      }
      refresh();
    });

    typesEl.appendChild(el);
    return el;
  });

  toInput.addEventListener('input', refresh);
  msgInput.addEventListener('input', refresh);
  fromInput.addEventListener('input', refresh);

  /* ==========================================================
     6. 复制 / 预览
     ========================================================== */
  copyBtn.addEventListener('click', function () {
    var link = buildLink();

    function done() {
      copyTip.textContent = '已复制，去发给 TA 吧';
      copyTip.classList.add('ok');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, function () { legacyCopy(link, done); });
    } else {
      legacyCopy(link, done);
    }
  });

  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) done();
      else copyTip.textContent = '复制失败，长按链接手动复制';
    } catch (e) {
      copyTip.textContent = '复制失败，长按链接手动复制';
    }
    document.body.removeChild(ta);
  }

  previewBtn.addEventListener('click', function () {
    window.open(buildLink(), '_blank');
  });

  /* ==========================================================
     7. 返回（iframe 内时；独立打开或 direct=1 则隐藏）
     ========================================================== */
  var backBtn = document.getElementById('backBtn');
  var isDirect = new URLSearchParams(window.location.search).get('direct') === '1';
  if (window.top === window || isDirect) {
    backBtn.style.display = 'none';
  } else {
    backBtn.addEventListener('click', function () {
      window.top.postMessage({ nav: '?m=wish' }, '*');
    });
  }

  refresh();
})();
