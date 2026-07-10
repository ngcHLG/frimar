// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. Cambiar el botón "Proceder al Pago" por "Cobrar pedido" y redirigir al modal de cobro
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-checkout');
  if (btn) {
    btn.textContent = ' Cobrar pedido';
    btn.onclick = function() {
      if (carrito.length === 0) return;
      const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
      if (offcanvas) offcanvas.hide();
      new bootstrap.Modal(document.getElementById('cobroModal')).show();
    };
  }
});

// 3. Ocultar las secciones de método de pago y reparto (se hace también en el index.html, pero por si acaso)
window.addEventListener('load', function() {
  const metodoPagoContainer = document.getElementById('metodo-pago-container');
  const repartoContainer = document.getElementById('reparto-container');
  if (metodoPagoContainer) metodoPagoContainer.classList.add('d-none');
  if (repartoContainer) repartoContainer.classList.add('d-none');
});
