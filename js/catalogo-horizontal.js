// Catálogo TODO: cada categoría se presenta como una fila desplazable horizontalmente.
(function () {
  const renderProductosOriginal = window.renderProductos;

  function tarjetaProducto(p) {
    const stock = p.stock !== undefined ? p.stock : 0;
    const stockColor = stock > 5 ? 'text-success' : (stock > 0 ? 'text-warning' : 'text-danger');
    const min = obtenerCantidadMinima(p);
    return `
      <div class="producto-col">
        <div class="card card-producto h-100">
          <div class="producto-media position-relative">
            ${p.foto_url
              ? `<img src="${p.foto_url}" class="card-img-top" alt="${p.nombre}">`
              : `<div class="producto-sin-foto"><i class="bi bi-image"></i></div>`
            }
          </div>
          <div class="card-body d-flex flex-column">
            <h6 class="card-title mb-1">${p.nombre}</h6>
            <p class="card-text small text-muted flex-grow-1">${p.descripcion || ''}</p>
            <div class="precio-text mb-2">${obtenerPrecioProducto(p)}</div>
            <div class="d-flex gap-2 align-items-center">
              <div class="d-flex align-items-center gap-1">
                <input type="number" id="qty-${p.id}" class="form-control qty-input" style="width: 70px;" min="${min}" value="${min}" ${!horarioAbierto ? 'disabled' : ''}>
                <span class="small ${stockColor}">/ ${stock}</span>
              </div>
              <button class="btn btn-accent flex-grow-1" onclick="agregarAlCarrito('${p.id}')" ${!horarioAbierto ? 'disabled' : ''}>Añadir</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  window.renderProductos = function () {
    if (categoriaActiva !== 'todas') {
      return renderProductosOriginal();
    }

    const container = document.getElementById('productos-container');
    if (!container) return;

    const productos = todosProductos
      .filter(p => obtenerPrecioNumerico(p) !== null && (p.stock || 0) > 0);

    if (productos.length === 0) {
      container.innerHTML = '<p class="text-muted">No existen registros en esta clasificación.</p>';
      return;
    }

    const categorias = todasCategorias.filter(cat =>
      productos.some(p => p.categoria_id === cat.id)
    );

    const usados = new Set();
    let html = '';

    categorias.forEach(cat => {
      const productosCategoria = productos.filter(p => p.categoria_id === cat.id);
      if (!productosCategoria.length) return;
      productosCategoria.forEach(p => usados.add(p.id));
      html += `
        <section class="catalogo-categoria">
          <h3 class="catalogo-categoria-titulo">${cat.nombre}</h3>
          <div class="productos-categoria-scroll">
            ${productosCategoria.map(tarjetaProducto).join('')}
          </div>
        </section>`;
    });

    const sinCategoria = productos.filter(p => !usados.has(p.id));
    if (sinCategoria.length) {
      html += `
        <section class="catalogo-categoria">
          <h3 class="catalogo-categoria-titulo">Otros</h3>
          <div class="productos-categoria-scroll">
            ${sinCategoria.map(tarjetaProducto).join('')}
          </div>
        </section>`;
    }

    container.className = 'catalogo-categorias';
    container.innerHTML = html;
  };
})();
