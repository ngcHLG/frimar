// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. Redefinir funciones que dependen de elementos del DOM que no existen en el vendedor
//    o que deben comportarse diferente.

// cargarMonedas sin manipular el DOM de los FABs
async function cargarMonedas() {
  const { data } = await supabaseClient.from('monedas').select('codigo').eq('activo', true).order('codigo');
  if (data && data.length > 0) {
    monedasDisponibles = data.map(m => m.codigo);
  } else {
    monedasDisponibles = ['CUP'];
  }
  const savedCurrency = localStorage.getItem('frimar-currency');
  if (savedCurrency && monedasDisponibles.includes(savedCurrency)) {
    monedaActiva = savedCurrency;
  } else {
    monedaActiva = monedasDisponibles[0];
    localStorage.setItem('frimar-currency', monedaActiva);
  }
  // No tocamos el DOM (current-currency-label no existe)
  // Tampoco llamamos a generarBotonesMoneda ni a inyectarModalCambioMoneda
  // porque no hay lista de monedas visible.
}

// Vaciamos estas funciones para que no causen errores si son llamadas
generarBotonesMoneda = function() {};
configurarSelectorMoneda = function() {};
cambiarMoneda = function() {}; // no permitimos cambiar moneda desde el vendedor

// También neutralizamos el modal de cambio de moneda (no se usará)
inyectarModalCambioMoneda = function() {};

// 3. Cambiar el botón "Proceder al Pago" por "Cobrar pedido"
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

  // Ocultar secciones de método de pago y reparto
  const metodoPagoContainer = document.getElementById('metodo-pago-container');
  const repartoContainer = document.getElementById('reparto-container');
  if (metodoPagoContainer) metodoPagoContainer.classList.add('d-none');
  if (repartoContainer) repartoContainer.classList.add('d-none');
});
