// js/app.js
// Inicialización, tema y eventos globales

(function() {
  var noop = function() {};
  console.log = noop; console.warn = noop; console.error = noop; console.info = noop;
})();

document.addEventListener('DOMContentLoaded', async () => {
  // ── Alto real del navbar (evita solapamientos con elementos sticky) ──
  function ajustarAlturaNavbar() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      document.documentElement.style.setProperty('--navbar-height', navbar.offsetHeight + 'px');
    }
  }
  ajustarAlturaNavbar();
  window.addEventListener('resize', ajustarAlturaNavbar);

  // ── Tema con persistencia ─────────────────
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    themeIcon.className = tema === 'light' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    localStorage.setItem('frimar-theme', tema);
  }

  const temaGuardado = localStorage.getItem('frimar-theme') || 'light';
  aplicarTema(temaGuardado);

  btnThemeToggle.addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-theme');
    aplicarTema(actual === 'light' ? 'dark' : 'light');
  });

  // ── Cargar datos ──────────────────────────
  await cargarMonedas();
  await cargarConfiguracion();
  await cargarCategorias();
  await cargarProductos();
  await verificarCombosActivos();
  await cargarRepartosEnvio();
  renderCategorias();
  await verificarHorario();

  // Vista especial de TODO: filas horizontales por categoría.
  const catalogoScript = document.createElement('script');
  catalogoScript.src = 'js/catalogo-horizontal.js?v=1.0';
  await new Promise(resolve => {
    catalogoScript.onload = resolve;
    catalogoScript.onerror = resolve;
    document.body.appendChild(catalogoScript);
  });

  renderProductos();

  configurarSelectorMoneda();
  configurarBotonPedido();

  // Actualización periódica
  setInterval(async () => {
    await verificarHorario();
    categoriaActiva === 'combos' ? cargarCombosPublicos() : renderProductos();
  }, 60000);
});
