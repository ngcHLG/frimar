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
  abrirNuevo: async function() {
    document.getElementById('combo-id').value = '';
    document.getElementById('combo-nombre').value = '';
    document.getElementById('combo-tipo').value = 'porcentaje';
    document.getElementById('combo-activo').checked = true;
    document.getElementById('combo-modal-titulo').textContent = 'Nuevo combo';

    // Limpiar monedas y cargar productos
    await llenarMonedasFijo({});
    await cargarProductosEnSelectCombo();

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
          <div class="mb-3"><label class="form-label">Tipo de descuento</label><select class="form-select" id="combo-tipo"><option value="porcentaje">Porcentaje (%)</option><option value="fijo">Precio fijo</option></select></div>
          <div class="mb-3">
            <label class="form-label">Monedas y descuento</label>
            <div id="monedas-fijo-container">
              <!-- Se llena dinámicamente con monedas -->
            </div>
          </div>
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

async function llenarMonedasFijo(preciosExistentes = {}) {
  const container = document.getElementById('monedas-fijo-container');
  if (!container) return;
  const { data: monedas } = await window.guajiroPC.from('monedas').select('codigo').eq('activo', true).order('codigo');
  if (!monedas || monedas.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay monedas definidas.</p>';
    return;
  }
  const montos = preciosExistentes.montos || {};
  container.innerHTML = monedas.map(m => {
    const checked = montos.hasOwnProperty(m.codigo) ? 'checked' : '';
    const valor = montos[m.codigo] !== undefined ? montos[m.codigo] : '';
    return `
      <div class="form-check form-check-inline mb-2">
        <input class="form-check-input moneda-fija-check" type="checkbox" id="moneda-fija-${m.codigo}" value="${m.codigo}" ${checked} onchange="togglePrecioFijo('${m.codigo}')">
        <label class="form-check-label" for="moneda-fija-${m.codigo}">${m.codigo}</label>
        <input type="number" step="0.01" min="0" class="form-control form-control-sm d-inline-block ms-2 moneda-fija-precio" id="precio-fijo-${m.codigo}" value="${valor}" style="width: 100px;" ${checked ? '' : 'disabled'}>
      </div>`;
  }).join('');
}

window.togglePrecioFijo = function(codigo) {
  const checkbox = document.getElementById(`moneda-fija-${codigo}`);
  const precioInput = document.getElementById(`precio-fijo-${codigo}`);
  if (checkbox && precioInput) {
    precioInput.disabled = !checkbox.checked;
    if (!checkbox.checked) precioInput.value = '';
  }
};

async function cargarProductosEnSelectCombo() {
  const { data } = await window.guajiroPC.from('productos').select('id, nombre, precios').eq('activo', true).order('nombre');
  const cont = document.getElementById('combo-productos-check');
  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="text-muted">No hay productos activos.</p>';
    return;
  }
  cont.innerHTML = data.map(p => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${p.id}" id="combo-prod-${p.id}"><label class="form-check-label" for="combo-prod-${p.id}">${p.nombre} <input type="number" class="form-control form-control-sm d-inline-block ms-2" style="width:70px;" value="1" min="1" id="combo-cant-${p.id}"></label></div>`).join('');
}

async function combosCargar() {
  const { data: combos } = await window.guajiroPC.from('combos').select('*').order('nombre');
  const container = document.getElementById('combos-lista');
  if (!combos || combos.length === 0) { container.innerHTML = '<p class="text-muted">No hay combos.</p>'; return; }
  let html = '';
  for (const c of combos) {
    const precios = c.precios || {};
    let descuentoTexto = '';
    if (precios.tipo === 'porcentaje') {
      const montos = precios.montos || {};
      descuentoTexto = Object.keys(montos).map(mon => `${mon}: -${montos[mon]}%`).join(', ');
    } else if (precios.tipo === 'fijo') {
      const montos = precios.montos || {};
      descuentoTexto = Object.keys(montos).map(mon => `${mon}: ${montos[mon]}`).join(', ');
    } else {
      if (c.tipo_descuento === 'porcentaje') descuentoTexto = `-${c.valor_descuento}%`;
      else descuentoTexto = `Fijo: ${c.valor_descuento}`;
    }

    const { data: items } = await window.guajiroPC.from('combo_items').select('*, productos(nombre)').eq('combo_id', c.id);
    const productosTexto = (items || []).map(i => `${i.cantidad}x ${i.productos.nombre}`).join(', ');

    html += `<div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${c.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${descuentoTexto}</span>
        <span style="font-size:0.85rem;">${c.activo ? 'Visible' : 'Oculto'}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${productosTexto}</span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.editar('${c.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.toggle('${c.id}')"><i class="bi ${c.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.combos.eliminar('${c.id}')"><i class="bi bi-trash"></i></button>
      </div></div>`;
  }
  container.innerHTML = html;
}

async function comboGuardar() {
  const id = document.getElementById('combo-id').value;
  const nombre = document.getElementById('combo-nombre').value.trim();
  const tipo = document.getElementById('combo-tipo').value;
  const activo = document.getElementById('combo-activo').checked;
  if (!nombre) { alert('El nombre es obligatorio'); return; }

  const montos = {};
  document.querySelectorAll('.moneda-fija-check:checked').forEach(cb => {
    const moneda = cb.value;
    const input = document.getElementById(`precio-fijo-${moneda}`);
    if (input && input.value && parseFloat(input.value) >= 0) {
      montos[moneda] = parseFloat(input.value);
    }
  });
  if (Object.keys(montos).length === 0) { alert('Selecciona al menos una moneda con un valor.'); return; }

  const precios = { tipo: tipo, montos: montos };

  const checks = document.querySelectorAll('#combo-productos-check input[type="checkbox"]:checked');
  if (checks.length === 0) { alert('Selecciona al menos un producto'); return; }
  const items = Array.from(checks).map(cb => {
    const pid = cb.value;
    const cant = parseInt(document.getElementById(`combo-cant-${pid}`).value) || 1;
    return { product_id: pid, cantidad: cant };
  });

  const comboData = {
    nombre,
    tipo_descuento: tipo,
    valor_descuento: tipo === 'porcentaje' ? (montos[Object.keys(montos)[0]] || 0) : 0,
    precios: precios,
    activo
  };

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
  document.getElementById('combo-activo').checked = c.activo;
  document.getElementById('combo-modal-titulo').textContent = 'Editar combo';

  await cargarProductosEnSelectCombo();
  await llenarMonedasFijo(c.precios || {});

  const { data: items } = await window.guajiroPC.from('combo_items').select('product_id, cantidad').eq('combo_id', id);
  if (items) {
    items.forEach(it => {
      const cb = document.getElementById(`combo-prod-${it.product_id}`);
      const qty = document.getElementById(`combo-cant-${it.product_id}`);
      if (cb) cb.checked = true;
      if (qty) qty.value = it.cantidad;
    });
  }

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
