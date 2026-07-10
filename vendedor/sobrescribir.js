// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. El punto de venta no maneja repartos/envío a domicilio, nunca.
//    (sobrescribimos ANTES de que cliente.js la llame, para evitar tocar
//    el <datalist id="repartos-list"> que no existe en este panel)
async function cargarRepartosEnvio() {
  window._repartosData = [];
}

// La moneda puede traer "aplica_domicilio: true" desde la base de datos
// (pensado para el cliente), pero en el punto de venta el reparto jamás
// aplica, así que forzamos que el contenedor quede siempre oculto,
// sin importar la configuración de la moneda activa.
function actualizarVisibilidadDomicilio() {
  const container = document.getElementById('reparto-container');
  if (container) container.classList.add('d-none');
  actualizarCarrito();
}

// NOTA: el método de pago (#metodo-pago-container) SÍ se deja funcionar
// igual que en el cliente: cliente.js ya se encarga de mostrarlo solo
// cuando la moneda activa admite más de un método de pago.

// 3. El botón "Cobrar pedido" cobra directamente, sin modal ni nombre:
//    usa el método de pago ya seleccionado en el carrito (metodoPagoActivo).
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-checkout');
  if (btn) {
    btn.textContent = 'Cobrar pedido';
    btn.onclick = function() {
      if (carrito.length === 0) return;
      procesarCobro();
    };
  }
});
