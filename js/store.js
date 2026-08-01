// In-memory cache over IndexedDB. The app is small enough that keeping
// everything in memory and writing straight through to IndexedDB is simpler
// (and easier to maintain) than a fine-grained reactive layer.

import { db, newId, getSettings, saveSettings, seedIfEmpty, clearRecipesAndPlanning } from './db.js';
import { uniqueSorted } from './utils.js';

export const state = {
  recipes: [],
  foods: [],
  phases: [],
  weekPlan: [],
  shoppingList: null,
  settings: null,
  ready: false,
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const fn of listeners) fn(state);
}

// Aisle taxonomy got more detailed after some people may already have had
// data seeded with the old, coarser one. Old code -> new code, splitting
// where needed using the food's category as a hint.
const CURRENT_AISLES = new Set([
  'produce', 'meat_poultry', 'fish', 'dairy_eggs',
  'pantry_savory', 'pantry_sweet', 'herbs_spices', 'seeds_dried_fruits', 'other',
]);
function migrateAisleCode(aisle, category) {
  if (CURRENT_AISLES.has(aisle)) return aisle;
  switch (aisle) {
    case 'meat_fish': return category === 'fish' ? 'fish' : 'meat_poultry';
    case 'spices': return 'herbs_spices';
    case 'pantry':
      if (category === 'nut' || category === 'seed') return 'seeds_dried_fruits';
      if (category === 'fat') return 'herbs_spices';
      if (category === 'pantry') return 'pantry_sweet';
      return 'pantry_savory';
    case 'bakery': return 'pantry_sweet';
    case 'frozen':
    case 'beverages':
      return 'other';
    default:
      return 'other';
  }
}

export async function boot() {
  await seedIfEmpty();
  const [recipes, foods, phases, weekPlan, settings, shoppingList] = await Promise.all([
    db.getAll('recipes'),
    db.getAll('foods'),
    db.getAll('phases'),
    db.getAll('weekPlan'),
    getSettings(),
    db.get('shoppingList', 'current'),
  ]);
  state.recipes = recipes;
  state.foods = foods.sort((a, b) => a.name_fr.localeCompare(b.name_fr));
  state.phases = phases.sort((a, b) => a.order - b.order);
  state.weekPlan = weekPlan;
  state.settings = settings;
  state.shoppingList = shoppingList || { id: 'current', items: [] };
  state.ready = true;

  // One-time upgrade for data seeded before the aisle list got more
  // detailed — remap silently so nothing shows a raw, untranslated code.
  const changedFoods = [];
  for (const food of state.foods) {
    const migrated = migrateAisleCode(food.aisle, food.category);
    if (migrated !== food.aisle) { food.aisle = migrated; changedFoods.push(food); }
  }
  if (changedFoods.length) await db.putMany('foods', changedFoods);

  if (state.shoppingList.items && state.shoppingList.items.length) {
    let shoppingChanged = false;
    for (const item of state.shoppingList.items) {
      const migrated = migrateAisleCode(item.aisle, null);
      if (migrated !== item.aisle) { item.aisle = migrated; shoppingChanged = true; }
    }
    if (shoppingChanged) await db.put('shoppingList', state.shoppingList);
  }

  // First run (or upgrading from before tags/cuisines existed): seed the
  // managed lists from whatever's already on her recipes, so nothing that
  // was typed before this existed gets lost.
  if (settings.tags === null || settings.cuisines === null) {
    const patch = {};
    if (settings.tags === null) patch.tags = uniqueSorted(recipes.flatMap((r) => r.tags || []));
    if (settings.cuisines === null) patch.cuisines = uniqueSorted(recipes.map((r) => r.cuisine));
    await updateSettings(patch);
  }

  notify();
  return state;
}

// --- Recipes -----------------------------------------------------------

export async function saveRecipe(recipe) {
  const now = new Date().toISOString();
  const isNew = !recipe.id;
  const full = {
    status: 'active',
    tags: [],
    ingredients: [],
    steps: [],
    ...recipe,
    id: recipe.id || newId('recipe'),
    createdAt: recipe.createdAt || now,
    updatedAt: now,
  };
  await db.put('recipes', full);
  const idx = state.recipes.findIndex((r) => r.id === full.id);
  if (idx >= 0) state.recipes[idx] = full;
  else state.recipes.push(full);
  notify();
  return full;
}

export async function deleteRecipe(id) {
  await db.delete('recipes', id);
  state.recipes = state.recipes.filter((r) => r.id !== id);
  state.weekPlan = state.weekPlan.filter((w) => w.recipeId !== id);
  await db.delete('weekPlan', id).catch(() => {});
  notify();
}

// Finds an existing recipe by non-empty source URL, for import de-duplication.
export function findRecipeBySource(source) {
  if (!source) return null;
  return state.recipes.find((r) => r.source && r.source.trim() === source.trim()) || null;
}

// Wipes recipes + week plan + shopping list. Leaves the food library,
// phase content and settings (tags/cuisines lists included) untouched.
export async function clearAllRecipeData() {
  await clearRecipesAndPlanning();
  state.recipes = [];
  state.weekPlan = [];
  state.shoppingList = { id: 'current', items: [] };
  notify();
}

// Adds a tag/cuisine to the managed list if it isn't already there.
// Recipes referencing a removed tag/cuisine keep their own value —
// removing it from the list only stops it being offered as a choice.
export async function ensureTagExists(tag) {
  const clean = (tag || '').trim();
  if (!clean || state.settings.tags.includes(clean)) return;
  await updateSettings({ tags: uniqueSorted([...state.settings.tags, clean]) });
}

export async function ensureCuisineExists(cuisine) {
  const clean = (cuisine || '').trim();
  if (!clean || state.settings.cuisines.includes(clean)) return;
  await updateSettings({ cuisines: uniqueSorted([...state.settings.cuisines, clean]) });
}

export async function removeTag(tag) {
  await updateSettings({ tags: state.settings.tags.filter((t) => t !== tag) });
}

export async function removeCuisine(cuisine) {
  await updateSettings({ cuisines: state.settings.cuisines.filter((c) => c !== cuisine) });
}

// --- Foods ---------------------------------------------------------------

export async function saveFood(food) {
  const full = { phases: [], aliases: [], ...food, id: food.id || newId('food') };
  await db.put('foods', full);
  const idx = state.foods.findIndex((f) => f.id === full.id);
  if (idx >= 0) state.foods[idx] = full;
  else state.foods.push(full);
  state.foods.sort((a, b) => a.name_fr.localeCompare(b.name_fr));
  notify();
  return full;
}

export async function deleteFood(id) {
  await db.delete('foods', id);
  state.foods = state.foods.filter((f) => f.id !== id);
  notify();
}

// --- Phases ----------------------------------------------------------------

export async function savePhase(phase) {
  await db.put('phases', phase);
  const idx = state.phases.findIndex((p) => p.id === phase.id);
  if (idx >= 0) state.phases[idx] = phase;
  notify();
  return phase;
}

// --- Settings ----------------------------------------------------------------

export async function updateSettings(patch) {
  const next = await saveSettings(patch);
  state.settings = next;
  notify();
  return next;
}

// --- Week plan / shopping list -----------------------------------------

export async function setWeekPlanEntry(recipeId, portions) {
  if (portions <= 0) return removeWeekPlanEntry(recipeId);
  const entry = { id: recipeId, recipeId, portions };
  await db.put('weekPlan', entry);
  const idx = state.weekPlan.findIndex((w) => w.recipeId === recipeId);
  if (idx >= 0) state.weekPlan[idx] = entry;
  else state.weekPlan.push(entry);
  notify();
}

export async function removeWeekPlanEntry(recipeId) {
  await db.delete('weekPlan', recipeId);
  state.weekPlan = state.weekPlan.filter((w) => w.recipeId !== recipeId);
  notify();
}

export async function clearWeekPlan() {
  await db.clear('weekPlan');
  state.weekPlan = [];
  notify();
}

export async function saveShoppingList(list) {
  const full = { id: 'current', ...list };
  await db.put('shoppingList', full);
  state.shoppingList = full;
  notify();
}
