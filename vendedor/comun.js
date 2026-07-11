// vendedor/comun.js - Crea el cliente de Supabase del vendedor y define notificaciones

const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';
const NTFY_TOPIC_STOCK = 'guajiro_stock';

// Cliente de Supabase del vendedor (storageKey aislada)
window.vendedorSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'sb-guajiro-vendedor-auth-token' }
});

// Para que los scripts del cliente reutilicen esta instancia
window.supabaseClient = window.vendedorSupabase;

// ─── Función de notificación de stock bajo/agotado (dinámica) ───
window.notificarStockBajo = async function(productoId, productoNombre, stockNuevo) {
  if (!productoId) {
    // Fallback simple si no hay ID
    if (stockNuevo === 0) {
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST',
        body: `⚠️ AGOTADO: ${productoNombre} se ha quedado sin stock.`,
        headers: { 'Title': 'Stock agotado' }
      }).catch(() => {});
    } else if (stockNuevo < 5) {
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST',
        body: `⚠️ Stock bajo: ${productoNombre} tiene solo ${stockNuevo} unidades.`,
        headers: { 'Title': 'Stock bajo' }
      }).catch(() => {});
    }
    return;
  }

  try {
    // 1. Obtener stock máximo del día
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await window.vendedorSupabase
      .from('inventario_movimientos')
      .select('stock_nuevo')
      .eq('producto_id', productoId)
      .gte('fecha', hoy + 'T00:00:00')
      .lt('fecha', hoy + 'T23:59:59')
      .order('stock_nuevo', { ascending: false })
      .limit(1);

    let maximo = (data && data.length > 0) ? data[0].stock_nuevo : stockNuevo;
    if (maximo <= 0) maximo = stockNuevo || 1;

    // 2. Calcular umbral: 20% del máximo (mínimo 1)
    const umbral = Math.max(1, Math.round(maximo * 0.20));

    // 3. Decidir notificación
    if (stockNuevo === 0) {
      const mensaje = `⚠️ AGOTADO: ${productoNombre} se ha quedado sin stock. (Máx. hoy: ${maximo})`;
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST',
        body: mensaje,
        headers: { 'Title': 'Stock agotado' }
      }).catch(() => {});
    } else if (stockNuevo <= umbral) {
      const mensaje = `⚠️ Stock bajo: ${productoNombre} tiene solo ${stockNuevo} unidades (umbral ${umbral}). Máx. hoy: ${maximo}`;
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST',
        body: mensaje,
        headers: { 'Title': 'Stock bajo' }
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('Error en notificación de stock:', e);
  }
};

// ─── Verificación de sesión ───
window.verificarSesion = async function() {
  const { data: { session } } = await window.vendedorSupabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  const rol = session.user?.user_metadata?.rol;
  if (rol !== 'vendedor') {
    await window.vendedorSupabase.auth.signOut();
    window.location.href = 'login.html?error=rol';
    return null;
  }
  return session;
};

window.cerrarSesion = async function() {
  await window.vendedorSupabase.auth.signOut();
  window.location.href = 'login.html';
};
