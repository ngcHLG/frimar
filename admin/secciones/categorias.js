window.categorias = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-tags-fill"></i> Categorías</h2>
      <div id="categorias-lista" class="mt-3"></div>
      ${modalHTML()}
    `;
    await cargarCategorias();
    document.getElementById('btn-cat-guardar').addEventListener('click', guardar);
  },
  abrirNuevo: function() {
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-nombre').value = '';
    document.getElementById('cat-modal-titulo').textContent = 'Nueva categoría';
    new bootstrap.Modal(document.getElementById('categoriaModal')).show();
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="categoriaModal" tabindex="-1">
      <div class="modal-dialog modal-sm"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="cat-modal-titulo">Nueva categoría</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="cat-id">
          <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="cat-nombre" required></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-cat-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function cargarCategorias() {
  const { data, error } = await window.guajiroPC.from('categorias').select('*').order('nombre');
  const container = document.getElementById('categorias-lista');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay categorías aún.</p>';
    return;
  }
  container.innerHTML = data.map(cat => `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${cat.nombre}</span>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-accent btn-sm" onclick="window.categorias.editar('${cat.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-accent btn-sm" onclick="window.categorias.eliminar('${cat.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');
}

async function guardar() {
  const id = document.getElementById('cat-id').value;
  const nombre = document.getElementById('cat-nombre').value.trim();
  if (!nombre) { alert('Nombre requerido'); return; }
  if (id) {
    await window.guajiroPC.from('categorias').update({ nombre }).eq('id', id);
  } else {
    await window.guajiroPC.from('categorias').insert([{ nombre }]);
  }
  bootstrap.Modal.getInstance(document.getElementById('categoriaModal')).hide();
  cargarCategorias();
}

window.categorias.editar = async function(id) {
  const { data, error } = await window.guajiroPC.from('categorias').select('*').eq('id', id).single();
  if (error || !data) return;
  document.getElementById('cat-id').value = data.id;
  document.getElementById('cat-nombre').value = data.nombre;
  document.getElementById('cat-modal-titulo').textContent = 'Editar categoría';
  new bootstrap.Modal(document.getElementById('categoriaModal')).show();
};

window.categorias.eliminar = async function(id) {
  await window.guajiroPC.from('categorias').delete().eq('id', id);
  cargarCategorias();
};