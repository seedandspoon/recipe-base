import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { scoreRecipeForPhase, scoreLabel } from '../match-score.js';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
export const MEAL_TYPE_ICONS = { breakfast: '🥐', lunch: '🥗', dinner: '🍽️', snack: '🍿', dessert: '🍰' };
export const MEAL_TYPE_ICON_FALLBACK = '🍴';
export const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'any'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const STATUSES = ['draft', 'active', 'archived'];
export const AISLES = [
  'produce', 'meat_poultry', 'fish', 'dairy_eggs',
  'pantry_savory', 'pantry_sweet', 'herbs_spices', 'seeds_dried_fruits', 'other',
];
export const FOOD_CATEGORIES = ['vegetable', 'fruit', 'legume', 'grain', 'meat', 'fish', 'dairy', 'protein', 'seed', 'nut', 'spice', 'fat', 'pantry'];

export function stars(rating) {
  const r = Number(rating) || 0;
  return '★'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r));
}

export function phaseBadge(phaseId) {
  return `<span class="badge badge-phase-${phaseId}">${t(`phase_${phaseId}`)}</span>`;
}

export function matchBadge(recipe, currentPhaseId, foods) {
  if (!currentPhaseId) return '';
  const { score, favoredCount, matchedCount } = scoreRecipeForPhase(recipe, currentPhaseId, foods);
  const label = scoreLabel(score);
  if (!label || matchedCount === 0) return '';
  const word = favoredCount === 1 ? t('ingredient_of_phase_singular') : t('ingredient_of_phase_plural');
  return `<span class="badge badge-match-${label}">🌱 ${favoredCount} ${word}</span>`;
}

// Card markup: the whole card links to the recipe, except the quick-add
// button in the corner, which must stay a sibling (not nested inside the
// link) so its click doesn't also trigger navigation.
export function recipeCardHtml(recipe, { currentPhaseId, foods, inWeek } = {}) {
  const photo = recipe.photo
    ? `<img class="thumb" src="${recipe.photo}" alt="">`
    : `<div class="thumb placeholder">🍽️</div>`;
  const statusBadge = recipe.status && recipe.status !== 'active'
    ? `<span class="badge badge-status-${recipe.status}">${t(`status_${recipe.status}`)}</span>`
    : '';
  const totalTime = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
  const quickAddBtn = inWeek
    ? `<a class="card-quick-add added" href="#/week" title="${t('already_in_week')}" aria-label="${t('already_in_week')}">✓</a>`
    : `<button type="button" class="card-quick-add" data-quick-add="${recipe.id}" title="${t('quick_add_to_week')}" aria-label="${t('quick_add_to_week')}">+</button>`;
  return `
    <div class="recipe-card">
      <a class="card-link" href="#/recipe/${recipe.id}">
        <div class="thumb-wrap">${photo}</div>
        <div class="body">
          <div class="title">${escapeHtml(recipe.title)}</div>
          <div class="meta">
            ${totalTime ? `<span>${totalTime} ${t('minutes')}</span>` : ''}
            ${recipe.rating ? `<span class="stars">${stars(recipe.rating)}</span>` : ''}
          </div>
          <div class="badges">
            ${matchBadge(recipe, currentPhaseId, foods || [])}
            ${statusBadge}
          </div>
        </div>
      </a>
      ${quickAddBtn}
    </div>`;
}

export function foodChip(food, extra = '') {
  return `<span class="food-chip">${escapeHtml(food.name_fr)} / ${escapeHtml(food.name_en)}${extra}</span>`;
}

export function optionList(values, prefix, selected) {
  return values
    .map((v) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${t(`${prefix}_${v}`)}</option>`)
    .join('');
}
