// pedidos.js - Lista de pedidos para el vendedor (sin eliminar, con cambio de estado)
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
      </div>
      <div id="pedidos-lista" class="mt-3"></div>
    `;
    await pedidosCargar();
  }
};

async function pedidosCargar() {
  const { data } = await window.vendedorSupabase.from('pedidos').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('pedidos-lista');
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

    return `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem;">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${p.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${new Date(p.created_at).toLocaleString()}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-secondary);"><i class="bi bi-telephone"></i> ${p.telefono} · <i class="bi bi-geo-alt"></i> ${p.direccion}</div>
      <div style="font-size:0.85rem; color:var(--text-secondary);">
        <i class="bi bi-truck"></i> ${p.zona} · 
        <i class="bi bi-cash"></i> ${p.metodo_pago} · 
        <i class="bi bi-currency-exchange"></i> ${moneda} · 
        <strong>${parseFloat(p.total).toFixed(2)} ${moneda}</strong>
      </div>
      <div class="mt-2">${items.map(i => `<span class="badge bg-secondary me-1">${i.cantidad}x ${i.nombre}</span>`).join('')}</div>
      <div class="mt-2 d-flex align-items-center gap-2 flex-wrap">
        <span class="badge bg-${badgeClass}">${p.estado}</span>
        <button class="btn btn-sm btn-outline-accent" onclick="cambiarEstado('${p.id}', 'pendiente')" title="Pendiente"><i class="bi bi-hourglass-split"></i></button>
        <button class="btn btn-sm btn-outline-accent" onclick="cambiarEstado('${p.id}', 'confirmado')" title="Confirmado"><i class="bi bi-check-circle"></i></button>
        <button class="btn btn-sm btn-outline-accent" onclick="cambiarEstado('${p.id}', 'entregado')" title="Entregado"><i class="bi bi-box-seam"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="cambiarEstado('${p.id}', 'cancelado')" title="Cancelado"><i class="bi bi-x-circle"></i></button>
      </div>
    </div>`;
  }).join('');
}

async function cambiarEstado(id, nuevoEstado) {
  await window.vendedorSupabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
  pedidosCargar();
}
