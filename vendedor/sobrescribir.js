// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. Redefinir funciones que dependen de elementos del DOM que no existen en el vendedor
//    o que deben comportarse diferente.

// cargarMonedas sin manipular el DOM de los FABs visibles del cliente
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
  // No generamos botones de moneda ni modal: el vendedor no cambia de moneda
}

// Vaciamos estas funciones para que no causen errores si son llamadas
generarBotonesMoneda = function() {};
configurarSelectorMoneda = function() {};
cambiarMoneda = function() {}; // no permitimos cambiar moneda desde el vendedor
inyectarModalCambioMoneda = function() {};

// El punto de venta no maneja repartos/envío a domicilio
async function cargarRepartosEnvio() {
  window._repartosData = [];
}

window.seleccionarReparto = function() {
  // no-op: el reparto no aplica en venta de tienda
};

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
