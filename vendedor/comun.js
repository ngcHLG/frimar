// comun.js - Funciones compartidas del panel de vendedor
const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';

window.frimarVendedor = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verificarSesion() {
  const { data: { session } } = await window.frimarVendedor.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

window.cerrarSesion = async function() {
  await window.frimarVendedor.auth.signOut();
  window.location.href = 'login.html';
};

document.addEventListener('DOMContentLoaded', async () => {
  await verificarSesion();
});
