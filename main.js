import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

// 1. FUNCIÓN GPS (Corregida sintaxis)
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

// 2. FUNCIÓN DE ENVÍO (Mapeo exacto de tu base de datos)
window.enviarReporte = async function() {
    const nombreVal = document.getElementById('nombre').value;
    const sectorVal = document.getElementById('sector').value;
    const detalleVal = document.getElementById('detalle').value;

    if (!nombreVal || !sectorVal || !detalleVal) {
        alert("Por favor, llena todos los campos");
        return;
    }

    // Cambiamos el estado del botón
    const btn = event.target;
    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Obteniendo ubicación...";

    // Pedimos el GPS (Aquí saltará el aviso en tu navegador)
    const mapa = await obtenerLinkMapa();
    
    btn.innerText = "Enviando al GAD...";

    // INSERCIÓN DIRECTA
    const { data, error } = await supabase.from('reportes').insert([{
        nombre_ciudadano: nombreVal,
        sector: sectorVal,
        descripcion: detalleVal,
        ubicacion: mapa,
        estado: 'Pendiente'
    }]).select(); // El .select() ayuda a confirmar que se guardó

    if (error) {
        alert("Error de Supabase: " + error.message);
        console.error(error);
    } else {
        alert("✅ ¡Éxito! Reporte guardado en la base de datos.");
        document.getElementById('nombre').value = "";
        document.getElementById('sector').value = "";
        document.getElementById('detalle').value = "";
    }

    btn.disabled = false;
    btn.innerText = textoOriginal;
}

// 3. ACCESO ADMIN
window.verificarAdmin = function() {
    const clave = prompt("Ingrese la clave:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').style.display = 'block';
        actualizarTabla();
    }
}

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cuerpo = document.getElementById('tablaCuerpo');
    if (error || !cuerpo) return;

    cuerpo.innerHTML = "";
    data.forEach(item => {
        cuerpo.innerHTML += `
            <tr class="border-b">
                <td class="p-4">${item.nombre_ciudadano}</td>
                <td class="p-4">${item.sector}</td>
                <td class="p-4 text-center">${item.estado}</td>
            </tr>
        `;
    });
}