// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. El punto de venta no maneja repartos/envío a domicilio.
//    (sobrescribimos ANTES de que cliente.js la llame, para evitar tocar
//    el <datalist id="repartos-list"> que no existe en este panel)
async function cargarRepartosEnvio() {
  window._repartosData = [];
}

// NOTA: a diferencia de versiones anteriores, aquí NO anulamos
// generarBotonesMoneda, configurarSelectorMoneda, cambiarMoneda ni
// inyectarModalCambioMoneda: el vendedor ahora sí puede cambiar de
// moneda igual que el cliente, usando las funciones originales de
// cliente.js (los elementos #btn-currency-toggle, #moneda-list y
// #current-currency-label ya existen y son visibles en este panel).

// 3. Cambiar el botón "Proceder al Pago" por "Cobrar pedido" y abrir el modal de cobro
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-checkout');
  if (btn) {
    btn.textContent = 'Cobrar pedido';
    btn.onclick = function() {
      if (carrito.length === 0) return;
      const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
      if (offcanvas) offcanvas.hide();
      new bootstrap.Modal(document.getElementById('cobroModal')).show();
    };
  }

  // Ocultar secciones de método de pago y reparto (no aplican en venta de tienda)
  const metodoPagoContainer = document.getElementById('metodo-pago-container');
  const repartoContainer = document.getElementById('reparto-container');
  if (metodoPagoContainer) metodoPagoContainer.classList.add('d-none');
  if (repartoContainer) repartoContainer.classList.add('d-none');
});
