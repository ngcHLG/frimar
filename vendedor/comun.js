// comun.js - Vendedor (sin redeclarar SUPABASE_URL)
// Usa las credenciales ya definidas en ../js/config.js, pero crea su propio cliente
window.vendedorSupabase = supabase.createClient(
  'https://xntjoyqwxqmjfdltydol.supabase.co',
  'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY'
);

async function verificarSesion() {
  const { data: { session } } = await window.vendedorSupabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

window.cerrarSesion = async function() {
  await window.vendedorSupabase.auth.signOut();
  window.location.href = 'login.html';
};

document.addEventListener('DOMContentLoaded', async () => {
  await verificarSesion();
});
