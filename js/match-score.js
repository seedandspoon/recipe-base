import { matchIngredients } from './matcher.js';

// Scores how well a recipe fits a given cycle phase, based on which of its
// ingredients resolve to foods favored during that phase.
export function scoreRecipeForPhase(recipe, phaseId, foods) {
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const matched = matchIngredients(recipe.ingredients || [], foods);
  const recognized = matched.filter((m) => m.foodId);
  if (recognized.length === 0) {
    return { score: null, matchedCount: 0, favoredCount: 0, totalCount: (recipe.ingredients || []).length };
  }
  let favoredCount = 0;
  for (const m of recognized) {
    const food = foodById.get(m.foodId);
    if (food && Array.isArray(food.phases) && food.phases.includes(phaseId)) {
      favoredCount += 1;
    }
  }
  return {
    score: favoredCount / recognized.length,
    matchedCount: recognized.length,
    favoredCount,
    totalCount: (recipe.ingredients || []).length,
  };
}

export function scoreLabel(score) {
  if (score === null || score === undefined) return null;
  if (score >= 0.66) return 'high';
  if (score >= 0.33) return 'medium';
  return 'low';
}
