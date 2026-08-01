// In-memory cache over IndexedDB. The app is small enough that keeping
// everything in memory and writing straight through to IndexedDB is simpler
// (and easier to maintain) than a fine-grained reactive layer.

import { db, newId, getSettings, saveSettings, seedIfEmpty } from './db.js';

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
