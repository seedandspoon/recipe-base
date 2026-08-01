import { state, updateSettings, clearAllRecipeData, removeTag, removeCuisine } from '../store.js';
import { exportBackup, importBackup } from '../db.js';
import { t, setLang, getLang } from '../i18n.js';
import { downloadFile, readFileAsText, todayIso } from '../utils.js';
import { toast } from '../toast.js';
import { applyCycleModeClass, refreshStaticText } from '../ui.js';

let replaceMode = false;

export async function renderSettings() {
  replaceMode = false;
  paint();
}

function paint() {
  const s = state.settings;
  const recipes = state.recipes;
  const stats = {
    total: recipes.length,
    active: recipes.filter((r) => r.status === 'active').length,
    thisWeek: state.weekPlan.length,
    rated: recipes.filter((r) => Number(r.rating) >= 4).length,
  };

  document.getElementById('view').innerHTML = `
    <h1>${t('nav_settings')}</h1>

    <div class="card">
      <div class="checkbox-row">
        <input type="checkbox" id="cycle-toggle" ${s.cycleModeEnabled ? 'checked' : ''} />
        <label for="cycle-toggle" style="margin:0;">${t('cycle_mode')}</label>
      </div>
      <p class="small muted">${t('cycle_mode_hint')}</p>
    </div>

    <div class="card cycle-only">
      <h2>${t('nav_foods')}</h2>
      <p class="small muted">${t('manage_foods_hint')}</p>
      <a class="btn" href="#/foods">${t('manage_foods')}</a>
    </div>

    <div class="card">
      <label>${t('language')}</label>
      <div class="filter-row">
        <button class="btn ${getLang()==='fr'?'btn-primary':''}" id="lang-fr">Français</button>
        <button class="btn ${getLang()==='en'?'btn-primary':''}" id="lang-en">English</button>
      </div>
    </div>

    <div class="card">
      <h2>${t('my_tags_title')}</h2>
      <p class="small muted">${t('manage_tags_hint')}</p>
      <div class="tag-picker">
        ${(s.tags || []).map((tag) => `<button type="button" class="tag-pill checked" data-remove-tag="${escapeAttr(tag)}">${escapeAttr(tag)} ✕</button>`).join('') || `<span class="small muted">—</span>`}
      </div>
      <div class="filter-row mt-1">
        <input id="new-tag-input" placeholder="${t('new_tag_placeholder')}" style="flex:1;" />
        <button class="btn btn-small" id="add-tag-btn">+ ${t('add_short')}</button>
      </div>
    </div>

    <div class="card">
      <h2>${t('my_cuisines_title')}</h2>
      <p class="small muted">${t('manage_cuisines_hint')}</p>
      <div class="tag-picker">
        ${(s.cuisines || []).map((c) => `<button type="button" class="tag-pill checked" data-remove-cuisine="${escapeAttr(c)}">${escapeAttr(c)} ✕</button>`).join('') || `<span class="small muted">—</span>`}
      </div>
      <div class="filter-row mt-1">
        <input id="new-cuisine-input" placeholder="${t('new_cuisine_placeholder')}" style="flex:1;" />
        <button class="btn btn-small" id="add-cuisine-btn">+ ${t('add_short')}</button>
      </div>
    </div>

    <div class="card">
      <h2>${t('backup')}</h2>
      <p class="small muted">${document.documentElement.lang === 'en'
        ? 'Everything lives only in this browser. Export regularly to keep a real backup, and use it to move your collection to another device.'
        : 'Tout est stocké uniquement dans ce navigateur. Exportez régulièrement pour garder une vraie sauvegarde, et pour transférer votre collection vers un autre appareil.'}</p>
      <div class="filter-row">
        <button class="btn btn-primary" id="export-btn">⬇ ${t('export_backup')}</button>
        <label class="btn" for="import-file">⬆ ${t('import_backup')}</label>
        <input type="file" id="import-file" accept="application/json" style="display:none;" />
      </div>
      <p class="small muted mt-1">${document.documentElement.lang === 'en' ? 'Import adds recipes to what you already have.' : 'L’import ajoute les recettes à celles déjà présentes.'}</p>
      <label class="checkbox-row small muted mt-1">
        <input type="checkbox" id="replace-mode-toggle" ${replaceMode ? 'checked' : ''} />
        ${t('import_mode_replace')}
      </label>
    </div>

    <div class="card">
      <h2>${t('my_base_title')}</h2>
      <div class="stat-row">
        <div class="stat-tile"><strong>${stats.total}</strong><span>${t('stat_recipes')}</span></div>
        <div class="stat-tile"><strong>${stats.active}</strong><span>${t('stat_active')}</span></div>
        <div class="stat-tile"><strong>${stats.thisWeek}</strong><span>${t('stat_this_week')}</span></div>
        <div class="stat-tile"><strong>${stats.rated}</strong><span>${t('stat_rated')}</span></div>
      </div>
      <button class="btn btn-danger mt-1" id="clear-all-btn">${t('clear_all_data')}</button>
    </div>

    <div class="card">
      <h2>${t('about')}</h2>
      <p class="small muted">${document.documentElement.lang === 'en'
        ? 'This app runs entirely in your browser. Your recipes, notes and photos never leave your device — only the empty app itself is hosted online. There is no account and no login.'
        : 'Cette application fonctionne entièrement dans votre navigateur. Vos recettes, notes et photos ne quittent jamais votre appareil — seule l’application vide est hébergée en ligne. Il n’y a ni compte, ni connexion.'}</p>
    </div>
  `;

  document.getElementById('cycle-toggle').addEventListener('change', async (e) => {
    await updateSettings({ cycleModeEnabled: e.target.checked });
    applyCycleModeClass();
    paint();
  });

  document.getElementById('lang-fr').addEventListener('click', async () => { setLang('fr'); await updateSettings({ language: 'fr' }); refreshStaticText(); paint(); });
  document.getElementById('lang-en').addEventListener('click', async () => { setLang('en'); await updateSettings({ language: 'en' }); refreshStaticText(); paint(); });

  document.querySelectorAll('[data-remove-tag]').forEach((btn) => {
    btn.addEventListener('click', async () => { await removeTag(btn.dataset.removeTag); paint(); });
  });
  document.querySelectorAll('[data-remove-cuisine]').forEach((btn) => {
    btn.addEventListener('click', async () => { await removeCuisine(btn.dataset.removeCuisine); paint(); });
  });
  document.getElementById('add-tag-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-tag-input');
    if (!input.value.trim()) return;
    await updateSettings({ tags: [...new Set([...(state.settings.tags || []), input.value.trim()])].sort((a, b) => a.localeCompare(b)) });
    paint();
  });
  document.getElementById('add-cuisine-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-cuisine-input');
    if (!input.value.trim()) return;
    await updateSettings({ cuisines: [...new Set([...(state.settings.cuisines || []), input.value.trim()])].sort((a, b) => a.localeCompare(b)) });
    paint();
  });

  document.getElementById('export-btn').addEventListener('click', async () => {
    const backup = await exportBackup();
    downloadFile(`carnet-de-recettes-${todayIso().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
    toast(t('export_backup') + ' ✓');
  });

  document.getElementById('replace-mode-toggle').addEventListener('change', (e) => { replaceMode = e.target.checked; });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      await importBackup(data, { mode: replaceMode ? 'replace' : 'merge' });
      toast(t('import_backup') + ' ✓');
      location.reload();
    } catch (err) {
      toast('Erreur : ' + err.message);
    }
  });

  document.getElementById('clear-all-btn').addEventListener('click', async () => {
    if (confirm(t('confirm_clear_all_data'))) {
      await clearAllRecipeData();
      toast(t('clear_all_data') + ' ✓');
      paint();
    }
  });
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
