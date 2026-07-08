window.combos = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-star-fill"></i> Combos</h2>
      <div id="combos-lista" class="mt-3"></div>
      ${modalHTML()}
    `;
    await combosCargar();
    await cargarProductosEnSelectCombo();
    document.getElementById('btn-combo-guardar').addEventListener('click', comboGuardar);
  },
  abrirNuevo: function() {
    document.getElementById('combo-id').value = '';
    document.getElementById('combo-nombre').value = '';
    document.getElementById('combo-tipo').value = 'porcentaje';
    document.getElementById('combo-valor').value = '';
    document.getElementById('combo-activo').checked = true;
    document.getElementById('combo-modal-titulo').textContent = 'Nuevo combo';
    cargarProductosEnSelectCombo();
    new bootstrap.Modal(document.getElementById('comboModal')).show();
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="comboModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="combo-modal-titulo">Nuevo combo</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="combo-id">
          <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="combo-nombre" required></div>
          <div class="mb-3"><label class="form-label">Tipo de descuento</label><select class="form-select" id="combo-tipo"><option value="porcentaje">Porcentaje (%)</option><option value="fijo">Precio fijo (CUP)</option></select></div>
          <div class="mb-3"><label class="form-label" id="combo-valor-label">Descuento (%)</label><input type="number" step="0.01" min="0" class="form-control" id="combo-valor" required></div>
          <div class="mb-3"><label class="form-label">Productos incluidos</label><div id="combo-productos-check" style="max-height:200px;overflow-y:auto;"></div></div>
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="combo-activo" checked><label class="form-check-label">Visible</label></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-combo-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function combosCargar() {
  const { data: combos } = await window.guajiroPC.from('combos').select('*').order('nombre');
  const container = document.getElementById('combos-lista');
  if (!combos || combos.length === 0) { container.innerHTML = '<p class="text-muted">No hay combos.</p>'; return; }
  let html = '';
  for (const c of combos) {
    const { data: items } = await window.guajiroPC.from('combo_items').select('*, productos(nombre, precio)').eq('combo_id', c.id);
    const totalOrig = (items || []).reduce((s,i) => s + parseFloat(i.productos.precio)*i.cantidad, 0);
    let final = totalOrig;
    if (c.tipo_descuento === 'porcentaje') final = totalOrig * (1 - c.valor_descuento/100);
    else if (c.tipo_descuento === 'fijo') final = parseFloat(c.valor_descuento);
    html += `<div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${c.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${c.tipo_descuento === 'porcentaje' ? '-'+c.valor_descuento+'%' : 'Fijo: '+c.valor_descuento} CUP</span>
        <span style="font-size:0.85rem;">${c.activo ? 'Visible' : 'Oculto'}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);"><s>${totalOrig.toFixed(2)}</s> → ${final.toFixed(2)} CUP</span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.editar('${c.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.toggle('${c.id}')"><i class="bi ${c.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.eliminar('${c.id}')"><i class="bi bi-trash"></i></button>
      </div></div>`;
  }
  container.innerHTML = html;
}

async function cargarProductosEnSelectCombo() {
  const { data } = await window.guajiroPC.from('productos').select('id, nombre, precio').eq('activo', true).order('nombre');
  const cont = document.getElementById('combo-productos-check');
  if (!data) { cont.innerHTML = '<p class="text-muted">No hay productos activos.</p>'; return; }
  cont.innerHTML = data.map(p => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${p.id}" id="combo-prod-${p.id}"><label class="form-check-label" for="combo-prod-${p.id}">${p.nombre} (${parseFloat(p.precio).toFixed(2)} CUP) <input type="number" class="form-control form-control-sm d-inline-block ms-2" style="width:70px;" value="1" min="1" id="combo-cant-${p.id}"></label></div>`).join('');
}

async function comboGuardar() {
  const id = document.getElementById('combo-id').value;
  const nombre = document.getElementById('combo-nombre').value.trim();
  const tipo = document.getElementById('combo-tipo').value;
  const valor = parseFloat(document.getElementById('combo-valor').value);
  const activo = document.getElementById('combo-activo').checked;
  if (!nombre || isNaN(valor)) { alert('Completa los campos'); return; }
  const checks = document.querySelectorAll('#combo-productos-check input[type="checkbox"]:checked');
  if (checks.length === 0) { alert('Selecciona al menos un producto'); return; }
  const items = Array.from(checks).map(cb => {
    const pid = cb.value;
    const cant = parseInt(document.getElementById(`combo-cant-${pid}`).value) || 1;
    return { product_id: pid, cantidad: cant };
  });
  const comboData = { nombre, tipo_descuento: tipo, valor_descuento: valor, activo };
  if (id) {
    await window.guajiroPC.from('combos').update(comboData).eq('id', id);
    await window.guajiroPC.from('combo_items').delete().eq('combo_id', id);
    await window.guajiroPC.from('combo_items').insert(items.map(i => ({ combo_id: id, ...i })));
  } else {
    const { data: nuevo } = await window.guajiroPC.from('combos').insert(comboData).select().single();
    if (nuevo) await window.guajiroPC.from('combo_items').insert(items.map(i => ({ combo_id: nuevo.id, ...i })));
  }
  bootstrap.Modal.getInstance(document.getElementById('comboModal')).hide();
  combosCargar();
}

window.combos.editar = async function(id) {
  const { data: c } = await window.guajiroPC.from('combos').select('*').eq('id', id).single();
  if (!c) return;
  document.getElementById('combo-id').value = c.id;
  document.getElementById('combo-nombre').value = c.nombre;
  document.getElementById('combo-tipo').value = c.tipo_descuento;
  document.getElementById('combo-valor').value = c.valor_descuento;
  document.getElementById('combo-activo').checked = c.activo;
  document.getElementById('combo-modal-titulo').textContent = 'Editar combo';
  await cargarProductosEnSelectCombo();
  const { data: items } = await window.guajiroPC.from('combo_items').select('product_id, cantidad').eq('combo_id', id);
  items.forEach(it => {
    const cb = document.getElementById(`combo-prod-${it.product_id}`);
    const qty = document.getElementById(`combo-cant-${it.product_id}`);
    if (cb) cb.checked = true;
    if (qty) qty.value = it.cantidad;
  });
  new bootstrap.Modal(document.getElementById('comboModal')).show();
};

window.combos.toggle = async function(id) {
  const { data } = await window.guajiroPC.from('combos').select('activo').eq('id', id).single();
  if (data) await window.guajiroPC.from('combos').update({ activo: !data.activo }).eq('id', id);
  combosCargar();
};

window.combos.eliminar = async function(id) {
  await window.guajiroPC.from('combos').delete().eq('id', id);
  combosCargar();
};