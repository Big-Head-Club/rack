/* The tray. One line in a game's <head> and it gets the two controls every game in the set
 * shares: EJECT, which is the way back to the shelf, and SUBSCRIBE, which puts the game in
 * your stream.
 *
 *   <script src="https://hundred-carts-production.up.railway.app/bar.js"
 *           data-game="gorgon" data-name="GORGON"></script>
 *
 * It lives in a shadow root. These games are twenty different codebases with twenty different
 * stylesheets, and a drop-in that inherits any of them is a drop-in that breaks somewhere; a
 * shadow root is the only way to be sure it looks the same in all of them and touches none of
 * them. For the same reason it is a small pill in the corner rather than a full-width bar —
 * most of these games are a canvas that fills the viewport, and a bar across the top would
 * cover somebody's score.
 *
 * Subscribing has to bounce through the menu. The stream belongs to the menu's origin and
 * browsers partition third-party storage, so a game cannot write to it from inside itself: the
 * button carries the slug to the menu, which records it and sends you straight back. */
(function () {
  // currentScript is set for deferred classic scripts too, but this drops into twenty
  // codebases and one of them will load it some way that clears it — so fall back to finding
  // the tag by its own attribute.
  var me = document.currentScript || document.querySelector('script[data-game]');
  if (!me || window.__cartTray) return;
  window.__cartTray = 1;

  // the orange off the tower cartridge — the one colour the whole set is branded on
  var BRAND = '#f2812f';
  var slug = me.dataset.game || '';
  var menu = (me.dataset.menu || new URL(me.src).origin).replace(/\/$/, '');
  var KEY = 'carts.sub.' + slug;

  function subscribed() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function remember(v) {
    try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) {}
  }

  var host = document.createElement('div');
  host.id = 'cart-tray';
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    /* A tag on the edge, not a bar across the top: most of these games are a canvas that
       fills the viewport, and anything spanning the top covers somebody's score. Spine-set
       text keeps it under 40px wide, and the brand edge is the one colour that carries. */
    '.tag{' +
      'position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147483000;' +
      'display:flex;flex-direction:column;align-items:stretch;' +
      'font:400 10px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;' +
      'letter-spacing:.26em;' +
      'border-radius:0 9px 9px 0;overflow:hidden;' +
      'background:rgba(14,12,10,.66);' +
      '-webkit-backdrop-filter:blur(9px) saturate(1.3);backdrop-filter:blur(9px) saturate(1.3);' +
      'box-shadow:inset -1px 0 0 rgba(255,255,255,.10),0 8px 22px -10px rgba(0,0,0,.75);' +
      'border-left:2px solid ' + BRAND + ';' +
      'opacity:.5;transition:opacity .25s ease;' +
    '}' +
    '.tag:hover,.tag:focus-within{opacity:1}' +
    'button{' +
      'all:unset;box-sizing:border-box;cursor:pointer;' +
      'writing-mode:vertical-rl;transform:rotate(180deg);' +
      'padding:16px 11px;color:#ded6cb;text-indent:.26em;' +
      'transition:color .2s ease,background .2s ease;' +
    '}' +
    'button:hover{color:#fff;background:rgba(255,255,255,.07)}' +
    'button:focus-visible{outline:2px solid ' + BRAND + ';outline-offset:-3px}' +
    '.sep{height:1px;background:rgba(255,255,255,.14);flex:none}' +
    '.on{color:' + BRAND + '}' +
    '@media (prefers-reduced-motion:reduce){.tag,button{transition:none}}' +
    '</style>' +
    '<div class="tag">' +
      '<button id="eject" aria-label="Eject — back to the shelf">EJECT</button>' +
      '<span class="sep"></span>' +
      '<button id="sub"></button>' +
    '</div>';

  var sub = root.getElementById('sub');
  function paint() {
    var on = subscribed();
    sub.textContent = on ? 'SUBSCRIBED' : 'SUBSCRIBE';
    sub.className = on ? 'on' : '';
    sub.setAttribute('aria-pressed', on ? 'true' : 'false');
    sub.setAttribute('aria-label', on ? 'Subscribed — remove from your stream'
                                      : 'Subscribe — add to your stream');
  }
  paint();

  root.getElementById('eject').addEventListener('click', function () {
    location.href = menu + '/';
  });
  sub.addEventListener('click', function () {
    var on = !subscribed();
    remember(on);
    paint();
    location.href = menu + '/?' + (on ? 'sub=' : 'unsub=') + encodeURIComponent(slug) +
      '&back=' + encodeURIComponent(location.href);
  });

  (document.body || document.documentElement).appendChild(host);
})();
