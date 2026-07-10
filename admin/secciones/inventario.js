// admin/secciones/inventario.js
window.inventario = {
  init: async function(container) {
    container.innerHTML = `
      <h2 class="mb-4 d-flex align-items-center gap-2">
        <i class="bi bi-boxes text-secondary"></i> Inventario
      </h2>

      <div class="d-flex flex-wrap gap-2 mb-3">
        <button class="btn btn-accent btn-sm" onclick="window.inventario.abrirAjuste()">
          <i class="bi bi-plus-circle"></i> Ajustar stock
        </button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.inventario.recargar()">
          <i class="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover" id="inv-tabla-productos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="inv-tbody-productos"></tbody>
        </table>
      </div>

      <hr>
      <h5 class="mt-4">Historial de movimientos</h5>
      <div class="d-flex flex-wrap gap-2 mb-2">
        <input type="date" class="form-control form-control-sm" id="inv-filtro-fecha" style="width:150px;">
        <input type="text" class="form-control form-control-sm" id="inv-filtro-producto" placeholder="Buscar producto" style="width:200px;">
        <select class="form-select form-select-sm" id="inv-filtro-tipo" style="width:150px;">
          <option value="">Todos</option>
          <option value="ajuste">Ajuste</option>
          <option value="venta">Venta</option>
        </select>
      </div>
      <div id="inv-historial" style="max-height:400px; overflow-y:auto;"></div>

      ${modalAjusteHTML()}
    `;

    await this.cargarProductos();
    await this.cargarHistorial();

    document.getElementById('inv-filtro-fecha').addEventListener('change', () => this.cargarHistorial());
    document.getElementById('inv-filtro-producto').addEventListener('input', () => this.cargarHistorial());
    document.getElementById('inv-filtro-tipo').addEventListener('change', () => this.cargarHistorial());

    document.getElementById('btn-inv-ajuste-guardar').addEventListener('click', () => this.guardarAjuste());

    // Cargar productos en el select del modal
    await this.cargarSelectProductos();
  },

  destroy: function() {},

  cargarProductos: async function() {
    const { data, error } = await window.guajiroPC
      .from('productos')
      .select('id, nombre, stock')
      .eq('activo', true)
      .order('nombre');

    const tbody = document.getElementById('inv-tbody-productos');
    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No hay productos activos.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(p => {
      const stockColor = p.stock <= 0 ? 'bg-danger' : (p.stock < 5 ? 'bg-warning' : 'bg-secondary');
      return `
        <tr>
          <td><strong>${p.nombre}</strong></td>
          <td><span class="badge ${stockColor}">${p.stock}</span></td>
          <td>
            <button class="btn btn-outline-accent btn-sm" onclick="window.inventario.abrirAjuste('${p.id}')">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  cargarSelectProductos: async function() {
    const { data } = await window.guajiroPC
      .from('productos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre');
    const select = document.getElementById('inv-ajuste-producto');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar...</option>';
    if (data) {
      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        select.appendChild(opt);
      });
    }
  },

  cargarHistorial: async function() {
    const productoFiltro = document.getElementById('inv-filtro-producto').value.trim();
    const fecha = document.getElementById('inv-filtro-fecha').value;
    const tipo = document.getElementById('inv-filtro-tipo').value;

    let query = window.guajiroPC
      .from('inventario_movimientos')
      .select('*, productos(nombre)')
      .order('fecha', { ascending: false })
      .limit(200);

    if (productoFiltro) {
      const { data: productos } = await window.guajiroPC
        .from('productos')
        .select('id')
        .ilike('nombre', `%${productoFiltro}%`);
      if (productos && productos.length > 0) {
        const ids = productos.map(p => p.id);
        query = query.in('producto_id', ids);
      } else {
        document.getElementById('inv-historial').innerHTML = '<p class="text-muted">Sin resultados.</p>';
        return;
      }
    }
    if (fecha) {
      query = query.gte('fecha', `${fecha}T00:00:00`).lte('fecha', `${fecha}T23:59:59`);
    }
    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    const container = document.getElementById('inv-historial');
    if (error || !data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay movimientos para estos filtros.</p>';
      return;
    }

    container.innerHTML = data.map(m => {
      const signo = m.cantidad >= 0 ? '+' : '';
      const clase = m.cantidad >= 0 ? 'text-success' : 'text-danger';
      const tipoLabel = m.tipo === 'venta' ? '🛒 Venta' : '✏️ Ajuste';
      return `
        <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${m.productos?.nombre || 'Producto eliminado'}</strong>
            <span class="badge bg-secondary">${tipoLabel}</span>
            <span class="${clase}">${signo}${m.cantidad}</span>
            <span class="text-muted small">(prev: ${m.stock_anterior} → ${m.stock_nuevo})</span>
            ${m.motivo ? `<span class="text-muted small">· ${m.motivo}</span>` : ''}
          </div>
          <span class="text-muted small">${new Date(m.fecha).toLocaleString()}</span>
        </div>
      `;
    }).join('');
  },

  abrirAjuste: function(productoId = null) {
    if (productoId) {
      document.getElementById('inv-ajuste-producto').value = productoId;
    } else {
      document.getElementById('inv-ajuste-producto').value = '';
    }
    document.getElementById('inv-ajuste-cantidad').value = '';
    document.getElementById('inv-ajuste-motivo').value = '';
    document.getElementById('inv-ajuste-tipo').value = 'añadir';
    document.getElementById('inv-ajuste-modal-titulo').textContent = 'Ajustar stock';
    new bootstrap.Modal(document.getElementById('invAjusteModal')).show();
  },

  guardarAjuste: async function() {
    const productoId = document.getElementById('inv-ajuste-producto').value;
    const cantidad = parseInt(document.getElementById('inv-ajuste-cantidad').value);
    const motivo = document.getElementById('inv-ajuste-motivo').value.trim() || 'Ajuste manual';
    const tipo = document.getElementById('inv-ajuste-tipo').value;

    if (!productoId || isNaN(cantidad) || cantidad <= 0) {
      alert('Selecciona un producto y una cantidad válida.');
      return;
    }

    const cantidadReal = tipo === 'añadir' ? cantidad : -cantidad;

    // Obtener producto y su nombre para la notificación
    const { data: producto, error: errGet } = await window.guajiroPC
      .from('productos')
      .select('nombre, stock')
      .eq('id', productoId)
      .single();

    if (errGet || !producto) {
      alert('Error al obtener el producto.');
      return;
    }

    const nombreProducto = producto.nombre;
    const stockAnterior = producto.stock;
    const stockNuevo = stockAnterior + cantidadReal;
    if (stockNuevo < 0) {
      alert('No puedes quitar más stock del que existe.');
      return;
    }

    const { error: errUpdate } = await window.guajiroPC
      .from('productos')
      .update({ stock: stockNuevo })
      .eq('id', productoId);

    if (errUpdate) {
      alert('Error al actualizar stock: ' + errUpdate.message);
      return;
    }

    const { error: errMov } = await window.guajiroPC
      .from('inventario_movimientos')
      .insert([{
        producto_id: productoId,
        cantidad: cantidadReal,
        tipo: 'ajuste',
        motivo: motivo,
        pedido_id: null,
        usuario: (await window.guajiroPC.auth.getUser()).data.user?.email || 'admin',
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo
      }]);

    if (errMov) {
      alert('Stock actualizado pero no se registró el movimiento: ' + errMov.message);
    }

    // ─── NOTIFICACIÓN DE STOCK BAJO (dinámico) ───
    await window.notificarStockBajo(productoId, nombreProducto, stockNuevo);

    bootstrap.Modal.getInstance(document.getElementById('invAjusteModal')).hide();
    this.cargarProductos();
    this.cargarHistorial();
  },

  recargar: function() {
    this.cargarProductos();
    this.cargarHistorial();
  }
};

function modalAjusteHTML() {
  return `
    <div class="modal fade" id="invAjusteModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="inv-ajuste-modal-titulo">Ajustar stock</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label">Producto</label>
              <select class="form-select" id="inv-ajuste-producto">
                <option value="">Seleccionar...</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label">Tipo</label>
              <select class="form-select" id="inv-ajuste-tipo">
                <option value="añadir">Añadir (+)</option>
                <option value="quitar">Quitar (-)</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label">Cantidad</label>
              <input type="number" class="form-control" id="inv-ajuste-cantidad" min="1" required>
            </div>
            <div class="mb-2">
              <label class="form-label">Motivo (opcional)</label>
              <input type="text" class="form-control" id="inv-ajuste-motivo" placeholder="Ej: reposición, devolución...">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-accent btn-sm" id="btn-inv-ajuste-guardar">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
