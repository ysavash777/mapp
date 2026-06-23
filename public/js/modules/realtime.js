// ═══════════════════════════════════════════════
//  MODULES · REALTIME (Supabase)
//  Reemplaza el SSE del servidor Node con
//  Supabase Realtime (WebSockets).
//  Cualquier INSERT/UPDATE/DELETE sobre la tabla
//  `entries` del proyecto activo se refleja
//  en tiempo real en todos los clientes conectados.
// ═══════════════════════════════════════════════

let _realtimeChannel = null;

function openProject(id) {
  const proj = projects.find(p => p.id === id);
  if (!proj) return;

  activeProjectId   = id;
  activeProjectName = proj.name;
  entries           = [];

  document.getElementById('screen-projects').classList.add('hidden');
  document.getElementById('header-proj-name').textContent = proj.name;

  if (typeof _flushPendingQueue === 'function') _flushPendingQueue();

  showSetup(id);
}

async function connectRealtime(projectId) {
  disconnectRealtime();

  // Cargar entries actuales del proyecto desde Supabase
  await _loadEntries(projectId);

  // Suscribirse a cambios en tiempo real sobre las entries de este proyecto
  _realtimeChannel = supabaseClient
    .channel(`entries:${projectId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',         // INSERT, UPDATE, DELETE
        schema: 'public',
        table:  'entries',
        filter: `project_id=eq.${projectId}`,
      },
      async (payload) => {
        console.info('[GDSMapiX] Realtime evento:', payload.eventType);
        // En vez de reconstruir la lista a mano desde el payload,
        // recargamos desde Supabase — garantiza consistencia y orden.
        await _loadEntries(projectId);
      }
    )
    .subscribe((status) => {
      const dot = document.getElementById('live-dot');
      if (!dot) return;
      if (status === 'SUBSCRIBED') {
        dot.classList.remove('offline');
      } else {
        dot.classList.add('offline');
      }
    });
}

async function _loadEntries(projectId) {
  try {
    const { data, error } = await supabaseClient
      .from('entries')
      .select('*')
      .eq('project_id', projectId)
      .order('ts', { ascending: false });
    if (error) throw error;
    // Normalizar nombres de columnas Supabase → nombres JS internos
    entries = (data || []).map(_rowToEntry);
    renderList();
  } catch (e) {
    console.error('[GDSMapiX] Error cargando entries:', e.message);
  }
}

// Convierte una fila de Supabase al formato interno usado por la UI
function _rowToEntry(row) {
  return {
    id:         row.id,
    project_id: row.project_id,
    ref:        row.ref        || '',
    dun:        row.dun        || '',
    desc:       row.desc       || '',
    tipo:       row.tipo,
    subtipo:    row.subtipo    || null,
    fechaVenc:  row.fecha_venc || null,
    comentario: row.comentario || null,
    qty:        row.qty,
    user:       row.user       || '',
    ts:         row.ts,
  };
}

function disconnectRealtime() {
  if (_realtimeChannel) {
    supabaseClient.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
  const dot = document.getElementById('live-dot');
  if (dot) dot.classList.add('offline');
}

// Alias para compatibilidad con otros módulos que llaman a disconnectSSE
function disconnectSSE() { disconnectRealtime(); }
