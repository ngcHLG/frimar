// js/carrito.js
// Funciones de gestión del carrito

function agregarAlCarrito(idProducto) {
  const producto = todosProductos.find(p => p.id === idProducto);
  if (!producto) return;

  const inputElem = document.getElementById(`qty-${idProducto}`);
  const cantidadExtraida = parseInt(inputElem.value) || 1;
  if (cantidadExtraida < 1) return;

  const precioActual = obtenerPrecioNumerico(producto);
  if (!precioActual) return;

  const grupo = carrito.find(item => item.id === idProducto && !item.esCombo);
  if (grupo) {
    grupo.cantidad += cantidadExtraida;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: precioActual,
      moneda: monedaActiva,
      permiteExtras: producto.permite_extras,
      cantidad: cantidadExtraida,
      extras: '',
      esCombo: false
    });
  }
  inputElem.value = 1;
  actualizarCarrito();
}

async function agregarComboAlCarrito(comboId) {
  const inputElem = document.getElementById(`qty-combo-${comboId}`);
  const cantidadExtraida = parseInt(inputElem.value) || 1;
  if (cantidadExtraida < 1) return;

  // Obtener precio del combo en la moneda activa
  const precioData = await obtenerPrecioCombo(comboId);
  if (!precioData) return; // combo no disponible en esta moneda

  const grupo = carrito.find(item => item.id === comboId && item.esCombo);
  if (grupo) {
    grupo.cantidad += cantidadExtraida;
  } else {
    carrito.push({
      id: comboId,
      nombre: precioData.combo.nombre,
      precio: precioData.finalPrice,
      moneda: monedaActiva,
      permiteExtras: false,
      cantidad: cantidadExtraida,
      extras: '',
      esCombo: true
    });
  }
  inputElem.value = 1;
  actualizarCarrito();
}

function actualizarCantidadManual(index, inputObj) {
  const val = parseInt(inputObj.value);
  if (isNaN(val) || val < 1) {
    eliminarDelCarrito(index);
  } else {
    carrito[index].cantidad = val;
    actualizarCarrito();
  }
}

function actualizarCarrito() {
  const lista = document.getElementById('carrito-lista');
  const badge = document.getElementById('cart-badge');
  const btnCheckout = document.getElementById('btn-checkout');

  lista.innerHTML = carrito.map((item, index) => `
    <div class="list-group-item carrito-item rounded mb-2 border">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <div class="fw-bold">${item.nombre}</div>
          ${item.esCombo ? '<small class="text-muted">Lote</small>' : ''}
        </div>
        <span class="fw-bold">${(item.precio * item.cantidad).toFixed(2)} ${item.moneda || monedaActiva}</span>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex gap-1 align-items-center">
          <span class="text-muted small me-2">Cant:</span>
          <input type="number" class="form-control form-control-sm text-center" style="width: 60px;"
                 value="${item.cantidad}" min="0" onchange="actualizarCantidadManual(${index}, this)">
        </div>
        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarDelCarrito(${index})" aria-label="Remover">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
      ${!item.esCombo && item.permiteExtras ? `<input type="text" class="form-control form-control-sm mt-2" placeholder="Notas operativas" value="${item.extras}" oninput="actualizarExtras(${index}, this.value)">` : ''}
    </div>
  `).join('') || `<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1"></i><p class="mt-2">Ningún registro en curso.</p></div>`;

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  document.getElementById('subtotal-carrito').textContent = subtotal.toFixed(2);
  document.getElementById('subtotal-moneda').textContent = monedaActiva;

  const metodoPago = document.getElementById('metodo-pago').value;
  let recargo = 0;
  if (metodoPago === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
    document.getElementById('recargo-aplicado').textContent = recargo.toFixed(2);
    document.getElementById('recargo-moneda').textContent = monedaActiva;
    document.getElementById('recargo-desglose').classList.remove('d-none');
  } else {
    document.getElementById('recargo-desglose').classList.add('d-none');
  }

  const repartoSelect = document.getElementById('reparto-select');
  let envio = 0;
  if (repartoSelect && repartoSelect.selectedOptions[0]?.dataset.precio) {
    envio = parseFloat(repartoSelect.selectedOptions[0].dataset.precio);
    document.getElementById('envio-aplicado').textContent = envio.toFixed(2);
    document.getElementById('envio-moneda').textContent = monedaActiva;
    document.getElementById('envio-desglose').classList.remove('d-none');
  } else {
    document.getElementById('envio-desglose').classList.add('d-none');
  }

  const total = subtotal + recargo + envio;
  document.getElementById('total-pedido').textContent = total.toFixed(2);
  document.getElementById('total-moneda').textContent = monedaActiva;

  const conteoGlobal = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  badge.textContent = conteoGlobal;
  badge.style.display = conteoGlobal > 0 ? 'flex' : 'none';

  btnCheckout.disabled = carrito.length === 0 || !repartoSelect?.value;
}

function actualizarExtras(index, valor) {
  if (index >= 0 && index < carrito.length) carrito[index].extras = valor;
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}
