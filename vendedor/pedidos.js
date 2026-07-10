// pedidos.js – Vendedor
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
      </div>
      <div id="pedidos-lista" class="mt-3"></div>
    `;
    pedidoNotaStyleTag();
    await pedidosCargar();
    this.interval = setInterval(pedidosCargar, 30000);
  },
  destroy: function() {
    if (this.interval) clearInterval(this.interval);
  }
};

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
  const { data } = await window.vendedorSupabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
  if (!cont) return;
  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="text-muted text-start">No hay pedidos aún.</p>';
    return;
  }

  cont.innerHTML = data.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
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
        <strong style="text-transform:uppercase;"><i class="bi bi-person"></i> ${p.nombre}</strong>
        <span class="pedido-nota__fecha">${new Date(p.created_at).toLocaleString()}</span>
      </div>

      <span class="pedido-nota__linea"><i class="bi bi-telephone"></i> ${p.telefono}</span>
      <span class="pedido-nota__linea"><i class="bi bi-geo-alt"></i> ${p.direccion}</span>
      ${p.referencia ? `<span class="pedido-nota__linea"><i class="bi bi-signpost"></i> Ref: ${p.referencia}</span>` : ''}
      <span class="pedido-nota__linea"><i class="bi bi-truck"></i> Reparto: ${p.zona}</span>
      <span class="pedido-nota__linea"><i class="bi bi-cash"></i> Pago: ${p.metodo_pago} (${moneda})</span>

      <div class="pedido-nota__items">
        ${items.map(i => `<div class="pedido-nota__item-row"><span>${i.cantidad}x ${i.nombre}</span><span>${(i.precio * i.cantidad).toFixed(2)}</span></div>`).join('')}
        ${envio > 0 ? `
          <div class="pedido-nota__desglose"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${moneda}</span></div>
          <div class="pedido-nota__desglose"><span>Envío</span><span>${envio.toFixed(2)} CUP</span></div>
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
            <button class="btn ${p.estado === e.valor ? 'btn-accent' : 'btn-outline-accent'}" onclick="cambiarEstado('${p.id}', '${e.valor}')" title="${e.titulo}">
              <i class="bi ${e.icono}"></i>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function cambiarEstado(id, nuevoEstado) {
  await window.vendedorSupabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
  pedidosCargar();
}
