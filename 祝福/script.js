(function () {
  'use strict';

  /* 祝福模块：读 ?p= 参数决定进哪个子项目，不带则显示列表 */
  var ITEMS = [
    { id: 'custom', name: '定制祝福', desc: '填上名字和话，生成专属链接', path: '定制/index.html', ready: true, icon: '✨' },
    { id: 'love', name: '表白', desc: '把想说的话，交给一颗心', path: '表白/index.html', ready: true },
    { id: 'guoqing', name: '国庆祝福', desc: '烟花之夜，点击放烟花', path: '国庆/index.html', ready: true },
    { id: 'yuandan', name: '元旦祝福', desc: '跨年倒数，雪夜烟花', path: '元旦/index.html', ready: true },
    { id: 'birthday', name: '生日祝福', desc: '点亮蜡烛，许愿吹灭', path: '生日/index.html', ready: true },
    { id: 'chunjie', name: '春节祝福', desc: '待开发', path: '春节/index.html', ready: false }
  ];

  var sp = new URLSearchParams(window.location.search);
  var p = sp.get('p');
  var direct = sp.get('direct') === '1';
  var view = document.getElementById('view');
  var menu = document.getElementById('menu');
  var list = document.getElementById('list');
  var current = null;
  var i;

  for (i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].id === p) current = ITEMS[i];
  }

  if (current && current.ready) {
    document.title = current.name;
    /* direct=1（分享直达）+ to/msg/from（链接定制参数）一并透传给子页面 */
    var qs = [];
    if (direct) qs.push('direct=1');
    var CUSTOM_KEYS = ['to', 'msg', 'from'];
    for (var k = 0; k < CUSTOM_KEYS.length; k++) {
      var cv = sp.get(CUSTOM_KEYS[k]);
      if (cv) qs.push(CUSTOM_KEYS[k] + '=' + encodeURIComponent(cv));
    }
    view.src = current.path + (qs.length ? ('?' + qs.join('&')) : '');
    view.style.display = 'block';
    return;
  }

  menu.style.display = 'block';
  for (i = 0; i < ITEMS.length; i++) {
    bindCard(ITEMS[i]);
  }

  function bindCard(item) {
    var a = document.createElement('a');
    var row = document.createElement('div');
    var label = document.createElement('span');
    var ico = document.createElement('span');
    var desc = document.createElement('div');

    row.className = 'row';
    label.className = 'label';
    ico.className = 'ico';
    ico.textContent = item.icon || (item.ready ? '❤️' : '🎁');
    label.appendChild(ico);
    label.appendChild(document.createTextNode(item.name));
    desc.className = 'desc';
    desc.textContent = item.desc;

    row.appendChild(label);
    a.appendChild(row);
    a.appendChild(desc);

    if (item.ready) {
      a.href = '?p=' + item.id;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.top !== window) {
          window.top.postMessage({ nav: '?m=wish&p=' + item.id }, '*');
        } else {
          window.location.href = '?p=' + item.id;
        }
      });
    } else {
      a.className = 'pending';
    }
    list.appendChild(a);
  }
})();
