import { state, updateSettings } from '../store.js';
import { exportBackup, importBackup } from '../db.js';
import { t, setLang, getLang } from '../i18n.js';
import { downloadFile, readFileAsText, todayIso } from '../utils.js';
import { toast } from '../toast.js';
import { applyCycleModeClass, refreshStaticText } from '../ui.js';

export async function renderSettings() {
  paint();
}

function paint() {
  const s = state.settings;
  document.getElementById('view').innerHTML = `
    <h1>${t('nav_settings')}</h1>

    <div class="card">
      <div class="checkbox-row">
        <input type="checkbox" id="cycle-toggle" ${s.cycleModeEnabled ? 'checked' : ''} />
        <label for="cycle-toggle" style="margin:0;">${t('cycle_mode')}</label>
      </div>
      <p class="small muted">${t('cycle_mode_hint')}</p>

      ${s.cycleModeEnabled ? `
        <div class="field mt-1">
          <label>${t('set_current_phase')}</label>
          <select id="current-phase-select">
            ${state.phases.map((p) => `<option value="${p.id}" ${p.id === s.currentPhaseId ? 'selected' : ''}>${t(`phase_${p.id}`)}</option>`).join('')}
          </select>
        </div>` : ''}
    </div>

    <div class="card">
      <label>${t('language')}</label>
      <div class="filter-row">
        <button class="btn ${getLang()==='fr'?'btn-primary':''}" id="lang-fr">Français</button>
        <button class="btn ${getLang()==='en'?'btn-primary':''}" id="lang-en">English</button>
      </div>
    </div>

    <div class="card">
      <h2>${t('backup')}</h2>
      <p class="small muted">${document.documentElement.lang === 'en'
        ? 'Everything lives only in this browser. Export regularly to keep a real backup, and use it to move your collection to another device.'
        : 'Tout est stocké uniquement dans ce navigateur. Exportez régulièrement pour garder une vraie sauvegarde, et pour transférer votre collection vers un autre appareil.'}</p>
      <button class="btn btn-primary" id="export-btn">${t('export_backup')}</button>

      <hr class="sep" />

      <label>${t('import_backup')}</label>
      <div class="field-row">
        <select id="import-mode">
          <option value="merge">${t('import_mode_merge')}</option>
          <option value="replace">${t('import_mode_replace')}</option>
        </select>
      </div>
      <input type="file" id="import-file" accept="application/json" />
    </div>

    <div class="card">
      <h2>${t('import')}</h2>
      <p class="small muted">${document.documentElement.lang === 'en'
        ? 'To bring in a recipe from a webpage, paste raw text, or import a batch file, use the Add page.'
        : 'Pour importer une recette depuis une page web, coller du texte brut, ou importer un lot, utilisez la page Ajouter.'}</p>
      <a class="btn" href="#/import">${t('nav_add')}</a>
    </div>

    <div class="card">
      <h2>${t('about')}</h2>
      <p class="small muted">${document.documentElement.lang === 'en'
        ? 'This app runs entirely in your browser. Your recipes, notes and photos never leave your device — only the empty app itself is hosted online. There is no account and no login.'
        : 'Cette application fonctionne entièrement dans votre navigateur. Vos recettes, notes et photos ne quittent jamais votre appareil — seule l’application vide est hébergée en ligne. Il n’y a ni compte, ni connexion.'}</p>
    </div>
  `;

  document.getElementById('cycle-toggle').addEventListener('change', async (e) => {
    await updateSettings({ cycleModeEnabled: e.target.checked });
    applyCycleModeClass();
    paint();
  });

  const phaseSelect = document.getElementById('current-phase-select');
  if (phaseSelect) {
    phaseSelect.addEventListener('change', async (e) => {
      await updateSettings({ currentPhaseId: e.target.value });
      toast(t('save') + ' ✓');
    });
  }

  document.getElementById('lang-fr').addEventListener('click', async () => { setLang('fr'); await updateSettings({ language: 'fr' }); refreshStaticText(); paint(); });
  document.getElementById('lang-en').addEventListener('click', async () => { setLang('en'); await updateSettings({ language: 'en' }); refreshStaticText(); paint(); });

  document.getElementById('export-btn').addEventListener('click', async () => {
    const backup = await exportBackup();
    downloadFile(`carnet-de-recettes-${todayIso().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
    toast(t('export_backup') + ' ✓');
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mode = document.getElementById('import-mode').value;
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      await importBackup(data, { mode });
      toast(t('import_backup') + ' ✓');
      location.reload();
    } catch (err) {
      toast('Erreur : ' + err.message);
    }
  });
}
