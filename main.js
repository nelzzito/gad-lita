// 1. CONFIGURACIÓN DE SUPABASE (Tus credenciales guardadas)
const _supabase = supabase.createClient('https://vclmcliofzjofzllvytj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q');

// 2. FUNCIÓN PARA ENVIAR REPORTE (Con GPS y Detalle)
async function enviarReporte() {
    const btn = document.getElementById('btnEnviar');
    const nom = document.getElementById('nombre').value;
    const sec = document.getElementById('sector').value;
    const des = document.getElementById('descripcion').value;

    if (!nom || !sec || !des) {
        alert("⚠️ Nelson, por favor llena todos los campos antes de enviar.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Obteniendo ubicación...";

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const urlGps = `https://www.google.com/maps?q=${lat},${lon}`;

        const { error } = await _supabase.from('reportes').insert([
            { 
                nombre_ciudadano: nom, 
                sector: sec, 
                descripcion: des, 
                ubicacion: urlGps,
                estado: 'Pendiente'
            }
        ]);

        if (error) {
            alert("❌ Error de conexión: " + error.message);
        } else {
            alert("✅ ¡Reporte enviado con éxito al GAD Lita!");
            location.reload(); 
        }
        btn.disabled = false;
        btn.innerText = "Enviar Reporte con GPS";
    }, (err) => {
        alert("📍 Error: Debes activar el GPS para que el GAD sepa dónde es el problema.");
        btn.disabled = false;
        btn.innerText = "Enviar Reporte con GPS";
    });
}

// 3. FUNCIÓN DE ACCESO ADMINISTRATIVO (El punto secreto)
function accesoAdmin() {
    const clave = prompt("Seguridad GAD Lita - Ingrese Clave:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').style.display = 'block';
        document.getElementById('formReporte').style.display = 'none';
        cargarReportes();
    } else {
        alert("Clave incorrecta.");
    }
}

// 4. CARGAR REPORTES EN LA TABLA (Con la columna Detalle)
async function cargarReportes() {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='5'>Cargando datos...</td></tr>";

    const { data, error } = await _supabase
        .from('reportes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }

    lista.innerHTML = ""; // Limpiar mensaje de carga
    data.forEach(rep => {
        lista.innerHTML += `
            <tr>
                <td>${rep.nombre_ciudadano}</td>
                <td>${rep.sector}</td>
                <td>${rep.descripcion || 'Sin detalle'}</td>
                <td>${rep.estado}</td>
                <td><a href="${rep.ubicacion}" target="_blank">📍 Ver Mapa</a></td>
            </tr>
        `;
    });
}

// 5. REGISTRO DEL SERVICE WORKER (Para que aparezca el botón Instalar)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Instalación lista'))
            .catch(err => console.log('Fallo instalación', err));
    });
}