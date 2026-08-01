import { t } from './i18n.js';
import { state } from './store.js';

export function applyCycleModeClass() {
  document.getElementById('app-shell').classList.toggle('cycle-off', !state.settings.cycleModeEnabled);
}

export function refreshStaticText() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}
