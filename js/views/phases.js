import { state, savePhase, updateSettings } from '../store.js';
import { t, tField } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../toast.js';

let editing = false;

const FACT_FIELDS = ['duration', 'hormones', 'mood', 'exercise', 'cookingStyle', 'seedCycling'];

export async function renderPhases({ params, query }) {
  const activeId = params.id || query.id || state.settings.currentPhaseId || state.phases[0].id;
  editing = false;
  paint(activeId);
}

function paint(activeId) {
  const phase = state.phases.find((p) => p.id === activeId) || state.phases[0];
  const isCurrent = state.settings.currentPhaseId === phase.id;
  const favoredFoods = state.foods.filter((f) => (f.phases || []).includes(phase.id));

  document.getElementById('view').innerHTML = `
    <div class="phase-tabs">
      ${state.phases.map((p) => `
        <button class="phase-tab ${p.id === phase.id ? 'active' : ''}" data-phase-tab="${p.id}"
          style="${p.id === phase.id ? `background:var(${p.colorVar});` : ''}">
          ${t(`phase_${p.id}`)}
        </button>`).join('')}
    </div>

    <div class="phase-card" style="border-color:var(${phase.colorVar});">
      <div class="flex-between">
        <h1 style="color:var(${phase.colorVar});">${t(`phase_${phase.id}`)}</h1>
        <div class="filter-row">
          ${isCurrent
            ? `<span class="badge badge-phase-${phase.id}">${t('current_phase_badge')}</span>`
            : `<button class="btn btn-small" id="set-current-btn">${t('set_current_phase')}</button>`}
          <button class="btn btn-small" id="edit-toggle-btn">${editing ? t('cancel') : t('edit')}</button>
        </div>
      </div>

      ${editing ? editFormHtml(phase) : factsHtml(phase)}

      <hr class="sep" />

      <h3>${t('favored_foods')}</h3>
      <div class="food-chip-list">
        ${favoredFoods.length ? favoredFoods.map((f) => `
          <a class="food-chip" href="#/foods?highlight=${f.id}">
            ${escapeHtml(f.name_fr)} / ${escapeHtml(f.name_en)}
            <span class="badge">${f.gi.level === 'na' ? 'IG —' : `IG ${f.gi.value ?? ''} (${t(`difficulty_${f.gi.level === 'low' ? 'easy' : f.gi.level === 'medium' ? 'medium' : 'hard'}`)})`}</span>
            ${f.organic.level === 'high' ? `<span class="badge">${t('organic_high')}</span>` : ''}
          </a>`).join('') : `<span class="muted small">—</span>`}
      </div>

      <hr class="sep" />

      <h3>${t('my_notes')}</h3>
      <textarea id="notes-area" rows="4" placeholder="${t('my_notes')}">${escapeHtml(phase.userNotes || '')}</textarea>
      <button class="btn btn-small mt-1" id="save-notes-btn">${t('save')}</button>
    </div>
  `;

  document.querySelectorAll('[data-phase-tab]').forEach((btn) => {
    btn.addEventListener('click', () => { editing = false; go(`/phases/${btn.dataset.phaseTab}`); paint(btn.dataset.phaseTab); });
  });

  const setCurrentBtn = document.getElementById('set-current-btn');
  if (setCurrentBtn) {
    setCurrentBtn.addEventListener('click', async () => {
      await updateSettings({ currentPhaseId: phase.id });
      toast(t('set_current_phase') + ' ✓');
      paint(phase.id);
    });
  }

  document.getElementById('edit-toggle-btn').addEventListener('click', () => {
    editing = !editing;
    paint(phase.id);
  });

  if (editing) {
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = { ...phase };
      for (const field of FACT_FIELDS) {
        updated[field] = {
          fr: document.getElementById(`ef-${field}-fr`).value,
          en: document.getElementById(`ef-${field}-en`).value,
        };
      }
      await savePhase(updated);
      toast(t('save') + ' ✓');
      editing = false;
      paint(phase.id);
    });
  }

  document.getElementById('save-notes-btn').addEventListener('click', async () => {
    const updated = { ...phase, userNotes: document.getElementById('notes-area').value };
    await savePhase(updated);
    toast(t('save') + ' ✓');
  });
}

function factsHtml(phase) {
  return `
    <div class="phase-grid">
      ${FACT_FIELDS.map((field) => `
        <div class="phase-fact">
          <h4>${t(fieldLabelKey(field))}</h4>
          <p>${escapeHtml(tField(phase[field]))}</p>
        </div>`).join('')}
    </div>`;
}

function editFormHtml(phase) {
  return `
    <form id="edit-form">
      ${FACT_FIELDS.map((field) => `
        <fieldset>
          <legend>${t(fieldLabelKey(field))}</legend>
          <div class="field-row">
            <div class="field"><label>Français</label><textarea rows="2" id="ef-${field}-fr">${escapeHtml(phase[field]?.fr || '')}</textarea></div>
            <div class="field"><label>English</label><textarea rows="2" id="ef-${field}-en">${escapeHtml(phase[field]?.en || '')}</textarea></div>
          </div>
        </fieldset>`).join('')}
      <button type="submit" class="btn btn-primary">${t('save')}</button>
    </form>`;
}

function fieldLabelKey(field) {
  return { duration: 'duration', hormones: 'hormones', mood: 'mood', exercise: 'exercise', cookingStyle: 'cooking_style', seedCycling: 'seed_cycling' }[field];
}
