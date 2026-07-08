window.zonas = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-truck"></i> Repartos</h2>
      <div id="zonas-lista" class="mt-3"></div>
      ${modalHTML()}
    `;
    await zonasCargar();
    document.getElementById('btn-zona-guardar').addEventListener('click', zonaGuardar);
  },
  abrirNuevo: function() {
    document.getElementById('zona-id').value = '';
    document.getElementById('zona-nombre').value = '';
    document.getElementById('zona-distancia').value = '';
    document.getElementById('zona-precio').value = '';
    document.getElementById('zona-activo').checked = true;
    new bootstrap.Modal(document.getElementById('zonaModal')).show();
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="zonaModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Nuevo reparto</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="zona-id">
          <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="zona-nombre" required></div>
          <div class="mb-3"><label class="form-label">Distancia</label><input type="text" class="form-control" id="zona-distancia" placeholder="Ej: 0–2 km" required></div>
          <div class="mb-3"><label class="form-label">Precio (CUP)</label><input type="number" step="0.01" min="0" class="form-control" id="zona-precio" required></div>
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="zona-activo" checked><label class="form-check-label">Activo</label></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-zona-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function zonasCargar() {
  const { data } = await window.guajiroPC.from('repartos').select('*').order('nombre');
  const cont = document.getElementById('zonas-lista');
  if (!data || data.length === 0) { cont.innerHTML = '<p class="text-muted">No hay repartos.</p>'; return; }
  cont.innerHTML = data.map(r => `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${r.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${r.distancia} · +${parseFloat(r.precio).toFixed(2)} CUP</span>
        <span style="font-size:0.85rem;">${r.activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.zonas.editar('${r.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.zonas.toggle('${r.id}')"><i class="bi ${r.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.zonas.eliminar('${r.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');
}

window.zonas.editar = async function(id) {
  const { data } = await window.guajiroPC.from('repartos').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('zona-id').value = data.id;
  document.getElementById('zona-nombre').value = data.nombre;
  document.getElementById('zona-distancia').value = data.distancia;
  document.getElementById('zona-precio').value = data.precio;
  document.getElementById('zona-activo').checked = data.activo;
  new bootstrap.Modal(document.getElementById('zonaModal')).show();
};

async function zonaGuardar() {
  const id = document.getElementById('zona-id').value;
  const nombre = document.getElementById('zona-nombre').value.trim();
  const distancia = document.getElementById('zona-distancia').value.trim();
  const precio = parseFloat(document.getElementById('zona-precio').value);
  const activo = document.getElementById('zona-activo').checked;
  if (!nombre || !distancia || isNaN(precio)) { alert('Completa todos los campos'); return; }
  if (id) {
    await window.guajiroPC.from('repartos').update({ nombre, distancia, precio, activo }).eq('id', id);
  } else {
    await window.guajiroPC.from('repartos').insert([{ nombre, distancia, precio, activo }]);
  }
  bootstrap.Modal.getInstance(document.getElementById('zonaModal')).hide();
  zonasCargar();
}

window.zonas.toggle = async function(id) {
  const { data } = await window.guajiroPC.from('repartos').select('activo').eq('id', id).single();
  if (data) await window.guajiroPC.from('repartos').update({ activo: !data.activo }).eq('id', id);
  zonasCargar();
};

window.zonas.eliminar = async function(id) {
  await window.guajiroPC.from('repartos').delete().eq('id', id);
  zonasCargar();
};