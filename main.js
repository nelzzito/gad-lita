// FUNCIÓN PARA OBTENER EL ENLACE DE GOOGLE MAPS (REPLICABLE)
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve("No soportado");
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`),
                () => resolve("No proporcionada"),
                { timeout: 5000 }
            );
        }
    });
}
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
        btn.innerText = "Obteniendo ubicación...";

        // Intentar obtener geolocalización
        const mapa = await obtenerLinkMapa(); // Llama a la función del GPS
btn.innerText = "Enviando al GAD...";
        let linkMapa = "No proporcionada";
        
        try {
            const posicion = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            const { latitude, longitude } = posicion.coords;
            linkMapa = `https://www.google.com/maps?q=${latitude},${longitude}`;
        } catch (error) {
            console.warn("No se pudo obtener la ubicación:", error.message);
            // El reporte se envía aunque no haya GPS, para no bloquear al ciudadano
        }

        btn.innerText = "Enviando al GAD...";

        const { error } = await supabase.from('reportes').insert([{
            nombre_ciudadano: document.getElementById('nombre').value,
            sector: document.getElementById('sector').value,
            descripcion: document.getElementById('descripcion').value,
            ubicacion: linkMapa, // ¡Aquí guardamos el mapa!
            estado: 'Pendiente'
        }]);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("✅ Reporte y ubicación enviados con éxito.");
            e.target.reset();
            actualizarTabla();
        }
        btn.disabled = false;
        btn.innerText = "Enviar al GAD";
    });
}

// 5. Lógica para leer datos en tiempo real
async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cuerpo = document.getElementById('tablaCuerpo');
    cuerpo.innerHTML = "";

    if (data) {
        data.forEach(item => {
            // Lógica para colores según el estado
            const colorEstado = item.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                               item.estado === 'En Proceso' ? 'bg-blue-100 text-blue-800' : 
                               'bg-green-100 text-green-800';

            cuerpo.innerHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-4">${item.nombre_ciudadano}</td>
                    <td class="p-4 font-medium">${item.sector}</td>
                    <td class="p-4">
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${colorEstado}">
                            ${item.estado}
                        </span>
                    </td>
                    <td class="p-4 space-x-2">
                       <button onclick="cambiarEstado('${item.id}', 'En Proceso')" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Atender</button>
<button onclick="cambiarEstado('${item.id}', 'Resuelto')" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Finalizar</button>
${item.ubicacion && item.ubicacion !== "No proporcionada" ? 
    `<a href="${item.ubicacion}" target="_blank" class="inline-block bg-gray-100 p-1 rounded hover:bg-gray-200" title="Ver en Google Maps">📍</a>` : ''}
                    </td>
                </tr>
            `;
        });
    }
}

// Iniciar sistema
cargarInterfaz();
// Función para cambiar el estado de un reporte (Mejora 3)
async function resolverReporte(id) {
    const { error } = await supabase
        .from('reportes')
        .update({ estado: 'Resuelto' })
        .eq('id', id);

    if (!error) actualizarTabla();
}
// Función global para que los botones de la tabla puedan llamarla
window.cambiarEstado = async function(id, nuevoEstado) {
    const { error } = await supabase
        .from('reportes')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert("Error al actualizar: " + error.message);
    } else {
        actualizarTabla(); // Recarga la tabla automáticamente para ver el cambio
    }
}
// FUNCIÓN PARA GESTIONAR ESTADOS DESDE LA WEB (REPLICABLE)
window.cambiarEstado = async function(id, nuevoEstado) {
    const { error } = await supabase
        .from('reportes')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert("Error al actualizar. Verifica que la política RLS sea 'ALL'.");
    } else {
        actualizarTabla(); // Esto refresca la lista automáticamente
    }
}