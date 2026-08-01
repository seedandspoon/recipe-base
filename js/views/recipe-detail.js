import { state, deleteRecipe, setWeekPlanEntry } from '../store.js';
import { t } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml } from '../utils.js';
import { stars, matchBadge } from './shared.js';
import { matchIngredients } from '../matcher.js';
import { scoreRecipeForPhase } from '../match-score.js';
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

  let matchDetail = '';
  if (currentPhaseId) {
    const res = scoreRecipeForPhase(recipe, currentPhaseId, state.foods);
    if (res.score !== null) {
      matchDetail = `<p class="small muted">${res.favoredCount}/${res.matchedCount} ${t('ingredients').toLowerCase()} ${t('favored_foods').toLowerCase()} (${t(`phase_${currentPhaseId}`)}).</p>`;
    }
  }

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
        ${matchDetail}
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
      <div class="flex-between">
        <label style="margin:0;">${t('add_to_week')}</label>
      </div>
      <div class="filter-row mt-1">
        <input id="portions-input" type="number" min="0" style="width:90px;" value="${weekEntry ? weekEntry.portions : ''}" placeholder="${t('portions_to_cook')}" />
        <button class="btn btn-primary btn-small" id="add-week-btn">${t('add_to_week')}</button>
        ${weekEntry ? `<span class="small muted">${t('portions_to_cook')}: ${weekEntry.portions}</span>` : ''}
      </div>
    </div>

    <div class="section">
      <h3>${t('nutrition')}</h3>
      <div class="filter-row">
        ${recipe.nutrition?.calories ? `<span class="badge">${recipe.nutrition.calories} kcal</span>` : ''}
        ${recipe.nutrition?.protein_g ? `<span class="badge">${recipe.nutrition.protein_g} g protéines</span>` : ''}
        ${recipe.nutrition?.carbs_g ? `<span class="badge">${recipe.nutrition.carbs_g} g glucides</span>` : ''}
        ${recipe.nutrition?.fat_g ? `<span class="badge">${recipe.nutrition.fat_g} g lipides</span>` : ''}
      </div>
    </div>

    <div class="section">
      <h3>${t('ingredients')}</h3>
      <ul class="ingredient-list">
        ${(recipe.ingredients || []).map((ing, i) => {
          const m = matched[i];
          const food = m && m.foodId ? foodById.get(m.foodId) : null;
          const favored = food && currentPhaseId && (food.phases || []).includes(currentPhaseId);
          return `
            <li>
              <input type="checkbox" data-check-ing="${i}" ${checkedIngredients.has(i) ? 'checked' : ''} />
              <span class="qty">${escapeHtml(ing.quantity || '')} ${escapeHtml(ing.unit || '')}</span>
              <span style="flex:1;">${escapeHtml(ing.name)}</span>
              ${ing.allergen ? `<span class="allergen-flag">${t('allergen')}</span>` : ''}
              ${favored ? `<span class="badge badge-phase-${currentPhaseId}">✓</span>` : ''}
            </li>`;
        }).join('')}
      </ul>
    </div>

    <div class="section">
      <h3>${t('steps')}</h3>
      <ol class="steps-list">
        ${(recipe.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </div>
  `;

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (confirm(t('confirm_delete_recipe'))) {
      await deleteRecipe(recipe.id);
      toast(t('delete') + ' ✓');
      go('/gallery');
    }
  });

  document.getElementById('add-week-btn').addEventListener('click', async () => {
    const portions = Number(document.getElementById('portions-input').value) || 0;
    await setWeekPlanEntry(recipe.id, portions);
    toast(t('add_to_week') + ' ✓');
    renderRecipeDetail({ params });
  });

  document.querySelectorAll('[data-check-ing]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const i = Number(cb.dataset.checkIng);
      if (cb.checked) checkedIngredients.add(i); else checkedIngredients.delete(i);
    });
  });
}
