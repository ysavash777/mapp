// ═══════════════════════════════════════════════
//  MODULES · SETUP (Supabase Storage)
//  Descarga los catálogos xlsx en este orden:
//  1. Supabase Storage (versión más reciente subida
//     desde el panel de catálogos)
//  2. URL estática de Render (fallback si no hay
//     archivo en Storage o falla la descarga)
//  3. Selección manual del usuario
// ═══════════════════════════════════════════════

// NOTA: CATALOG_BUCKET se declara en modules/catalog-settings.js.
// No volver a declararlo acá: todos los <script> clásicos comparten
// el mismo scope global, así que una segunda "const CATALOG_BUCKET"
// rompe el script entero con un SyntaxError de redeclaración.

async function _fetchFromStorage(filename) {
  const { data, error } = await supabaseClient.storage
    .from(CATALOG_BUCKET)
    .download(filename);
  if (error) throw error;
  const buf = await data.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

async function _fetchFromStatic(filename) {
  const res = await fetch(filename);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

async function _loadCatalog(filename) {
  // Intentar Supabase Storage primero
  try {
    const data = await _fetchFromStorage(filename);
    console.info(`[GDSMapiX] ${filename} cargado desde Supabase Storage (${data.length} filas)`);
    return data;
  } catch (e) {
    console.warn(`[GDSMapiX] ${filename} no encontrado en Storage, intentando URL estática...`);
  }
  // Fallback: URL estática de Render
  const data = await _fetchFromStatic(filename);
  console.info(`[GDSMapiX] ${filename} cargado desde URL estática (${data.length} filas)`);
  return data;
}

function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) { reject(err); }
    };
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}

function setStepState(id, iconId, state) {
  const step = document.getElementById(id);
  const icon = document.getElementById(iconId);
  if (!step) return;
  step.className = 'setup-step ' + state;
  if (icon) icon.textContent = state === 'done' ? '✓' : state === 'fail' ? '✕' : '';
}
function setProgressFill(pct) {
  const bar = document.getElementById('setup-progress-fill');
  if (bar) bar.style.width = pct + '%';
}

async function showSetup(projectId) {
  if (vlData.length && refData.length) { launchScanner(projectId); return; }

  document.getElementById('setup-overlay').classList.remove('hidden');
  let vlOk = false, refOk = false;

  setStepState('step-vl', 'step-vl-icon', 'active'); setProgressFill(10);
  try {
    vlData = await _loadCatalog('variables.xlsx');
    setStepState('step-vl', 'step-vl-icon', 'done'); setProgressFill(50); vlOk = true;
  } catch (e) { setStepState('step-vl', 'step-vl-icon', 'fail'); setProgressFill(50); }

  setStepState('step-ref', 'step-ref-icon', 'active');
  try {
    refData = await _loadCatalog('referencia.xlsx');
    setStepState('step-ref', 'step-ref-icon', 'done'); setProgressFill(100); refOk = true;
  } catch (e) { setStepState('step-ref', 'step-ref-icon', 'fail'); setProgressFill(100); }

  if (vlOk && refOk) {
    document.getElementById('setup-msg').textContent = 'Sistema listo.';
    setTimeout(() => {
      document.getElementById('setup-overlay').classList.add('hidden');
      launchScanner(projectId);
    }, 400);
  } else {
    document.getElementById('setup-msg').textContent = 'No se encontraron los catálogos.';
    document.getElementById('manual-fallback').style.display = 'block';
    setupManualListeners(projectId);
  }
}

function setupManualListeners(projectId) {
  document.getElementById('file-vl').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      vlData = await parseXLSX(f);
      document.getElementById('lbl-vl').textContent = `${f.name} (${vlData.length})`;
      document.getElementById('lbl-vl').className = 'fi-label loaded';
      checkReady();
    } catch { showToast('Error al leer variables.xlsx', 'error'); }
  });
  document.getElementById('file-ref').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      refData = await parseXLSX(f);
      document.getElementById('lbl-ref').textContent = `${f.name} (${refData.length})`;
      document.getElementById('lbl-ref').className = 'fi-label loaded';
      checkReady();
    } catch { showToast('Error al leer referencia.xlsx', 'error'); }
  });
  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('setup-overlay').classList.add('hidden');
    launchScanner(projectId);
  }, { once: true });
}

function checkReady() {
  const btn = document.getElementById('btn-start');
  if (btn) btn.disabled = !(vlData.length && refData.length);
}

function launchScanner(projectId) {
  connectRealtime(projectId);
  renderList();
  if (_isIOS()) {
    const wrap = document.getElementById('scanner-wrap');
    const hint = document.getElementById('scanner-toggle-hint');
    if (wrap) wrap.classList.add('scanner-off');
    if (hint) { hint.style.display = ''; hint.textContent = 'Toque para activar'; }
  } else {
    startScanner();
  }
}
