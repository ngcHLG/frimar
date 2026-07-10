// js/cliente.js
// Funciones de carga de datos, renderizado y monedas

// ─── Monedas ────────────────────────────
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
  document.getElementById('current-currency-label').textContent = monedaActiva;
  generarBotonesMoneda();
  inyectarModalCambioMoneda();
  await actualizarMetodosPago();
  await actualizarConfiguracionMoneda();
}

function inyectarModalCambioMoneda() {
  if (document.getElementById('confirmarCambioMonedaModal')) return;

  const modalHTML = `
    <div class="modal fade" id="confirmarCambioMonedaModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cambiar moneda</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Si cambias de moneda, se vaciará tu carrito actual porque los precios pueden variar. ¿Deseas continuar?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-accent btn-sm" id="btn-confirmar-cambio-moneda">Vaciar</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('btn-confirmar-cambio-moneda').addEventListener('click', function () {
    const codigoPendiente = window._monedaPendiente;
    if (!codigoPendiente) return;

    carrito = [];
    actualizarCarrito();

    monedaActiva = codigoPendiente;
    localStorage.setItem('frimar-currency', codigoPendiente);
    document.getElementById('current-currency-label').textContent = codigoPendiente;
    generarBotonesMoneda();
    document.getElementById('moneda-list').classList.remove('show');
    actualizarConfiguracionMoneda();
    actualizarMetodosPago();

    if (categoriaActiva === 'combos') {
      cargarCombosPublicos();
    } else {
      renderProductos();
    }

    bootstrap.Modal.getInstance(document.getElementById('confirmarCambioMonedaModal')).hide();
    window._monedaPendiente = null;
  });
}

function generarBotonesMoneda() {
  const container = document.getElementById('moneda-list');
  const otrasMonedas = monedasDisponibles.filter(cod => cod !== monedaActiva);
  container.innerHTML = otrasMonedas.map(cod =>
    `<button class="moneda-chip" onclick="cambiarMoneda('${cod}')">${cod}</button>`
  ).join('');
}

function cambiarMoneda(codigo) {
  if (!monedasDisponibles.includes(codigo)) return;

  if (carrito.length > 0 && codigo !== monedaActiva) {
    window._monedaPendiente = codigo;
    new bootstrap.Modal(document.getElementById('confirmarCambioMonedaModal')).show();
    return;
  }

  monedaActiva = codigo;
  localStorage.setItem('frimar-currency', codigo);
  document.getElementById('current-currency-label').textContent = codigo;
  generarBotonesMoneda();
  document.getElementById('moneda-list').classList.remove('show');
  actualizarConfiguracionMoneda();
  actualizarMetodosPago();
  if (categoriaActiva === 'combos') {
    cargarCombosPublicos();
  } else {
    renderProductos();
  }
  actualizarCarrito();
}

function configurarSelectorMoneda() {
  const toggleBtn = document.getElementById('btn-currency-toggle');
  const list = document.getElementById('moneda-list');
  toggleBtn.addEventListener('click', () => list.classList.toggle('show'));
  document.addEventListener('click', (e) => {
    if (!toggleBtn.contains(e.target) && !list.contains(e.target)) {
      list.classList.remove('show');
    }
  });
}

// ─── Métodos de pago según moneda ────────
async function actualizarMetodosPago() {
  const { data } = await supabaseClient
    .from('monedas')
    .select('metodos_pago')
    .eq('codigo', monedaActiva)
    .single();

  const metodos = data?.metodos_pago || ['efectivo', 'transferencia'];
  const container = document.getElementById('metodo-pago-container');
  const select = document.getElementById('metodo-pago');

  if (!container || !select) return;

  const opciones = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia'
  };
  select.innerHTML = '';
  metodos.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = opciones[m] || m;
    select.appendChild(opt);
  });

  if (metodos.length <= 1) {
    container.classList.add('d-none');
    metodoPagoActivo = metodos[0] || 'efectivo';
  } else {
    container.classList.remove('d-none');
    if (metodos.includes(metodoPagoActivo)) {
      select.value = metodoPagoActivo;
    } else {
      select.value = metodos[0];
      metodoPagoActivo = metodos[0];
    }
  }

  select.onchange = () => {
    metodoPagoActivo = select.value;
    actualizarInfoRecargo();
    actualizarCarrito();
  };

  actualizarInfoRecargo();
}

// ─── Configuración y recargo ────────────
async function cargarConfiguracion() {
  await actualizarConfiguracionMoneda();
  await actualizarMetodosPago();
}

async function actualizarConfiguracionMoneda() {
  const { data } = await supabaseClient
    .from('monedas')
    .select('recargo_transferencia, aplica_domicilio')
    .eq('codigo', monedaActiva)
    .single();
  recargoTransferencia = (data && !isNaN(data.recargo_transferencia)) ? parseFloat(data.recargo_transferencia) : 0;
  aplicaDomicilio = data ? (data.aplica_domicilio !== false) : true;
  actualizarInfoRecargo();
  actualizarVisibilidadDomicilio();
}

function actualizarInfoRecargo() {
  const info = document.getElementById('recargo-info');
  if (!info) return;

  if (metodoPagoActivo === 'transferencia' && recargoTransferencia > 0) {
    info.textContent = `Recargo del ${recargoTransferencia}% sobre subtotal en ${monedaActiva}.`;
    info.classList.remove('d-none');
  } else {
    info.classList.add('d-none');
  }
}

function actualizarVisibilidadDomicilio() {
  const container = document.getElementById('reparto-container');
  if (!container) return;
  if (aplicaDomicilio) {
    container.classList.remove('d-none');
  } else {
    container.classList.add('d-none');
    document.getElementById('reparto-input').value = '';
    document.getElementById('reparto-precio').textContent = '';
    document.getElementById('reparto-input').dataset.precio = '';
  }
  actualizarCarrito();
}

// ─── Categorías y productos ─────────────
async function cargarCategorias() {
  const { data } = await supabaseClient.from('categorias').select('*').order('nombre');
  if (data) todasCategorias = data;
}

async function cargarProductos() {
  const { data } = await supabaseClient
    .from('productos')
    .select('*, categorias(nombre)')
    .eq('activo', true)
    .order('nombre');
  if (data) todosProductos = data;
}

async function verificarCombosActivos() {
  const { data } = await supabaseClient.from('combos').select('id').eq('activo', true).limit(1);
  hayCombosActivos = data && data.length > 0;
}

async function cargarRepartosEnvio() {
  const datalist = document.getElementById('repartos-list');
  const { data } = await supabaseClient.from('repartos').select('*').eq('activo', true).order('nombre');
  datalist.innerHTML = '';
  if (!data || data.length === 0) return;

  window._repartosData = data;
  data.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.nombre;
    opt.dataset.precio = r.precio;
    opt.dataset.id = r.id;
    datalist.appendChild(opt);
  });
}

window.seleccionarReparto = function(nombreReparto) {
  const reparto = window._repartosData?.find(r => r.nombre === nombreReparto);
  if (reparto) {
    document.getElementById('reparto-input').value = reparto.nombre;
    document.getElementById('reparto-precio').textContent = `Envío: +${parseFloat(reparto.precio).toFixed(2)} CUP`;
    document.getElementById('reparto-input').dataset.precio = reparto.precio;
    document.getElementById('reparto-input').dataset.id = reparto.id;
  } else {
    document.getElementById('reparto-precio').textContent = '';
    document.getElementById('reparto-input').dataset.precio = '';
    document.getElementById('reparto-input').dataset.id = '';
  }
  actualizarCarrito();
};

// ─── Renderizado ─────────────────────────
function renderCategorias() {
  const container = document.getElementById('categorias-container');
  let html = `<button class="btn-categoria active" onclick="filtrarPorCategoria('todas', this)">Todo</button>`;
  if (hayCombosActivos) {
    html += `<button class="btn-categoria" onclick="filtrarPorCategoria('combos', this)">Combos</button>`;
  }
  const categoriasConProductos = todasCategorias.filter(cat =>
    todosProductos.some(prod => prod.categoria_id === cat.id && obtenerPrecioNumerico(prod) > 0)
  );
  categoriasConProductos.forEach(cat => {
    html += `<button class="btn-categoria" onclick="filtrarPorCategoria('${cat.id}', this)">${cat.nombre}</button>`;
  });
  container.innerHTML = html;
}

function filtrarPorCategoria(catId, el) {
  categoriaActiva = catId;
  document.querySelectorAll('.btn-categoria').forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
  catId === 'combos' ? cargarCombosPublicos() : renderProductos();
}

function obtenerPrecioNumerico(producto) {
  const precios = producto.precios || {};
  const info = precios[monedaActiva];
  if (!info) return null;
  if (typeof info === 'object') {
    return (!isNaN(info.precio) && info.precio > 0) ? parseFloat(info.precio) : null;
  } else {
    const val = parseFloat(info);
    return (!isNaN(val) && val > 0) ? val : null;
  }
}

function obtenerCantidadMinima(producto) {
  const precios = producto.precios || {};
  const info = precios[monedaActiva];
  if (typeof info === 'object' && info.min) {
    return parseInt(info.min) || 1;
  }
  return 1;
}

function obtenerPrecioProducto(producto) {
  const precio = obtenerPrecioNumerico(producto);
  return precio ? precio.toFixed(2) + ' ' + monedaActiva : 'N/D';
}

function renderProductos() {
  const container = document.getElementById('productos-container');
  let productosFiltrados = todosProductos.filter(p => obtenerPrecioNumerico(p) !== null);
  if (categoriaActiva !== 'todas') {
    productosFiltrados = productosFiltrados.filter(p => p.categoria_id === categoriaActiva);
  }
  if (productosFiltrados.length === 0) {
    container.innerHTML = '<p class="text-muted">No existen registros en esta clasificación.</p>';
    return;
  }
  container.innerHTML = productosFiltrados.map(p => {
    const stock = p.stock !== undefined ? p.stock : 0;
    const stockText = stock > 0 ? `Stock: ${stock}` : 'Sin stock';
    const stockColor = stock > 5 ? 'text-success' : (stock > 0 ? 'text-warning' : 'text-danger');
    return `
    <div class="col">
      <div class="card card-producto h-100">
        <div class="producto-media position-relative">
          ${p.foto_url
            ? `<img src="${p.foto_url}" class="card-img-top" alt="${p.nombre}">`
            : `<div class="producto-sin-foto"><i class="bi bi-image"></i></div>`
          }
        </div>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">${p.nombre}</h6>
          <p class="card-text small text-muted flex-grow-1">${p.descripcion || ''}</p>
          <div class="precio-text mb-2">${obtenerPrecioProducto(p)}</div>
          <div class="small ${stockColor} mb-2">${stockText}</div>
          <div class="d-flex gap-2 align-items-center">
            <input type="number" id="qty-${p.id}" class="form-control qty-input" style="width: 70px;" min="${obtenerCantidadMinima(p)}" value="${obtenerCantidadMinima(p)}" ${!horarioAbierto ? 'disabled' : ''}>
            <button class="btn btn-accent flex-grow-1" onclick="agregarAlCarrito('${p.id}')" ${!horarioAbierto ? 'disabled' : ''}>
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function validarCantidadMinima(input, min) {
  if (parseInt(input.value) < min || isNaN(parseInt(input.value))) {
    input.value = min;
  }
}

// ─── Agregar al carrito con validación de stock ───
function agregarAlCarrito(idProducto) {
  const producto = todosProductos.find(p => p.id === idProducto);
  if (!producto) return;

  const inputElem = document.getElementById(`qty-${idProducto}`);
  let cantidadDeseada = parseInt(inputElem.value) || 1;
  if (cantidadDeseada < 1) cantidadDeseada = 1;

  const precioActual = obtenerPrecioNumerico(producto);
  if (!precioActual) return;

  const min = obtenerCantidadMinima(producto);
  const grupo = carrito.find(item => item.id === idProducto && !item.esCombo);
  const cantidadYaEnCarrito = grupo ? grupo.cantidad : 0;
  const cantidadTotal = cantidadYaEnCarrito + cantidadDeseada;

  if (cantidadTotal < min) {
    document.getElementById('toast-min-text').textContent =
      `Debes comprar al menos ${min} unidades de ${producto.nombre} en ${monedaActiva}.`;
    new bootstrap.Toast(document.getElementById('toastCantidadMinima')).show();
    inputElem.value = min;
    return;
  }

  // Validar stock
  const stockDisponible = producto.stock || 0;
  if (stockDisponible > 0 && cantidadTotal > stockDisponible) {
    document.getElementById('toast-min-text').textContent =
      `Solo hay ${stockDisponible} unidades disponibles de ${producto.nombre}.`;
    new bootstrap.Toast(document.getElementById('toastCantidadMinima')).show();
    return;
  }

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
  inputElem.value = min;
  actualizarCarrito();
}

// ─── Combos con monedas ──────────────────
async function obtenerPrecioCombo(comboId) {
  const { data: combo, error: errCombo } = await supabaseClient
    .from('combos').select('*').eq('id', comboId).single();
  if (errCombo || !combo) return null;

  const { data: items, error: errItems } = await supabaseClient
    .from('combo_items')
    .select('*, productos(id, nombre, precios, stock)')
    .eq('combo_id', comboId);
  if (errItems || !items || items.length === 0) return null;

  let originalTotal = 0;
  for (const item of items) {
    const precioProd = obtenerPrecioNumerico(item.productos);
    if (precioProd === null) return null;
    originalTotal += precioProd * item.cantidad;
  }

  const precios = combo.precios || {};
  const montos = precios.montos || {};
  if (!montos[monedaActiva] && montos[monedaActiva] !== 0) return null;

  let finalPrice;
  if (precios.tipo === 'porcentaje') {
    finalPrice = originalTotal * (1 - montos[monedaActiva] / 100);
  } else if (precios.tipo === 'fijo') {
    finalPrice = montos[monedaActiva];
  } else {
    return null;
  }

  return { combo, items, originalTotal, finalPrice };
}

async function cargarCombosPublicos() {
  const container = document.getElementById('productos-container');
  container.innerHTML = '<div class="col"><div class="skeleton skeleton-card"></div></div><div class="col"><div class="skeleton skeleton-card"></div></div>';

  const { data: combos, error } = await supabaseClient.from('combos').select('*').eq('activo', true).order('nombre');
  if (error || !combos || combos.length === 0) {
    container.innerHTML = '<p class="text-muted">No existen lotes documentados.</p>';
    return;
  }

  let html = '';
  for (const combo of combos) {
    const precioData = await obtenerPrecioCombo(combo.id);
    if (!precioData) continue;

    // Verificar stock de todos los productos del combo
    let stockSuficiente = true;
    for (const item of precioData.items) {
      const producto = todosProductos.find(p => p.id === item.productos.id);
      if (!producto || (producto.stock || 0) < item.cantidad) {
        stockSuficiente = false;
        break;
      }
    }
    if (!stockSuficiente) continue;

    const { items, originalTotal, finalPrice } = precioData;
    const listaProductos = items.map(i => `${i.cantidad}x ${i.productos.nombre}`).join(', ');

    const precios = combo.precios || {};
    const montos = precios.montos || {};
    let badgeTexto = '';
    if (precios.tipo === 'porcentaje') {
      badgeTexto = `-${montos[monedaActiva]}%`;
    } else if (precios.tipo === 'fijo') {
      badgeTexto = `Fijo ${montos[monedaActiva]} ${monedaActiva}`;
    }

    html += `
      <div class="col">
        <div class="card card-producto h-100">
          <div class="producto-media position-relative">
            <div class="producto-sin-foto"><i class="bi bi-layers"></i></div>
            <span class="badge-oferta">${badgeTexto}</span>
          </div>
          <div class="card-body d-flex flex-column">
            <h6 class="card-title mb-1">${combo.nombre}</h6>
            <p class="card-text small text-muted flex-grow-1">${listaProductos}</p>
            <div class="d-flex align-items-center gap-2 mb-3">
              <s class="text-muted small">${originalTotal.toFixed(2)} ${monedaActiva}</s>
              <span class="precio-text">${finalPrice.toFixed(2)} ${monedaActiva}</span>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <input type="number" id="qty-combo-${combo.id}" class="form-control qty-input" style="width: 70px;" min="1" value="1" ${!horarioAbierto ? 'disabled' : ''}>
              <button class="btn btn-accent flex-grow-1" onclick="agregarComboAlCarrito('${combo.id}')" ${!horarioAbierto ? 'disabled' : ''}>
                Añadir Lote
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = html === '' ? '<p class="text-muted">No hay lotes disponibles en esta moneda.</p>' : html;
}

// ─── Horarios ────────────────────────────
async function verificarHorario() {
  const ahora = new Date();
  const diaSemana = ahora.getDay();
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;

  const { data } = await supabaseClient.from('horarios').select('abierto, hora_apertura, hora_cierre').eq('dia_semana', diaSemana).single();
  let textoHorario = 'Cerrado por hoy. ¡Te esperamos pronto!';

  if (data) {
    if (data.abierto) {
      horarioAbierto = true;
      textoHorario = '';
    } else if (data.hora_apertura && data.hora_cierre && data.hora_apertura !== data.hora_cierre) {
      const [hA, mA] = data.hora_apertura.split(':').map(Number);
      const [hC, mC] = data.hora_cierre.split(':').map(Number);
      horarioAbierto = horaActual >= (hA + mA / 60) && horaActual < (hC + mC / 60);
      if (!horarioAbierto) textoHorario = `Estamos fuera de servicio. Nuestro horario es de ${data.hora_apertura.slice(0,5)} a ${data.hora_cierre.slice(0,5)}.`;
    } else {
      horarioAbierto = false;
      textoHorario = 'Cerrado por hoy. ¡Te esperamos pronto!';
    }
  } else {
    horarioAbierto = false;
    textoHorario = 'Cerrado por hoy. ¡Te esperamos pronto!';
  }

  document.getElementById('horario-aviso').classList.toggle('d-none', horarioAbierto);
  document.getElementById('horario-texto').textContent = textoHorario;
      }
