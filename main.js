import { createClient } from '@supabase/supabase-js'

// Usamos las llaves que ya tienes en tu .env (reemplázalas aquí para la web)
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co' 
const supabaseKey = 'sb_publishable_wgDPu5049WPdWsm_xE_jmA_hJ4Po...' // Tu llave anon
const supabase = createClient(supabaseUrl, supabaseKey)

const app = document.getElementById('app');

// --- FUNCIÓN PARA RENDERIZAR TODO ---
async function cargarInterfaz() {
    app.innerHTML = `
        <h1 class="text-3xl font-bold text-blue-800 mb-8 text-center">Sistema de Gestión - GAD LITA</h1>
        
        <div class="bg-white p-6 rounded-lg shadow-md mb-10">
            <h2 class="text-xl font-semibold mb-4">Enviar Nuevo Reporte Ciudadano</h2>
            <form id="reporteForm" class="grid grid-cols-1 gap-4">
                <input type="text" id="nombre" placeholder="Tu nombre" class="border p-2 rounded" required>
                <input type="text" id="sector" placeholder="Sector (Ej: Lita Centro)" class="border p-2 rounded" required>
                <textarea id="descripcion" placeholder="Describe el problema" class="border p-2 rounded" required></textarea>
                <button type="submit" class="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Enviar Reporte</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">Panel de Control (Administración)</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-200">
                            <th class="p-2 border">Ciudadano</th>
                            <th class="p-2 border">Sector</th>
                            <th class="p-2 border">Estado</th>
                            <th class="p-2 border">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="tablaCuerpo"></tbody>
                </table>
            </div>
        </div>
    `;

    escucharFormulario();
    obtenerReportes();
}

// --- LÓGICA DE ENVÍO ---
function escucharFormulario() {
    document.getElementById('reporteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const descripcion = document.getElementById('descripcion').value;
        const sector = document.getElementById('sector').value;

        const { error } = await supabase.from('reportes').insert([{ nombre_ciudadano: nombre, descripcion, sector, estado: 'Pendiente' }]);

        if (error) alert("Error: " + error.message);
        else {
            alert("¡Reporte enviado con éxito!");
            document.getElementById('reporteForm').reset();
            obtenerReportes(); // Recargar tabla
        }
    });
}

// --- LÓGICA DE LECTURA (ADMIN) ---
async function obtenerReportes() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cuerpo = document.getElementById('tablaCuerpo');
    cuerpo.innerHTML = "";

    data.forEach(reg => {
        cuerpo.innerHTML += `
            <tr>
                <td class="p-2 border">${reg.nombre_ciudadano}</td>
                <td class="p-2 border">${reg.sector}</td>
                <td class="p-2 border">
                    <span class="px-2 py-1 rounded ${reg.estado === 'Pendiente' ? 'bg-yellow-200' : 'bg-green-200'}">${reg.estado}</span>
                </td>
                <td class="p-2 border">
                    <button class="text-blue-500 underline" onclick="alert('Funcionalidad de edición en desarrollo')">Gestionar</button>
                </td>
            </tr>
        `;
    });
}

cargarInterfaz();