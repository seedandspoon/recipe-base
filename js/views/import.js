import { saveRecipe, findRecipeBySource } from '../store.js';
import { importBackup } from '../db.js';
import { t } from '../i18n.js';
import { go } from '../router.js';
import { escapeHtml, readFileAsText } from '../utils.js';
import { toast } from '../toast.js';

let activeTab = 'web';
let pasteText = '';
let batchItems = null; // [{recipe, include, updatesExisting}]

export async function renderImport({ query }) {
  if (query.data) {
    await handleWebImport(query.data);
    return;
  }
  paint();
}

function paint() {
  document.getElementById('view').innerHTML = `
    <h1>${t('import')}</h1>
    <div class="import-tabs">
      <button class="import-tab ${activeTab==='web'?'active':''}" data-tab="web">${t('import_from_web')}</button>
      <button class="import-tab ${activeTab==='paste'?'active':''}" data-tab="paste">${t('import_paste')}</button>
      <button class="import-tab ${activeTab==='manual'?'active':''}" data-tab="manual">${t('import_manual')}</button>
      <button class="import-tab ${activeTab==='batch'?'active':''}" data-tab="batch">${t('import_batch')}</button>
    </div>
    <div id="import-panel"></div>
  `;
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => { activeTab = btn.dataset.tab; paint(); });
  });
  const panel = document.getElementById('import-panel');
  if (activeTab === 'web') panel.innerHTML = webTabHtml();
  if (activeTab === 'paste') panel.innerHTML = pasteTabHtml();
  if (activeTab === 'manual') { manualTab(); return; }
  if (activeTab === 'batch') panel.innerHTML = batchTabHtml();
  bindPanel();
}

function webTabHtml() {
  const bookmarkletHref = window.__bookmarkletHref || '#';
  return `
    <div class="card">
      <p>${t('bookmarklet_hint')}</p>
      <a class="bookmarklet-btn" href="${bookmarkletHref}" onclick="return false;" draggable="true">📥 ${t('bookmarklet')}</a>
      <p class="small muted mt-1">${document.documentElement.lang === 'en' ? 'On desktop, drag it up into your bookmarks bar. On iPhone Safari, bookmark this page first, then edit that bookmark and paste the button\'s link as its address.' : 'Sur ordinateur, faites-le glisser dans votre barre de favoris. Sur iPhone (Safari), mettez d’abord cette page en favori, puis modifiez ce favori pour coller l’adresse du bouton.'}</p>
    </div>`;
}

function pasteTabHtml() {
  return `
    <div class="card">
      <div class="field">
        <textarea id="paste-area" rows="12" placeholder="${t('paste_text_here')}">${escapeHtml(pasteText)}</textarea>
      </div>
      <button class="btn btn-primary" id="parse-btn">${t('parse')}</button>
    </div>`;
}

function batchTabHtml() {
  if (!batchItems) {
    return `
      <div class="card">
        <p class="small muted">${document.documentElement.lang === 'en'
          ? 'Choose a JSON file: either a full backup exported from this app, or a plain array of recipes.'
          : 'Choisissez un fichier JSON : soit une sauvegarde complète exportée depuis l’app, soit un simple tableau de recettes.'}</p>
        <input type="file" id="batch-file" accept="application/json" />
      </div>`;
  }
  const includedCount = batchItems.filter((b) => b.include).length;
  return `
    <div class="card">
      ${batchItems.map((b, i) => `
        <div class="plan-item">
          <input type="checkbox" data-batch-include="${i}" ${b.include ? 'checked' : ''} />
          <div class="grow">
            <div>${escapeHtml(b.recipe.title || '(sans titre)')}</div>
            <div class="small muted">${(b.recipe.ingredients || []).length} ${t('ingredients').toLowerCase()}${b.updatesExisting ? ' · ' + t('will_update_existing') : ''}</div>
          </div>
        </div>`).join('')}
      <button class="btn btn-primary mt-1" id="batch-import-btn">${t('import')} (${includedCount})</button>
      <button class="btn mt-1" id="batch-cancel-btn">${t('cancel')}</button>
    </div>`;
}

function manualTab() {
  window.__importDraft = null;
  go('/recipe/new');
}

function bindPanel() {
  const parseBtn = document.getElementById('parse-btn');
  if (parseBtn) {
    parseBtn.addEventListener('click', () => {
      pasteText = document.getElementById('paste-area').value;
      const draft = parsePastedText(pasteText);
      startEditorWithDraft(draft);
    });
  }
  const batchFile = document.getElementById('batch-file');
  if (batchFile) {
    batchFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        const data = JSON.parse(text);
        if (data && data.kind === 'cycle-recipe-book-backup') {
          await importBackup(data, { mode: 'merge' });
          toast(t('import') + ' ✓');
          location.reload();
          return;
        }
        const recipes = Array.isArray(data) ? data : (data.recipes || []);
        batchItems = recipes.map((r) => {
          const existing = findRecipeBySource(r.source);
          return { recipe: r, include: true, updatesExisting: !!existing, existingId: existing ? existing.id : null };
        });
        paint();
      } catch (err) {
        toast('JSON invalide : ' + err.message);
      }
    });
  }
  document.querySelectorAll('[data-batch-include]').forEach((cb) => {
    cb.addEventListener('change', () => { batchItems[Number(cb.dataset.batchInclude)].include = cb.checked; });
  });
  const batchImportBtn = document.getElementById('batch-import-btn');
  if (batchImportBtn) {
    batchImportBtn.addEventListener('click', async () => {
      let count = 0;
      for (const item of batchItems) {
        if (!item.include) continue;
        const payload = { ...item.recipe };
        if (item.existingId) payload.id = item.existingId;
        else delete payload.id;
        await saveRecipe(payload);
        count += 1;
      }
      toast(`${count} ${t('import').toLowerCase()} ✓`);
      batchItems = null;
      go('/gallery');
    });
  }
  const batchCancelBtn = document.getElementById('batch-cancel-btn');
  if (batchCancelBtn) batchCancelBtn.addEventListener('click', () => { batchItems = null; paint(); });
}

function startEditorWithDraft(draft) {
  const existing = findRecipeBySource(draft.source);
  if (existing) {
    draft.id = existing.id;
    draft.createdAt = existing.createdAt;
    toast(t('will_update_existing'));
  }
  window.__importDraft = draft;
  go('/recipe/new');
}

async function handleWebImport(encoded) {
  document.getElementById('view').innerHTML = `<div class="empty-state">${t('import')}…</div>`;
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json);
    const draft = {
      title: payload.title || '',
      description: payload.description || '',
      source: payload.source || '',
      photo: payload.photoUrl || '',
      tags: payload.tags || [],
      mealType: 'dinner',
      cuisine: payload.cuisine || '',
      season: 'any',
      difficulty: 'easy',
      rating: 0,
      prepTime: payload.prepTime || '',
      cookTime: payload.cookTime || '',
      servings: payload.servings || 4,
      nutrition: { calories: '', protein_g: '', carbs_g: '', fat_g: '' },
      ingredients: (payload.ingredients && payload.ingredients.length) ? payload.ingredients : [{ name: '', quantity: '', unit: '', allergen: false }],
      steps: (payload.steps && payload.steps.length) ? payload.steps : [''],
      status: 'active',
    };
    startEditorWithDraft(draft);
  } catch (err) {
    toast('Import impossible : ' + err.message);
    activeTab = 'web';
    paint();
  }
}

// --- Best-effort raw-text parser --------------------------------------

const INGREDIENT_HEADING_RE = /^(ingr[ée]dients?|ingredients)\s*:?$/i;
const STEPS_HEADING_RE = /^(é?tapes?|instructions?|pr[ée]paration|directions?|method|steps?)\s*:?$/i;
const QTY_LINE_RE = /^([\d]+(?:[.,/]\d+)?(?:\s\d\/\d)?|[½¼¾⅓⅔])\s*(g|kg|ml|cl|l|cuill[eè]res?(?:\sà\s(?:soupe|caf[ée]))?|c\.\s?à\s?s\.?|c\.\s?à\s?c\.?|tasses?|cups?|tbsp|tsp|oz|lb|pi[eè]ces?|pieces?|unit[eé]s?|gousses?)?\s*(.*)$/i;

function parseIngredientLine(rawLine) {
  const line = rawLine.replace(/^[•\-\*•]\s*/, '').trim();
  const m = line.match(QTY_LINE_RE);
  if (m && m[3]) {
    return { name: m[3].trim(), quantity: m[1] || '', unit: (m[2] || '').trim(), allergen: false };
  }
  return { name: line, quantity: '', unit: '', allergen: false };
}

export function parsePastedText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { title: '', description: '', source: '', ingredients: [{ name: '', quantity: '', unit: '', allergen: false }], steps: [''] };
  }
  const title = lines[0];
  let section = 'preamble';
  const ingredients = [];
  const steps = [];
  const descriptionLines = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (INGREDIENT_HEADING_RE.test(line)) { section = 'ingredients'; continue; }
    if (STEPS_HEADING_RE.test(line)) { section = 'steps'; continue; }

    if (section === 'ingredients') { ingredients.push(parseIngredientLine(line)); continue; }
    if (section === 'steps') { steps.push(line.replace(/^\d+[.)]\s*/, '')); continue; }

    if (/^[\d½¼¾⅓⅔•\-*]/.test(line)) { section = 'ingredients'; ingredients.push(parseIngredientLine(line)); continue; }
    if (/^\d+[.)]\s+/.test(line)) { section = 'steps'; steps.push(line.replace(/^\d+[.)]\s*/, '')); continue; }
    descriptionLines.push(line);
  }

  return {
    title,
    description: descriptionLines.join(' '),
    source: '',
    photo: '',
    tags: [],
    mealType: 'dinner',
    cuisine: '',
    season: 'any',
    difficulty: 'easy',
    rating: 0,
    prepTime: '',
    cookTime: '',
    servings: 4,
    nutrition: { calories: '', protein_g: '', carbs_g: '', fat_g: '' },
    ingredients: ingredients.length ? ingredients : [{ name: '', quantity: '', unit: '', allergen: false }],
    steps: steps.length ? steps : [''],
    status: 'active',
  };
}
