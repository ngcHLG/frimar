window.config = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-gear-fill"></i> Ajustes</h2>
      <div class="mt-3">
        <h5 style="color: var(--text-main);"><i class="bi bi-currency-exchange"></i> Monedas y recargos</h5>
        <div id="monedas-lista"></div>
        ${modalHTML()}
      </div>
    `;
    await cargarMonedas();
    document.getElementById('btn-moneda-guardar').addEventListener('click', guardarMoneda);
  },
  abrirNuevo: function() {
    document.getElementById('moneda-id').value = '';
    document.getElementById('moneda-codigo').value = '';
    document.getElementById('moneda-nombre').value = '';
    document.getElementById('mp-efectivo').checked = false;
    document.getElementById('mp-transferencia').checked = false;
    document.getElementById('moneda-recargo').value = 0;
    document.getElementById('moneda-modal-titulo').textContent = 'Nueva moneda';
    new bootstrap.Modal(document.getElementById('monedaModal')).show();
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="monedaModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="moneda-modal-titulo">Nueva moneda</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="moneda-id">
          <div class="mb-3"><label class="form-label">Código</label><input type="text" class="form-control" id="moneda-codigo" placeholder="CUP, USD..." required></div>
          <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="moneda-nombre" placeholder="Peso Cubano" required></div>
          <div class="mb-3">
            <label class="form-label">Métodos de pago</label>
            <div class="form-check"><input class="form-check-input" type="checkbox" value="efectivo" id="mp-efectivo"><label class="form-check-label" for="mp-efectivo">Efectivo</label></div>
            <div class="form-check"><input class="form-check-input" type="checkbox" value="transferencia" id="mp-transferencia"><label class="form-check-label" for="mp-transferencia">Transferencia</label></div>
          </div>
          <div class="mb-3">
            <label class="form-label">Recargo por transferencia (%)</label>
            <input type="number" step="0.01" min="0" class="form-control" id="moneda-recargo" value="0">
            <small class="text-muted">Se aplica al subtotal cuando el pago es por transferencia en esta moneda.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-moneda-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function cargarMonedas() {
  const { data, error } = await window.guajiroPC.from('monedas').select('*').order('codigo');
  const container = document.getElementById('monedas-lista');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay monedas definidas. Usa el botón flotante para agregar.</p>';
    return;
  }
  container.innerHTML = data.map(m => `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${m.codigo} — ${m.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">
          Métodos: ${(m.metodos_pago || []).join(', ') || 'Ninguno'}
          ${(m.metodos_pago || []).includes('transferencia') ? ` | Recargo: ${parseFloat(m.recargo_transferencia || 0)}%` : ''}
        </span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.config.editarMoneda('${m.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.config.eliminarMoneda('${m.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');
}

window.config.editarMoneda = async function(id) {
  const { data, error } = await window.guajiroPC.from('monedas').select('*').eq('id', id).single();
  if (error || !data) return;
  document.getElementById('moneda-id').value = data.id;
  document.getElementById('moneda-codigo').value = data.codigo;
  document.getElementById('moneda-nombre').value = data.nombre;
  document.getElementById('mp-efectivo').checked = (data.metodos_pago || []).includes('efectivo');
  document.getElementById('mp-transferencia').checked = (data.metodos_pago || []).includes('transferencia');
  document.getElementById('moneda-recargo').value = data.recargo_transferencia || 0;
  document.getElementById('moneda-modal-titulo').textContent = 'Editar moneda';
  new bootstrap.Modal(document.getElementById('monedaModal')).show();
};

window.config.eliminarMoneda = async function(id) {
  if (!confirm('¿Eliminar esta moneda?')) return;
  const { error } = await window.guajiroPC.from('monedas').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  cargarMonedas();
};

async function guardarMoneda() {
  const id = document.getElementById('moneda-id').value;
  const codigo = document.getElementById('moneda-codigo').value.trim().toUpperCase();
  const nombre = document.getElementById('moneda-nombre').value.trim();
  const metodos_pago = [];
  if (document.getElementById('mp-efectivo').checked) metodos_pago.push('efectivo');
  if (document.getElementById('mp-transferencia').checked) metodos_pago.push('transferencia');
  const recargo = parseFloat(document.getElementById('moneda-recargo').value) || 0;

  if (!codigo || !nombre) { alert('Código y nombre son obligatorios'); return; }

  const datos = { codigo, nombre, metodos_pago, recargo_transferencia: recargo };

  if (id) {
    const { error } = await window.guajiroPC.from('monedas').update(datos).eq('id', id);
    if (error) { alert('Error al actualizar: ' + error.message); return; }
  } else {
    const { error } = await window.guajiroPC.from('monedas').insert([datos]);
    if (error) { alert('Error al crear: ' + error.message); return; }
  }

  bootstrap.Modal.getInstance(document.getElementById('monedaModal')).hide();
  cargarMonedas();
    }
