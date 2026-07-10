// secciones/pedidos.js
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex flex-nowrap justify-content-between align-items-center mb-4 gap-2">
        <h2 class="m-0 fs-3 text-truncate" style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
        <div class="d-flex flex-nowrap align-items-center gap-2">
          <button class="btn btn-outline-accent btn-sm d-flex align-items-center gap-1" id="btn-seleccionar-todos" onclick="window.pedidos.seleccionarTodos()">
            <i class="bi bi-check-square"></i> <span id="texto-seleccionar-todos" class="d-none d-sm-inline">Todos</span>
          </button>
          <button id="btn-eliminar-seleccionados" class="btn btn-danger btn-sm d-none position-relative" onclick="window.pedidos.eliminarSeleccionados()" title="Eliminar seleccionados">
            <i class="bi bi-trash"></i>
            <span id="cantidad-seleccionados" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style="font-size: 0.65rem;">0</span>
          </button>
        </div>
      </div>
      <div id="pedidos-lista" class="d-flex flex-column gap-3"></div>
      ${modalConfirmacionHTML()}
    `;

    this.seleccionados = new Set();
    await pedidosCargar();
    this.interval = setInterval(pedidosCargar, 30000);
  },
  destroy: function() {
    if (this.interval) clearInterval(this.interval);
  }
};

function modalConfirmacionHTML() {
  return `
    <div class="modal fade" id="confirmarEliminarModal" tabindex="-1">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title text-danger"><i class="bi bi-exclamation-triangle-fill"></i> Confirmar</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center py-4">
            <p id="confirmar-mensaje" class="mb-0 fs-6">¿Eliminar los pedidos seleccionados?</p>
          </div>
          <div class="modal-footer border-top-0 pt-0 justify-content-center">
            <button type="button" class="btn btn-light btn-sm px-3" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger btn-sm px-3" id="btn-confirmar-eliminar">Eliminar</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function pedidosCargar() {
  const { data } = await window.guajiroPC.from('pedidos').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
  
  if (!data || data.length === 0) {
    cont.innerHTML = `
      <div class="text-center p-5 rounded" style="background: var(--bg-surface); border: 1px dashed var(--border-color);">
        <i class="bi bi-inbox text-muted fs-1 mb-2 d-block"></i>
        <p class="text-muted mb-0">No hay pedidos aún.</p>
      </div>`;
    return;
  }

  cont.innerHTML = data.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    const estaSeleccionado = window.pedidos.seleccionados.has(p.id);

    return `
    <div class="card list-item shadow-sm border-0" style="background: var(--bg-surface);">
      <div class="card-body p-3">
        
        <div class="d-flex justify-content-between align-items-start mb-2">
          <button class="btn btn-sm btn-select-pedido ${estaSeleccionado ? 'btn-accent' : 'btn-outline-accent'}" style="width: 32px; height: 32px; padding: 0; border-radius: 6px;" onclick="window.pedidos.togglePedido('${p.id}', this)">
            <i class="bi ${estaSeleccionado ? 'bi-check-square-fill' : 'bi-square'}"></i>
          </button>
          <small class="text-muted"><i class="bi bi-clock"></i> ${new Date(p.created_at).toLocaleString()}</small>
        </div>

        <h5 class="fw-bold text-uppercase mb-2" style="color: var(--text-main);">${p.nombre}</h5>

        <div class="mb-3 text-secondary" style="font-size: 0.9rem;">
          <div class="mb-1"><i class="bi bi-telephone text-muted me-2"></i>${p.telefono}</div>
          <div class="mb-1"><i class="bi bi-geo-alt text-muted me-2"></i>${p.direccion}</div>
          <div class="mb-1"><i class="bi bi-signpost text-muted me-2"></i>${p.referencia || 'Sin referencia'}</div>
        </div>

        <blockquote class="p-3 mb-3 rounded" style="background: rgba(0,0,0,0.03); border-left: 4px solid var(--accent-color); font-size: 0.9rem;">
          <ul class="list-unstyled mb-2">
            ${items.map(i => `<li class="mb-1"><span class="badge bg-secondary me-2">${i.cantidad}x</span> ${i.nombre}</li>`).join('')}
          </ul>
          <div class="fw-bold border-top pt-2 mt-2 d-flex justify-content-between">
            <span>Total:</span>
            <span>${parseFloat(p.total).toFixed(2)} ${p.moneda || 'CUP'}</span>
          </div>
        </blockquote>

        <div class="mb-3 d-flex flex-column gap-1 text-secondary" style="font-size: 0.85rem;">
          <div><i class="bi bi-wallet2 text-muted me-2"></i>Pago: <strong class="text-uppercase">${p.metodo_pago}</strong></div>
          <div><i class="bi bi-truck text-muted me-2"></i>Envío: <strong>${p.zona}</strong></div>
        </div>

        <div class="btn-group w-100 shadow-sm" role="group">
          <button type="button" class="btn btn-sm ${p.estado === 'pendiente' ? 'btn-warning text-dark' : 'btn-outline-warning'}" onclick="window.pedidos.cambiarEstado('${p.id}', 'pendiente')" title="Pendiente">
            <i class="bi bi-hourglass-split"></i>
          </button>
          <button type="button" class="btn btn-sm ${p.estado === 'confirmado' ? 'btn-info text-white' : 'btn-outline-info'}" onclick="window.pedidos.cambiarEstado('${p.id}', 'confirmado')" title="Confirmado">
            <i class="bi bi-check-circle"></i>
          </button>
          <button type="button" class="btn btn-sm ${p.estado === 'entregado' ? 'btn-success' : 'btn-outline-success'}" onclick="window.pedidos.cambiarEstado('${p.id}', 'entregado')" title="Entregado">
            <i class="bi bi-box-seam"></i>
          </button>
          <button type="button" class="btn btn-sm ${p.estado === 'cancelado' ? 'btn-danger' : 'btn-outline-danger'}" onclick="window.pedidos.cambiarEstado('${p.id}', 'cancelado')" title="Cancelado">
            <i class="bi bi-x-circle"></i>
          </button>
        </div>

      </div>
    </div>`;
  }).join('');

  window.pedidos.actualizarBotonEliminar();
  window.pedidos.actualizarBotonSeleccionarTodos();
}

// ─── Selección y eliminación ───
window.pedidos.togglePedido = function(id, boton) {
  if (window.pedidos.seleccionados.has(id)) {
    window.pedidos.seleccionados.delete(id);
    boton.classList.remove('btn-accent');
    boton.classList.add('btn-outline-accent');
    boton.querySelector('i').className = 'bi bi-square';
  } else {
    window.pedidos.seleccionados.add(id);
    boton.classList.remove('btn-outline-accent');
    boton.classList.add('btn-accent');
    boton.querySelector('i').className = 'bi bi-check-square-fill';
  }
  window.pedidos.actualizarBotonEliminar();
  window.pedidos.actualizarBotonSeleccionarTodos();
};

window.pedidos.seleccionarTodos = function() {
  const totalPedidos = document.querySelectorAll('#pedidos-lista .list-item').length;
  if (window.pedidos.seleccionados.size === totalPedidos && totalPedidos > 0) {
    window.pedidos.seleccionados.clear();
    document.querySelectorAll('#pedidos-lista .list-item .btn-select-pedido').forEach(btn => {
      btn.classList.remove('btn-accent');
      btn.classList.add('btn-outline-accent');
      btn.querySelector('i').className = 'bi bi-square';
    });
  } else {
    document.querySelectorAll('#pedidos-lista .list-item').forEach(item => {
      const btn = item.querySelector('.btn-select-pedido');
      const id = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      window.pedidos.seleccionados.add(id);
      btn.classList.remove('btn-outline-accent');
      btn.classList.add('btn-accent');
      btn.querySelector('i').className = 'bi bi-check-square-fill';
    });
  }
  window.pedidos.actualizarBotonEliminar();
  window.pedidos.actualizarBotonSeleccionarTodos();
};

window.pedidos.actualizarBotonEliminar = function() {
  const btn = document.getElementById('btn-eliminar-seleccionados');
  const span = document.getElementById('cantidad-seleccionados');
  if (window.pedidos.seleccionados.size > 0) {
    btn.classList.remove('d-none');
    span.textContent = window.pedidos.seleccionados.size;
  } else {
    btn.classList.add('d-none');
  }
};

window.pedidos.actualizarBotonSeleccionarTodos = function() {
  const btn = document.getElementById('btn-seleccionar-todos');
  const icono = btn.querySelector('i');
  const totalPedidos = document.querySelectorAll('#pedidos-lista .list-item').length;
  
  if (totalPedidos > 0 && window.pedidos.seleccionados.size === totalPedidos) {
    btn.classList.add('btn-accent');
    btn.classList.remove('btn-outline-accent');
    icono.className = 'bi bi-check-square-fill';
  } else {
    btn.classList.remove('btn-accent');
    btn.classList.add('btn-outline-accent');
    icono.className = 'bi bi-check-square';
  }
};

window.pedidos.eliminarSeleccionados = function() {
  if (window.pedidos.seleccionados.size === 0) return;
  const modalEl = document.getElementById('confirmarEliminarModal');
  const mensaje = document.getElementById('confirmar-mensaje');
  mensaje.textContent = `¿Eliminar ${window.pedidos.seleccionados.size} pedido(s)?`;
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  document.getElementById('btn-confirmar-eliminar').onclick = async () => {
    modal.hide();
    const ids = [...window.pedidos.seleccionados];
    const { error } = await window.guajiroPC.from('pedidos').delete().in('id', ids);
    if (error) {
      alert('Error al eliminar: ' + error.message);
      return;
    }
    window.pedidos.seleccionados.clear();
    pedidosCargar();
  };
};

// ─── Cambios de estado unificados ───
window.pedidos.cambiarEstado = async function(id, nuevoEstado) {
  if (nuevoEstado === 'cancelado') {
    if (!confirm('¿Seguro que deseas cancelar este pedido?')) return;
  }
  await window.guajiroPC.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
  pedidosCargar();
};
