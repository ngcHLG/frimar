// pedido.js - Lógica de cobro para el vendedor
// Sin modal, sin nombre de comprador: se cobra directo con un clic,
// usando el método de pago que ya esté seleccionado en el carrito
// (metodoPagoActivo, controlado por el propio selector de cliente.js).

async function procesarCobro() {
  if (!carrito.length) return;

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  let recargo = 0;
  if (metodoPagoActivo === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
  }
  const total = subtotal + recargo;

  const pedidoData = {
    nombre: 'Cliente de tienda',
    telefono: 'N/A',
    direccion: 'Tienda',
    referencia: null,
    metodo_pago: metodoPagoActivo,
    moneda: monedaActiva,
    zona: 'Venta en tienda',
    envio: 0,
    total,
    items: carrito.map(item => ({
      nombre: item.nombre,
      precio: item.precio,
      moneda: item.moneda || monedaActiva,
      cantidad: item.cantidad,
      extras: item.extras || null,
      esCombo: item.esCombo || false
    })),
    estado: 'confirmado',
    origen: 'tienda'
  };

  const { error } = await window.vendedorSupabase.from('pedidos').insert([pedidoData]);
  if (error) {
    alert('Error al cobrar: ' + error.message);
    return;
  }

  // Cerrar el carrito
  const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
  if (offcanvas) offcanvas.hide();

  // Limpiar carrito
  carrito = [];
  actualizarCarrito();

  // Mostrar toast de éxito
  new bootstrap.Toast(document.getElementById('toastPedido')).show();
}
