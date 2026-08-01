import { state, saveShoppingList, saveFood } from '../store.js';
import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../toast.js';
import { AISLES } from './shared.js';

export async function renderShopping() {
  paint();
}

function paint() {
  const items = (state.shoppingList && state.shoppingList.items) || [];

  document.getElementById('view').innerHTML = `
    <div class="flex-between">
      <h1>${t('shopping_list')}</h1>
      ${items.length > 0 ? `<button class="btn btn-small" id="clear-checked-btn">${t('clear_checked')}</button>` : ''}
    </div>
    ${items.length === 0 ? `<div class="empty-state">${t('empty_shopping_list')}</div>` : shoppingListHtml(items)}
  `;

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

function shoppingListHtml(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.aisle || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const orderedAisles = AISLES.filter((a) => groups.has(a));

  return orderedAisles.map((aisle) => `
    <div class="aisle-group">
      <h3>${t(`aisle_${aisle}`)}</h3>
      ${groups.get(aisle).map((item) => `
        <div class="shopping-item ${item.checked ? 'checked' : ''}">
          <input type="checkbox" data-toggle-item="${item.id}" ${item.checked ? 'checked' : ''} />
          <span class="label">${escapeHtml(item.label)}</span>
          <select data-item-aisle="${item.id}">${AISLES.map((a) => `<option value="${a}" ${a===item.aisle?'selected':''}>${t(`aisle_${a}`)}</option>`).join('')}</select>
        </div>`).join('')}
    </div>`).join('');
}
