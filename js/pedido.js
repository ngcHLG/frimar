// js/pedido.js
// Confirmación de pedido y envío de notificación (offcanvas de facturación)

function configurarBotonPedido() {
  document.getElementById('btn-checkout').addEventListener('click', () => {
    if (carrito.length === 0) return;
    const carritoOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
    if (carritoOffcanvas) carritoOffcanvas.hide();
  });

  document.getElementById('confirmar-pedido').addEventListener('click', confirmarPedido);
}

async function confirmarPedido() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const referencia = document.getElementById('referencia').value.trim();
  const errorDiv = document.getElementById('facturacion-error');
  const errorText = document.getElementById('facturacion-error-text');

  if (!nombre || !telefono || !direccion) {
    errorText.textContent = 'Faltan parámetros obligatorios en el formulario.';
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

  // ── Construir items con producto_id y expandir combos ──
  const itemsPedido = carrito.map(item => {
    if (item.esCombo) {
      // Combo: expandir subitems con sus IDs
      const subitems = (item.items || []).map(sub => ({
        producto_id: sub.producto_id,
        nombre: sub.nombre,
        cantidad: sub.cantidad * item.cantidad  // cantidad total
      }));
      return {
        nombre: item.nombre,
        precio: item.precio,
        moneda: item.moneda || monedaActiva,
        cantidad: item.cantidad,
        extras: item.extras || null,
        esCombo: true,
        items: subitems
      };
    } else {
      // Producto simple: guardar producto_id
      const producto = todosProductos.find(p => p.id === item.id);
      return {
        producto_id: producto ? producto.id : null,
        nombre: item.nombre,
        precio: item.precio,
        moneda: item.moneda || monedaActiva,
        cantidad: item.cantidad,
        extras: item.extras || null,
        esCombo: false,
        items: null
      };
    }
  });

  const pedidoData = {
    nombre,
    telefono,
    direccion,
    referencia: referencia || null,
    metodo_pago: metodoPagoActivo,
    moneda: monedaActiva,
    zona: zonaTexto,
    envio: envio,
    recargo: recargo,
    total,
    items: itemsPedido,
    estado: 'pendiente'
  };

  const { error: errorPedido } = await supabaseClient.from('pedidos').insert([pedidoData]);

  if (errorPedido) {
    errorText.textContent = 'Fallo en la transmisión de datos del pedido.';
    errorDiv.classList.remove('d-none');
    return;
  }

  // Notificación ntfy
  const productosTexto = carrito.map(item => {
    const extra = item.extras ? ` [${item.extras}]` : '';
    return `• ${item.cantidad}x ${item.nombre}${extra} — ${(item.precio * item.cantidad).toFixed(2)} ${item.moneda || monedaActiva}`;
  }).join('\n');

  const recargoTexto = recargo > 0 ? `\n💳 Recargo (${recargoTransferencia}%): ${recargo.toFixed(2)} ${monedaActiva}` : '';
  const envioTexto = envio > 0 ? `\n🛵 Envío: ${envio.toFixed(2)} CUP` : '';
  const envioNota = monedaActiva !== 'CUP' && envio > 0 ? '\n(El envío se cobra aparte en CUP)' : '';

  const payloadNtfy = `🧾 NUEVO PEDIDO — FRIMAR
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

  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: 'POST', body: payloadNtfy }).catch(() => {});

  // Cerrar offcanvas de facturación
  const facturacionOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('facturacionOffcanvas'));
  if (facturacionOffcanvas) facturacionOffcanvas.hide();

  setTimeout(() => {
    new bootstrap.Toast(document.getElementById('toastPedido')).show();
  }, 300);

  carrito = [];
  actualizarCarrito();

  // Limpiar formulario
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('direccion').value = '';
  document.getElementById('referencia').value = '';
}
