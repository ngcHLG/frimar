// js/pedido.js
// Confirmación de pedido y envío de notificación

function configurarBotonPedido() {
  document.getElementById('btn-checkout').addEventListener('click', () => {
    if (carrito.length === 0) return;
    checkoutModalInstance.show();
  });

  document.getElementById('confirmar-pedido').addEventListener('click', confirmarPedido);
}

async function confirmarPedido() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const referencia = document.getElementById('referencia').value.trim();
  const errorDiv = document.getElementById('checkout-error');

  if (!nombre || !telefono || !direccion) {
    document.getElementById('error-text').textContent = 'Faltan parámetros obligatorios en el formulario.';
    errorDiv.classList.remove('d-none');
    return;
  }
  errorDiv.classList.add('d-none');

  const repartoSelect = document.getElementById('reparto-input');
  const zonaTexto = repartoSelect.value || 'Domicilio';
  const totalPedido = parseFloat(document.getElementById('total-pedido').textContent);

  const { error: errorPedido } = await supabaseClient.from('pedidos').insert([{
    nombre, telefono, direccion, referencia: referencia || null,
    metodo_pago: metodoPagoActivo, moneda: monedaActiva, zona: zonaTexto, total: totalPedido,
    items: carrito.map(item => ({
      nombre: item.nombre, precio: item.precio, moneda: item.moneda || monedaActiva, cantidad: item.cantidad,
      extras: item.extras || null, esCombo: item.esCombo || false
    })),
    estado: 'pendiente'
  }]);

  if (errorPedido) {
    document.getElementById('error-text').textContent = 'Fallo en la transmisión de datos del pedido.';
    errorDiv.classList.remove('d-none');
    return;
  }

  const logProductos = carrito.map(item =>
    `${item.cantidad}x ${item.nombre}${item.extras ? ' [' + item.extras + ']' : ''} — ${(item.precio * item.cantidad).toFixed(2)} ${item.moneda || monedaActiva}`
  ).join('\n');

  const payloadNtfy = `🤠 PEDIDO GUAJIRO
👤Titular: ${nombre}
📞Tel: ${telefono}
🏠Dir: ${direccion}${referencia ? '\nRef: ' + referencia : ''}
👣Ruta: ${zonaTexto}
🪙Liq: ${metodoPagoActivo} (${monedaActiva})
---
${logProductos}
---
📥TOTAL: ${totalPedido.toFixed(2)} ${monedaActiva}`;

  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: 'POST', body: payloadNtfy }).catch(() => {});

  checkoutModalInstance.hide();
  const offcanvasInst = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
  if (offcanvasInst) offcanvasInst.hide();

  setTimeout(() => {
    new bootstrap.Toast(document.getElementById('toastPedido')).show();
  }, 300);

  carrito = [];
  actualizarCarrito();
}
