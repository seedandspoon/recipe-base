import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { scoreRecipeForPhase, scoreLabel } from '../match-score.js';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'any'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const STATUSES = ['draft', 'active', 'archived'];
export const AISLES = ['produce', 'meat_fish', 'dairy_eggs', 'bakery', 'pantry', 'spices', 'frozen', 'beverages', 'other'];
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
  const { score } = scoreRecipeForPhase(recipe, currentPhaseId, foods);
  const label = scoreLabel(score);
  if (!label) return '';
  return `<span class="badge badge-match-${label}" title="${t(`match_${label}`)}">${t(`match_${label}`)}</span>`;
}

export function recipeCardHtml(recipe, { currentPhaseId, foods } = {}) {
  const photo = recipe.photo
    ? `<img class="thumb" src="${recipe.photo}" alt="">`
    : `<div class="thumb placeholder">🍽️</div>`;
  const statusBadge = recipe.status && recipe.status !== 'active'
    ? `<span class="badge badge-status-${recipe.status}">${t(`status_${recipe.status}`)}</span>`
    : '';
  const totalTime = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
  return `
    <a class="recipe-card" href="#/recipe/${recipe.id}">
      ${photo}
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
    </a>`;
}

export function foodChip(food, extra = '') {
  return `<span class="food-chip">${escapeHtml(food.name_fr)} / ${escapeHtml(food.name_en)}${extra}</span>`;
}

export function optionList(values, prefix, selected) {
  return values
    .map((v) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${t(`${prefix}_${v}`)}</option>`)
    .join('');
}
