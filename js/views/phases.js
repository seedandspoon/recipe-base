import { state, savePhase, setWeekPlanEntry } from '../store.js';
import { t, tField } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../toast.js';
import { scoreRecipeForPhase } from '../match-score.js';
import { recipeCardHtml, FOOD_CATEGORIES, PHASE_ICONS } from './shared.js';

let editing = false;

const FACT_FIELDS = ['duration', 'hormones', 'mood', 'exercise', 'cookingStyle', 'seedCycling'];
const GI_DOTS = { low: '🟢', medium: '🟡', high: '🔴', na: '⚪' };

export async function renderPhases({ params, query }) {
  const activeId = params.id || query.id || state.settings.currentPhaseId || state.phases[0].id;
  editing = false;
  paint(activeId);
}

function paint(activeId) {
  const phase = state.phases.find((p) => p.id === activeId) || state.phases[0];
  const isCurrent = state.settings.currentPhaseId === phase.id;
  const favoredFoods = state.foods.filter((f) => (f.phases || []).includes(phase.id));
  const foodsByCategory = new Map();
  for (const f of favoredFoods) {
    const cat = f.category || 'pantry';
    if (!foodsByCategory.has(cat)) foodsByCategory.set(cat, []);
    foodsByCategory.get(cat).push(f);
  }
  const orderedCategories = FOOD_CATEGORIES.filter((c) => foodsByCategory.has(c));

  // "Belongs to this phase" = at least half of its recognized ingredients
  // are favored for it — a slightly lower bar than the "high match" badge
  // color, so this section stays useful even for recipes that lean this
  // way without being a perfect match.
  const phaseRecipes = state.recipes.filter((r) => {
    const { score } = scoreRecipeForPhase(r, phase.id, state.foods);
    return score !== null && score >= 0.5;
  });
  const weekRecipeIds = new Set(state.weekPlan.map((w) => w.recipeId));

  document.getElementById('view').innerHTML = `
    <div class="phase-tabs">
      ${state.phases.map((p) => `
        <button class="phase-tab ${p.id === phase.id ? 'active' : ''}" data-phase-tab="${p.id}"
          style="${p.id === phase.id ? `background:var(${p.colorVar});` : ''}">
          ${PHASE_ICONS[p.id] || ''} ${t(`phase_${p.id}`)}
        </button>`).join('')}
    </div>

    <div class="phase-card" style="border-color:var(${phase.colorVar});">
      <div class="flex-between">
        <h1 style="color:var(${phase.colorVar});">${PHASE_ICONS[phase.id] || ''} ${t(`phase_${phase.id}`)}</h1>
        <div class="filter-row">
          ${isCurrent ? `<span class="badge badge-phase-${phase.id}">${t('current_phase_badge')}</span>` : ''}
          <button class="btn btn-small" id="edit-toggle-btn">${editing ? t('cancel') : t('edit')}</button>
        </div>
      </div>

      ${editing ? editFormHtml(phase) : factsHtml(phase)}

      <hr class="sep" />

      <div class="flex-between">
        <h3 style="margin:0;">${t('favored_foods')}</h3>
        <span class="small muted">${favoredFoods.length}</span>
      </div>
      ${orderedCategories.length ? orderedCategories.map((cat) => `
        <div class="food-category-group">
          <h4>${t(`category_${cat}`)}</h4>
          <div class="food-chip-list">
            ${foodsByCategory.get(cat).map((f) => `
              <a class="food-chip" href="#/foods?highlight=${f.id}">
                ${escapeHtml(f.name_fr)}
                <span title="${t('glycemic_index')}: ${f.gi.level === 'na' ? t('gi_not_applicable') : t(`gi_${f.gi.level}`)}">${GI_DOTS[f.gi.level] || ''}</span>
                ${f.organic.level === 'high' ? `<span title="${t('organic_high')}">🌱</span>` : ''}
                ${f.organic.level === 'low' ? `<span title="${t('organic_low')}">✓</span>` : ''}
              </a>`).join('')}
          </div>
        </div>
      `).join('') : `<p class="muted small">—</p>`}
      ${favoredFoods.length ? `<p class="small muted mt-1">🟢 ${t('gi_low')} · 🟡 ${t('gi_medium')} · 🔴 ${t('gi_high')} · 🌱 ${t('organic_high')} · ✓ ${t('organic_low')}</p>` : ''}

      <hr class="sep" />

      <h3>${t('my_notes')}</h3>
      <textarea id="notes-area" rows="4" placeholder="${t('my_notes')}">${escapeHtml(phase.userNotes || '')}</textarea>
      <button class="btn btn-small mt-1" id="save-notes-btn">${t('save')}</button>
    </div>

    <div class="section">
      <h3>${t('phase_recipes_title')} <span class="muted small">${phaseRecipes.length}</span></h3>
      ${phaseRecipes.length ? `
        <div class="recipe-grid">
          ${phaseRecipes.map((r) => recipeCardHtml(r, { currentPhaseId: phase.id, foods: state.foods, inWeek: weekRecipeIds.has(r.id) })).join('')}
        </div>` : `<p class="muted small">${t('no_phase_recipes', { phase: t(`phase_${phase.id}`) })}</p>`}
    </div>
  `;

  document.querySelectorAll('[data-phase-tab]').forEach((btn) => {
    btn.addEventListener('click', () => { editing = false; go(`/phases/${btn.dataset.phaseTab}`); paint(btn.dataset.phaseTab); });
  });

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

  document.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const recipeId = btn.dataset.quickAdd;
      const recipe = state.recipes.find((r) => r.id === recipeId);
      await setWeekPlanEntry(recipeId, recipe.servings || 1);
      toast(t('quick_add_to_week') + ' ✓');
      paint(phase.id);
    });
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
