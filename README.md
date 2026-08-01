# Carnet de recettes du cycle / Cycle Recipe Book

A private recipe book that connects what you cook to where you are in your
menstrual cycle. No account, no server, no tracking — everything you enter
stays in your browser, on your device.

## How it's built (and why)

This is a static web app: plain HTML, CSS and JavaScript, no framework, no
build step, no `npm install` required to run it. That's deliberate — it's
meant to keep working for years with minimal upkeep from a non-developer.

- **Your data** (recipes, notes, corrections) lives in your browser's local
  IndexedDB storage. It never leaves your device except when you explicitly
  export a backup file.
- **The app itself** (the empty code — no personal data) is hosted for free
  on GitHub Pages, so it works instantly on your laptop and your iPhone,
  and installs as an offline-capable app (a PWA).
- There is no login and no cloud sync between devices — see **Backup &
  moving between devices** below for how to do that yourself.

## One-time setup

### 1. Turn on GitHub Pages

In this repository on GitHub: **Settings → Pages → Build and deployment →
Source: "Deploy from a branch"**, branch `main`, folder `/ (root)`, then
Save. GitHub will give you a URL like
`https://seedandspoon.github.io/recipe-base/` — that's your app's address.

### 2. Install it on your iPhone

Open that URL in Safari, tap the **Share** button, then **"Add to Home
Screen"**. It'll behave like a normal app icon, open full-screen, and keep
working without an internet connection after the first visit.

### 3. Install it on your laptop

Most browsers (Chrome, Edge) will offer to "Install app" from the address
bar. Otherwise, just bookmark the URL — it works offline once loaded.

## Importing recipes

- **From a webpage (the fast path):** open **Add → From a webpage**, and
  drag the "Import" button into your bookmarks bar. On a recipe site,
  click that bookmark — it reads the page's recipe data and opens the app
  with everything pre-filled for you to review before saving. Works on
  most recipe sites that use standard recipe markup (schema.org). If a
  site isn't supported, use "Paste text" instead.
  - On iPhone, Safari doesn't let you drag a link into bookmarks, so:
    bookmark this Settings/Add page first, then edit that bookmark and
    replace its address with the "Import" button's link (long-press the
    button to copy its link, or view the page source).
- **Paste text:** copy a recipe's text from anywhere and paste it in; the
  app makes a best-effort guess at ingredients and steps, which you then
  fix up in the review screen.
- **Type it in:** a plain form.
- **Batch import:** pick a JSON file — either a full backup exported from
  this app, or a plain array of recipe objects.

Importing a recipe whose source link matches one you already have updates
it in place instead of creating a duplicate.

## Backup & moving between devices

Go to **Settings → Backup**:

- **Export everything** downloads one JSON file with all your recipes,
  your food-library corrections, your phase notes, and your settings.
  Keep this somewhere safe (iCloud Drive, a USB stick, wherever) — it's
  your real backup.
- **Import a backup** loads that file back in, either merging it with
  what's already there or replacing everything. To move your collection
  to a second device, install the app there and import your latest
  export.

Do this regularly — nothing is backed up automatically, since nothing
leaves your device automatically.

## Turning cycle features on/off

**Settings → Cycle features.** Off, the app is a plain recipe book: no
phase pages, no food-matching badges, no phase filter. On, it adds the
Cycle tab, the food library, phase-match badges on recipes, and lets you
say "this is my phase right now" (either from Settings or from a phase
page) to sort/highlight recipes that fit.

## Editing the reference food data

**Foods** tab: every food's phase(s), glycemic index, organic priority
and grocery aisle are editable — click **Edit** on any row, or **+ Add a
food** for a new one. The starter set's glycemic-index and organic-
priority values are commonly published reference figures (see sources
below), not lab measurements for the specific produce you buy — correct
anything that doesn't match what you know.

**Sources used for the starter data:**
- Glycemic index: *International Tables of Glycemic Index and Glycemic
  Load Values* (Atkinson, Foster-Powell & Brand-Miller, *Diabetes Care*,
  2008); University of Sydney Glycemic Index Database
  ([glycemicindex.com](https://glycemicindex.com)); Harvard Health
  Publishing's glycemic index chart.
- Organic priority: EWG's 2025 Shopper's Guide to Pesticides in Produce —
  the "Dirty Dozen" / "Clean Fifteen" lists
  ([ewg.org](https://www.ewg.org)). This only covers fresh produce; other
  categories are marked "not rated".
- Cycle-phase guidance (hormones, mood, exercise, cooking style, seed
  cycling) reflects commonly described patterns in mainstream cycle-
  syncing and naturopathic wellness content. It's general orientation,
  not medical advice — adjust it and the "My notes" field to match your
  own body.

## Shopping list

Pick recipes for the week from each recipe's page (set how many portions
to cook — this scales the ingredient quantities), then go to **Week** and
click **Generate shopping list**. It merges repeated ingredients, groups
everything by aisle, and lets you tick items off as you shop. If you move
an item to a different aisle, the app remembers that for the ingredient
going forward.

## Project structure

```
index.html          App shell
css/styles.css       All styling
js/                  App code (no build step — edit and reload)
  db.js              IndexedDB storage + backup import/export
  store.js           In-memory cache over the database
  matcher.js          Ingredient ↔ food-library matching (FR/EN)
  match-score.js      Recipe ↔ phase scoring
  i18n.js             FR/EN interface text
  router.js            Hash-based page routing
  views/                One file per screen
data/                Starter content (foods, phases, example recipes)
bookmarklet/import.js  Source of the "import from a webpage" bookmarklet
manifest.json, sw.js  Make it an installable, offline-capable app
```

To change anything, edit the relevant file directly and refresh the page
— there's nothing to compile.
