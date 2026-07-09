window.productos = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-box-fill"></i> Productos</h2>
      <div id="productos-lista" class="mt-3"></div>
      ${modalHTML()}
    `;
    await cargarProductos();
    await cargarCategoriasEnSelect();
    document.getElementById('btn-prod-guardar').addEventListener('click', guardar);
    document.getElementById('prod-foto').addEventListener('change', previewFoto);
  },
  abrirNuevo: async function() {
    await llenarMonedasAjustes({});
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-descripcion').value = '';
    document.getElementById('prod-categoria').value = '';
    document.getElementById('prod-extras').checked = true;
    document.getElementById('prod-foto').value = '';
    document.getElementById('preview-foto').classList.add('d-none');
    document.getElementById('prod-modal-titulo').textContent = 'Nuevo producto';
    new bootstrap.Modal(document.getElementById('productoModal')).show();
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="productoModal" tabindex="-1">
      <div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="prod-modal-titulo">Nuevo producto</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="prod-id">
          <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="prod-nombre" required></div>
          <div class="mb-3"><label class="form-label">Descripción</label><textarea class="form-control" id="prod-descripcion" rows="2"></textarea></div>
          <div class="mb-3"><label class="form-label">Categoría</label><select class="form-select" id="prod-categoria"><option value="">Sin categoría</option></select></div>
          <div class="mb-3">
            <label class="form-label">Ajustes según monedas</label>
            <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
              <table class="table table-borderless align-middle mb-0" style="min-width: 450px;">
                <thead>
                  <tr>
                    <th style="width: 110px;">Moneda</th>
                    <th style="width: 140px;">Precio</th>
                    <th style="width: 90px;">Cant. mín.</th>
                  </tr>
                </thead>
                <tbody id="monedas-ajustes-container">
                  <!-- dinámico -->
                </tbody>
              </table>
            </div>
          </div>
          <div class="mb-3"><label class="form-label">Foto</label><input type="file" class="form-control" id="prod-foto" accept="image/*"><img id="preview-foto" src="" class="mt-2 d-none" style="width:100px;height:100px;object-fit:cover;border-radius:4px;"></div>
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="prod-extras" checked><label class="form-check-label">Permitir extras</label></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-prod-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function llenarMonedasAjustes(preciosExistentes = {}) {
  const tbody = document.getElementById('monedas-ajustes-container');
  if (!tbody) return;

  const { data: monedas, error } = await window.guajiroPC.from('monedas').select('codigo').eq('activo', true).order('codigo');
  if (error || !monedas) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No hay monedas disponibles.</td></tr>';
    return;
  }

  tbody.innerHTML = monedas.map(m => {
    const datos = preciosExistentes[m.codigo] || {};
    const checked = datos.precio !== undefined ? 'checked' : '';
    const precioValor = datos.precio || '';
    const cantidadMinima = datos.min || 1;
    return `
      <tr>
        <td style="vertical-align: middle;">
          <div class="form-check">
            <input class="form-check-input moneda-check" type="checkbox" id="moneda-${m.codigo}" value="${m.codigo}" ${checked} onchange="toggleAjusteMoneda('${m.codigo}')">
            <label class="form-check-label" for="moneda-${m.codigo}">${m.codigo}</label>
          </div>
        </td>
        <td style="vertical-align: middle;">
          <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="precio-${m.codigo}" value="${precioValor}" style="width: 120px;" ${checked ? '' : 'disabled'}>
        </td>
        <td style="vertical-align: middle;">
          <input type="number" step="1" min="1" class="form-control form-control-sm" id="min-${m.codigo}" value="${cantidadMinima}" style="width: 70px;" ${checked ? '' : 'disabled'}>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleAjusteMoneda = function(codigo) {
  const checkbox = document.getElementById(`moneda-${codigo}`);
  const precioInput = document.getElementById(`precio-${codigo}`);
  const minInput = document.getElementById(`min-${codigo}`);
  const disabled = !checkbox.checked;
  precioInput.disabled = disabled;
  minInput.disabled = disabled;
  if (!checkbox.checked) {
    precioInput.value = '';
    minInput.value = '1';
  }
};

async function cargarProductos() {
  const { data } = await window.guajiroPC.from('productos').select('*, categorias(nombre)').order('nombre');
  const cont = document.getElementById('productos-lista');
  if (!data || data.length === 0) {
    cont.innerHTML = '<p class="text-muted text-center">No hay productos aún.</p>';
    return;
  }
  cont.innerHTML = data.map(p => {
    const precios = p.precios || {};
    const preciosTexto = Object.keys(precios).map(moneda => {
      const info = precios[moneda];
      if (typeof info === 'object') {
        return `${moneda}: ${info.precio} (mín. ${info.min || 1})`;
      } else {
        return `${moneda}: ${parseFloat(info).toFixed(2)}`;
      }
    }).join(' · ') || 'Sin precios';

    return `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <img src="${p.foto_url || ''}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${p.nombre}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${preciosTexto}</span>
        <span style="font-size:0.85rem;">${p.activo ? 'Visible' : 'Oculto'}</span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.productos.editar('${p.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.productos.toggle('${p.id}')"><i class="bi ${p.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.productos.eliminar('${p.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

async function cargarCategoriasEnSelect() {
  const { data } = await window.guajiroPC.from('categorias').select('id, nombre').order('nombre');
  const select = document.getElementById('prod-categoria');
  select.innerHTML = '<option value="">Sin categoría</option>';
  if (data) data.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.nombre;
    select.appendChild(o);
  });
}

function previewFoto(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('preview-foto');
  if (file) {
    const reader = new FileReader();
    reader.onload = ev => { preview.src = ev.target.result; preview.classList.remove('d-none'); };
    reader.readAsDataURL(file);
  } else { preview.classList.add('d-none'); }
}

async function guardar() {
  const id = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value.trim();
  const descripcion = document.getElementById('prod-descripcion').value.trim();
  const categoria_id = document.getElementById('prod-categoria').value || null;
  const permite_extras = document.getElementById('prod-extras').checked;
  const archivo = document.getElementById('prod-foto').files[0];

  if (!nombre) { alert('El nombre es obligatorio'); return; }

  const precios = {};
  document.querySelectorAll('.moneda-check:checked').forEach(cb => {
    const moneda = cb.value;
    const precioInput = document.getElementById(`precio-${moneda}`);
    const minInput = document.getElementById(`min-${moneda}`);
    const precio = parseFloat(precioInput.value);
    const min = parseInt(minInput.value) || 1;
    if (precioInput.value !== '' && !isNaN(precio) && precio >= 0) {
      precios[moneda] = { precio: precio, min: min };
    }
  });

  if (Object.keys(precios).length === 0) {
    alert('Debes marcar al menos una moneda con precio.');
    return;
  }

  let foto_url = null;
  if (archivo) {
    const nombreArchivo = `producto_${Date.now()}.${archivo.name.split('.').pop()}`;
    const { error: uploadError } = await window.guajiroPC.storage.from('productos').upload(nombreArchivo, archivo, { upsert: true, contentType: archivo.type });
    if (!uploadError) {
      const { data: urlData } = window.guajiroPC.storage.from('productos').getPublicUrl(nombreArchivo);
      foto_url = urlData.publicUrl;
    }
  } else if (id) {
    const { data: old } = await window.guajiroPC.from('productos').select('foto_url').eq('id', id).single();
    foto_url = old?.foto_url || null;
  }

  const datos = { nombre, descripcion, categoria_id, permite_extras, foto_url, precios };

  if (id) {
    const { error } = await window.guajiroPC.from('productos').update(datos).eq('id', id);
    if (error) { alert('Error al actualizar: ' + error.message); return; }
  } else {
    const { error } = await window.guajiroPC.from('productos').insert([{ ...datos, activo: true }]);
    if (error) { alert('Error al crear: ' + error.message); return; }
  }

  bootstrap.Modal.getInstance(document.getElementById('productoModal')).hide();
  cargarProductos();
}

window.productos.editar = async function(id) {
  const { data, error } = await window.guajiroPC.from('productos').select('*').eq('id', id).single();
  if (error || !data) return;

  document.getElementById('prod-id').value = data.id;
  document.getElementById('prod-nombre').value = data.nombre;
  document.getElementById('prod-descripcion').value = data.descripcion || '';
  document.getElementById('prod-categoria').value = data.categoria_id || '';
  document.getElementById('prod-extras').checked = data.permite_extras;

  const precios = data.precios || {};
  const preciosConvertidos = {};
  Object.keys(precios).forEach(moneda => {
    const valor = precios[moneda];
    if (typeof valor === 'object') {
      preciosConvertidos[moneda] = valor;
    } else {
      preciosConvertidos[moneda] = { precio: parseFloat(valor), min: 1 };
    }
  });

  await llenarMonedasAjustes(preciosConvertidos);

  document.getElementById('prod-foto').value = '';
  const preview = document.getElementById('preview-foto');
  if (data.foto_url) {
    preview.src = data.foto_url;
    preview.classList.remove('d-none');
  } else {
    preview.classList.add('d-none');
  }
  document.getElementById('prod-modal-titulo').textContent = 'Editar producto';
  new bootstrap.Modal(document.getElementById('productoModal')).show();
};

window.productos.toggle = async function(id) {
  const { data } = await window.guajiroPC.from('productos').select('activo').eq('id', id).single();
  if (data) await window.guajiroPC.from('productos').update({ activo: !data.activo }).eq('id', id);
  cargarProductos();
};

window.productos.eliminar = async function(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  const { error } = await window.guajiroPC.from('productos').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); return; }
  cargarProductos();
};
