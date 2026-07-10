// comun.js - Vendedor (sin redeclarar SUPABASE_URL)
// Crea el cliente de Supabase del vendedor con su PROPIA storageKey de
// autenticación, para que su sesión de login quede aislada de la del
// administrador y de cualquier otro cliente creado en la página.
window.vendedorSupabase = supabase.createClient(
  'https://xntjoyqwxqmjfdltydol.supabase.co',
  'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY',
  {
    auth: {
      storageKey: 'sb-guajiro-vendedor-auth-token'
    }
  }
);

// js/config.js reutilizará esta misma instancia en vez de crear otra
window.supabaseClient = window.vendedorSupabase;

// Esta función NO se autoejecuta al cargar la página (evita el loop de
// recarga en login.html). Solo index.html la invoca explícitamente.
// Además de exigir sesión, exige que el usuario tenga
// user_metadata.rol === 'vendedor' — así una cuenta de administrador
// no puede entrar aquí aunque conozca la URL.
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
