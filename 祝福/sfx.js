/* ============================================================
   sfx.js —— 祝福模块共用音效引擎（WebAudio 合成，零素材）
   在子页面 index.html 里先于 script.js 引入：<script src="../sfx.js"></script>
   用法：SFX.play('whoosh' | 'boom' | 'sparkle' | 'crackle' | 'puff' | 'chime')
         SFX.windOn() / SFX.windOff()（长按吹气循环风声）
   音效开关：页面放 <button id="sfxBtn">，本文件自动绑定，状态存 localStorage
   ============================================================ */
(function () {
  'use strict';

  if (window.SFX) return;

  var KEY = 'sfx.muted';
  var ctx = null;
  var master = null;
  var muted = false;
  var windNodes = null;

  try {
    muted = localStorage.getItem(KEY) === '1';
  } catch (e) {}

  function ensure() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  function noiseBuffer(dur) {
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 咻 —— 烟花升空：带通噪声频率上扫 */
  function whoosh() {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.7);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(260 + Math.random() * 120, t);
    bp.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 500, t + 0.55);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.75);
  }

  /* 砰 —— 烟花爆炸：低通下扫噪声 + 低频 thump */
  function boom() {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(1.1);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900 + Math.random() * 400, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 0.85);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    src.connect(lp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 1.1);

    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.45);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(og).connect(master);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  /* 叮 —— 点击/配对：正弦 + 泛音风铃 */
  function sparkle() {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var base = 1318 * Math.pow(2, ((Math.random() * 5) | 0) / 12);
    [1, 2.76].forEach(function (mul, idx) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * mul;
      var g = ctx.createGain();
      var v = idx ? 0.08 : 0.2;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /* 嚓 —— 火柴点燃：高通短噪声 */
  function crackle() {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.06);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2800;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(hp).connect(g).connect(master);
    src.start(t);
  }

  /* 噗 —— 蜡烛吹灭：低通短噪声 */
  function puff() {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.16);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.42, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(lp).connect(g).connect(master);
    src.start(t);
  }

  /* 叮-叮-叮 —— 彩蛋/胜利：三音上行 */
  function chime() {
    if (!ensure()) return;
    [1046.5, 1318.5, 1568].forEach(function (f, i) {
      setTimeout(function () {
        if (!ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + 0.55);
      }, i * 110);
    });
  }

  /* 呼 —— 长按吹气循环风声 */
  function windOn() {
    if (!ensure() || windNodes) return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(1.2);
    src.loop = true;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.55;
    var g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.13, ctx.currentTime + 0.25);
    src.connect(bp).connect(g).connect(master);
    src.start();
    windNodes = { src: src, g: g };
  }

  function windOff() {
    if (!windNodes || !ctx) return;
    var w = windNodes;
    windNodes = null;
    try {
      w.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      w.src.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  window.SFX = {
    get muted() { return muted; },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      return muted;
    },
    play: function (name) {
      if (muted) return;
      try {
        if (name === 'whoosh') whoosh();
        else if (name === 'boom') boom();
        else if (name === 'sparkle') sparkle();
        else if (name === 'crackle') crackle();
        else if (name === 'puff') puff();
        else if (name === 'chime') chime();
      } catch (e) {}
    },
    windOn: function () { if (!muted) windOn(); },
    windOff: windOff
  };

  /* 自动绑定音效开关按钮（页面里有 <button id="sfxBtn"> 即生效） */
  function bindBtn() {
    var btn = document.getElementById('sfxBtn');
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var m = window.SFX.toggle();
      btn.textContent = m ? '🔇' : '🔊';
      if (!m) window.SFX.play('sparkle');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBtn);
  } else {
    bindBtn();
  }
})();
