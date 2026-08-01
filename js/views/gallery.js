import { state } from '../store.js';
import { t } from '../i18n.js';
import { normalize } from '../matcher.js';
import { scoreRecipeForPhase } from '../match-score.js';
import { uniqueSorted, escapeHtml } from '../utils.js';
import { MEAL_TYPES, SEASONS, DIFFICULTIES, STATUSES, recipeCardHtml, optionList } from './shared.js';

const filters = {
  q: '',
  mealType: '',
  cuisine: '',
  season: '',
  difficulty: '',
  status: 'active',
  tag: '',
  minRating: '',
  sort: 'recent',
};

function recipeMatchesQuery(recipe, q) {
  if (!q) return true;
  const nq = normalize(q);
  if (normalize(recipe.title || '').includes(nq)) return true;
  return (recipe.ingredients || []).some((ing) => normalize(ing.name || '').includes(nq));
}

function applyFilters() {
  const cycleOn = state.settings.cycleModeEnabled;
  const currentPhaseId = cycleOn ? state.settings.currentPhaseId : null;

  let list = state.recipes.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.mealType && r.mealType !== filters.mealType) return false;
    if (filters.cuisine && r.cuisine !== filters.cuisine) return false;
    if (filters.season && r.season !== filters.season) return false;
    if (filters.difficulty && r.difficulty !== filters.difficulty) return false;
    if (filters.tag && !(r.tags || []).includes(filters.tag)) return false;
    if (filters.minRating && (Number(r.rating) || 0) < Number(filters.minRating)) return false;
    if (!recipeMatchesQuery(r, filters.q)) return false;
    return true;
  });

  if (filters.sort === 'name') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sort === 'rating') {
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (filters.sort === 'match' && currentPhaseId) {
    list.sort((a, b) => {
      const sa = scoreRecipeForPhase(a, currentPhaseId, state.foods).score ?? -1;
      const sb = scoreRecipeForPhase(b, currentPhaseId, state.foods).score ?? -1;
      return sb - sa;
    });
  } else {
    list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  return { list, currentPhaseId };
}

function groupByMealType(list) {
  const groups = new Map();
  for (const r of list) {
    const key = r.mealType || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

export async function renderGallery({ query: routeQuery } = {}) {
  const cuisines = uniqueSorted(state.recipes.map((r) => r.cuisine));
  const tags = uniqueSorted(state.recipes.flatMap((r) => r.tags || []));
  const cycleOn = state.settings.cycleModeEnabled;

  const { list, currentPhaseId } = applyFilters();
  const groups = groupByMealType(list);

  const mealTypeOrder = MEAL_TYPES.filter((m) => groups.has(m)).concat(
    [...groups.keys()].filter((k) => !MEAL_TYPES.includes(k))
  );

  document.getElementById('view').innerHTML = `
    <div class="gallery-controls">
      <input id="f-q" type="search" placeholder="${t('search_placeholder')}" value="${escapeHtml(filters.q)}" />
      <div class="filter-row">
        <select id="f-mealType"><option value="">${t('meal_type')}: ${t('all')}</option>${optionList(MEAL_TYPES, 'meal', filters.mealType)}</select>
        <select id="f-cuisine"><option value="">${t('cuisine')}: ${t('all')}</option>${cuisines.map((c) => `<option value="${escapeHtml(c)}" ${c===filters.cuisine?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select>
        <select id="f-season"><option value="">${t('season')}: ${t('all')}</option>${optionList(SEASONS, 'season', filters.season)}</select>
        <select id="f-difficulty"><option value="">${t('difficulty')}: ${t('all')}</option>${optionList(DIFFICULTIES, 'difficulty', filters.difficulty)}</select>
        <select id="f-status">${STATUSES.map((s) => `<option value="${s}" ${s===filters.status?'selected':''}>${t(`status_${s}`)}</option>`).join('')}<option value="" ${filters.status===''?'selected':''}>${t('all_fem')}</option></select>
        ${tags.length ? `<select id="f-tag"><option value="">${t('tags')}: ${t('all')}</option>${tags.map((tg) => `<option value="${escapeHtml(tg)}" ${tg===filters.tag?'selected':''}>${escapeHtml(tg)}</option>`).join('')}</select>` : ''}
        <select id="f-rating"><option value="">${t('rating')}: ${t('any')}</option>${[5,4,3,2,1].map((n) => `<option value="${n}" ${String(n)===filters.minRating?'selected':''}>${'★'.repeat(n)}+</option>`).join('')}</select>
        <select id="f-sort">
          <option value="recent" ${filters.sort==='recent'?'selected':''}>${t('sort_by')}: ${t('sort_recent')}</option>
          <option value="name" ${filters.sort==='name'?'selected':''}>${t('sort_by')}: ${t('sort_name')}</option>
          <option value="rating" ${filters.sort==='rating'?'selected':''}>${t('sort_by')}: ${t('sort_rating')}</option>
          ${cycleOn ? `<option value="match" ${filters.sort==='match'?'selected':''}>${t('sort_by')}: ${t('sort_match')}</option>` : ''}
        </select>
        <button class="btn btn-small" id="f-clear">${t('clear_filters')}</button>
      </div>
    </div>
    <div id="gallery-results">
      ${list.length === 0 ? `<div class="empty-state">${t('no_recipes')}</div>` : mealTypeOrder.map((key) => `
        <div class="meal-group">
          <h2>${MEAL_TYPES.includes(key) ? t(`meal_${key}`) : escapeHtml(key)}</h2>
          <div class="recipe-grid">
            ${groups.get(key).map((r) => recipeCardHtml(r, { currentPhaseId, foods: state.foods })).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const bind = (id, key, evt = 'input') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(evt, () => { filters[key] = el.value; renderGallery(); });
  };
  bind('f-q', 'q');
  bind('f-mealType', 'mealType', 'change');
  bind('f-cuisine', 'cuisine', 'change');
  bind('f-season', 'season', 'change');
  bind('f-difficulty', 'difficulty', 'change');
  bind('f-status', 'status', 'change');
  bind('f-tag', 'tag', 'change');
  bind('f-rating', 'minRating', 'change');
  bind('f-sort', 'sort', 'change');
  document.getElementById('f-clear').addEventListener('click', () => {
    Object.assign(filters, { q: '', mealType: '', cuisine: '', season: '', difficulty: '', status: 'active', tag: '', minRating: '', sort: 'recent' });
    renderGallery();
  });

  if (routeQuery && routeQuery.focus === 'search') {
    document.getElementById('f-q').focus();
    history.replaceState(null, '', '#/gallery');
  }
}
