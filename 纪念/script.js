(function () {
  'use strict';

  /* 纪念模块：读 ?p= 参数决定进哪个子项目，不带则显示列表 */
  var ITEMS = [
    { id: 'days', name: '纪念日', desc: '记一个日子，数着过', path: '天数/index.html', ready: true, icon: '📅' }
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
    /* direct=1（分享直达）+ date/to/msg/from（纪念日定制参数）一并透传给子页面 */
    var qs = [];
    if (direct) qs.push('direct=1');
    var CUSTOM_KEYS = ['date', 'to', 'msg', 'from'];
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
    ico.textContent = item.icon || (item.ready ? '📅' : '🎁');
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
          window.top.postMessage({ nav: '?m=mem&p=' + item.id }, '*');
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
