// sobrescribir.js – Adapta el cliente para el vendedor

// 1. Usar la sesión del vendedor en lugar de la del cliente
supabaseClient = window.vendedorSupabase;

// 2. El punto de venta no maneja repartos/envío a domicilio, nunca.
async function cargarRepartosEnvio() {
  window._repartosData = [];
}

function actualizarVisibilidadDomicilio() {
  const container = document.getElementById('reparto-container');
  if (container) container.classList.add('d-none');
  actualizarCarrito();
}

// 3. El botón "Cobrar pedido" cobra directamente
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-checkout');
  if (btn) {
    btn.textContent = 'Cobrar pedido';
    btn.onclick = function() {
      if (carrito.length === 0) return;
      procesarCobro();
    };
  }
});

// ── Función de cobro (modificada para guardar producto_id) ──
async function procesarCobro() {
  if (!carrito.length) return;

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  let recargo = 0;
  if (metodoPagoActivo === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
  }
  const total = subtotal + recargo;

  const itemsPedido = carrito.map(item => {
    if (item.esCombo) {
      const subitems = (item.items || []).map(sub => ({
        producto_id: sub.producto_id,
        nombre: sub.nombre,
        cantidad: sub.cantidad * item.cantidad
      }));
      return {
        nombre: item.nombre,
        precio: item.precio,
        moneda: item.moneda || monedaActiva,
        cantidad: item.cantidad,
        extras: item.extras || null,
        esCombo: true,
        items: subitems
      };
    } else {
      const producto = todosProductos.find(p => p.id === item.id);
      return {
        producto_id: producto ? producto.id : null,
        nombre: item.nombre,
        precio: item.precio,
        moneda: item.moneda || monedaActiva,
        cantidad: item.cantidad,
        extras: item.extras || null,
        esCombo: false,
        items: null
      };
    }
  });

  const pedidoData = {
    nombre: 'Cliente de tienda',
    telefono: 'N/A',
    direccion: 'Tienda',
    referencia: null,
    metodo_pago: metodoPagoActivo,
    moneda: monedaActiva,
    zona: 'Venta en tienda',
    envio: 0,
    recargo: recargo,
    total,
    items: itemsPedido,
    estado: 'confirmado',
    origen: 'tienda'
  };

  const { error } = await window.vendedorSupabase.from('pedidos').insert([pedidoData]);
  if (error) {
    alert('Error al cobrar: ' + error.message);
    return;
  }

  // Cerrar el carrito
  const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('carritoOffcanvas'));
  if (offcanvas) offcanvas.hide();

  // Limpiar carrito
  carrito = [];
  actualizarCarrito();

  // Mostrar toast de éxito
  new bootstrap.Toast(document.getElementById('toastPedido')).show();
}

// Vista TODO del catálogo para el vendedor: se instala después de que
// cambiarSeccion() haya cedido el control en su primer await.
setTimeout(() => {
  if (!window.renderProductos) return;
  const renderProductosOriginal = window.renderProductos;

  const tarjetaProducto = (p) => {
    const stock = p.stock !== undefined ? p.stock : 0;
    const stockColor = stock > 5 ? 'text-success' : (stock > 0 ? 'text-warning' : 'text-danger');
    const min = obtenerCantidadMinima(p);
    return `
      <div class="producto-col">
        <div class="card card-producto h-100">
          <div class="producto-media position-relative">
            ${p.foto_url ? `<img src="${p.foto_url}" class="card-img-top" alt="${p.nombre}">` : `<div class="producto-sin-foto"><i class="bi bi-image"></i></div>`}
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
  };

  window.renderProductos = function () {
    if (categoriaActiva !== 'todas') return renderProductosOriginal();
    const container = document.getElementById('productos-container');
    if (!container) return;
    const productos = todosProductos.filter(p => obtenerPrecioNumerico(p) !== null && (p.stock || 0) > 0);
    if (!productos.length) {
      container.innerHTML = '<p class="text-muted">No existen registros en esta clasificación.</p>';
      return;
    }
    const categorias = todasCategorias.filter(cat => productos.some(p => p.categoria_id === cat.id));
    const usados = new Set();
    let html = '';
    categorias.forEach(cat => {
      const productosCategoria = productos.filter(p => p.categoria_id === cat.id);
      if (!productosCategoria.length) return;
      productosCategoria.forEach(p => usados.add(p.id));
      html += `<section class="catalogo-categoria"><h3 class="catalogo-categoria-titulo">${cat.nombre}</h3><div class="productos-categoria-scroll">${productosCategoria.map(tarjetaProducto).join('')}</div></section>`;
    });
    const sinCategoria = productos.filter(p => !usados.has(p.id));
    if (sinCategoria.length) {
      html += `<section class="catalogo-categoria"><h3 class="catalogo-categoria-titulo">Otros</h3><div class="productos-categoria-scroll">${sinCategoria.map(tarjetaProducto).join('')}</div></section>`;
    }
    container.className = 'catalogo-categorias';
    container.innerHTML = html;
  };
}, 0);
