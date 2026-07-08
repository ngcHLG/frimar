window.horarios = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-clock-fill"></i> Horarios</h2>
      <div id="horarios-lista" class="mt-3"></div>
      ${modalHTML()}
    `;
    await horariosCargar();
    document.getElementById('btn-hor-guardar').addEventListener('click', horarioGuardar);
  }
};

function modalHTML() {
  return `
    <div class="modal fade" id="horarioModal" tabindex="-1">
      <div class="modal-dialog modal-sm"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Editar horario</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="hor-id">
          <div class="mb-3"><label class="form-label">Día</label><input type="text" class="form-control" id="hor-dia" readonly></div>
          <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="hor-abierto"><label class="form-check-label">Forzar abierto</label></div>
          <div class="row"><div class="col"><label class="form-label">Apertura</label><input type="time" class="form-control" id="hor-apertura"></div><div class="col"><label class="form-label">Cierre</label><input type="time" class="form-control" id="hor-cierre"></div></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-accent btn-sm" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-accent btn-sm" id="btn-hor-guardar">Guardar</button>
        </div>
      </div></div>
    </div>`;
}

async function horariosCargar() {
  const { data } = await window.guajiroPC.from('horarios').select('*').order('dia_semana');
  const cont = document.getElementById('horarios-lista');
  if (!data) { cont.innerHTML = '<p class="text-muted">No hay horarios.</p>'; return; }
  cont.innerHTML = data.map(h => `
    <div class="list-item" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.8rem; display:flex; align-items:center; justify-content:space-between;">
      <div class="item-info" style="display:flex; align-items:center; gap:1rem; flex-grow:1;">
        <span class="item-name" style="font-weight:600; text-transform:uppercase;">${h.nombre_dia}</span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${h.abierto ? 'Abierto (forzado)' : (h.hora_apertura ? h.hora_apertura.slice(0,5)+' - '+h.hora_cierre.slice(0,5) : 'Cerrado')}</span>
      </div>
      <button class="btn btn-outline-accent btn-sm" onclick="window.horarios.editar('${h.id}')"><i class="bi bi-pencil"></i></button>
    </div>`).join('');
}

window.horarios.editar = async function(id) {
  const { data } = await window.guajiroPC.from('horarios').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('hor-id').value = data.id;
  document.getElementById('hor-dia').value = data.nombre_dia;
  document.getElementById('hor-abierto').checked = data.abierto;
  document.getElementById('hor-apertura').value = data.hora_apertura?.slice(0,5) || '';
  document.getElementById('hor-cierre').value = data.hora_cierre?.slice(0,5) || '';
  new bootstrap.Modal(document.getElementById('horarioModal')).show();
};

async function horarioGuardar() {
  const id = document.getElementById('hor-id').value;
  const abierto = document.getElementById('hor-abierto').checked;
  const apertura = abierto ? null : document.getElementById('hor-apertura').value;
  const cierre = abierto ? null : document.getElementById('hor-cierre').value;
  await window.guajiroPC.from('horarios').update({ abierto, hora_apertura: apertura, hora_cierre: cierre }).eq('id', id);
  bootstrap.Modal.getInstance(document.getElementById('horarioModal')).hide();
  horariosCargar();
}