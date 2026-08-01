import { state, setWeekPlanEntry, removeWeekPlanEntry, saveShoppingList } from '../store.js';
import { t } from '../i18n.js';
import { escapeHtml, parseQuantity, formatQuantity } from '../utils.js';
import { matchIngredientLine, buildFoodIndex, normalize, singularize } from '../matcher.js';
import { toast } from '../toast.js';
import { go } from '../router.js';
import { matchBadge } from './shared.js';

export async function renderWeek() {
  paint();
}

function paint() {
  const cycleOn = state.settings.cycleModeEnabled;
  const currentPhaseId = cycleOn ? state.settings.currentPhaseId : null;
  const entries = state.weekPlan
    .map((w) => ({ ...w, recipe: state.recipes.find((r) => r.id === w.recipeId) }))
    .filter((e) => e.recipe);
  const shoppingCount = (state.shoppingList && state.shoppingList.items && state.shoppingList.items.length) || 0;

  document.getElementById('view').innerHTML = `
    <h1>${t('this_week')}</h1>
    ${entries.length === 0 ? `<div class="empty-state">${t('empty_week')}</div>` : `
      <div class="recipe-grid">
        ${entries.map((e) => weekCardHtml(e, currentPhaseId)).join('')}
      </div>
      <button class="btn btn-primary mt-1" id="generate-btn">${t('generate_list')}</button>
    `}

    ${shoppingCount > 0 ? `
      <div class="card mt-1 flex-between">
        <div>
          <strong>🛒 ${t('shopping_list')}</strong>
          <div class="small muted">${shoppingCount} ${document.documentElement.lang === 'en' ? 'items, summed and grouped by aisle.' : 'lignes, quantités additionnées et rangées par rayon.'}</div>
        </div>
        <a class="btn btn-primary" href="#/shopping">${document.documentElement.lang === 'en' ? 'Open' : 'Ouvrir'}</a>
      </div>` : ''}
  `;

  document.querySelectorAll('[data-step-down]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const recipeId = btn.dataset.stepDown;
      const entry = state.weekPlan.find((w) => w.recipeId === recipeId);
      await setWeekPlanEntry(recipeId, Math.max(0, (entry?.portions || 0) - 1));
      paint();
    });
  });
  document.querySelectorAll('[data-step-up]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const recipeId = btn.dataset.stepUp;
      const entry = state.weekPlan.find((w) => w.recipeId === recipeId);
      await setWeekPlanEntry(recipeId, (entry?.portions || 0) + 1);
      paint();
    });
  });
  document.querySelectorAll('[data-remove-week]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await removeWeekPlanEntry(btn.dataset.removeWeek);
      paint();
    });
  });

  const genBtn = document.getElementById('generate-btn');
  if (genBtn) genBtn.addEventListener('click', async () => {
    await generateShoppingList(entries);
    go('/shopping');
  });
}

function weekCardHtml(e, currentPhaseId) {
  const { recipe, portions } = e;
  const photo = recipe.photo
    ? `<img class="thumb" src="${recipe.photo}" alt="">`
    : `<div class="thumb placeholder">🍽️</div>`;
  const totalTime = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
  return `
    <div class="recipe-card recipe-card--week">
      <a class="card-link" href="#/recipe/${recipe.id}">
        <div class="thumb-wrap">${photo}</div>
        <div class="body">
          <div class="title">${escapeHtml(recipe.title)}</div>
          <div class="meta">
            ${totalTime ? `<span>${totalTime} ${t('minutes')}</span>` : ''}
            <span>${t('servings')}: ${recipe.servings}</span>
          </div>
          <div class="badges">${matchBadge(recipe, currentPhaseId, state.foods)}</div>
        </div>
      </a>
      <div class="card-stepper">
        <button type="button" data-step-down="${recipe.id}" aria-label="-">−</button>
        <span>${portions}</span>
        <button type="button" data-step-up="${recipe.id}" aria-label="+">+</button>
      </div>
      <button type="button" class="card-trash" data-remove-week="${recipe.id}" title="${t('remove')}" aria-label="${t('remove')}">🗑</button>
    </div>`;
}

async function generateShoppingList(entries) {
  const foodIndex = buildFoodIndex(state.foods);
  const foodById = new Map(state.foods.map((f) => [f.id, f]));

  // group key -> { foodId, name, aisle, parts: Map(unit -> qtySum), recipeTitles: Set }
  const groups = new Map();

  for (const e of entries) {
    const factor = e.recipe.servings > 0 ? e.portions / e.recipe.servings : 1;
    for (const ing of e.recipe.ingredients || []) {
      const foodId = matchIngredientLine(ing.name, foodIndex);
      const key = foodId || `text:${normalize(ing.name).split(' ').map(singularize).join(' ')}`;
      if (!groups.has(key)) {
        const food = foodId ? foodById.get(foodId) : null;
        groups.set(key, {
          foodId: foodId || null,
          name: food ? food.name_fr : ing.name,
          aisle: food ? food.aisle : 'other',
          parts: new Map(),
          recipeTitles: new Set(),
        });
      }
      const group = groups.get(key);
      group.recipeTitles.add(e.recipe.title);
      const qty = parseQuantity(ing.quantity);
      const unit = (ing.unit || '').trim().toLowerCase();
      const scaledQty = qty === null ? null : qty * factor;
      const partKey = unit || '_';
      if (scaledQty === null) {
        group.parts.set(partKey, group.parts.get(partKey) || null); // no quantity, just presence
      } else {
        group.parts.set(partKey, (group.parts.get(partKey) || 0) + scaledQty);
      }
    }
  }

  const items = [...groups.entries()].map(([key, g], i) => {
    const parts = [...g.parts.entries()].map(([unit, qty]) => {
      if (qty === null) return unit === '_' ? '' : unit;
      const qtyStr = formatQuantity(qty);
      return unit === '_' ? qtyStr : `${qtyStr} ${unit}`;
    }).filter(Boolean);
    const label = parts.length ? `${g.name} — ${parts.join(' + ')}` : g.name;
    return {
      id: `item_${i}_${key}`.replace(/[^a-z0-9_]/gi, ''),
      foodId: g.foodId,
      label,
      aisle: g.aisle,
      recipeTitles: [...g.recipeTitles],
      checked: false,
    };
  });

  items.sort((a, b) => a.label.localeCompare(b.label));

  // Preserve checked state for items that already existed with the same id.
  const previous = new Map((state.shoppingList?.items || []).map((i) => [i.id, i]));
  for (const item of items) {
    if (previous.has(item.id)) item.checked = previous.get(item.id).checked;
  }

  await saveShoppingList({ items, generatedAt: new Date().toISOString() });
  toast(t('generate_list') + ' ✓');
}
