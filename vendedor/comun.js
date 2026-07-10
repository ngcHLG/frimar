// comun.js - Vendedor (sin redeclarar SUPABASE_URL)
// Crea el cliente de Supabase del vendedor con su PROPIA storageKey de
// autenticación, para que su sesión de login quede aislada de la del
// administrador y de cualquier otro cliente creado en la página (evita
// el warning "Multiple GoTrueClient instances" y evita que una sesión
// de /admin haga que /vendedor no pida login).
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

// IMPORTANTE: esta función ya NO se autoejecuta al cargar la página.
// Antes se disparaba en TODAS las páginas que incluyeran comun.js,
// incluida login.html, donde al no haber sesión redirigía a
// "login.html" (la misma página), provocando un recargado infinito
// que no dejaba ni escribir las credenciales.
// Ahora es index.html quien decide, explícitamente, cuándo llamarla.
window.verificarSesion = async function() {
  const { data: { session } } = await window.vendedorSupabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
};

window.cerrarSesion = async function() {
  await window.vendedorSupabase.auth.signOut();
  window.location.href = 'login.html';
};
