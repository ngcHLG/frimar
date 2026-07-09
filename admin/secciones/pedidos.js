// secciones/pedidos.js
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
        <div class="d-flex flex-nowrap align-items-center gap-2 overflow-auto" style="max-width: 100%; scrollbar-width: none;">
          <button class="btn btn-outline-accent btn-sm text-nowrap" id="btn-seleccionar-todos" onclick="window.pedidos.seleccionarTodos()">
            <i class="bi bi-check-square"></i> <span>Seleccionar todos</span>
          </button>
          <button id="btn-eliminar-seleccionados" class="btn btn-outline-danger btn-sm text-nowrap d-none" onclick="window.pedidos.eliminarSeleccionados()">
            <i class="bi bi-trash"></i> Eliminar (<span id="cantidad-seleccionados">0</span>)
          </button>
        </div>
      </div>
      <div id="pedidos-lista" class="mt-3"></div>
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
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle"></i> Confirmar</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <p id="confirmar-mensaje">¿Eliminar los pedidos seleccionados?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-outline-danger btn-sm" id="btn-confirmar-eliminar">Eliminar</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function pedidosCargar() {
  const { data } = await window.guajiroPC.from('pedidos').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="text-muted text-start">No hay pedidos aún.</p>';
    return;
  }

  cont.innerHTML = data.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    const estaSeleccionado = window.pedidos.seleccionados.has(p.id);
    const puedeConfirmar = p.estado === 'pendiente';
    const puedeEntregar = p.estado === 'confirmado';
    const puedeCancelar = p.estado === 'pendiente' || p.estado === 'confirmado';
    const badgeClass = {
      pendiente: 'warning',
      confirmado: 'info',
      entregado: 'success',
      cancelado: 'danger'
    }[p.estado] || 'secondary';

    return `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:flex-start; gap:0.8rem;">
      <button class="btn btn-sm btn-outline-accent" style="flex-shrink:0; margin-top:0.2rem;" onclick="window.pedidos.togglePedido('${p.id}', this)" title="Seleccionar pedido">
        <i class="bi ${estaSeleccionado ? 'bi-check-square-fill' : 'bi-square'}"></i>
      </button>
      <div style="flex-grow:1; text-align:left;">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="item-name" style="font-weight:600; text-transform:uppercase;">${p.nombre}</span>
          <span style="font-size:0.85rem; color:var(--text-secondary);">${new Date(p.created_at).toLocaleString()}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary);"><i class="bi bi-telephone"></i> ${p.telefono} · <i class="bi bi-geo-alt"></i> ${p.direccion}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          <i class="bi bi-truck"></i> ${p.zona} · 
          <i class="bi bi-cash"></i> ${p.metodo_pago} · 
          <i class="bi bi-currency-exchange"></i> ${p.moneda || 'CUP'} · 
          <strong>${parseFloat(p.total).toFixed(2)} ${p.moneda || 'CUP'}</strong>
        </div>
        <div class="mt-2">${items.map(i => `<span class="badge bg-secondary me-1">${i.cantidad}x ${i.nombre}</span>`).join('')}</div>
        <div class="mt-2 d-flex align-items-center gap-2 flex-wrap">
          <span class="badge bg-${badgeClass}">${p.estado}</span>
          ${puedeConfirmar ? `<button class="btn btn-sm btn-outline-accent" onclick="window.pedidos.confirmar('${p.id}')"><i class="bi bi-check-circle"></i> Confirmar</button>` : ''}
          ${puedeEntregar ? `<button class="btn btn-sm btn-outline-accent" onclick="window.pedidos.entregar('${p.id}')"><i class="bi bi-box-seam"></i> Entregado</button>` : ''}
          ${puedeCancelar ? `<button class="btn btn-sm btn-outline-danger" onclick="window.pedidos.cancelar('${p.id}')"><i class="bi bi-x-circle"></i> Cancelar</button>` : ''}
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
    document.querySelectorAll('#pedidos-lista .list-item button').forEach(btn => {
      btn.classList.remove('btn-accent');
      btn.classList.add('btn-outline-accent');
      btn.querySelector('i').className = 'bi bi-square';
    });
  } else {
    document.querySelectorAll('#pedidos-lista .list-item').forEach(item => {
      const btn = item.querySelector('button');
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
  const texto = btn.querySelector('span');
  const totalPedidos = document.querySelectorAll('#pedidos-lista .list-item').length;
  if (totalPedidos > 0 && window.pedidos.seleccionados.size === totalPedidos) {
    btn.classList.add('btn-accent');
    icono.className = 'bi bi-check-square-fill';
    texto.textContent = 'Deseleccionar todos';
  } else {
    btn.classList.remove('btn-accent');
    icono.className = 'bi bi-check-square';
    texto.textContent = 'Seleccionar todos';
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

// ─── Cambios de estado ───
window.pedidos.confirmar = async function(id) {
  await window.guajiroPC.from('pedidos').update({ estado: 'confirmado' }).eq('id', id);
  pedidosCargar();
};

window.pedidos.entregar = async function(id) {
  await window.guajiroPC.from('pedidos').update({ estado: 'entregado' }).eq('id', id);
  pedidosCargar();
};

window.pedidos.cancelar = async function(id) {
  if (!confirm('¿Cancelar este pedido?')) return;
  await window.guajiroPC.from('pedidos').update({ estado: 'cancelado' }).eq('id', id);
  pedidosCargar();
};
