// Source of the "import" bookmarklet. Settings.js fetches this file and
// wraps it into a javascript: bookmarklet, replacing __APP_URL__ with the
// address the app is actually running from. Keep this file plain,
// self-contained JS (no imports) — it runs inside arbitrary recipe pages.
(function () {
  function isoDurationToMinutes(iso) {
    if (!iso) return '';
    var m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return '';
    var h = parseInt(m[1] || 0, 10);
    var mi = parseInt(m[2] || 0, 10);
    return h * 60 + mi;
  }

  function textOf(x) {
    if (!x) return '';
    if (typeof x === 'string') return x;
    if (Array.isArray(x)) return x.map(textOf).join(' ');
    if (x.text) return x.text;
    if (x.name) return x.name;
    return '';
  }

  // "23 g" / "429 kJ" / 23 -> "23" — nutrition values in JSON-LD are
  // sometimes plain numbers, sometimes strings with a unit attached.
  function numFrom(x) {
    if (x === undefined || x === null || x === '') return '';
    var m = String(x).match(/[\d.,]+/);
    return m ? m[0].replace(',', '.') : '';
  }

  function extractRecipeJsonLd() {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i += 1) {
      try {
        var data = JSON.parse(scripts[i].textContent);
        var candidates = Array.isArray(data) ? data : (data['@graph'] || [data]);
        for (var j = 0; j < candidates.length; j += 1) {
          var node = candidates[j];
          var types = [].concat(node['@type'] || []);
          if (types.indexOf('Recipe') !== -1) return node;
        }
      } catch (e) { /* ignore malformed JSON-LD blocks */ }
    }
    return null;
  }

  var recipe = extractRecipeJsonLd();
  if (!recipe) {
    alert('Aucune recette structurée trouvée sur cette page. Utilisez "Coller du texte" dans l’app.\n\nNo structured recipe found on this page. Use "Paste text" in the app instead.');
    return;
  }

  var ingredients = (recipe.recipeIngredient || recipe.ingredients || []).map(function (line) {
    return { name: String(line), quantity: '', unit: '', allergen: false };
  });

  // Steps become sections [{ title, items }], preserving each
  // HowToSection's name instead of flattening everything together.
  var stepSections = [];
  var instr = recipe.recipeInstructions;
  if (Array.isArray(instr)) {
    var hasSections = instr.some(function (s) { return s && s['@type'] === 'HowToSection'; });
    if (hasSections) {
      instr.forEach(function (s) {
        if (s && s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement)) {
          var items = s.itemListElement.map(textOf).filter(Boolean);
          if (items.length) stepSections.push({ title: textOf(s.name) || '', items: items });
        } else {
          var text = textOf(s);
          if (text) stepSections.push({ title: '', items: [text] });
        }
      });
    } else {
      var flatItems = instr.map(function (s) { return typeof s === 'string' ? s : textOf(s); }).filter(Boolean);
      if (flatItems.length) stepSections.push({ title: '', items: flatItems });
    }
  } else if (typeof instr === 'string') {
    var lines = instr.split(/\n+/).filter(Boolean);
    if (lines.length) stepSections.push({ title: '', items: lines });
  }

  var image = recipe.image;
  if (image && typeof image === 'object' && !Array.isArray(image)) image = image.url;
  if (Array.isArray(image)) image = image[0];

  var rawNutrition = recipe.nutrition || {};
  var nutrition = {
    calories: numFrom(rawNutrition.calories),
    protein_g: numFrom(rawNutrition.proteinContent),
    fat_g: numFrom(rawNutrition.fatContent),
    saturates_g: numFrom(rawNutrition.saturatedFatContent),
    carbs_g: numFrom(rawNutrition.carbohydrateContent),
    sugars_g: numFrom(rawNutrition.sugarContent),
    fiber_g: numFrom(rawNutrition.fiberContent),
  };

  var payload = {
    title: textOf(recipe.name),
    description: textOf(recipe.description),
    source: location.href,
    photoUrl: image || '',
    servings: parseInt(recipe.recipeYield, 10) || '',
    prepTime: isoDurationToMinutes(recipe.prepTime),
    cookTime: isoDurationToMinutes(recipe.cookTime),
    cuisine: textOf(recipe.recipeCuisine),
    tags: recipe.keywords ? String(recipe.keywords).split(',').map(function (s) { return s.trim(); }) : [],
    ingredients: ingredients,
    steps: stepSections,
    nutrition: nutrition,
  };

  var json = JSON.stringify(payload);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  window.open('__APP_URL__#/import?data=' + encoded, '_blank');
})();
