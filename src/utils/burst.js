export function burstStars(originEl) {
  const rect = originEl.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;

  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  flash.style.cssText = `--ox:${cx}px; --oy:${cy}px;`;
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });

  const wave = document.createElement('div');
  wave.className = 'shockwave';
  wave.style.cssText = `left:${cx}px; top:${cy}px; width:30px; height:30px;`;
  document.body.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove(), { once: true });

  const label = originEl.closest('.shiny-label');
  if (label) {
    label.classList.remove('flash');
    requestAnimationFrame(() => label.classList.add('flash'));
    label.addEventListener('animationend', () => label.classList.remove('flash'), { once: true });
  }
}
