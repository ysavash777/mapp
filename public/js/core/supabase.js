// ═══════════════════════════════════════════════
//  CORE · SUPABASE
//  Único archivo que necesitás editar cuando tengas
//  las credenciales. Reemplazá los dos valores de
//  abajo con los de tu proyecto Supabase:
//  Dashboard → Settings → API
// ═══════════════════════════════════════════════

const SUPABASE_URL  = 'https://eadkwfthmsiuorzxhscp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZGt3ZnRobXNpdW9yenhoc2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE2ODE4MSwiZXhwIjoyMDk3NzQ0MTgxfQ.NEsD8hC2_ximZ9VfbfvmnOfgNV79Cb-uuBiOp5Yx8d8';

// Cliente Supabase (cargado via CDN en index.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

// ── Realtime ─────────────────────────────────────
// Escucha cambios en la tabla 'entries' y actualiza
// la lista en vivo sin necesidad de recargar.
function _startRealtime() {
  supabase
    .channel('entries-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'entries' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          // Solo agregar si no existe ya (evita duplicados con la cola local)
          if (!entries.find(e => e.id === payload.new.id)) {
            entries.unshift(_dbRowToEntry(payload.new));
            renderList();
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = entries.findIndex(e => e.id === payload.new.id);
          if (idx !== -1) {
            entries[idx] = _dbRowToEntry(payload.new);
            renderList();
          }
        } else if (payload.eventType === 'DELETE') {
          entries = entries.filter(e => e.id !== payload.old.id);
          renderList();
        }
      }
    )
    .subscribe();
}

// Convierte una fila de Supabase al formato JS de la app
function _dbRowToEntry(row) {
  return {
    id:         row.id,
    ref:        row.ref,
    dun:        row.dun,
    desc:       row.desc,
    tipo:       row.tipo,
    subtipo:    row.subtipo,
    fechaVenc:  row.fecha_venc,
    comentario: row.comentario,
    qty:        row.qty,
    user:       row.user,
    ts:         row.ts,
  };
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _startRealtime);
} else {
  _startRealtime();
}
