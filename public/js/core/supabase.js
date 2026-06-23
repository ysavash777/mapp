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
