(() => {
  const overlay = document.getElementById('intro-film');
  const frame = document.getElementById('intro-frame');
  const skip = document.getElementById('intro-skip');
  // Deep links and reduced-motion visitors go straight to their requested content.
  if (location.hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    return;
  }
  const background = [...document.querySelectorAll('body > header, body > main, body > footer, body > .skip')].filter(el => !el.inert);
  let done = false;
  let timeout;
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timeout);
    window.removeEventListener('message', receive);
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.documentElement.classList.remove('intro-playing');
    background.forEach(el => { el.inert = false; });
    const heading = document.getElementById('hero-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
  function receive(event) {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type === 'kai-promo-complete') finish();
  }
  function onKey(event) {
    if (event.key === 'Escape') finish();
    if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
  }
  window.addEventListener('message', receive);
  document.addEventListener('keydown', onKey);
  skip.addEventListener('click', finish);
  background.forEach(el => { el.inert = true; });
  overlay.hidden = false;
  document.documentElement.classList.add('intro-playing');
  skip.focus({ preventScroll: true });
  // Always release the homepage if the embedded animation fails to load.
  timeout = setTimeout(finish, 22000);
  frame.src = 'promo.html?v=immersive-20261028';
})();
