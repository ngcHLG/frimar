window.config = {
  init: async function(container) {
    container.innerHTML = `
      <h2 style="color: var(--text-main);"><i class="bi bi-gear-fill"></i> Ajustes</h2>
      <div class="row mt-3"><div class="col-md-6">
        <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:1.5rem;">
          <h5>Recargo por transferencia</h5>
          <div class="mb-3"><label class="form-label">Porcentaje (%)</label><input type="number" step="0.01" min="0" class="form-control" id="cfg-recargo"></div>
          <button class="btn btn-accent" id="btn-cfg-guardar">Guardar</button>
        </div>
      </div></div>
    `;
    const { data } = await window.guajiroPC.from('configuracion').select('recargo_transferencia').single();
    if (data) document.getElementById('cfg-recargo').value = data.recargo_transferencia;
    document.getElementById('btn-cfg-guardar').addEventListener('click', async () => {
      const val = parseFloat(document.getElementById('cfg-recargo').value) || 0;
      await window.guajiroPC.from('configuracion').update({ recargo_transferencia: val }).eq('id', 1);
      alert('Configuración guardada');
    });
  }
};