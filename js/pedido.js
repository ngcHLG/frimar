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

  const repartoInput = document.getElementById('reparto-input');
  const zonaTexto = aplicaDomicilio && repartoInput?.value ? repartoInput.value : 'No aplica envío';
  const envio = aplicaDomicilio && repartoInput?.dataset.precio ? parseFloat(repartoInput.dataset.precio) : 0;

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  let recargo = 0;
  if (metodoPagoActivo === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
  }
  let total = subtotal + recargo;
  if (monedaActiva === 'CUP' && aplicaDomicilio) {
    total += envio;
  }

  const pedidoData = {
    nombre,
    telefono,
    direccion,
    referencia: referencia || null,
    metodo_pago: metodoPagoActivo,
    moneda: monedaActiva,
    zona: zonaTexto,
    envio: envio,
    total,
    items: carrito.map(item => ({
      nombre: item.nombre,
      precio: item.precio,
      moneda: item.moneda || monedaActiva,
      cantidad: item.cantidad,
      extras: item.extras || null,
      esCombo: item.esCombo || false
    })),
    estado: 'pendiente'
  };

  const { error: errorPedido } = await supabaseClient.from('pedidos').insert([pedidoData]);

  if (errorPedido) {
    document.getElementById('error-text').textContent = 'Fallo en la transmisión de datos del pedido.';
    errorDiv.classList.remove('d-none');
    return;
  }

  // ─── Notificación ntfy ─────────────────
  const productosTexto = carrito.map(item => {
    const extra = item.extras ? ` [${item.extras}]` : '';
    return `• ${item.cantidad}x ${item.nombre}${extra} — ${(item.precio * item.cantidad).toFixed(2)} ${item.moneda || monedaActiva}`;
  }).join('\n');

  const recargoTexto = recargo > 0 ? `\n💳 Recargo (${recargoTransferencia}%): ${recargo.toFixed(2)} ${monedaActiva}` : '';
  const envioTexto = envio > 0 ? `\n🛵 Envío: ${envio.toFixed(2)} CUP` : '';
  const envioNota = monedaActiva !== 'CUP' && envio > 0 ? '\n(El envío se cobra aparte en CUP)' : '';

  const payloadNtfy = `🧾 NUEVO PEDIDO — GUAJIRO
👤 ${nombre}
📞 ${telefono}
📍 ${direccion}${referencia ? '\n📌 Ref: ' + referencia : ''}
🛵 Reparto: ${zonaTexto}
💳 Pago: ${metodoPagoActivo} (${monedaActiva})
────────────────────
${productosTexto}
────────────────────
💰 Subtotal: ${subtotal.toFixed(2)} ${monedaActiva}${recargoTexto}${envioTexto}${envioNota}
🔻 TOTAL: ${total.toFixed(2)} ${monedaActiva}`;

  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    body: payloadNtfy
  }).catch(() => {});

  checkoutModalInstance.hide();
  const offcanvasInst = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
  if (offcanvasInst) offcanvasInst.hide();

  setTimeout(() => {
    new bootstrap.Toast(document.getElementById('toastPedido')).show();
  }, 300);

  carrito = [];
  actualizarCarrito();
    }
