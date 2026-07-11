// admin/secciones/inventario.js
window.inventario = {
  init: async function(container) {
    container.innerHTML = `
      <h2 class="mb-4 d-flex align-items-center gap-2">
        <i class="bi bi-boxes text-secondary"></i> Inventario
      </h2>

      <!-- Filtro de búsqueda para productos -->
      <div class="mb-3">
        <input type="text" class="form-control form-control-sm" id="inv-filtro-productos" placeholder="Buscar producto..." style="max-width: 300px;">
      </div>

      <div class="table-responsive">
        <table class="table table-hover" id="inv-tabla-productos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th style="width: 80px;">Acciones</th>
            </tr>
          </thead>
          <tbody id="inv-tbody-productos"></tbody>
        </table>
      </div>

      <hr>
      <h5 class="mt-4">Historial de movimientos</h5>
      <div class="d-flex flex-wrap gap-2 mb-2">
        <input type="date" class="form-control form-control-sm" id="inv-filtro-fecha" style="width:150px;">
        <input type="text" class="form-control form-control-sm" id="inv-filtro-producto-hist" placeholder="Buscar producto" style="width:200px;">
        <select class="form-select form-select-sm" id="inv-filtro-tipo" style="width:150px;">
          <option value="">Todos</option>
          <option value="ajuste">Ajuste</option>
          <option value="venta">Venta</option>
        </select>
        <button class="btn btn-outline-accent btn-sm" onclick="window.inventario.recargar()" title="Actualizar">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
      <div id="inv-historial" style="max-height:400px; overflow-y:auto;"></div>
    `;

    await this.cargarProductos();
    await this.cargarHistorial();

    // Filtro de productos en tiempo real
    document.getElementById('inv-filtro-productos').addEventListener('input', () => this.cargarProductos());

    // Filtros del historial
    document.getElementById('inv-filtro-fecha').addEventListener('change', () => this.cargarHistorial());
    document.getElementById('inv-filtro-producto-hist').addEventListener('input', () => this.cargarHistorial());
    document.getElementById('inv-filtro-tipo').addEventListener('change', () => this.cargarHistorial());
  },

  destroy: function() {},

  cargarProductos: async function() {
    const filtro = document.getElementById('inv-filtro-productos').value.trim().toLowerCase();

    let query = window.guajiroPC
      .from('productos')
      .select('id, nombre, stock')
      .eq('activo', true)
      .order('nombre');

    if (filtro) {
      query = query.ilike('nombre', `%${filtro}%`);
    }

    const { data, error } = await query;

    const tbody = document.getElementById('inv-tbody-productos');
    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No hay productos que coincidan.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(p => {
      const stockColor = p.stock <= 0 ? 'bg-danger' : (p.stock < 5 ? 'bg-warning' : 'bg-secondary');
      const panelId = `edit-panel-${p.id}`;
      return `
        <tr id="row-${p.id}">
          <td><strong>${p.nombre}</strong></td>
          <td><span class="badge ${stockColor}">${p.stock}</span></td>
          <td>
            <button class="btn btn-outline-accent btn-sm" onclick="window.inventario.toggleEdicion('${p.id}')" title="Editar stock">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>
        <tr id="${panelId}" class="edit-panel" style="display:none; background-color: var(--bg-surface);">
          <td colspan="3" style="padding: 0.3rem 0.5rem;">
            <div class="d-flex flex-wrap align-items-center gap-1" style="white-space: nowrap;">
              <!-- Toggle añadir/quitar (solo íconos) -->
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-accent tipo-btn active" data-tipo="añadir" data-id="${p.id}" onclick="window.inventario.setTipo('${p.id}', 'añadir')" title="Añadir">
                  <i class="bi bi-plus-circle"></i>
                </button>
                <button class="btn btn-outline-accent tipo-btn" data-tipo="quitar" data-id="${p.id}" onclick="window.inventario.setTipo('${p.id}', 'quitar')" title="Quitar">
                  <i class="bi bi-dash-circle"></i>
                </button>
              </div>

              <!-- Cantidad -->
              <div style="display:flex; align-items:center; gap:0.2rem;">
                <label class="small text-muted" style="margin:0;">Cant:</label>
                <input type="number" class="form-control form-control-sm" id="inv-cant-${p.id}" value="1" min="1" style="width:60px;">
              </div>

              <!-- Motivo (más corto) -->
              <input type="text" class="form-control form-control-sm" id="inv-motivo-${p.id}" placeholder="Motivo" style="width:120px; min-width:80px; flex:1;">

              <!-- Botones Aceptar y Cancelar (solo íconos) -->
              <button class="btn btn-accent btn-sm" onclick="window.inventario.guardarAjusteInline('${p.id}')" title="Aceptar">
                <i class="bi bi-check"></i>
              </button>
              <button class="btn btn-outline-accent btn-sm" onclick="window.inventario.toggleEdicion('${p.id}')" title="Cancelar">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleEdicion: function(productoId) {
    const panel = document.getElementById(`edit-panel-${productoId}`);
    if (panel) {
      if (panel.style.display === 'none') {
        document.querySelectorAll('.edit-panel').forEach(p => p.style.display = 'none');
        panel.style.display = 'table-row';
        this.setTipo(productoId, 'añadir');
      } else {
        panel.style.display = 'none';
      }
    }
  },

  setTipo: function(productoId, tipo) {
    const panel = document.getElementById(`edit-panel-${productoId}`);
    if (!panel) return;
    const btns = panel.querySelectorAll('.tipo-btn');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
    panel.dataset.tipo = tipo;
  },

  guardarAjusteInline: async function(productoId) {
    const panel = document.getElementById(`edit-panel-${productoId}`);
    if (!panel) return;

    const tipo = panel.dataset.tipo || 'añadir';
    const cantidadInput = document.getElementById(`inv-cant-${productoId}`);
    const motivoInput = document.getElementById(`inv-motivo-${productoId}`);

    const cantidad = parseInt(cantidadInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('La cantidad debe ser un número positivo.');
      return;
    }

    const motivo = motivoInput.value.trim() || 'Ajuste manual';
    const cantidadReal = tipo === 'añadir' ? cantidad : -cantidad;

    // Obtener producto y su nombre
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

    // Actualizar stock
    const { error: errUpdate } = await window.guajiroPC
      .from('productos')
      .update({ stock: stockNuevo })
      .eq('id', productoId);

    if (errUpdate) {
      alert('Error al actualizar stock: ' + errUpdate.message);
      return;
    }

    // Obtener usuario autenticado
    const { data: { user } } = await window.guajiroPC.auth.getUser();
    const usuario = user?.email || 'admin';

    // Registrar movimiento
    const { error: errMov } = await window.guajiroPC
      .from('inventario_movimientos')
      .insert([{
        producto_id: productoId,
        cantidad: cantidadReal,
        tipo: 'ajuste',
        motivo: motivo,
        pedido_id: null,
        usuario: usuario,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo
      }]);

    if (errMov) {
      // Mostrar error detallado
      alert('Stock actualizado pero error al registrar movimiento: ' + errMov.message + '\n\nAsegúrate de tener políticas RLS que permitan insertar en inventario_movimientos.');
      // No recargamos para que no se pierda el ajuste, pero mostramos el error.
    } else {
      // Notificación de stock bajo
      await window.notificarStockBajo(productoId, nombreProducto, stockNuevo);
    }

    // Cerrar panel y recargar
    panel.style.display = 'none';
    this.cargarProductos();
    this.cargarHistorial();
  },

  cargarHistorial: async function() {
    const productoFiltro = document.getElementById('inv-filtro-producto-hist').value.trim();
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
      // Los emojis los mantengo solo en el historial, puedes cambiarlos por íconos si prefieres.
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

  recargar: function() {
    this.cargarProductos();
    this.cargarHistorial();
  }
};
