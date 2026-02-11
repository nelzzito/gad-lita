// 1. Importación directa para el navegador (CDN)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 2. Configuración de conexión (Usa tus llaves reales aquí)
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp' // Reemplázala con la llave de tu panel de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

const app = document.getElementById('app');

// 3. Función para dibujar la interfaz en la pantalla
async function cargarInterfaz() {
    app.innerHTML = `
        <div class="space-y-8">
            <h1 class="text-4xl font-extrabold text-blue-900 text-center">GAD LITA - Gobernanza Digital</h1>
            
            <div class="bg-white p-8 rounded-xl shadow-lg border-t-4 border-blue-600">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">📝 Registrar Reporte</h2>
                <form id="reporteForm" class="grid gap-5">
                    <input type="text" id="nombre" placeholder="Nombre completo" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <input type="text" id="sector" placeholder="Sector o Comunidad" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <textarea id="descripcion" rows="3" placeholder="Detalle del reporte o solicitud..." class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required></textarea>
                    <button type="submit" class="bg-blue-700 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition shadow-md">Enviar al GAD</button>
                </form>
            </div>

            <div class="bg-white p-8 rounded-xl shadow-lg">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">📊 Panel de Seguimiento</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-100 text-gray-700 uppercase text-sm">
                                <th class="p-4 border-b">Ciudadano</th>
                                <th class="p-4 border-b">Sector</th>
                                <th class="p-4 border-b">Estado</th>
                            </tr>
                        </thead>
                        <tbody id="tablaCuerpo" class="divide-y divide-gray-200">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    escucharEnvio();
    actualizarTabla();
}

// 4. Lógica para guardar datos
function escucharEnvio() {
    document.getElementById('reporteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerText = "Enviando...";

        const { error } = await supabase.from('reportes').insert([{
            nombre_ciudadano: document.getElementById('nombre').value,
            sector: document.getElementById('sector').value,
            descripcion: document.getElementById('descripcion').value,
            estado: 'Pendiente'
        }]);

        if (error) {
            alert("Error: " + error.message);
            btn.disabled = false;
        } else {
            alert("✅ Reporte enviado correctamente a la nube.");
            e.target.reset();
            btn.disabled = false;
            btn.innerText = "Enviar al GAD";
            actualizarTabla();
        }
    });
}

// 5. Lógica para leer datos en tiempo real
async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cuerpo = document.getElementById('tablaCuerpo');
    cuerpo.innerHTML = "";

    if (data) {
        data.forEach(item => {
            cuerpo.innerHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-4">${item.nombre_ciudadano}</td>
                    <td class="p-4 font-medium">${item.sector}</td>
                    <td class="p-4">
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${item.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                            ${item.estado}
                        </span>
                    </td>
                </tr>
            `;
        });
    }
}

// Iniciar sistema
cargarInterfaz();