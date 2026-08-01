import { boot, state } from './store.js';
import { route, setNotFound, startRouter, render } from './router.js';
import { t, setLang, onLangChange } from './i18n.js';
import { applyCycleModeClass, refreshStaticText } from './ui.js';

import { renderGallery } from './views/gallery.js';
import { renderRecipeDetail } from './views/recipe-detail.js';
import { renderRecipeEditor } from './views/recipe-editor.js';
import { renderPhases } from './views/phases.js';
import { renderFoods } from './views/foods.js';
import { renderPlanner } from './views/planner.js';
import { renderImport } from './views/import.js';
import { renderSettings } from './views/settings.js';

async function setupBookmarklet() {
  try {
    const source = await (await fetch('bookmarklet/import.js')).text();
    const appUrl = `${location.origin}${location.pathname}`;
    const wrapped = source.replaceAll('__APP_URL__', appUrl);
    window.__bookmarkletHref = `javascript:${encodeURIComponent(wrapped)}`;
  } catch {
    window.__bookmarkletHref = '#';
  }
}

async function main() {
  document.getElementById('view').innerHTML = '<div class="empty-state">…</div>';

  await boot();
  setLang(state.settings.language || 'fr');
  applyCycleModeClass();
  refreshStaticText();
  await setupBookmarklet();

  onLangChange(() => { refreshStaticText(); render(); });

  route('/gallery', renderGallery);
  route('/recipe/new', renderRecipeEditor);
  route('/recipe/:id/edit', renderRecipeEditor);
  route('/recipe/:id', renderRecipeDetail);
  route('/phases', renderPhases);
  route('/phases/:id', renderPhases);
  route('/foods', renderFoods);
  route('/planner', renderPlanner);
  route('/import', renderImport);
  route('/settings', renderSettings);
  setNotFound(() => `<div class="empty-state">${t('no_recipes')}</div>`);

  startRouter();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
