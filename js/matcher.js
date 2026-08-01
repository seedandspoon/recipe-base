// Matches free-text ingredient lines against the food reference library,
// regardless of language (FR/EN) or number (singular/plural).

const ACCENTS = /[̀-ͯ]/g;

export function normalize(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(ACCENTS, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Very small, deliberately conservative singularizer for FR/EN food words.
// Good enough for a personal ingredient list, not a general NLP tool.
export function singularize(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('aux')) return word.slice(0, -3) + 'al'; // chevaux -> cheval (edge case, harmless)
  if (word.endsWith('eaux')) return word.slice(0, -1);        // poireaux -> poireau
  if (word.endsWith('oux')) return word.slice(0, -1);         // choux -> chou
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';   // berries -> berry
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';   // leaves -> leaf
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    return word.slice(0, -1); // tomates -> tomate, eggs -> egg
  }
  return word;
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map(singularize);
}

// Build a lookup from every known name/alias (normalized + singularized,
// as a token set) to the food id.
export function buildFoodIndex(foods) {
  const index = []; // [{ foodId, tokens: Set<string>, tokenCount, phrase }]
  for (const food of foods) {
    const names = [food.name_fr, food.name_en, ...(food.aliases || [])].filter(Boolean);
    for (const name of names) {
      const tokens = tokenize(name);
      if (tokens.length === 0) continue;
      index.push({ foodId: food.id, tokens, tokenCount: tokens.length, phrase: tokens.join(' ') });
    }
  }
  // Longest phrases first, so "huile d'olive" wins over "olive".
  index.sort((a, b) => b.tokenCount - a.tokenCount);
  return index;
}

// Given one ingredient line ("2 cups baby spinach, chopped"), find the best
// matching food id, if any.
export function matchIngredientLine(line, foodIndex) {
  const tokens = tokenize(line);
  if (tokens.length === 0) return null;
  const tokenSet = new Set(tokens);
  let best = null;
  for (const entry of foodIndex) {
    const allPresent = entry.tokens.every((t) => tokenSet.has(t));
    if (allPresent) {
      if (!best || entry.tokenCount > best.tokenCount) best = entry;
    }
  }
  return best ? best.foodId : null;
}

export function matchIngredients(ingredientLines, foods) {
  const index = buildFoodIndex(foods);
  return ingredientLines.map((line) => ({
    line,
    foodId: matchIngredientLine(typeof line === 'string' ? line : line.name, index),
  }));
}
