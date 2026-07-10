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
