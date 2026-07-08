// js/app.js
// Inicialización, tema y eventos globales

(function() {
  var noop = function() {};
  console.log = noop; console.warn = noop; console.error = noop; console.info = noop;
})();

document.addEventListener('DOMContentLoaded', async () => {
  // Tema
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  btnThemeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    themeIcon.className = newTheme === 'light' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
  });

  // Modal checkout
  const modalEl = document.getElementById('checkoutModal');
  if (modalEl) checkoutModalInstance = new bootstrap.Modal(modalEl);

  // Cargar datos
  await cargarMonedas();
  await cargarConfiguracion();
  await cargarCategorias();
  await cargarProductos();
  await verificarCombosActivos();
  await cargarRepartosEnvio();
  renderCategorias();
  await verificarHorario();
  renderProductos();

  // Eventos
  document.getElementById('metodo-pago').addEventListener('change', () => {
    actualizarInfoRecargo();
    actualizarCarrito();
  });

  configurarSelectorMoneda();
  configurarBotonPedido();

  // Actualización periódica
  setInterval(async () => {
    await verificarHorario();
    categoriaActiva === 'combos' ? cargarCombosPublicos() : renderProductos();
  }, 60000);
});
