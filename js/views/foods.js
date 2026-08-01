import { state, saveFood, deleteFood } from '../store.js';
import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../toast.js';
import { AISLES, FOOD_CATEGORIES } from './shared.js';

let editingId = null;
let creating = false;
let query = '';
let highlightId = null;

const GI_LEVELS = ['na', 'low', 'medium', 'high'];
const ORGANIC_LEVELS = ['na', 'low', 'high'];

export async function renderFoods({ query: q }) {
  editingId = null;
  creating = false;
  query = '';
  highlightId = q.highlight || null;
  paint();
  if (highlightId) {
    setTimeout(() => {
      const row = document.querySelector(`[data-food-row="${highlightId}"]`);
      if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('badge-match-high'); }
    }, 50);
  }
}

function paint() {
  const list = state.foods.filter((f) => {
    if (!query) return true;
    const nq = query.toLowerCase();
    return f.name_fr.toLowerCase().includes(nq) || f.name_en.toLowerCase().includes(nq);
  });

  document.getElementById('view').innerHTML = `
    <div class="flex-between">
      <h1 data-i18n="nav_foods">${t('nav_foods')}</h1>
      <button class="btn btn-primary" id="add-food-btn">+ ${t('add_food')}</button>
    </div>
    <input id="food-search" type="search" placeholder="${t('search_placeholder')}" value="${escapeHtml(query)}" style="margin-bottom:1rem;" />

    ${creating ? `<div class="card">${foodFormHtml(emptyFood())}</div>` : ''}

    <div style="overflow-x:auto;">
      <table class="food-table">
        <thead>
          <tr>
            <th>${t('food_name_fr')} / ${t('food_name_en')}</th>
            <th>${t('category')}</th>
            <th>${t('phase_menstrual')[0]}${t('phase_follicular')[0]}${t('phase_ovulatory')[0]}${t('phase_luteal')[0]}</th>
            <th>${t('glycemic_index')}</th>
            <th>${t('organic_priority')}</th>
            <th>${t('aisle')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((f) => foodRowHtml(f)).join('')}
        </tbody>
      </table>
    </div>

    <p class="small muted mt-1">
      ${t('sources')}: International Tables of Glycemic Index and Glycemic Load (Atkinson, Foster-Powell &amp; Brand-Miller, <em>Diabetes Care</em>, 2008); University of Sydney Glycemic Index Database (glycemicindex.com); Harvard Health Publishing glycemic index chart. Organic priority: EWG Shopper's Guide to Pesticides in Produce, 2025 edition (ewg.org) — covers fresh produce only; other categories are marked "not rated". Values are commonly published approximations — correct any of them freely.
    </p>
  `;

  document.getElementById('food-search').addEventListener('input', (e) => { query = e.target.value; paint(); });
  document.getElementById('add-food-btn').addEventListener('click', () => { creating = !creating; editingId = null; paint(); });

  document.querySelectorAll('[data-edit-food]').forEach((btn) => {
    btn.addEventListener('click', () => { editingId = editingId === btn.dataset.editFood ? null : btn.dataset.editFood; creating = false; paint(); });
  });
  document.querySelectorAll('[data-delete-food]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm(t('confirm_delete_recipe').replace('recette', 'aliment'))) {
        await deleteFood(btn.dataset.deleteFood);
        toast(t('delete') + ' ✓');
        paint();
      }
    });
  });

  const form = document.getElementById('food-form');
  if (form) bindFoodForm(form);
}

function emptyFood() {
  return { id: null, name_fr: '', name_en: '', aliases: [], category: 'vegetable', phases: [], gi: { level: 'na', value: null }, organic: { level: 'na' }, aisle: 'produce' };
}

function foodRowHtml(f) {
  const phaseInitials = ['menstrual', 'follicular', 'ovulatory', 'luteal']
    .map((p) => (f.phases || []).includes(p) ? `<span class="badge badge-phase-${p}">${t(`phase_${p}`)[0]}</span>` : '')
    .join(' ');
  const editing = editingId === f.id;
  return `
    <tr data-food-row="${f.id}">
      <td>${escapeHtml(f.name_fr)} / ${escapeHtml(f.name_en)}</td>
      <td>${f.category ? t(`category_${f.category}`) : ''}</td>
      <td>${phaseInitials}</td>
      <td>${f.gi.level === 'na' ? t('gi_not_applicable') : `${f.gi.value ?? ''} (${t(`gi_${f.gi.level}`)})`}</td>
      <td>${f.organic.level === 'na' ? t('organic_na') : f.organic.level === 'high' ? t('organic_high') : t('organic_low')}</td>
      <td>${t(`aisle_${f.aisle}`)}</td>
      <td class="filter-row">
        <button class="btn btn-small" data-edit-food="${f.id}">${t('edit')}</button>
        <button class="btn btn-small btn-danger" data-delete-food="${f.id}">${t('delete')}</button>
      </td>
    </tr>
    ${editing ? `<tr><td colspan="7">${foodFormHtml(f)}</td></tr>` : ''}
  `;
}

function foodFormHtml(f) {
  return `
    <form id="food-form" data-id="${f.id || ''}">
      <div class="field-row">
        <div class="field"><label>${t('food_name_fr')}</label><input id="ff-name-fr" required value="${escapeHtml(f.name_fr)}" /></div>
        <div class="field"><label>${t('food_name_en')}</label><input id="ff-name-en" required value="${escapeHtml(f.name_en)}" /></div>
        <div class="field"><label>${t('aliases')}</label><input id="ff-aliases" value="${escapeHtml((f.aliases || []).join(', '))}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t('category')}</label><select id="ff-category"></select></div>
        <div class="field"><label>${t('aisle')}</label><select id="ff-aisle">${AISLES.map((a) => `<option value="${a}" ${a===f.aisle?'selected':''}>${t(`aisle_${a}`)}</option>`).join('')}</select></div>
      </div>
      <div class="field">
        <label>${t('favored_foods')}</label>
        <div class="filter-row">
          ${['menstrual','follicular','ovulatory','luteal'].map((p) => `
            <label class="checkbox-row" style="width:auto;">
              <input type="checkbox" id="ff-phase-${p}" ${(f.phases||[]).includes(p) ? 'checked' : ''} />
              ${t(`phase_${p}`)}
            </label>`).join('')}
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t('glycemic_index')}</label><select id="ff-gi-level">${GI_LEVELS.map((l) => `<option value="${l}" ${l===f.gi.level?'selected':''}>${l === 'na' ? t('gi_not_applicable') : t(`gi_${l}`)}</option>`).join('')}</select></div>
        <div class="field"><label>Valeur IG (0-100)</label><input id="ff-gi-value" type="number" min="0" max="100" value="${f.gi.value ?? ''}" /></div>
        <div class="field"><label>${t('organic_priority')}</label><select id="ff-organic">${ORGANIC_LEVELS.map((l) => `<option value="${l}" ${l===f.organic.level?'selected':''}>${l==='na'?t('organic_na'):l==='high'?t('organic_high'):t('organic_low')}</option>`).join('')}</select></div>
      </div>
      <div class="filter-row">
        <button type="submit" class="btn btn-primary">${t('save')}</button>
        <button type="button" class="btn" id="ff-cancel">${t('cancel')}</button>
      </div>
    </form>`;
}

function bindFoodForm(form) {
  // category select needs plain options (optionList expects i18n keys); build manually instead
  const categorySelect = document.getElementById('ff-category');
  const currentCategory = form.dataset.id ? state.foods.find((f) => f.id === form.dataset.id)?.category : 'vegetable';
  categorySelect.innerHTML = FOOD_CATEGORIES.map((c) => `<option value="${c}" ${c===currentCategory?'selected':''}>${t(`category_${c}`)}</option>`).join('');

  document.getElementById('ff-cancel').addEventListener('click', () => { editingId = null; creating = false; paint(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phases = ['menstrual','follicular','ovulatory','luteal'].filter((p) => document.getElementById(`ff-phase-${p}`).checked);
    const giLevel = document.getElementById('ff-gi-level').value;
    const giValueRaw = document.getElementById('ff-gi-value').value;
    const food = {
      id: form.dataset.id || undefined,
      name_fr: document.getElementById('ff-name-fr').value.trim(),
      name_en: document.getElementById('ff-name-en').value.trim(),
      aliases: document.getElementById('ff-aliases').value.split(',').map((s) => s.trim()).filter(Boolean),
      category: categorySelect.value,
      aisle: document.getElementById('ff-aisle').value,
      phases,
      gi: { level: giLevel, value: giValueRaw === '' ? null : Number(giValueRaw) },
      organic: { level: document.getElementById('ff-organic').value },
    };
    await saveFood(food);
    toast(t('save') + ' ✓');
    editingId = null;
    creating = false;
    paint();
  });
}
