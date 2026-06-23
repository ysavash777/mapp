// ═══════════════════════════════════════════════
//  MODULES · PERSISTENCE (Supabase)
//  Cola de tránsito: el dato entra al buffer local,
//  se intenta mandar a Supabase, y recién se borra
//  del buffer cuando Supabase confirma que lo guardó.
// ═══════════════════════════════════════════════

const PENDING_QUEUE_KEY = 'mapix_pending_queue_v1';

function _loadQueue() {
  try { return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]'); }
  catch (e) { return []; }
}
function _saveQueue(q) {
  try { localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(q)); }
  catch (e) { console.error('[GDSMapiX] No se pudo persistir la cola local:', e); }
}
function _enqueue(op) {
  const q = _loadQueue(); q.push(op); _saveQueue(q);
}
function _dequeue(qid) {
  _saveQueue(_loadQueue().filter(op => op.qid !== qid));
}

// ── Operaciones Supabase ─────────────────────────
async function _sendOp(op) {
  if (op.kind === 'create') {
    const { error } = await supabase.from('entries').insert([op.entry]);
    if (error) throw error;
  } else if (op.kind === 'update') {
    const { error } = await supabase.from('entries').update(op.patch).eq('id', op.entryId);
    if (error) throw error;
  } else if (op.kind === 'delete') {
    const { error } = await supabase.from('entries').delete().eq('id', op.entryId);
    if (error) throw error;
  }
}

async function _attemptOp(op) {
  try {
    await _sendOp(op);
    _dequeue(op.qid);
    return true;
  } catch (err) {
    console.warn('[GDSMapiX] Pendiente de sincronizar:', op.kind, op.entryId || '', err.message);
    return false;
  }
}

// ── API pública ──────────────────────────────────
async function saveEntry(entry) {
  // Mapear nombres de campos JS → columnas Supabase
  const row = {
    id:         entry.id,
    project_id: activeProjectId,
    ref:        entry.ref        || null,
    dun:        entry.dun        || null,
    desc:       entry.desc       || null,
    tipo:       entry.tipo,
    subtipo:    entry.subtipo    || null,
    fecha_venc: entry.fechaVenc  || null,
    comentario: entry.comentario || null,
    qty:        entry.qty,
    user:       entry.user       || null,
    ts:         entry.ts,
  };
  const op = { qid: uid(), kind: 'create', projectId: activeProjectId, entry: row, ts: Date.now() };
  _enqueue(op);
  await _attemptOp(op);
  // Realtime actualizará la lista en todos los clientes
}

async function updateEntry(id, patch) {
  // Renombrar fechaVenc → fecha_venc si viene en el patch
  const row = { ...patch };
  if ('fechaVenc' in row) { row.fecha_venc = row.fechaVenc; delete row.fechaVenc; }
  const op = { qid: uid(), kind: 'update', projectId: activeProjectId, entryId: id, patch: row, ts: Date.now() };
  _enqueue(op);
  await _attemptOp(op);
}

async function removeEntry(id) {
  const op = { qid: uid(), kind: 'delete', projectId: activeProjectId, entryId: id, ts: Date.now() };
  _enqueue(op);
  await _attemptOp(op);
}

// ── Retry loop ───────────────────────────────────
let _retryTimer = null;

async function _flushPendingQueue() {
  const q = _loadQueue();
  if (!q.length) return;
  console.info(`[GDSMapiX] Reintentando ${q.length} operación(es) pendiente(s)...`);
  for (const op of q) {
    if (op.projectId !== activeProjectId) continue;
    await _attemptOp(op);
  }
}

function _startRetryLoop() {
  if (_retryTimer) clearInterval(_retryTimer);
  _retryTimer = setInterval(_flushPendingQueue, 4000);
}

window.addEventListener('online',  () => { console.info('[GDSMapiX] Conexión recuperada, sincronizando...'); _flushPendingQueue(); });
window.addEventListener('offline', () => { console.warn('[GDSMapiX] Sin conexión. Registros en cola local.'); });

_startRetryLoop();
_flushPendingQueue();
