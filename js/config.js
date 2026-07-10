// js/config.js
// Credenciales y variables globales de Guajiro

const SUPABASE_URL = 'https://xntjoyqwxqmjfdltydol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j1aIGvPLNaTTAbvlygmqzQ_-mCoDRBY';
const NTFY_TOPIC = 'guajiro_productos_congelados';

// Si ya existe un cliente de Supabase configurado en la página (por ejemplo,
// el panel de vendedor crea el suyo antes de cargar este script, con su
// propia storageKey de sesión), lo reutilizamos en vez de crear una segunda
// instancia de GoTrueClient apuntando a la misma clave de almacenamiento.
var supabaseClient = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables compartidas
let todasCategorias = [];
let todosProductos = [];
let hayCombosActivos = false;
let categoriaActiva = 'todas';
let carrito = [];
let checkoutModalInstance = null;
let horarioAbierto = true;
let recargoTransferencia = 0;
let monedaActiva = 'CUP';
let monedasDisponibles = [];
let metodoPagoActivo = 'efectivo';
let aplicaDomicilio = true;
