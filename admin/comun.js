// comun.js - Funciones compartidas del panel ComeCome
(function() {
  const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';

  // Inicializar Supabase en una variable con nombre único
  window.guajiroPC = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
