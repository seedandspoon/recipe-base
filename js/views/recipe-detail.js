import { state, deleteRecipe, setWeekPlanEntry } from '../store.js';
import { t } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml, normalizeStepSections } from '../utils.js';
import { stars, matchBadge } from './shared.js';
import { matchIngredients } from '../matcher.js';
import { toast } from '../toast.js';

const checkedIngredients = new Set();

export async function renderRecipeDetail({ params }) {
  const recipe = state.recipes.find((r) => r.id === params.id);
  if (!recipe) {
    document.getElementById('view').innerHTML = `<div class="empty-state">${t('no_recipes')}</div>`;
    return;
  }
  const cycleOn = state.settings.cycleModeEnabled;
  const currentPhaseId = cycleOn ? state.settings.currentPhaseId : null;
  const foodById = new Map(state.foods.map((f) => [f.id, f]));
  const matched = matchIngredients(recipe.ingredients || [], state.foods);
  const weekEntry = state.weekPlan.find((w) => w.recipeId === recipe.id);
  const stepSections = normalizeStepSections(recipe.steps);
  const n = recipe.nutrition || {};

  document.getElementById('view').innerHTML = `
    ${recipe.photo ? `<img class="recipe-header-photo" src="${recipe.photo}" alt="">` : ''}
    <div class="recipe-title-row">
      <div>
        <h1>${escapeHtml(recipe.title)}</h1>
        <div class="badges">
          ${matchBadge(recipe, currentPhaseId, state.foods)}
          ${recipe.status !== 'active' ? `<span class="badge badge-status-${recipe.status}">${t(`status_${recipe.status}`)}</span>` : ''}
          ${(recipe.tags || []).map((tg) => `<span class="badge">${escapeHtml(tg)}</span>`).join('')}
        </div>
      </div>
      <div class="filter-row">
        <a class="btn" href="#/recipe/${recipe.id}/edit">${t('edit')}</a>
        <button class="btn btn-danger" id="delete-btn">${t('delete')}</button>
      </div>
    </div>

    ${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''}
    ${recipe.source ? `<p class="small muted">${t('source')}: <a href="${escapeHtml(recipe.source)}" target="_blank" rel="noopener">${escapeHtml(recipe.source)}</a></p>` : ''}

    <div class="recipe-stats">
      ${recipe.prepTime ? `<div><strong>${recipe.prepTime} ${t('minutes')}</strong>${t('prep_time')}</div>` : ''}
      ${recipe.cookTime ? `<div><strong>${recipe.cookTime} ${t('minutes')}</strong>${t('cook_time')}</div>` : ''}
      <div><strong>${recipe.servings}</strong>${t('servings')}</div>
      ${recipe.difficulty ? `<div><strong>${t(`difficulty_${recipe.difficulty}`)}</strong>${t('difficulty')}</div>` : ''}
      ${recipe.rating ? `<div><strong class="stars">${stars(recipe.rating)}</strong>${t('rating')}</div>` : ''}
    </div>

    <div class="card">
      ${weekEntry
        ? `<div class="flex-between">
            <span>${t('already_in_week')} — ${t('portions_to_cook')}: <strong>${weekEntry.portions}</strong></span>
            <a class="btn btn-small" href="#/week">${t('nav_week')}</a>
          </div>`
        : `<button class="btn btn-primary" id="add-week-btn">🗓️ ${t('quick_add_to_week')}</button>`}
    </div>

    ${hasAnyNutrition(n) ? `
    <div class="section">
      <h3>${t('nutrition')}</h3>
      <div class="filter-row">
        ${n.calories ? `<span class="badge">${n.calories} kcal</span>` : ''}
        ${n.protein_g ? `<span class="badge">${n.protein_g} g ${t('protein_label').toLowerCase()}</span>` : ''}
        ${n.fat_g ? `<span class="badge">${n.fat_g} g ${t('fat_label').toLowerCase()}${n.saturates_g ? ` (${n.saturates_g} g ${t('saturates_label')})` : ''}</span>` : ''}
        ${n.carbs_g ? `<span class="badge">${n.carbs_g} g ${t('carbs_label').toLowerCase()}${n.sugars_g ? ` (${n.sugars_g} g ${t('sugars_label')})` : ''}</span>` : ''}
        ${n.fiber_g ? `<span class="badge">${n.fiber_g} g ${t('fiber_label').toLowerCase()}</span>` : ''}
      </div>
    </div>` : ''}

    <div class="section">
      <h3>${t('ingredients')}</h3>
      <ul class="ingredient-list">
        ${(recipe.ingredients || []).map((ing, i) => {
          const m = matched[i];
          const food = m && m.foodId ? foodById.get(m.foodId) : null;
          const recognized = !!food;
          const favored = food && currentPhaseId && (food.phases || []).includes(currentPhaseId);
          return `
            <li>
              <input type="checkbox" data-check-ing="${i}" ${checkedIngredients.has(i) ? 'checked' : ''} />
              <span class="qty">${escapeHtml(ing.quantity || '')} ${escapeHtml(ing.unit || '')}</span>
              <span style="flex:1;">${escapeHtml(ing.name)}</span>
              ${ing.allergen ? `<span class="allergen-flag">${t('allergen')}</span>` : ''}
              ${recognized ? `<span class="recognized-flag" title="${t('ingredient_recognized')}">✓</span>` : ''}
              ${favored ? `<span class="badge badge-phase-${currentPhaseId}">${t(`phase_${currentPhaseId}`)}</span>` : ''}
            </li>`;
        }).join('')}
      </ul>
    </div>

    <div class="section">
      <h3>${t('steps')}</h3>
      ${stepSections.map((section) => `
        <div class="recipe-steps-section">
          ${section.title ? `<h4>${escapeHtml(section.title)}</h4>` : ''}
          <ol class="steps-list">
            ${section.items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
          </ol>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (confirm(t('confirm_delete_recipe'))) {
      await deleteRecipe(recipe.id);
      toast(t('delete') + ' ✓');
      go('/gallery');
    }
  });

  const addWeekBtn = document.getElementById('add-week-btn');
  if (addWeekBtn) {
    addWeekBtn.addEventListener('click', async () => {
      await setWeekPlanEntry(recipe.id, recipe.servings || 1);
      toast(t('quick_add_to_week') + ' ✓');
      renderRecipeDetail({ params });
    });
  }

  document.querySelectorAll('[data-check-ing]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const i = Number(cb.dataset.checkIng);
      if (cb.checked) checkedIngredients.add(i); else checkedIngredients.delete(i);
    });
  });
}

function hasAnyNutrition(n) {
  return !!(n.calories || n.protein_g || n.fat_g || n.carbs_g || n.fiber_g);
}
