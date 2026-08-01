import { state, saveShoppingList, saveFood } from '../store.js';
import { newId } from '../db.js';
import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../toast.js';
import { AISLES } from './shared.js';

let editingAisleFor = null; // item id currently showing its aisle picker
let addingItem = false;

export async function renderShopping() {
  editingAisleFor = null;
  addingItem = false;
  paint();
}

function paint() {
  const items = (state.shoppingList && state.shoppingList.items) || [];

  document.getElementById('view').innerHTML = `
    <div class="flex-between">
      <h1>${t('shopping_list')}</h1>
      <div class="filter-row">
        ${items.length > 0 ? `<button class="btn btn-small" id="copy-btn">${t('copy_list')}</button>` : ''}
        ${items.length > 0 ? `<button class="btn btn-small" id="clear-checked-btn">${t('clear_checked')}</button>` : ''}
        <button class="btn btn-small" id="add-item-btn">+ ${t('add_item')}</button>
      </div>
    </div>

    ${addingItem ? addItemFormHtml() : ''}

    ${items.length === 0 && !addingItem ? `<div class="empty-state">${t('empty_shopping_list')}</div>` : shoppingListHtml(items)}
  `;

  const addBtn = document.getElementById('add-item-btn');
  if (addBtn) addBtn.addEventListener('click', () => { addingItem = !addingItem; paint(); });

  const addForm = document.getElementById('add-item-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('new-item-name');
      const name = input.value.trim();
      if (!name) return;
      const list = { ...state.shoppingList, items: [...items, {
        id: newId('manual'),
        foodId: null,
        label: name,
        aisle: 'other',
        recipeTitles: [],
        checked: false,
      }] };
      await saveShoppingList(list);
      addingItem = false;
      paint();
    });
    document.getElementById('add-item-cancel').addEventListener('click', () => { addingItem = false; paint(); });
  }

  document.querySelectorAll('[data-toggle-item]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const list = { ...state.shoppingList };
      const item = list.items.find((i) => i.id === cb.dataset.toggleItem);
      item.checked = cb.checked;
      await saveShoppingList(list);
      paint();
    });
  });

  document.querySelectorAll('[data-open-aisle]').forEach((btn) => {
    btn.addEventListener('click', () => { editingAisleFor = btn.dataset.openAisle; paint(); });
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
      editingAisleFor = null;
      toast(t('save') + ' ✓');
      paint();
    });
    sel.addEventListener('blur', () => { editingAisleFor = null; paint(); });
  });
  const openSelect = document.querySelector('[data-item-aisle]');
  if (openSelect) openSelect.focus();

  document.querySelectorAll('[data-remove-item]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const list = { ...state.shoppingList, items: state.shoppingList.items.filter((i) => i.id !== btn.dataset.removeItem) };
      await saveShoppingList(list);
      paint();
    });
  });

  const clearBtn = document.getElementById('clear-checked-btn');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    const list = { ...state.shoppingList, items: state.shoppingList.items.filter((i) => !i.checked) };
    await saveShoppingList(list);
    paint();
  });

  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const text = buildCopyText(items);
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copy_list') + ' ✓');
    } catch {
      toast(t('copy_failed'));
    }
  });
}

function addItemFormHtml() {
  return `
    <form id="add-item-form" class="card filter-row" style="align-items:center;">
      <input id="new-item-name" placeholder="${t('add_item')}" style="flex:1;" autofocus />
      <button type="submit" class="btn btn-primary btn-small">${t('save')}</button>
      <button type="button" class="btn btn-small" id="add-item-cancel">${t('cancel')}</button>
    </form>`;
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
      ${groups.get(aisle).map((item) => shoppingRowHtml(item)).join('')}
    </div>`).join('');
}

function shoppingRowHtml(item) {
  const showPicker = editingAisleFor === item.id;
  const sourceNote = (item.recipeTitles && item.recipeTitles.length)
    ? `<div class="small muted">${item.recipeTitles.map(escapeHtml).join(' · ')}</div>` : '';
  return `
    <div class="shopping-item ${item.checked ? 'checked' : ''}">
      <input type="checkbox" data-toggle-item="${item.id}" ${item.checked ? 'checked' : ''} />
      <div class="grow">
        <span class="label">${escapeHtml(item.label)}</span>
        ${sourceNote}
      </div>
      ${showPicker
        ? `<select data-item-aisle="${item.id}">${AISLES.map((a) => `<option value="${a}" ${a===item.aisle?'selected':''}>${t(`aisle_${a}`)}</option>`).join('')}</select>`
        : `<button type="button" class="icon-btn" data-open-aisle="${item.id}" title="${t('move_to_aisle')}" aria-label="${t('move_to_aisle')}">⇄</button>`}
      <button type="button" class="icon-btn" data-remove-item="${item.id}" title="${t('remove')}" aria-label="${t('remove')}">✕</button>
    </div>`;
}

function buildCopyText(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.aisle || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const orderedAisles = AISLES.filter((a) => groups.has(a));
  const lines = [];
  for (const aisle of orderedAisles) {
    lines.push(`${t(`aisle_${aisle}`)}`);
    for (const item of groups.get(aisle)) {
      lines.push(`- ${item.label}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
