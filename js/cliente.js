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
  const savedCurrency = localStorage.getItem('guajiro-currency');
  if (savedCurrency && monedasDisponibles.includes(savedCurrency)) {
    monedaActiva = savedCurrency;
  } else {
    monedaActiva = monedasDisponibles[0];
    localStorage.setItem('guajiro-currency', monedaActiva);
  }
  document.getElementById('current-currency-label').textContent = monedaActiva;
  generarBotonesMoneda();
}

function generarBotonesMoneda() {
  const container = document.getElementById('moneda-list');
  container.innerHTML = monedasDisponibles.map(cod =>
    `<button class="moneda-chip ${cod === monedaActiva ? 'active' : ''}" onclick="cambiarMoneda('${cod}')">${cod}</button>`
  ).join('');
}

function cambiarMoneda(codigo) {
  if (!monedasDisponibles.includes(codigo)) return;
  monedaActiva = codigo;
  localStorage.setItem('guajiro-currency', codigo);
  document.getElementById('current-currency-label').textContent = codigo;
  generarBotonesMoneda();
  document.getElementById('moneda-list').classList.remove('show');
  actualizarRecargoDesdeMoneda();
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

// ─── Configuración y recargo ────────────
async function cargarConfiguracion() {
  await actualizarRecargoDesdeMoneda();
}

async function actualizarRecargoDesdeMoneda() {
  const { data } = await supabaseClient
    .from('monedas')
    .select('recargo_transferencia')
    .eq('codigo', monedaActiva)
    .single();
  recargoTransferencia = (data && !isNaN(data.recargo_transferencia)) ? parseFloat(data.recargo_transferencia) : 0;
  actualizarInfoRecargo();
}

function actualizarInfoRecargo() {
  const metodo = document.getElementById('metodo-pago').value;
  const info = document.getElementById('recargo-info');
  if (metodo === 'transferencia' && recargoTransferencia > 0) {
    info.textContent = `Recargo del ${recargoTransferencia}% sobre subtotal en ${monedaActiva}.`;
    info.classList.remove('d-none');
  } else {
    info.classList.add('d-none');
  }
}

// ─── Categorías y productos ─────────────
async function cargarCategorias() {
  const { data } = await supabaseClient.from('categorias').select('*').order('nombre');
  if (data) todasCategorias = data;
}

async function cargarProductos() {
  const { data } = await supabaseClient.from('productos').select('*, categorias(nombre)').eq('activo', true).order('nombre');
  if (data) todosProductos = data;
}

async function verificarCombosActivos() {
  const { data } = await supabaseClient.from('combos').select('id').eq('activo', true).limit(1);
  hayCombosActivos = data && data.length > 0;
}

async function cargarRepartosEnvio() {
  const select = document.getElementById('reparto-select');
  const { data } = await supabaseClient.from('repartos').select('*').eq('activo', true).order('nombre');
  select.innerHTML = '<option value="">Seleccione zona de envío...</option>';
  if (!data || data.length === 0) return;
  data.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.dataset.precio = r.precio;
    opt.textContent = `${r.nombre} — +${parseFloat(r.precio).toFixed(2)} ${monedaActiva}`;
    select.appendChild(opt);
  });
}

// ─── Renderizado ─────────────────────────
function renderCategorias() {
  const container = document.getElementById('categorias-container');
  let html = `<button class="btn-categoria active" onclick="filtrarPorCategoria('todas', this)">Inventario Completo</button>`;
  if (hayCombosActivos) {
    html += `<button class="btn-categoria" onclick="filtrarPorCategoria('combos', this)">Lotes (Combos)</button>`;
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
  if (precios[monedaActiva] !== undefined && precios[monedaActiva] !== null) {
    const val = parseFloat(precios[monedaActiva]);
    return (!isNaN(val) && val > 0) ? val : null;
  }
  return null;
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
  container.innerHTML = productosFiltrados.map(p => `
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
          <div class="precio-text mb-3">${obtenerPrecioProducto(p)}</div>
          <div class="d-flex gap-2 align-items-center">
            <input type="number" id="qty-${p.id}" class="form-control qty-input" style="width: 70px;" min="1" value="1" ${!horarioAbierto ? 'disabled' : ''}>
            <button class="btn btn-accent flex-grow-1" onclick="agregarAlCarrito('${p.id}')" ${!horarioAbierto ? 'disabled' : ''}>
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Combos con monedas ──────────────────
async function obtenerPrecioCombo(comboId) {
  const { data: combo, error: errCombo } = await supabaseClient
    .from('combos').select('*').eq('id', comboId).single();
  if (errCombo || !combo) return null;

  const { data: items, error: errItems } = await supabaseClient
    .from('combo_items')
    .select('*, productos(nombre, precios)')
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
  let textoHorario = 'Sistema inactivo hoy.';

  if (data) {
    if (data.abierto) {
      horarioAbierto = true;
      textoHorario = '';
    } else if (data.hora_apertura && data.hora_cierre && data.hora_apertura !== data.hora_cierre) {
      const [hA, mA] = data.hora_apertura.split(':').map(Number);
      const [hC, mC] = data.hora_cierre.split(':').map(Number);
      horarioAbierto = horaActual >= (hA + mA / 60) && horaActual < (hC + mC / 60);
      if (!horarioAbierto) textoHorario = `Operaciones documentadas de ${data.hora_apertura.slice(0,5)} a ${data.hora_cierre.slice(0,5)}.`;
    } else {
      horarioAbierto = false;
    }
  } else {
    horarioAbierto = false;
  }

  document.getElementById('horario-aviso').classList.toggle('d-none', horarioAbierto);
  document.getElementById('horario-texto').textContent = textoHorario;
}
