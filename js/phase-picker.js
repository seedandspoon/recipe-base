// Global, always-visible phase selector (pill in the top bar). Lets you
// change "my current phase" from anywhere, not just from Settings or the
// Cycle page.

import { state, updateSettings } from './store.js';
import { t } from './i18n.js';
import { escapeHtml } from './utils.js';
import { render as rerenderRoute } from './router.js';

const PHASE_ICONS = {
  menstrual: '❄️',
  follicular: '🌱',
  ovulatory: '☀️',
  luteal: '🍂',
};

let open = false;

export function mountPhasePicker() {
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('phase-picker');
    if (!picker) return;
    if (!picker.contains(e.target)) closeMenu();
  });
  renderPhasePicker();
}

export function renderPhasePicker() {
  const root = document.getElementById('phase-picker');
  if (!root) return;

  const currentPhase = state.phases.find((p) => p.id === state.settings.currentPhaseId) || state.phases[0];
  if (!currentPhase) { root.innerHTML = ''; return; }

  root.innerHTML = `
    <button type="button" class="phase-picker-btn" id="phase-picker-btn">
      <span>${PHASE_ICONS[currentPhase.id] || ''}</span>
      <span>${t(`phase_${currentPhase.id}`)}</span>
      <span class="chevron">⌄</span>
    </button>
    <div class="phase-picker-menu" id="phase-picker-menu" ${open ? '' : 'hidden'}>
      ${state.phases.map((p) => `
        <button type="button" class="phase-picker-option ${p.id === currentPhase.id ? 'active' : ''}" data-phase-option="${p.id}">
          <span>${PHASE_ICONS[p.id] || ''}</span>
          <span>${escapeHtml(t(`phase_${p.id}`))}</span>
          ${p.id === currentPhase.id ? '<span class="check">✓</span>' : ''}
        </button>`).join('')}
    </div>
  `;

  document.getElementById('phase-picker-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    open = !open;
    renderPhasePicker();
  });
  root.querySelectorAll('[data-phase-option]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await updateSettings({ currentPhaseId: btn.dataset.phaseOption });
      closeMenu();
      rerenderRoute();
    });
  });
}

function closeMenu() {
  if (!open) return;
  open = false;
  renderPhasePicker();
}
