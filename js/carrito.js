// js/carrito.js
// Funciones de gestión del carrito

function agregarAlCarrito(idProducto) {
  const producto = todosProductos.find(p => p.id === idProducto);
  if (!producto) return;

  const inputElem = document.getElementById(`qty-${idProducto}`);
  let cantidadDeseada = parseInt(inputElem.value) || 1;
  if (cantidadDeseada < 1) cantidadDeseada = 1;

  const precioActual = obtenerPrecioNumerico(producto);
  if (!precioActual) return;

  const min = obtenerCantidadMinima(producto);
  if (cantidadDeseada < min) cantidadDeseada = min;   // simplemente se ajusta al mínimo, sin alert

  const grupo = carrito.find(item => item.id === idProducto && !item.esCombo);
  if (grupo) {
    grupo.cantidad += cantidadDeseada;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: precioActual,
      moneda: monedaActiva,
      permiteExtras: producto.permite_extras,
      cantidad: cantidadDeseada,
      extras: '',
      esCombo: false,
      items: null
    });
  }
  inputElem.value = min; // reiniciar al mínimo para la siguiente compra
  actualizarCarrito();
}

async function agregarComboAlCarrito(comboId) {
  const inputElem = document.getElementById(`qty-combo-${comboId}`);
  const cantidadExtraida = parseInt(inputElem.value) || 1;
  if (cantidadExtraida < 1) return;

  const precioData = await obtenerPrecioCombo(comboId);
  if (!precioData) return;

  const grupo = carrito.find(item => item.id === comboId && item.esCombo);
  if (grupo) {
    grupo.cantidad += cantidadExtraida;
    grupo.items = precioData.items.map(i => ({ nombre: i.productos.nombre, cantidad: i.cantidad }));
  } else {
    carrito.push({
      id: comboId,
      nombre: precioData.combo.nombre,
      precio: precioData.finalPrice,
      moneda: monedaActiva,
      permiteExtras: false,
      cantidad: cantidadExtraida,
      extras: '',
      esCombo: true,
      items: precioData.items.map(i => ({ nombre: i.productos.nombre, cantidad: i.cantidad }))
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
          ${item.esCombo ? `<div class="small text-muted">${(item.items || []).map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}</div>` : ''}
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

  let recargo = 0;
  if (metodoPagoActivo === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
    document.getElementById('recargo-aplicado').textContent = recargo.toFixed(2);
    document.getElementById('recargo-moneda').textContent = monedaActiva;
    document.getElementById('recargo-desglose').classList.remove('d-none');
  } else {
    document.getElementById('recargo-desglose').classList.add('d-none');
  }

  const repartoInput = document.getElementById('reparto-input');
  let envio = 0;
  if (aplicaDomicilio && repartoInput && repartoInput.dataset.precio) {
    envio = parseFloat(repartoInput.dataset.precio);
  }

  const envioCUP = document.getElementById('envio-cup-desglose');
  const envioDesglose = document.getElementById('envio-desglose');
  if (envio > 0 && aplicaDomicilio) {
    if (monedaActiva === 'CUP') {
      document.getElementById('envio-aplicado').textContent = envio.toFixed(2);
      document.getElementById('envio-moneda').textContent = 'CUP';
      envioDesglose.classList.remove('d-none');
      envioCUP.classList.add('d-none');
    } else {
      document.getElementById('envio-cup-aplicado').textContent = envio.toFixed(2);
      envioCUP.classList.remove('d-none');
      envioDesglose.classList.add('d-none');
    }
  } else {
    envioDesglose.classList.add('d-none');
    envioCUP.classList.add('d-none');
  }

  let total = subtotal + recargo;
  if (monedaActiva === 'CUP' && aplicaDomicilio && envio > 0) {
    total += envio;
  }

  document.getElementById('total-pedido').textContent = total.toFixed(2);
  document.getElementById('total-moneda').textContent = monedaActiva;

  const conteoGlobal = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  badge.textContent = conteoGlobal;
  badge.style.display = conteoGlobal > 0 ? 'flex' : 'none';

  const necesitaReparto = aplicaDomicilio && window._repartosData?.length > 0;
  const repartoSeleccionado = repartoInput && repartoInput.dataset.precio;
  btnCheckout.disabled = carrito.length === 0 || (necesitaReparto && !repartoSeleccionado);
}

function actualizarExtras(index, valor) {
  if (index >= 0 && index < carrito.length) carrito[index].extras = valor;
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}
