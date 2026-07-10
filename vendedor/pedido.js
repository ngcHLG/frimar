// pedido.js - Lógica de cobro para el vendedor
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-cobrar').addEventListener('click', async () => {
    const nombre = document.getElementById('cobro-nombre').value.trim() || 'Cliente de tienda';
    const metodoPago = document.getElementById('cobro-metodo').value;

    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    let recargo = 0;
    if (metodoPago === 'transferencia' && recargoTransferencia > 0) {
      recargo = subtotal * (recargoTransferencia / 100);
    }
    const total = subtotal + recargo;

    const pedidoData = {
      nombre,
      telefono: 'N/A',
      direccion: 'Tienda',
      referencia: null,
      metodo_pago: metodoPago,
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

    // Cerrar modal
    bootstrap.Modal.getInstance(document.getElementById('cobroModal')).hide();
    // Limpiar carrito
    carrito = [];
    actualizarCarrito();
    // Mostrar toast de éxito
    new bootstrap.Toast(document.getElementById('toastPedido')).show();
  });
});
