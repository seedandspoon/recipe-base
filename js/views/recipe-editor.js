import { state, saveRecipe } from '../store.js';
import { t } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml, readFileAsDataURL, resizeImageDataUrl, normalizeStepSections } from '../utils.js';
import { MEAL_TYPES, SEASONS, DIFFICULTIES, STATUSES, optionList } from './shared.js';
import { toast } from '../toast.js';

let draft = null; // working copy of the recipe being edited

function emptyNutrition() {
  return { calories: '', protein_g: '', carbs_g: '', sugars_g: '', fat_g: '', saturates_g: '', fiber_g: '' };
}

function emptyRecipe() {
  return {
    id: null, title: '', photo: '', description: '', source: '',
    tags: [], mealType: 'dinner', cuisine: '', season: 'any', difficulty: 'easy',
    rating: 0, prepTime: '', cookTime: '', servings: 4,
    nutrition: emptyNutrition(),
    ingredients: [{ name: '', quantity: '', unit: '', allergen: false }],
    steps: [{ title: '', items: [''] }],
    status: 'active',
  };
}

export async function renderRecipeEditor({ params }) {
  const existing = params.id ? state.recipes.find((r) => r.id === params.id) : null;
  draft = existing ? JSON.parse(JSON.stringify(existing)) : (window.__importDraft || emptyRecipe());
  window.__importDraft = null;
  draft.nutrition = { ...emptyNutrition(), ...(draft.nutrition || {}) };
  if (!draft.ingredients || draft.ingredients.length === 0) draft.ingredients = [{ name: '', quantity: '', unit: '', allergen: false }];
  draft.steps = normalizeStepSections(draft.steps);
  if (draft.steps.length === 0) draft.steps = [{ title: '', items: [''] }];

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
        <p class="small muted" style="margin-top:-0.4rem;">${document.documentElement.lang === 'en' ? 'All optional — per portion.' : 'Tout est facultatif — par portion.'}</p>
        <div class="field-row">
          <div class="field"><label>Calories (kcal)</label><input id="rf-cal" type="number" min="0" value="${draft.nutrition.calories}" /></div>
          <div class="field"><label>${t('protein_label')} (g)</label><input id="rf-protein" type="number" min="0" value="${draft.nutrition.protein_g}" /></div>
          <div class="field"><label>${t('fat_label')} (g)</label><input id="rf-fat" type="number" min="0" value="${draft.nutrition.fat_g}" /></div>
          <div class="field"><label>${t('saturates_label')} (g)</label><input id="rf-sat" type="number" min="0" value="${draft.nutrition.saturates_g}" /></div>
          <div class="field"><label>${t('carbs_label')} (g)</label><input id="rf-carbs" type="number" min="0" value="${draft.nutrition.carbs_g}" /></div>
          <div class="field"><label>${t('sugars_label')} (g)</label><input id="rf-sugars" type="number" min="0" value="${draft.nutrition.sugars_g}" /></div>
          <div class="field"><label>${t('fiber_label')} (g)</label><input id="rf-fiber" type="number" min="0" value="${draft.nutrition.fiber_g}" /></div>
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
          ${draft.steps.map((section, si) => stepSectionHtml(section, si)).join('')}
        </div>
        <button type="button" class="btn btn-small" id="rf-add-section">+ ${t('add_step_section')}</button>
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

function stepSectionHtml(section, si) {
  return `
    <div class="step-section" data-section="${si}">
      <div class="field-row" style="align-items:center;">
        <div class="field" style="flex:1;">
          <input data-section-title="${si}" placeholder="${t('step_section_title_placeholder')}" value="${escapeHtml(section.title || '')}" />
        </div>
        <button type="button" class="btn btn-small" data-remove-section="${si}">✕ ${t('step_section')}</button>
      </div>
      <ol class="step-items">
        ${section.items.map((s, ii) => stepRowHtml(s, si, ii)).join('')}
      </ol>
      <button type="button" class="btn btn-small" data-add-step="${si}">+ ${t('add_step')}</button>
    </div>`;
}

function stepRowHtml(s, si, ii) {
  return `
    <li class="field-row" style="align-items:flex-start;">
      <div class="field" style="flex:1;"><textarea rows="2" data-step-section="${si}" data-step-index="${ii}">${escapeHtml(s)}</textarea></div>
      <button type="button" class="btn btn-small" data-remove-step-section="${si}" data-remove-step-index="${ii}">✕</button>
    </li>`;
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
    sugars_g: document.getElementById('rf-sugars').value,
    fat_g: document.getElementById('rf-fat').value,
    saturates_g: document.getElementById('rf-sat').value,
    fiber_g: document.getElementById('rf-fiber').value,
  };
}

function bindEvents() {
  document.getElementById('rf-cancel').addEventListener('click', () => history.back());

  // Any button that restructures the form (add/remove a row or section)
  // repaints the whole form from `draft` — so it must capture whatever's
  // currently typed in the plain fields first, or that text would be lost.
  const mutate = (fn) => { readFormIntoDraft(); fn(); paint(); };

  document.getElementById('rf-add-ingredient').addEventListener('click', () => {
    mutate(() => draft.ingredients.push({ name: '', quantity: '', unit: '', allergen: false }));
  });

  document.getElementById('rf-add-section').addEventListener('click', () => {
    mutate(() => draft.steps.push({ title: '', items: [''] }));
  });

  document.querySelectorAll('[data-remove-ingredient]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mutate(() => {
        const i = Number(btn.dataset.removeIngredient);
        draft.ingredients.splice(i, 1);
        if (draft.ingredients.length === 0) draft.ingredients.push({ name: '', quantity: '', unit: '', allergen: false });
      });
    });
  });

  document.querySelectorAll('[data-remove-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mutate(() => {
        const si = Number(btn.dataset.removeSection);
        draft.steps.splice(si, 1);
        if (draft.steps.length === 0) draft.steps.push({ title: '', items: [''] });
      });
    });
  });

  document.querySelectorAll('[data-add-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mutate(() => draft.steps[Number(btn.dataset.addStep)].items.push(''));
    });
  });

  document.querySelectorAll('[data-remove-step-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mutate(() => {
        const si = Number(btn.dataset.removeStepSection);
        const ii = Number(btn.dataset.removeStepIndex);
        draft.steps[si].items.splice(ii, 1);
        if (draft.steps[si].items.length === 0) draft.steps[si].items.push('');
      });
    });
  });

  document.querySelectorAll('[data-ing]').forEach((input) => {
    input.addEventListener('input', () => {
      const i = Number(input.dataset.i);
      const field = input.dataset.ing;
      draft.ingredients[i][field] = field === 'allergen' ? input.checked : input.value;
    });
  });

  document.querySelectorAll('[data-section-title]').forEach((input) => {
    input.addEventListener('input', () => {
      draft.steps[Number(input.dataset.sectionTitle)].title = input.value;
    });
  });
  document.querySelectorAll('[data-step-section]').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      const si = Number(textarea.dataset.stepSection);
      const ii = Number(textarea.dataset.stepIndex);
      draft.steps[si].items[ii] = textarea.value;
    });
  });

  document.getElementById('rf-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    const resized = await resizeImageDataUrl(dataUrl);
    mutate(() => { draft.photo = resized; });
  });

  document.getElementById('recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    readFormIntoDraft();
    if (!draft.title) { toast(t('title') + ' ?'); return; }
    draft.ingredients = draft.ingredients.filter((i) => i.name && i.name.trim());
    draft.steps = draft.steps
      .map((section) => ({ title: (section.title || '').trim(), items: section.items.filter((s) => s && s.trim()) }))
      .filter((section) => section.items.length > 0);
    const saved = await saveRecipe(draft);
    toast(t('save') + ' ✓');
    go(`/recipe/${saved.id}`);
  });
}
