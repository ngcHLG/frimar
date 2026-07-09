// js/app.js
// Inicialización, tema y eventos globales

(function() {
  var noop = function() {};
  console.log = noop; console.warn = noop; console.error = noop; console.info = noop;
})();

document.addEventListener('DOMContentLoaded', async () => {
  // ── Tema con persistencia ─────────────────
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    themeIcon.className = tema === 'light' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    localStorage.setItem('frimar-theme', tema);
  }

  // Recuperar tema guardado
  const temaGuardado = localStorage.getItem('frimar-theme') || 'light';
  aplicarTema(temaGuardado);

  btnThemeToggle.addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-theme');
    aplicarTema(actual === 'light' ? 'dark' : 'light');
  });

  // ── Modal checkout ────────────────────────
  const modalEl = document.getElementById('checkoutModal');
  if (modalEl) checkoutModalInstance = new bootstrap.Modal(modalEl);

  // ── Cargar datos ──────────────────────────
  await cargarMonedas();
  await cargarConfiguracion();
  await cargarCategorias();
  await cargarProductos();
  await verificarCombosActivos();
  await cargarRepartosEnvio();
  renderCategorias();
  await verificarHorario();
  renderProductos();

  configurarSelectorMoneda();
  configurarBotonPedido();

  // Actualización periódica
  setInterval(async () => {
    await verificarHorario();
    categoriaActiva === 'combos' ? cargarCombosPublicos() : renderProductos();
  }, 60000);
});
