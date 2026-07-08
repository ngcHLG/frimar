window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
      <div id="pedidos-lista" class="mt-3"></div>
    `;
    await pedidosCargar();
    this.interval = setInterval(pedidosCargar, 30000);
  },
  destroy: function() {
    if (this.interval) clearInterval(this.interval);
  }
};

async function pedidosCargar() {
  const { data } = await window.guajiroPC.from('pedidos').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
  if (!data || data.length === 0) { cont.innerHTML = '<p class="text-muted">No hay pedidos aún.</p>'; return; }
  cont.innerHTML = data.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    return `<div class="list-item flex-column align-items-start" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem;">
      <div class="d-flex justify-content-between w-100 mb-2">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${p.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${new Date(p.created_at).toLocaleString()}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-secondary);"><i class="bi bi-telephone"></i> ${p.telefono} · <i class="bi bi-geo-alt"></i> ${p.direccion}</div>
      <div style="font-size:0.85rem; color:var(--text-secondary);">${p.zona} · ${p.metodo_pago} · <strong>${parseFloat(p.total).toFixed(2)} CUP</strong></div>
      <div class="mt-2">${items.map(i => `<span class="badge bg-secondary me-1">${i.cantidad}x ${i.nombre}</span>`).join('')}</div>
      <div class="mt-2"><span class="badge bg-${p.estado === 'pendiente' ? 'warning' : p.estado === 'confirmado' ? 'info' : p.estado === 'preparado' ? 'primary' : 'success'}">${p.estado}</span>
      ${p.estado !== 'entregado' ? `<button class="btn btn-sm btn-outline-accent ms-2" onclick="window.pedidos.avanzar('${p.id}', '${p.estado}')"><i class="bi bi-arrow-right-circle"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');
}

window.pedidos.avanzar = async function(id, estado) {
  const siguiente = { 'pendiente': 'confirmado', 'confirmado': 'preparado', 'preparado': 'entregado' };
  if (siguiente[estado]) {
    await window.guajiroPC.from('pedidos').update({ estado: siguiente[estado] }).eq('id', id);
    pedidosCargar();
  }
};