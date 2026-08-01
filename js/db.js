// Minimal IndexedDB wrapper. No external dependencies, on purpose:
// this app needs to keep working with nothing but a browser for years.

const DB_NAME = 'cycle-recipe-book';
const DB_VERSION = 1;

const STORES = {
  recipes: 'id',
  foods: 'id',
  phases: 'id',
  settings: 'key',
  weekPlan: 'id',       // recipes picked for the current week + portions
  shoppingList: 'id',   // single row 'current' holding generated list state
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const db = {
  async getAll(storeName) {
    const database = await openDB();
    return reqToPromise(database.transaction(storeName, 'readonly').objectStore(storeName).getAll());
  },
  async get(storeName, key) {
    const database = await openDB();
    return reqToPromise(database.transaction(storeName, 'readonly').objectStore(storeName).get(key));
  },
  async put(storeName, value) {
    return tx(storeName, 'readwrite', (store) => store.put(value));
  },
  async putMany(storeName, values) {
    return tx(storeName, 'readwrite', (store) => {
      for (const v of values) store.put(v);
    });
  },
  async delete(storeName, key) {
    return tx(storeName, 'readwrite', (store) => store.delete(key));
  },
  async clear(storeName) {
    return tx(storeName, 'readwrite', (store) => store.clear());
  },
  async count(storeName) {
    const database = await openDB();
    return reqToPromise(database.transaction(storeName, 'readonly').objectStore(storeName).count());
  },
};

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// --- First-run seeding -----------------------------------------------------

export async function seedIfEmpty() {
  const [recipeCount, foodCount, phaseCount] = await Promise.all([
    db.count('recipes'),
    db.count('foods'),
    db.count('phases'),
  ]);

  if (foodCount === 0) {
    const foods = await (await fetch('data/seed-foods.json')).json();
    await db.putMany('foods', foods);
  }
  if (phaseCount === 0) {
    const phases = await (await fetch('data/seed-phases.json')).json();
    await db.putMany('phases', phases);
  }
  if (recipeCount === 0) {
    const recipes = await (await fetch('data/seed-recipes.json')).json();
    await db.putMany('recipes', recipes);
  }

  const settings = await getSettings();
  await db.put('settings', settings);
}

const DEFAULT_SETTINGS = {
  key: 'app',
  cycleModeEnabled: true,
  currentPhaseId: 'menstrual',
  language: 'fr',
  onboarded: false,
  tags: null, // null = not yet initialized; store.boot() seeds it from existing recipes once
  cuisines: null,
};

export async function getSettings() {
  const s = await db.get('settings', 'app');
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch, key: 'app' };
  await db.put('settings', next);
  return next;
}

// Wipes recipes and everything tied to them (week plan, shopping list) —
// deliberately leaves the food library, phase content and settings alone,
// since those are reference data she may have carefully corrected.
export async function clearRecipesAndPlanning() {
  await Promise.all([
    db.clear('recipes'),
    db.clear('weekPlan'),
    db.clear('shoppingList'),
  ]);
}

// --- Full backup export / import -------------------------------------------

export async function exportBackup() {
  const [recipes, foods, phases, weekPlan] = await Promise.all([
    db.getAll('recipes'),
    db.getAll('foods'),
    db.getAll('phases'),
    db.getAll('weekPlan'),
  ]);
  const settings = await getSettings();
  const shoppingList = await db.get('shoppingList', 'current');
  return {
    kind: 'cycle-recipe-book-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes,
    foods,
    phases,
    settings,
    weekPlan,
    shoppingList: shoppingList || null,
  };
}

export async function importBackup(data, { mode = 'merge' } = {}) {
  if (!data || data.kind !== 'cycle-recipe-book-backup') {
    throw new Error('This file does not look like a recipe book backup.');
  }
  if (mode === 'replace') {
    await Promise.all([
      db.clear('recipes'),
      db.clear('foods'),
      db.clear('phases'),
      db.clear('weekPlan'),
    ]);
  }
  if (data.recipes) await db.putMany('recipes', data.recipes);
  if (data.foods) await db.putMany('foods', data.foods);
  if (data.phases) await db.putMany('phases', data.phases);
  if (data.weekPlan) await db.putMany('weekPlan', data.weekPlan);
  if (data.shoppingList) await db.put('shoppingList', data.shoppingList);
  if (data.settings) await saveSettings(data.settings);
}
