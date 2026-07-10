// comun.js - Funciones compartidas del panel ComeCome (Admin)
(function() {
  const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';

  // storageKey propia para que la sesión de admin quede aislada de la
  // sesión del vendedor (y de cualquier otro cliente Supabase de la página)
  window.guajiroPC = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: 'sb-guajiro-admin-auth-token'
    }
  });

  // Verificar sesión
  async function verificarSesion() {
    const { data: { session } } = await window.guajiroPC.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  // Cerrar sesión
  window.cerrarSesion = async function() {
    await window.guajiroPC.auth.signOut();
    window.location.href = 'login.html';
  };

  // Ejecutar verificación al cargar la página
  document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
  });
})();
