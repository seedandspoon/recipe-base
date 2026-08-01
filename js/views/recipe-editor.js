import { state, saveRecipe } from '../store.js';
import { t } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml, readFileAsDataURL, resizeImageDataUrl } from '../utils.js';
import { MEAL_TYPES, SEASONS, DIFFICULTIES, STATUSES, optionList } from './shared.js';
import { toast } from '../toast.js';

let draft = null; // working copy of the recipe being edited

function emptyRecipe() {
  return {
    id: null, title: '', photo: '', description: '', source: '',
    tags: [], mealType: 'dinner', cuisine: '', season: 'any', difficulty: 'easy',
    rating: 0, prepTime: '', cookTime: '', servings: 4,
    nutrition: { calories: '', protein_g: '', carbs_g: '', fat_g: '' },
    ingredients: [{ name: '', quantity: '', unit: '', allergen: false }],
    steps: [''],
    status: 'active',
  };
}

export async function renderRecipeEditor({ params }) {
  const existing = params.id ? state.recipes.find((r) => r.id === params.id) : null;
  draft = existing ? JSON.parse(JSON.stringify(existing)) : (window.__importDraft || emptyRecipe());
  window.__importDraft = null;
  if (!draft.nutrition) draft.nutrition = { calories: '', protein_g: '', carbs_g: '', fat_g: '' };
  if (!draft.ingredients || draft.ingredients.length === 0) draft.ingredients = [{ name: '', quantity: '', unit: '', allergen: false }];
  if (!draft.steps || draft.steps.length === 0) draft.steps = [''];

  paint();
}

function paint() {
  document.getElementById('view').innerHTML = `
    <form id="recipe-form" class="card">
      <div class="field">
        <label>${t('title')}</label>
        <input id="rf-title" required value="${escapeHtml(draft.title)}" />
      </div>

      <div class="field">
        <label>${t('photo')}</label>
        ${draft.photo ? `<img src="${draft.photo}" style="max-width:220px;border-radius:8px;display:block;margin-bottom:0.5rem;" />` : ''}
        <input id="rf-photo" type="file" accept="image/*" capture="environment" />
      </div>

      <div class="field">
        <label>${t('description')}</label>
        <textarea id="rf-desc" rows="2">${escapeHtml(draft.description)}</textarea>
      </div>

      <div class="field">
        <label>${t('source')}</label>
        <input id="rf-source" value="${escapeHtml(draft.source)}" placeholder="https://…" />
      </div>

      <div class="field">
        <label>${t('tags')} (${t('tags').toLowerCase()}, séparées par des virgules)</label>
        <input id="rf-tags" value="${escapeHtml((draft.tags || []).join(', '))}" />
      </div>

      <div class="field-row">
        <div class="field">
          <label>${t('meal_type')}</label>
          <select id="rf-mealType">${optionList(MEAL_TYPES, 'meal', draft.mealType)}</select>
        </div>
        <div class="field">
          <label>${t('cuisine')}</label>
          <input id="rf-cuisine" value="${escapeHtml(draft.cuisine)}" />
        </div>
        <div class="field">
          <label>${t('season')}</label>
          <select id="rf-season">${optionList(SEASONS, 'season', draft.season)}</select>
        </div>
        <div class="field">
          <label>${t('difficulty')}</label>
          <select id="rf-difficulty">${optionList(DIFFICULTIES, 'difficulty', draft.difficulty)}</select>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>${t('rating')}</label>
          <select id="rf-rating">${[0,1,2,3,4,5].map((n) => `<option value="${n}" ${n===Number(draft.rating)?'selected':''}>${n === 0 ? '—' : '★'.repeat(n)}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>${t('prep_time')} (${t('minutes')})</label>
          <input id="rf-prep" type="number" min="0" value="${draft.prepTime}" />
        </div>
        <div class="field">
          <label>${t('cook_time')} (${t('minutes')})</label>
          <input id="rf-cook" type="number" min="0" value="${draft.cookTime}" />
        </div>
        <div class="field">
          <label>${t('servings')}</label>
          <input id="rf-servings" type="number" min="1" value="${draft.servings}" />
        </div>
        <div class="field">
          <label>${t('status')}</label>
          <select id="rf-status">${optionList(STATUSES, 'status', draft.status)}</select>
        </div>
      </div>

      <fieldset>
        <legend>${t('nutrition')}</legend>
        <div class="field-row">
          <div class="field"><label>Calories</label><input id="rf-cal" type="number" min="0" value="${draft.nutrition.calories}" /></div>
          <div class="field"><label>Protéines (g)</label><input id="rf-protein" type="number" min="0" value="${draft.nutrition.protein_g}" /></div>
          <div class="field"><label>Glucides (g)</label><input id="rf-carbs" type="number" min="0" value="${draft.nutrition.carbs_g}" /></div>
          <div class="field"><label>Lipides (g)</label><input id="rf-fat" type="number" min="0" value="${draft.nutrition.fat_g}" /></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>${t('ingredients')}</legend>
        <div id="rf-ingredients">
          ${draft.ingredients.map((ing, i) => ingredientRowHtml(ing, i)).join('')}
        </div>
        <button type="button" class="btn btn-small" id="rf-add-ingredient">+ ${t('add_ingredient')}</button>
      </fieldset>

      <fieldset>
        <legend>${t('steps')}</legend>
        <div id="rf-steps">
          ${draft.steps.map((s, i) => stepRowHtml(s, i)).join('')}
        </div>
        <button type="button" class="btn btn-small" id="rf-add-step">+ ${t('add_step')}</button>
      </fieldset>

      <div class="flex-between mt-1">
        <button type="button" class="btn" id="rf-cancel">${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('save')}</button>
      </div>
    </form>
  `;
  bindEvents();
}

function ingredientRowHtml(ing, i) {
  return `
    <div class="field-row" data-ingredient-row="${i}" style="align-items:center;">
      <div class="field" style="flex:2;"><input data-ing="name" data-i="${i}" placeholder="${t('ingredients')}" value="${escapeHtml(ing.name)}" /></div>
      <div class="field" style="flex:0.6;"><input data-ing="quantity" data-i="${i}" placeholder="qté" value="${escapeHtml(ing.quantity)}" /></div>
      <div class="field" style="flex:0.8;"><input data-ing="unit" data-i="${i}" placeholder="unité" value="${escapeHtml(ing.unit || '')}" /></div>
      <div class="field checkbox-row" style="flex:0.8;">
        <input type="checkbox" data-ing="allergen" data-i="${i}" ${ing.allergen ? 'checked' : ''} id="allerg-${i}" />
        <label for="allerg-${i}" style="margin:0;">${t('allergen')}</label>
      </div>
      <button type="button" class="btn btn-small" data-remove-ingredient="${i}">✕</button>
    </div>`;
}

function stepRowHtml(s, i) {
  return `
    <div class="field-row" style="align-items:flex-start;">
      <span class="muted" style="padding-top:0.5rem;min-width:1.4rem;">${i + 1}.</span>
      <div class="field" style="flex:1;"><textarea rows="2" data-step="${i}">${escapeHtml(s)}</textarea></div>
      <button type="button" class="btn btn-small" data-remove-step="${i}">✕</button>
    </div>`;
}

function readFormIntoDraft() {
  draft.title = document.getElementById('rf-title').value.trim();
  draft.description = document.getElementById('rf-desc').value;
  draft.source = document.getElementById('rf-source').value.trim();
  draft.tags = document.getElementById('rf-tags').value.split(',').map((s) => s.trim()).filter(Boolean);
  draft.mealType = document.getElementById('rf-mealType').value;
  draft.cuisine = document.getElementById('rf-cuisine').value.trim();
  draft.season = document.getElementById('rf-season').value;
  draft.difficulty = document.getElementById('rf-difficulty').value;
  draft.rating = Number(document.getElementById('rf-rating').value);
  draft.prepTime = Number(document.getElementById('rf-prep').value) || 0;
  draft.cookTime = Number(document.getElementById('rf-cook').value) || 0;
  draft.servings = Number(document.getElementById('rf-servings').value) || 1;
  draft.status = document.getElementById('rf-status').value;
  draft.nutrition = {
    calories: document.getElementById('rf-cal').value,
    protein_g: document.getElementById('rf-protein').value,
    carbs_g: document.getElementById('rf-carbs').value,
    fat_g: document.getElementById('rf-fat').value,
  };
}

function bindEvents() {
  document.getElementById('rf-cancel').addEventListener('click', () => history.back());

  document.getElementById('rf-add-ingredient').addEventListener('click', () => {
    draft.ingredients.push({ name: '', quantity: '', unit: '', allergen: false });
    paint();
  });
  document.getElementById('rf-add-step').addEventListener('click', () => {
    draft.steps.push('');
    paint();
  });

  document.querySelectorAll('[data-remove-ingredient]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.removeIngredient);
      draft.ingredients.splice(i, 1);
      if (draft.ingredients.length === 0) draft.ingredients.push({ name: '', quantity: '', unit: '', allergen: false });
      paint();
    });
  });
  document.querySelectorAll('[data-remove-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.removeStep);
      draft.steps.splice(i, 1);
      if (draft.steps.length === 0) draft.steps.push('');
      paint();
    });
  });

  document.querySelectorAll('[data-ing]').forEach((input) => {
    input.addEventListener('input', () => {
      const i = Number(input.dataset.i);
      const field = input.dataset.ing;
      draft.ingredients[i][field] = field === 'allergen' ? input.checked : input.value;
    });
  });
  document.querySelectorAll('[data-step]').forEach((input) => {
    input.addEventListener('input', () => {
      draft.steps[Number(input.dataset.step)] = input.value;
    });
  });

  document.getElementById('rf-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    draft.photo = await resizeImageDataUrl(dataUrl);
    paint();
  });

  document.getElementById('recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    readFormIntoDraft();
    if (!draft.title) { toast(t('title') + ' ?'); return; }
    draft.ingredients = draft.ingredients.filter((i) => i.name && i.name.trim());
    draft.steps = draft.steps.filter((s) => s && s.trim());
    const saved = await saveRecipe(draft);
    toast(t('save') + ' ✓');
    go(`/recipe/${saved.id}`);
  });
}
