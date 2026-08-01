// Tiny bilingual dictionary (FR/EN). No framework, just string lookup.
// Add a key here whenever a view needs new user-facing text.

export const STRINGS = {
  app_title: { fr: 'Carnet de recettes', en: 'Recipe Book' },
  nav_gallery: { fr: 'Recettes', en: 'Recipes' },
  nav_phases: { fr: 'Cycle', en: 'Cycle' },
  nav_foods: { fr: 'Aliments', en: 'Foods' },
  nav_planner: { fr: 'Semaine', en: 'Week' },
  nav_week: { fr: 'Cette semaine', en: 'This week' },
  nav_shopping: { fr: 'Courses', en: 'Shopping' },
  nav_settings: { fr: 'Réglages', en: 'Settings' },
  nav_add: { fr: 'Ajouter', en: 'Add' },

  // Gallery
  search_placeholder: { fr: 'Chercher par nom ou ingrédient…', en: 'Search by name or ingredient…' },
  search: { fr: 'Chercher', en: 'Search' },
  filters: { fr: 'Filtres', en: 'Filters' },
  clear_filters: { fr: 'Réinitialiser', en: 'Clear filters' },
  meal_type: { fr: 'Type de repas', en: 'Meal type' },
  cuisine: { fr: 'Cuisine', en: 'Cuisine' },
  season: { fr: 'Saison', en: 'Season' },
  difficulty: { fr: 'Difficulté', en: 'Difficulty' },
  status: { fr: 'Statut', en: 'Status' },
  rating: { fr: 'Note', en: 'Rating' },
  tags: { fr: 'Étiquettes', en: 'Tags' },
  status_draft: { fr: 'Brouillon', en: 'Draft' },
  status_active: { fr: 'Active', en: 'Active' },
  status_archived: { fr: 'Archivée', en: 'Archived' },
  no_recipes: { fr: 'Aucune recette ne correspond.', en: 'No recipes match.' },
  match_high: { fr: 'Idéal pour cette phase', en: 'Great fit for this phase' },
  match_medium: { fr: 'Convient plutôt bien', en: 'Fits reasonably well' },
  match_low: { fr: 'Moins adapté à cette phase', en: 'Less suited to this phase' },
  ingredient_of_phase_singular: { fr: 'ingrédient de la phase', en: 'ingredient for this phase' },
  ingredient_of_phase_plural: { fr: 'ingrédients de la phase', en: 'ingredients for this phase' },
  all_recipes_count: { fr: 'Toutes les recettes', en: 'All recipes' },
  of_total: { fr: 'sur', en: 'of' },
  quick_add_to_week: { fr: 'Ajouter à la semaine', en: 'Add to this week' },
  already_in_week: { fr: 'Déjà dans ta semaine', en: 'Already in your week' },
  sort_by: { fr: 'Trier par', en: 'Sort by' },
  sort_match: { fr: 'Adéquation à la phase', en: 'Phase match' },
  sort_name: { fr: 'Nom', en: 'Name' },
  sort_rating: { fr: 'Note', en: 'Rating' },
  sort_recent: { fr: 'Récentes', en: 'Recent' },

  // Recipe fields
  title: { fr: 'Titre', en: 'Title' },
  description: { fr: 'Description', en: 'Description' },
  source: { fr: 'Source', en: 'Source' },
  prep_time: { fr: 'Préparation', en: 'Prep time' },
  cook_time: { fr: 'Cuisson', en: 'Cook time' },
  servings: { fr: 'Portions', en: 'Servings' },
  nutrition: { fr: 'Nutrition', en: 'Nutrition' },
  ingredients: { fr: 'Ingrédients', en: 'Ingredients' },
  steps: { fr: 'Étapes', en: 'Steps' },
  allergen: { fr: 'Allergène', en: 'Allergen' },
  photo: { fr: 'Photo', en: 'Photo' },
  edit: { fr: 'Modifier', en: 'Edit' },
  save: { fr: 'Enregistrer', en: 'Save' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  delete: { fr: 'Supprimer', en: 'Delete' },
  add_to_week: { fr: 'Ajouter à la semaine', en: 'Add to this week' },
  minutes: { fr: 'min', en: 'min' },
  add_ingredient: { fr: 'Ajouter un ingrédient', en: 'Add ingredient' },
  add_step: { fr: 'Ajouter une étape', en: 'Add step' },
  confirm_delete_recipe: { fr: 'Supprimer cette recette ?', en: 'Delete this recipe?' },

  // Phases
  phase_menstrual: { fr: 'Menstruelle', en: 'Menstrual' },
  phase_follicular: { fr: 'Folliculaire', en: 'Follicular' },
  phase_ovulatory: { fr: 'Ovulatoire', en: 'Ovulatory' },
  phase_luteal: { fr: 'Lutéale', en: 'Luteal' },
  duration: { fr: 'Durée', en: 'Duration' },
  hormones: { fr: 'Hormones', en: 'Hormones' },
  mood: { fr: 'Humeur', en: 'Mood' },
  exercise: { fr: 'Mouvement', en: 'Exercise' },
  cooking_style: { fr: 'Cuisiner pendant cette phase', en: 'Cooking for this phase' },
  seed_cycling: { fr: 'Seed cycling', en: 'Seed cycling' },
  favored_foods: { fr: 'Aliments à privilégier', en: 'Foods to favor' },
  my_notes: { fr: 'Mes notes', en: 'My notes' },
  set_current_phase: { fr: 'Je suis dans cette phase en ce moment', en: "This is my phase right now" },
  current_phase_badge: { fr: 'Phase actuelle', en: 'Current phase' },

  // Foods
  food_name_fr: { fr: 'Nom (français)', en: 'Name (French)' },
  food_name_en: { fr: 'Nom (anglais)', en: 'Name (English)' },
  aliases: { fr: 'Autres appellations', en: 'Aliases' },
  glycemic_index: { fr: 'Index glycémique', en: 'Glycemic index' },
  gi_not_applicable: { fr: 'Non applicable (glucides négligeables)', en: 'Not applicable (negligible carbs)' },
  organic_priority: { fr: 'Priorité bio', en: 'Organic priority' },
  organic_high: { fr: 'À acheter bio si possible', en: 'Worth buying organic' },
  organic_low: { fr: 'Bio moins prioritaire', en: 'Organic less critical' },
  organic_na: { fr: 'Non évalué', en: 'Not rated' },
  aisle: { fr: 'Rayon', en: 'Aisle' },
  category: { fr: 'Catégorie', en: 'Category' },
  add_food: { fr: 'Ajouter un aliment', en: 'Add a food' },
  sources: { fr: 'Sources', en: 'Sources' },
  manage_foods: { fr: 'Gérer mes aliments', en: 'Manage my foods' },
  manage_foods_hint: {
    fr: 'Le catalogue que l’app reconnaît dans tes recettes : index glycémique, priorité bio, catégorie, phases. Tu peux tout modifier.',
    en: 'The catalog the app recognizes in your recipes: glycemic index, organic priority, category, phases. You can edit all of it.',
  },

  // Planner / shopping list
  this_week: { fr: 'Cette semaine', en: 'This week' },
  portions_to_cook: { fr: 'Portions à cuisiner', en: 'Portions to cook' },
  generate_list: { fr: 'Générer la liste de courses', en: 'Generate shopping list' },
  shopping_list: { fr: 'Liste de courses', en: 'Shopping list' },
  remove: { fr: 'Retirer', en: 'Remove' },
  empty_week: { fr: 'Aucune recette sélectionnée pour la semaine.', en: 'No recipes picked for the week yet.' },
  empty_shopping_list: { fr: 'Pas encore de liste de courses. Génère-la depuis "Cette semaine".', en: 'No shopping list yet. Generate it from "This week".' },
  clear_checked: { fr: 'Effacer les cases cochées', en: 'Clear checked items' },
  move_to_aisle: { fr: 'Déplacer vers…', en: 'Move to aisle…' },
  add_item: { fr: 'Ajouter un article', en: 'Add an item' },
  copy_list: { fr: 'Copier', en: 'Copy' },
  copy_failed: { fr: 'Impossible de copier', en: 'Could not copy' },

  // Import
  import: { fr: 'Importer', en: 'Import' },
  import_from_web: { fr: 'Depuis une page web', en: 'From a webpage' },
  import_paste: { fr: 'Coller du texte', en: 'Paste text' },
  import_manual: { fr: 'Saisir à la main', en: 'Type it in' },
  import_batch: { fr: 'Importer un lot', en: 'Batch import' },
  review_before_saving: { fr: 'Vérifiez avant d’enregistrer', en: 'Review before saving' },
  will_update_existing: { fr: 'Une recette avec cette source existe déjà : elle sera mise à jour.', en: 'A recipe with this source already exists: it will be updated.' },
  paste_text_here: { fr: 'Collez le texte de la recette ici…', en: 'Paste the recipe text here…' },
  parse: { fr: 'Analyser', en: 'Parse' },
  choose_file: { fr: 'Choisir un fichier', en: 'Choose a file' },

  // Settings
  cycle_mode: { fr: 'Fonctions liées au cycle', en: 'Cycle features' },
  cycle_mode_hint: { fr: 'Désactivez pour un carnet de recettes tout simple, sans rien lié au cycle.', en: 'Turn off for a plain recipe book, with nothing cycle-related showing.' },
  language: { fr: 'Langue', en: 'Language' },
  backup: { fr: 'Sauvegarde', en: 'Backup' },
  export_backup: { fr: 'Exporter tout', en: 'Export everything' },
  import_backup: { fr: 'Importer une sauvegarde', en: 'Import a backup' },
  import_mode_merge: { fr: 'Fusionner (ajoute / met à jour)', en: 'Merge (adds / updates)' },
  import_mode_replace: { fr: 'Remplacer tout', en: 'Replace everything' },
  bookmarklet: { fr: 'Bouton "Importer" pour le navigateur', en: 'Browser "Import" button' },
  bookmarklet_hint: {
    fr: 'Faites glisser ce bouton dans votre barre de favoris. Sur une page de recette, cliquez dessus pour l’importer.',
    en: 'Drag this button to your bookmarks bar. On a recipe page, click it to import that recipe.',
  },
  about: { fr: 'À propos', en: 'About' },

  // Aisles (used for shopping-list grouping)
  aisle_produce: { fr: 'Fruits & légumes', en: 'Produce' },
  aisle_meat_poultry: { fr: 'Boucherie & volaille', en: 'Meat & poultry' },
  aisle_fish: { fr: 'Poissonnerie', en: 'Fish' },
  aisle_dairy_eggs: { fr: 'Crèmerie & œufs', en: 'Dairy & eggs' },
  aisle_pantry_savory: { fr: 'Épicerie salée', en: 'Savory pantry' },
  aisle_pantry_sweet: { fr: 'Épicerie sucrée & petit-déjeuner', en: 'Sweet pantry & breakfast' },
  aisle_herbs_spices: { fr: 'Herbes, épices & condiments', en: 'Herbs, spices & condiments' },
  aisle_seeds_dried_fruits: { fr: 'Graines & fruits secs', en: 'Seeds & dried fruit' },
  aisle_other: { fr: 'Autre', en: 'Other' },

  meal_breakfast: { fr: 'Petit-déjeuner', en: 'Breakfast' },
  meal_lunch: { fr: 'Déjeuner', en: 'Lunch' },
  meal_dinner: { fr: 'Dîner', en: 'Dinner' },
  meal_snack: { fr: 'En-cas', en: 'Snack' },
  meal_dessert: { fr: 'Dessert', en: 'Dessert' },

  season_spring: { fr: 'Printemps', en: 'Spring' },
  season_summer: { fr: 'Été', en: 'Summer' },
  season_autumn: { fr: 'Automne', en: 'Autumn' },
  season_winter: { fr: 'Hiver', en: 'Winter' },
  season_any: { fr: 'Toute l’année', en: 'Any season' },

  difficulty_easy: { fr: 'Facile', en: 'Easy' },
  difficulty_medium: { fr: 'Moyen', en: 'Medium' },
  difficulty_hard: { fr: 'Difficile', en: 'Hard' },

  all: { fr: 'Tous', en: 'All' },
  all_fem: { fr: 'Toutes', en: 'All' },
  any: { fr: 'Indifférent', en: 'Any' },

  // Food categories (page Aliments)
  category_vegetable: { fr: 'Légume', en: 'Vegetable' },
  category_fruit: { fr: 'Fruit', en: 'Fruit' },
  category_legume: { fr: 'Légumineuse', en: 'Legume' },
  category_grain: { fr: 'Céréale', en: 'Grain' },
  category_meat: { fr: 'Viande', en: 'Meat' },
  category_fish: { fr: 'Poisson', en: 'Fish' },
  category_dairy: { fr: 'Produit laitier', en: 'Dairy' },
  category_protein: { fr: 'Protéine', en: 'Protein' },
  category_seed: { fr: 'Graine', en: 'Seed' },
  category_nut: { fr: 'Noix', en: 'Nut' },
  category_spice: { fr: 'Épice', en: 'Spice' },
  category_fat: { fr: 'Matière grasse', en: 'Fat' },
  category_pantry: { fr: 'Épicerie', en: 'Pantry' },

  // Glycemic index levels — dedicated labels (not the "difficulty" ones)
  gi_low: { fr: 'Bas', en: 'Low' },
  gi_medium: { fr: 'Moyen', en: 'Medium' },
  gi_high: { fr: 'Élevé', en: 'High' },
};

const listeners = new Set();
let currentLang = 'fr';

export function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'fr';
  document.documentElement.lang = currentLang;
  for (const fn of listeners) fn(currentLang);
}

export function getLang() {
  return currentLang;
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars) {
  const entry = STRINGS[key];
  let str = entry ? (entry[currentLang] || entry.fr || key) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return str;
}

// Helper for bilingual data fields stored as { fr, en } on foods/phases.
export function tField(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[currentLang] || field.fr || field.en || '';
}
