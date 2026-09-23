/* Shared navigation only: no analytics, storage, or network requests. */
(function () {
  var nav = document.querySelector('.brand-nav');
  var button = nav && nav.querySelector('.brand-menu');
  var links = nav && nav.querySelector('.brand-links');
  if (!button || !links) return;
  nav.classList.add('menu-enhanced');
  function close() { links.classList.remove('is-open'); button.setAttribute('aria-expanded', 'false'); button.textContent = 'メニュー ☰'; }
  button.addEventListener('click', function () {
    var open = !links.classList.contains('is-open');
    links.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? '閉じる ×' : 'メニュー ☰';
  });
  links.addEventListener('click', function (event) { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && links.classList.contains('is-open')) { close(); button.focus(); } });
})();
