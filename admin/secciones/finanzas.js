// admin/secciones/finanzas.js
// Panel de Finanzas: ventas entregadas (web + puesto de venta), filtros y totales por moneda.

window.finanzas = {
  init: async function(container) {
    finanzasStyleTag();

    container.innerHTML = `
      <h2 class="mb-4 d-flex align-items-center gap-2">
        <i class="bi bi-graph-up text-secondary"></i> Finanzas
      </h2>

      <div class="finanzas-filtros">
        <div class="finanzas-filtro-grupo">
          <label>Desde</label>
          <input type="date" class="form-control form-control-sm" id="fin-fecha-desde">
        </div>
        <div class="finanzas-filtro-grupo">
          <label>Hasta</label>
          <input type="date" class="form-control form-control-sm" id="fin-fecha-hasta">
        </div>
        <div class="finanzas-filtro-grupo">
          <label>Producto</label>
          <input type="text" class="form-control form-control-sm" id="fin-filtro-producto" placeholder="Buscar producto...">
        </div>
        <div class="finanzas-filtro-grupo">
          <label>Moneda</label>
          <input type="text" class="form-control form-control-sm" id="fin-filtro-moneda" placeholder="Ej: CUP, USD...">
        </div>
        <div class="finanzas-filtro-grupo">
          <label>Origen</label>
          <select class="form-select form-select-sm" id="fin-filtro-origen">
            <option value="">Todos</option>
            <option value="pagina">Página (web)</option>
            <option value="tienda">Puesto de venta</option>
          </select>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <button class="btn btn-outline-accent btn-sm" id="fin-btn-eliminar" disabled>
          <i class="bi bi-trash"></i> Eliminar seleccionados
        </button>
        <span class="text-muted small" id="fin-conteo"></span>
      </div>

      <div class="table-responsive">
        <table class="table finanzas-tabla">
          <thead>
            <tr>
              <th style="width:2rem;"><input type="checkbox" id="fin-check-all"></th>
              <th>Día</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody id="fin-tbody"></tbody>
        </table>
      </div>

      <div class="d-flex justify-content-center align-items-center gap-2 my-3" id="fin-paginacion"></div>

      <h4 class="mt-4 mb-3">Total por moneda</h4>
      <div id="fin-ganancia"></div>
    `;

    ['fin-fecha-desde', 'fin-fecha-hasta'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => cargarDatos())
    );
    ['fin-filtro-producto', 'fin-filtro-moneda'].forEach(id =>
      document.getElementById(id).addEventListener('input', () => { paginaActual = 1; renderTabla(); })
    );
    document.getElementById('fin-filtro-origen').addEventListener('change', () => cargarDatos());
    document.getElementById('fin-check-all').addEventListener('change', (e) => toggleTodos(e.target.checked));
    document.getElementById('fin-btn-eliminar').addEventListener('click', eliminarSeleccionados);

    await cargarDatos();
  },
  destroy: function() {
    ventasCache = [];
    seleccionados.clear();
  }
};

let ventasCache = [];      // filas planas de ventas (una por producto)
let seleccionados = new Set(); // claves "pedidoId::itemIndex" seleccionadas
let paginaActual = 1;
const PAGINA_TAM = 25;

function finanzasStyleTag() {
  if (document.getElementById('finanzas-style')) return;
  const style = document.createElement('style');
  style.id = 'finanzas-style';
  style.textContent = `
    .finanzas-filtros {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      margin-bottom: 1rem;
      align-items: end;
    }
    .finanzas-filtro-grupo {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .finanzas-filtro-grupo label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
    }
    .finanzas-tabla {
      background-color: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .finanzas-tabla thead th {
      background-color: var(--nav-bg);
      color: var(--nav-text);
      border-bottom: none;
      font-size: 0.8rem;
      text-transform: uppercase;
    }
    .finanzas-tabla td, .finanzas-tabla th {
      border-color: var(--border-color);
      vertical-align: middle;
    }
    .finanzas-tabla tbody tr:hover {
      background-color: rgba(138, 141, 145, 0.08);
    }
    .fin-pagina-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      border-radius: 4px;
      padding: 0.2rem 0.6rem;
      font-size: 0.85rem;
    }
    .fin-pagina-btn.active {
      background-color: var(--accent-btn);
      color: var(--accent-text);
      border-color: var(--accent-btn);
    }
    .fin-pagina-btn:disabled {
      opacity: 0.4;
    }
    .ganancia-card {
      display: inline-flex;
      flex-direction: column;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.8rem 1.2rem;
      margin: 0 0.6rem 0.6rem 0;
      min-width: 140px;
    }
    .ganancia-card .moneda {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      font-weight: 600;
    }
    .ganancia-card .total {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-main);
    }
  `;
  document.head.appendChild(style);
}

async function cargarDatos() {
  const desde = document.getElementById('fin-fecha-desde').value;
  const hasta = document.getElementById('fin-fecha-hasta').value;
  const origen = document.getElementById('fin-filtro-origen').value;

  let query = window.guajiroPC.from('pedidos').select('id, created_at, items, moneda, origen, estado').eq('estado', 'entregado');

  if (desde) {
    query = query.gte('created_at', `${desde}T00:00:00`);
  }
  if (hasta) {
    query = query.lte('created_at', `${hasta}T23:59:59`);
  }
  if (origen === 'tienda') {
    query = query.eq('origen', 'tienda');
  } else if (origen === 'pagina') {
    query = query.is('origen', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    document.getElementById('fin-tbody').innerHTML = `<tr><td colspan="5" class="text-danger">Error al cargar: ${error.message}</td></tr>`;
    return;
  }

  // Aplanar: una fila por producto vendido
  ventasCache = [];
  (data || []).forEach(pedido => {
    const items = Array.isArray(pedido.items) ? pedido.items : [];
    items.forEach((item, idx) => {
      ventasCache.push({
        clave: `${pedido.id}::${idx}`,
        pedidoId: pedido.id,
        fecha: pedido.created_at,
        producto: item.nombre,
        cantidad: item.cantidad,
        precio: parseFloat(item.precio) || 0,
        moneda: item.moneda || pedido.moneda || 'CUP'
      });
    });
  });

  seleccionados.clear();
  paginaActual = 1;
  renderTabla();
}

function filasFiltradas() {
  const filtroProducto = document.getElementById('fin-filtro-producto').value.trim().toLowerCase();
  const filtroMoneda = document.getElementById('fin-filtro-moneda').value.trim().toLowerCase();

  return ventasCache.filter(v => {
    const okProducto = !filtroProducto || v.producto.toLowerCase().includes(filtroProducto);
    const okMoneda = !filtroMoneda || v.moneda.toLowerCase().includes(filtroMoneda);
    return okProducto && okMoneda;
  });
}

function renderTabla() {
  const filas = filasFiltradas();
  const totalPaginas = Math.max(1, Math.ceil(filas.length / PAGINA_TAM));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * PAGINA_TAM;
  const filasPagina = filas.slice(inicio, inicio + PAGINA_TAM);

  const tbody = document.getElementById('fin-tbody');
  if (!tbody) return;

  if (filas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center py-3">No hay ventas para estos filtros.</td></tr>';
  } else {
    tbody.innerHTML = filasPagina.map(v => `
      <tr>
        <td><input type="checkbox" class="fin-check-item" data-clave="${v.clave}" ${seleccionados.has(v.clave) ? 'checked' : ''}></td>
        <td>${new Date(v.fecha).toLocaleDateString()}</td>
        <td>${v.producto}</td>
        <td>${v.cantidad}</td>
        <td>${v.precio.toFixed(2)} ${v.moneda}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.fin-check-item').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const clave = e.target.dataset.clave;
        if (e.target.checked) seleccionados.add(clave);
        else seleccionados.delete(clave);
        actualizarBotonEliminar();
      });
    });
  }

  renderPaginacion(totalPaginas);
  renderGanancia(filas);
  actualizarBotonEliminar();
}

function renderPaginacion(totalPaginas) {
  const cont = document.getElementById('fin-paginacion');
  if (!cont) return;
  if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

  let botones = `<button class="fin-pagina-btn" id="fin-pag-prev" ${paginaActual === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;
  botones += `<span class="small text-muted">Página ${paginaActual} de ${totalPaginas}</span>`;
  botones += `<button class="fin-pagina-btn" id="fin-pag-next" ${paginaActual === totalPaginas ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
  cont.innerHTML = botones;

  document.getElementById('fin-pag-prev')?.addEventListener('click', () => { paginaActual--; renderTabla(); });
  document.getElementById('fin-pag-next')?.addEventListener('click', () => { paginaActual++; renderTabla(); });
}

function renderGanancia(filas) {
  const cont = document.getElementById('fin-ganancia');
  if (!cont) return;

  const totales = {};
  filas.forEach(v => {
    totales[v.moneda] = (totales[v.moneda] || 0) + (v.precio * v.cantidad);
  });

  const monedas = Object.keys(totales);
  if (monedas.length === 0) {
    cont.innerHTML = '<p class="text-muted">Sin datos para estos filtros.</p>';
    return;
  }

  cont.innerHTML = monedas.map(m => `
    <div class="ganancia-card">
      <span class="moneda">${m}</span>
      <span class="total">${totales[m].toFixed(2)}</span>
    </div>
  `).join('');
}

function toggleTodos(marcar) {
  const filas = filasFiltradas();
  const inicio = (paginaActual - 1) * PAGINA_TAM;
  const filasPagina = filas.slice(inicio, inicio + PAGINA_TAM);
  filasPagina.forEach(v => {
    if (marcar) seleccionados.add(v.clave);
    else seleccionados.delete(v.clave);
  });
  renderTabla();
}

function actualizarBotonEliminar() {
  const btn = document.getElementById('fin-btn-eliminar');
  const conteo = document.getElementById('fin-conteo');
  if (!btn) return;
  btn.disabled = seleccionados.size === 0;
  if (conteo) conteo.textContent = seleccionados.size > 0 ? `${seleccionados.size} línea(s) seleccionada(s)` : '';
}

async function eliminarSeleccionados() {
  if (seleccionados.size === 0) return;

  // Cada línea pertenece a un pedido completo; se elimina el pedido entero.
  const pedidoIds = [...new Set([...seleccionados].map(clave => clave.split('::')[0]))];

  if (!confirm(`Se eliminará${pedidoIds.length > 1 ? 'n' : ''} ${pedidoIds.length} venta(s) completa(s), incluyendo todos sus datos. ¿Continuar?`)) {
    return;
  }

  const { error } = await window.guajiroPC.from('pedidos').delete().in('id', pedidoIds);
  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }

  seleccionados.clear();
  await cargarDatos();
}
