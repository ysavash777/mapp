// ═══════════════════════════════════════════════
//  MODULES · PROJECTS (Supabase)
//  CRUD de proyectos contra Supabase Postgres.
//  La lógica de delegación de eventos y el
//  confirmDialog basado en Promise se mantienen
//  igual que en la versión Node.
// ═══════════════════════════════════════════════

function showProjectsScreen() {
  stopScanner();
  disconnectRealtime();
  document.getElementById('screen-projects').classList.remove('hidden');
  loadProjects();
}

function goToProjects() {
  showProjectsScreen();
}

async function loadProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Cargar conteo de entries por proyecto
    const counts = await Promise.all(data.map(async p => {
      const { count } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', p.id);
      return { ...p, entryCount: count || 0 };
    }));
    projects = counts;
  } catch (e) {
    console.error('[GDSMapiX] Error cargando proyectos:', e.message);
    projects = projects || [];
  }
  renderProjects();
}

function renderProjects() {
  const list = document.getElementById('proj-list');
  if (!projects.length) {
    list.innerHTML = `
      <div class="proj-empty">
        <div class="proj-empty-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" opacity=".3"/></svg>
        </div>
        <p>No hay proyectos todavía</p>
        <p class="hint">Creá uno con el botón de abajo</p>
      </div>`;
    return;
  }
  list.innerHTML = projects.map(p => `
    <div class="proj-card" data-project-id="${p.id}">
      <div class="proj-card-clickzone" data-action="open">
        <div class="proj-card-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" opacity=".3"/></svg>
        </div>
        <div class="proj-card-body">
          <div class="proj-card-name"></div>
          <div class="proj-card-meta">
            <span class="pcm-date"></span>
            <span class="pcm-author"></span>
          </div>
        </div>
        <span class="proj-card-count">${p.entryCount} reg.</span>
      </div>
      <button type="button" class="proj-card-del" data-action="delete">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"/></svg>
      </button>
    </div>`).join('');

  list.querySelectorAll('.proj-card').forEach(card => {
    const p = projects.find(x => x.id === card.dataset.projectId);
    if (!p) return;
    const date = new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    card.querySelector('.proj-card-name').textContent  = p.name;
    card.querySelector('.pcm-date').textContent         = date;
    card.querySelector('.pcm-author').textContent       = `por ${p.created_by}`;
  });
}

// ── Delegación de eventos ────────────────────────
function _initProjectListDelegation() {
  const list = document.getElementById('proj-list');
  if (!list) return;
  list.addEventListener('click', (evt) => {
    const actionEl = evt.target.closest('[data-action]');
    if (!actionEl || !list.contains(actionEl)) return;
    const card = actionEl.closest('.proj-card');
    if (!card) return;
    const projectId = card.dataset.projectId;
    const project   = projects.find(p => p.id === projectId);
    if (!project) return;
    if (actionEl.dataset.action === 'open')   openProject(projectId);
    if (actionEl.dataset.action === 'delete') handleDeleteProject(projectId, project.name);
  });
}

async function handleDeleteProject(id, name) {
  const confirmed = await confirmDialog('Eliminar proyecto', `¿Eliminar "${name}" y todos sus registros?`);
  if (!confirmed) return;
  try {
    // Las entries se borran en cascada (ON DELETE CASCADE en el schema)
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    showToast('Proyecto eliminado', 'warn');
  } catch (e) {
    console.error('[GDSMapiX] Error al eliminar proyecto:', e.message);
    showToast('Error al eliminar', 'error');
  } finally {
    await loadProjects();
  }
}

// ── Nuevo proyecto ───────────────────────────────
function openNewProjectDialog() {
  document.getElementById('new-project-dialog').classList.remove('hidden');
  setTimeout(() => document.getElementById('np-name').focus(), 100);
}
function closeNewProjectDialog() {
  document.getElementById('new-project-dialog').classList.add('hidden');
  document.getElementById('np-name').value = '';
}

async function createProject() {
  const nameEl = document.getElementById('np-name');
  const name   = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const id = uid();
  try {
    const { error } = await supabase.from('projects').insert([{
      id, name, created_by: currentUser || 'Sistema'
    }]);
    if (error) throw error;
    closeNewProjectDialog();
    await loadProjects();
    openProject(id);
  } catch (e) {
    console.error('[GDSMapiX] Error al crear proyecto:', e.message);
    showToast('Error al crear proyecto', 'error');
  }
}

// ── Boot del módulo ──────────────────────────────
_initProjectListDelegation();
document.getElementById('np-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') createProject();
});
