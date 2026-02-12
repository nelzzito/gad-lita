// 1. CONFIGURACIÓN DE SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

// 2. OBTENER GPS (Promesa robusta con tiempo de espera)
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve("No soportado");
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    resolve(`https://www.google.com/maps?q=${lat},${lon}`);
                },
                () => resolve("No proporcionada"),
                { timeout: 8000 }
            );
        }
    });
}

// 3. FUNCIÓN PRINCIPAL DE ENVÍO (Lógica de la Versión Plus)
window.enviarReporte = async function() {
    // Captura de elementos
    const nombreInput = document.getElementById('nombre');
    const sectorInput = document.getElementById('sector');
    const detalleInput = document.getElementById('detalle');
    const btn = document.querySelector("button[onclick='enviarReporte()']");

    // Validación rigurosa
    if (!nombreInput.value.trim() || !sectorInput.value.trim() || !detalleInput.value.trim()) {
        return alert("⚠️ Por favor, llene todos los campos obligatorios.");
    }

    // Estado visual del botón
    const textoOriginal = btn.innerText;
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        const linkGps = await obtenerLinkMapa();

        const reporte = {
            nombre_ciudadano: nombreInput.value,
            sector: sectorInput.value,
            descripcion: detalleInput.value,
            ubicacion: linkGps,
            estado: 'Pendiente'
        };

        if (navigator.onLine) {
            // RUTA ONLINE
            const { error } = await supabase.from('reportes').insert([reporte]);
            if (error) throw error;
            alert("✅ Reporte enviado con éxito al GAD Lita.");
            limpiarCampos(nombreInput, sectorInput, detalleInput);
        } else {
            // RUTA OFFLINE
            guardarEnLocal(reporte);
            alert("📡 Sin conexión a internet. El reporte se guardó en este teléfono y se enviará apenas recuperes señal.");
            limpiarCampos(nombreInput, sectorInput, detalleInput);
        }
    } catch (err) {
        console.error("Error en el proceso:", err);
        alert("❌ Error: " + (err.message || "No se pudo enviar el reporte. Intente de nuevo."));
    } finally {
        // Restauración del botón (Siempre ocurre, pase lo que pase)
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};

// 4. FUNCIONES AUXILIARES
function limpiarCampos(n, s, d) {
    n.value = "";
    s.value = "";
    d.value = "";
}

function guardarEnLocal(datos) {
    let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes')) || [];
    pendientes.push(datos);
    localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
}

// 5. SINCRONIZACIÓN AUTOMÁTICA (Al recuperar internet)
window.addEventListener('online', async () => {
    let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes')) || [];
    if (pendientes.length > 0) {
        console.log("Detectada conexión. Sincronizando datos pendientes...");
        for (let reporte of pendientes) {
            await supabase.from('reportes').insert([reporte]);
        }
        localStorage.removeItem('reportes_pendientes');
        alert("✅ Conexión recuperada. Se han sincronizado los reportes que estaban pendientes.");
    }
});

// 6. ADMINISTRACIÓN (Mantenimiento de funciones actuales)
window.verificarAdmin = function() {
    const clave = prompt("Ingrese la clave administrativa:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').style.setProperty('display', 'block', 'important');
        actualizarTabla();
    }
};

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('tablaCuerpo');
    if (error || !tbody) return;

    tbody.innerHTML = "";
    data.forEach(item => {
        const fila = document.createElement('tr');
        fila.className = "border-b hover:bg-gray-50";
        fila.innerHTML = `
            <td class="p-3 text-sm">${item.nombre_ciudadano}</td>
            <td class="p-3 text-sm">${item.sector}</td>
            <td class="p-3 text-sm">${item.descripcion}</td>
            <td class="p-3 text-xs">
                <span class="px-2 py-1 rounded-full ${item.estado === 'Finalizado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${item.estado}
                </span>
            </td>
            <td class="p-3 text-center">
                <a href="${item.ubicacion}" target="_blank">📍</a>
            </td>
            <td class="p-3 text-center flex gap-2 justify-center">
                <button onclick="cambiarEstado('${item.id}', 'Finalizado')" style="color:#2563eb">Finalizar</button>
                <button onclick="eliminarReporte('${item.id}')" style="color:#dc2626">Ignorar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// 7. OTROS (Exportación y Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(e => console.error("SW Error:", e));
    });
}