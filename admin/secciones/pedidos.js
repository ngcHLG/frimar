// secciones/pedidos.js
window.pedidos = {
  init: async function(container) {
    container.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <h2 class="m-0" style="color: var(--text-main);"><i class="bi bi-receipt"></i> Pedidos</h2>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button class="btn btn-outline-accent btn-sm text-nowrap" id="btn-seleccionar-todos" onclick="window.pedidos.seleccionarTodos()">
            <i class="bi bi-check-square"></i> <span id="texto-seleccionar-todos">Seleccionar todos</span>
          </button>
          <button id="btn-eliminar-seleccionados" class="btn btn-danger btn-sm text-nowrap d-none shadow-sm" onclick="window.pedidos.eliminarSeleccionados()">
            <i class="bi bi-trash"></i> Eliminar (<span id="cantidad-seleccionados">0</span>)
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
    <div class="card list-item shadow-sm border-0" style="background: var(--bg-surface);">
      <div class="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-sm btn-select-pedido ${

