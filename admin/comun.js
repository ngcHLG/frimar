// comun.js - Funciones compartidas del panel GUAJIRO (Admin)
(function() {
  const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';
  const NTFY_TOPIC_STOCK = 'guajiro_stock'; // Topic para notificaciones de inventario

  window.guajiroPC = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storageKey: 'sb-guajiro-admin-auth-token' }
  });

  // ─── Notificación de stock bajo/agotado con umbral dinámico ───
  window.notificarStockBajo = async function(productoId, productoNombre, stockNuevo) {
    if (!productoId) {
      // Fallback: si no hay ID, usar el criterio antiguo (stock < 5)
      if (stockNuevo === 0) {
        const mensaje = `⚠️ AGOTADO: ${productoNombre} se ha quedado sin stock.`;
        fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
          method: 'POST', body: mensaje, headers: { 'Title': 'Stock agotado' }
        }).catch(() => {});
      } else if (stockNuevo < 5) {
        const mensaje = `⚠️ Stock bajo: ${productoNombre} tiene solo ${stockNuevo} unidades.`;
        fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
          method: 'POST', body: mensaje, headers: { 'Title': 'Stock bajo' }
        }).catch(() => {});
      }
      return;
    }

    // 1. Obtener el stock máximo del día (el pico más alto alcanzado hoy)
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await window.guajiroPC
      .from('inventario_movimientos')
      .select('stock_nuevo')
      .eq('producto_id', productoId)
      .gte('fecha', hoy + 'T00:00:00')
      .lt('fecha', hoy + 'T23:59:59')
      .order('stock_nuevo', { ascending: false })
      .limit(1);

    // Si no hay movimientos hoy, el máximo es el stock actual
    let maximo = (data && data.length > 0) ? data[0].stock_nuevo : stockNuevo;
    // Si maximo es 0, evitamos división por cero
    if (maximo <= 0) maximo = stockNuevo || 1;

    // 2. Calcular umbral: 20% del máximo, con un mínimo de 1 unidad
    const umbral = Math.max(1, Math.round(maximo * 0.20));

    // 3. Decidir si notificar
    if (stockNuevo === 0) {
      const mensaje = `⚠️ AGOTADO: ${productoNombre} se ha quedado sin stock. (Máx. hoy: ${maximo})`;
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST', body: mensaje, headers: { 'Title': 'Stock agotado' }
      }).catch(() => {});
    } else if (stockNuevo <= umbral) {
      const mensaje = `⚠️ Stock bajo: ${productoNombre} tiene solo ${stockNuevo} unidades (umbral ${umbral}). Máx. hoy: ${maximo}`;
      fetch(`https://ntfy.sh/${NTFY_TOPIC_STOCK}`, {
        method: 'POST', body: mensaje, headers: { 'Title': 'Stock bajo' }
      }).catch(() => {});
    }
  };

  // ─── Verificación de sesión (igual que antes) ───
  async function verificarSesion() {
    const { data: { session } } = await window.guajiroPC.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    const rol = session.user?.user_metadata?.rol;
    if (rol !== 'admin') {
      await window.guajiroPC.auth.signOut();
      window.location.href = 'login.html?error=rol';
      return null;
    }
    return session;
  }

  window.cerrarSesion = async function() {
    await window.guajiroPC.auth.signOut();
    window.location.href = 'login.html';
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
  });
})();
