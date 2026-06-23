// ═══════════════════════════════════════════════
//  MODULES · CATALOG SETTINGS (Supabase Storage)
//  Sube variables.xlsx y referencia.xlsx al bucket
//  "catalogs" de Supabase Storage. Al abrir un
//  proyecto, setup.js los descarga desde ahí.
//  Si el bucket no existe, los descarga desde la
//  URL estática de Render como fallback.
// ═══════════════════════════════════════════════

const CATALOG_BUCKET = 'catalogs';
let _catalogStatus   = [];

async function openCatalogSettings() {
  const existing = document.getElementById('catalog-settings-backdrop');
  if (existing) { existing.remove(); return; }
  await _fetchCatalogStatus();
  _renderCatalogPanel();
}

async function _fetchCatalogStatus() {
  try {
    const { data, error } = await supabase.storage.from(CATALOG_BUCKET).list('', { limit: 10 });
    if (error) throw error;
    const EXPECTED = ['variables.xlsx', 'referencia.xlsx'];
    _catalogStatus = EXPECTED.map(name => {
      const file = (data || []).find(f => f.name === name);
      return file
        ? { name, exists: true, size: file.metadata?.size || 0, updatedAt: file.updated_at || file.created_at }
        : { name, exists: false };
    });
  } catch (e) {
    console.warn('[GDSMapiX] No se pudo verificar catálogos en Storage:', e.message);
    _catalogStatus = [
      { name: 'variables.xlsx',  exists: false },
      { name: 'referencia.xlsx', exists: false },
    ];
  }
}

function _renderCatalogPanel() {
  const prev = document.getElementById('catalog-settings-backdrop');
  if (prev) prev.remove();

  function fileRow(catalog) {
    const { name, exists, size, updatedAt } = catalog;
    const date = exists && updatedAt
      ? new Date(updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
      : null;
    const sizeKb = exists && size ? Math.round(size / 1024) : null;

    return `
      <div class="cs-file-row" id="cs-row-${name.replace('.', '_')}">
        <div class="cs-file-info">
          <div class="cs-file-name">${name}</div>
          <div class="cs-file-meta">
            ${exists
              ? `<span class="cs-badge cs-badge-ok">En servidor</span><span class="cs-file-detail">${sizeKb ? sizeKb + ' KB · ' : ''}${date || ''}</span>`
              : `<span class="cs-badge cs-badge-missing">No encontrado</span>`}
          </div>
        </div>
        <label class="cs-upload-btn" title="Subir nuevo ${name}">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 10V2M5 5l3-3 3 3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>
          <input type="file" accept=".xlsx,.xls" data-catalog="${name}" style="display:none"/>
        </label>
      </div>`;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="cs-backdrop" id="catalog-settings-backdrop" onclick="closeCatalogSettings(event)">
      <div class="cs-panel">
        <div class="cs-handle"></div>
        <div class="cs-header">
          <div class="cs-title">Catálogos del sistema</div>
          <button type="button" class="cs-close-btn" onclick="document.getElementById('catalog-settings-backdrop').remove()">
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>
          </button>
        </div>
        <p class="cs-subtitle">Los archivos se almacenan en Supabase Storage y son compartidos por todos los usuarios.</p>

        <div class="cs-section-label">Referencias y variables</div>
        <div class="cs-files-list">
          ${_catalogStatus.map(fileRow).join('')}
        </div>

        <div class="cs-section-label" style="margin-top:14px">Coordenadas</div>
        <div class="cs-coming-soon">
          <div class="cs-coming-icon">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z"/><circle cx="8" cy="6" r="1.5"/></svg>
          </div>
          <div>
            <div class="cs-coming-label">Próximamente</div>
            <div class="cs-coming-sub">Carga de archivo de coordenadas de ubicaciones</div>
          </div>
          <span class="cs-soon-badge">Pronto</span>
        </div>
      </div>
    </div>`);

  document.getElementById('catalog-settings-backdrop').addEventListener('change', async (evt) => {
    const input = evt.target;
    if (input.tagName !== 'INPUT' || input.type !== 'file') return;
    const file        = input.files[0];
    if (!file) return;
    const catalogName = input.dataset.catalog;

    const uploadBtn = input.closest('.cs-upload-btn');
    if (uploadBtn) {
      uploadBtn.classList.add('cs-uploading');
      uploadBtn.innerHTML = `<span class="cs-spinner"></span>`;
    }

    try {
      // Renombrar al nombre canónico por si el usuario subió un archivo con otro nombre
      const renamedFile = new File([file], catalogName, { type: file.type });

      const { error } = await supabase.storage
        .from(CATALOG_BUCKET)
        .upload(catalogName, renamedFile, { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (error) throw error;

      // Limpiar caché local de xlsx para forzar re-descarga al próximo proyecto
      if (catalogName === 'variables.xlsx')  vlData  = [];
      if (catalogName === 'referencia.xlsx') refData = [];

      showToast(`${catalogName} actualizado`, 'success');
      await _fetchCatalogStatus();
      _renderCatalogPanel();

    } catch (err) {
      console.error('[GDSMapiX] Error al subir catálogo:', err.message);
      showToast(`Error al subir ${catalogName}`, 'error');
      await _fetchCatalogStatus();
      _renderCatalogPanel();
    }
  });
}

function closeCatalogSettings(evt) {
  if (evt.target.id === 'catalog-settings-backdrop')
    document.getElementById('catalog-settings-backdrop').remove();
}
