// secciones/pedidos.js
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 class="mb-0 text-nowrap" style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
        <div class="d-flex flex-nowrap align-items-center gap-2">
          <button class="btn btn-outline-accent btn-sm text-nowrap" id="btn-seleccionar-todos" onclick="window.pedidos.seleccionarTodos()">
            <i class="bi bi-check-square"></i> <span>Seleccionar</span>
          </button>
          <button id="btn-eliminar-seleccionados" class="btn btn-outline-danger btn-sm position-relative d-none" onclick="window.pedidos.eliminarSeleccionados()" title="Eliminar seleccionados">
            <i class="bi bi-trash"></i>
            <span class="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle" id="cantidad-seleccionados">0</span>
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

function pedidoNotaStyleTag() {
  if (document.getElementById('pedido-nota-style')) return;
  const style = document.createElement('style');
  style.id = 'pedido-nota-style';
  style.textContent = `
    .pedido-nota {
      display: block;
      width: 100%;
      max-width: 420px;
      margin: 0 auto 1.25rem;
      background: var(--bg-surface);
      border: 1px dashed var(--border-color);
      border-radius: 6px;
      padding: 1rem 1.1rem;
      text-align: left;
      font-family: 'Courier New', Courier, monospace;
      position: relative;
    }
    .pedido-nota__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 0.6rem;
    }
    .pedido-nota__check {
      background: none;
      border: none;
      padding: 0;
      font-size: 1.25rem;
      line-height: 1;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .pedido-nota__check.is-checked { color: var(--accent-btn); }
    .pedido-nota__fecha {
      font-size: 0.75rem;
      color: var(--text-secondary);
      letter-spacing: 0.02em;
    }
    .pedido-nota__linea {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.3rem;
      color: var(--text-main);
    }
    .pedido-nota__linea i {
      width: 1.2rem;
      display: inline-block;
      color: var(--text-secondary);
    }
    .pedido-nota__items {
      border-top: 1px dashed var(--border-color);
      margin-top: 0.5rem;
      padding-top: 0.5rem;
    }
    .pedido-nota__item-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-main);
      margin-bottom: 0.15rem;
    }
    .pedido-nota__desglose {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 0.3rem;
    }
    .pedido-nota__total {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 0.95rem;
      border-top: 1px dashed var(--border-color);
      margin-top: 0.4rem;
      padding-top: 0.4rem;
    }
    .pedido-nota__footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.7rem;
    }
  `;
  document.head.appendChild(style);
}

async function pedidosCargar() {
  pedidoNotaStyleTag();
  const { data } = await window.guajiroPC.from('pedidos').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
  if (!cont) return;
  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="text-muted text-start">No hay pedidos aún.</p>';
    return;
  }

  cont.innerHTML = data.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    const estaSeleccionado = window.pedidos.seleccionados.has(p.id);
    const badgeClass = {
      pendiente: 'warning',
      confirmado: 'info',
      entregado: 'success',
      cancelado: 'danger'
    }[p.estado] || 'secondary';

    const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.precio) * i.cantidad), 0);
    const envio = parseFloat(p.envio) || 0;
    const moneda = p.moneda || 'CUP';

    const estados = [
      { valor: 'pendiente', icono: 'bi-hourglass-split', titulo: 'Pendiente' },
      { valor: 'confirmado', icono: 'bi-check-circle', titulo: 'Confirmado' },
      { valor: 'entregado', icono: 'bi-box-seam', titulo: 'Entregado' },
      { valor: 'cancelado', icono: 'bi-x-circle', titulo: 'Cancelado' }
    ];

    return `
    <div class="pedido-nota" data-pedido-id="${p.id}">
      <div class="pedido-nota__header">
        <button class="pedido-nota__check ${estaSeleccionado ? 'is-checked' : ''}" onclick="window.pedidos.togglePedido('${p.id}', this)" title="Seleccionar pedido">
          <i class="bi ${estaSeleccionado ? 'bi-check-square-fill' : 'bi-square'}"></i>
        </button>
        <span class="pedido-nota__fecha">${new Date(p.created_at).toLocaleString()}</span>
      </div>

      <span class="pedido-nota__linea"><i class="bi bi-person"></i> <strong style="text-transform:uppercase;">${p.nombre}</strong></span>
      <span class="pedido-nota__linea"><i class="bi bi-telephone"></i> ${p.telefono}</span>
      <span class="pedido-nota__linea"><i class="bi bi-geo-alt"></i> ${p.direccion}</span>
      ${p.referencia ? `<span class="pedido-nota__linea"><i class="bi bi-signpost"></i> Ref: ${p.referencia}</span>` : ''}
      <span class="pedido-nota__linea"><i class="bi bi-truck"></i> Reparto: ${p.zona}</span>
      <span class="pedido-nota__linea"><i class="bi bi-cash"></i> Pago: ${p.metodo_pago} (${moneda})</span>

      <div class="pedido-nota__items">
        ${items.map(i => `<div class="pedido-nota__item-row"><span>${i.cantidad}x ${i.nombre}</span><span>${(i.precio * i.cantidad).toFixed(2)}</span></div>`).join('')}
        ${envio > 0 ? `
          <div class="pedido-nota__desglose"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${moneda}</span></div>
          <div class="pedido-nota__desglose"><span>Envío</span><span>${envio.toFixed(2)} ${moneda}</span></div>
        ` : ''}
      </div>

      <div class="pedido-nota__total">
        <span>Total</span>
        <span>${parseFloat(p.total).toFixed(2)} ${moneda}</span>
      </div>

      <div class="pedido-nota__footer">
        <span class="badge bg-${badgeClass}">${p.estado}</span>
        <div class="btn-group btn-group-sm" role="group">
          ${estados.map(e => `
            <button class="btn ${p.estado === e.valor ? 'btn-accent' : 'btn-outline-accent'}" onclick="window.pedidos.cambiarEstado('${p.id}', '${e.valor}')" title="${e.titulo}">
              <i class="bi ${e.icono}"></i>
            </button>
          `).join('')}
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
    boton.classList.remove('is-checked');
    boton.querySelector('i').className = 'bi bi-square';
  } else {
    window.pedidos.seleccionados.add(id);
    boton.classList.add('is-checked');
    boton.querySelector('i').className = 'bi bi-check-square-fill';
  }
  window.pedidos.actualizarBotonEliminar();
  window.pedidos.actualizarBotonSeleccionarTodos();
};

window.pedidos.seleccionarTodos = function() {
  const totalPedidos = document.querySelectorAll('#pedidos-lista .pedido-nota').length;
  if (window.pedidos.seleccionados.size === totalPedidos && totalPedidos > 0) {
    window.pedidos.seleccionados.clear();
    document.querySelectorAll('#pedidos-lista .pedido-nota__check').forEach(btn => {
      btn.classList.remove('is-checked');
      btn.querySelector('i').className = 'bi bi-square';
    });
  } else {
    document.querySelectorAll('#pedidos-lista .pedido-nota').forEach(item => {
      const id = item.getAttribute('data-pedido-id');
      const btn = item.querySelector('.pedido-nota__check');
      window.pedidos.seleccionados.add(id);
      btn.classList.add('is-checked');
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
  const totalPedidos = document.querySelectorAll('#pedidos-lista .pedido-nota').length;
  if (totalPedidos > 0 && window.pedidos.seleccionados.size === totalPedidos) {
    btn.classList.add('btn-accent');
    icono.className = 'bi bi-check-square-fill';
    texto.textContent = 'Deseleccionar';
  } else {
    btn.classList.remove('btn-accent');
    icono.className = 'bi bi-check-square';
    texto.textContent = 'Seleccionar';
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
window.pedidos.cambiarEstado = async function(id, nuevoEstado) {
  await window.guajiroPC.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
  pedidosCargar();
};

