import { state, setWeekPlanEntry, removeWeekPlanEntry, saveShoppingList, saveFood } from '../store.js';
import { t } from '../i18n.js';
import { escapeHtml, parseQuantity, formatQuantity } from '../utils.js';
import { matchIngredientLine, buildFoodIndex, normalize, singularize } from '../matcher.js';
import { toast } from '../toast.js';
import { AISLES } from './shared.js';

export async function renderPlanner() {
  paint();
}

function paint() {
  const entries = state.weekPlan
    .map((w) => ({ ...w, recipe: state.recipes.find((r) => r.id === w.recipeId) }))
    .filter((e) => e.recipe);

  document.getElementById('view').innerHTML = `
    <h1>${t('this_week')}</h1>
    ${entries.length === 0 ? `<div class="empty-state">${t('empty_week')}</div>` : entries.map((e) => planItemHtml(e)).join('')}

    ${entries.length > 0 ? `<button class="btn btn-primary mt-1" id="generate-btn">${t('generate_list')}</button>` : ''}

    ${state.shoppingList && state.shoppingList.items && state.shoppingList.items.length > 0 ? shoppingListHtml() : ''}
  `;

  document.querySelectorAll('[data-portions-for]').forEach((input) => {
    input.addEventListener('change', async () => {
      const recipeId = input.dataset.portionsFor;
      await setWeekPlanEntry(recipeId, Number(input.value) || 0);
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
  if (genBtn) genBtn.addEventListener('click', async () => { await generateShoppingList(entries); paint(); });

  document.querySelectorAll('[data-toggle-item]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const list = { ...state.shoppingList };
      const item = list.items.find((i) => i.id === cb.dataset.toggleItem);
      item.checked = cb.checked;
      await saveShoppingList(list);
      paint();
    });
  });
  document.querySelectorAll('[data-item-aisle]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const list = { ...state.shoppingList };
      const item = list.items.find((i) => i.id === sel.dataset.itemAisle);
      item.aisle = sel.value;
      await saveShoppingList(list);
      if (item.foodId) {
        const food = state.foods.find((f) => f.id === item.foodId);
        if (food) await saveFood({ ...food, aisle: sel.value });
      }
      toast(t('save') + ' ✓');
      paint();
    });
  });
  const clearBtn = document.getElementById('clear-checked-btn');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    const list = { ...state.shoppingList, items: state.shoppingList.items.filter((i) => !i.checked) };
    await saveShoppingList(list);
    paint();
  });
}

function planItemHtml(e) {
  return `
    <div class="plan-item">
      ${e.recipe.photo ? `<img src="${e.recipe.photo}" alt="">` : ''}
      <div class="grow">
        <a href="#/recipe/${e.recipe.id}">${escapeHtml(e.recipe.title)}</a>
        <div class="small muted">${t('servings')}: ${e.recipe.servings}</div>
      </div>
      <label class="small muted" style="width:auto;">${t('portions_to_cook')}</label>
      <input type="number" min="0" value="${e.portions}" data-portions-for="${e.recipeId}" />
      <button class="btn btn-small" data-remove-week="${e.recipeId}">${t('remove')}</button>
    </div>`;
}

function shoppingListHtml() {
  const groups = new Map();
  for (const item of state.shoppingList.items) {
    const key = item.aisle || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const orderedAisles = AISLES.filter((a) => groups.has(a));

  return `
    <hr class="sep" />
    <div class="flex-between">
      <h2>${t('shopping_list')}</h2>
      <button class="btn btn-small" id="clear-checked-btn">${t('clear_checked')}</button>
    </div>
    ${orderedAisles.map((aisle) => `
      <div class="aisle-group">
        <h3>${t(`aisle_${aisle}`)}</h3>
        ${groups.get(aisle).map((item) => `
          <div class="shopping-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" data-toggle-item="${item.id}" ${item.checked ? 'checked' : ''} />
            <span class="label">${escapeHtml(item.label)}</span>
            <select data-item-aisle="${item.id}">${AISLES.map((a) => `<option value="${a}" ${a===item.aisle?'selected':''}>${t(`aisle_${a}`)}</option>`).join('')}</select>
          </div>`).join('')}
      </div>`).join('')}
  `;
}

async function generateShoppingList(entries) {
  const foodIndex = buildFoodIndex(state.foods);
  const foodById = new Map(state.foods.map((f) => [f.id, f]));

  // group key -> { foodId, name, aisle, parts: Map(unit -> qtySum), unmatchedTexts: [] }
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
        });
      }
      const group = groups.get(key);
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
