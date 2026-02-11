// 1. IMPORTACIÓN Y CONFIGURACIÓN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

// 2. FUNCIONES DE APOYO (GPS)
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

// 3. LÓGICA DE ENVÍO DEL CIUDADANO (CORREGIDA)
window.enviarReporte = async function() {
    const nombre = document.getElementById('nombre').value;
    const sector = document.getElementById('sector').value;
    const detalle = document.getElementById('detalle').value;

    if (!nombre || !sector || !detalle) {
        return alert("⚠️ Por favor, llene todos los campos.");
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    btn.innerText = "Enviando...";
    btn.disabled = true;

    const linkGps = await obtenerLinkMapa();

    const { error } = await supabase.from('reportes').insert([{ 
        nombre_ciudadano: nombre, 
        sector: sector, 
        descripcion: detalle,
        ubicacion: linkGps,
        estado: 'Pendiente'
    }]);

    if (error) {
        alert("❌ Error: " + error.message);
    } else {
        alert("✅ Reporte enviado con éxito al GAD Lita.");
        // Limpiar campos
        document.getElementById('nombre').value = "";
        document.getElementById('sector').value = "";
        document.getElementById('detalle').value = "";
    }
    
    btn.innerText = "Enviar al GAD";
    btn.disabled = false;
}

// 4. FUNCIONES ADMINISTRATIVAS (Resolver e Ignorar)
window.cambiarEstado = async function(id, nuevoEstado) {
    const { error } = await supabase.from('reportes').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
        alert("✅ Reporte Finalizado.");
        actualizarTabla(); 
    }
}

window.eliminarReporte = async function(id) {
    if (confirm("⚠️ ¿Estás seguro de IGNORAR este reporte? Se borrará para siempre.")) {
        const { error } = await supabase.from('reportes').delete().eq('id', id);
        if (!error) {
            alert("🗑️ Reporte eliminado.");
            actualizarTabla();
        }
    }
}

// 5. ACCESO Y DIBUJO DE TABLA
window.verificarAdmin = function() {
    const clave = prompt("Ingrese la clave:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').style.setProperty('display', 'block', 'important');
        actualizarTabla();
    }
}

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const contenedor = document.getElementById('tablaReportes');
    if (error || !contenedor) return;

    contenedor.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-100 border-b">
                    <th class="p-3 text-xs font-bold">CIUDADANO</th>
                    <th class="p-3 text-xs font-bold">SECTOR</th>
                    <th class="p-3 text-xs font-bold">ESTADO</th>
                    <th class="p-3 text-center text-xs font-bold">UBICACIÓN</th>
                    <th class="p-3 text-center text-xs font-bold">ACCIONES</th>
                </tr>
            </thead>
            <tbody id="tablaCuerpo"></tbody>
        </table>
    `;

    const tbody = document.getElementById('tablaCuerpo');
    data.forEach(item => {
        const fila = document.createElement('tr');
        fila.className = "border-b hover:bg-gray-50";
        fila.innerHTML = `
            <td class="p-3 text-sm">${item.nombre_ciudadano || '---'}</td>
            <td class="p-3 text-sm">${item.sector || '---'}</td>
            <td class="p-3 text-xs">
                <span class="px-2 py-1 rounded-full ${item.estado === 'Finalizado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${item.estado}
                </span>
            </td>
            <td class="p-3 text-center">
                <a href="${item.ubicacion}" target="_blank" class="text-xl">📍</a>
            </td>
            <td class="p-3 text-center flex gap-2 justify-center">
                ${item.estado !== 'Finalizado' ? 
                    `<button onclick="cambiarEstado('${item.id}', 'Finalizado')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs">Resolver</button>` 
                    : '✅'}
                <button onclick="eliminarReporte('${item.id}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Ignorar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error || !data) return alert("No hay datos");

    let excelCode = '<html><head><meta charset="UTF-8"></head><body><table border="1">';
    excelCode += '<tr style="background:#eeeeee"><th>CIUDADANO</th><th>SECTOR</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>MAPA</th><th>FECHA</th></tr>';
    
    data.forEach(item => {
        const linkLimpio = item.ubicacion && item.ubicacion.includes('http') ? `<a href="${item.ubicacion}">Ver Ubicación</a>` : '---';
        excelCode += `<tr>
            <td>${item.nombre_ciudadano}</td><td>${item.sector}</td><td>${item.descripcion}</td>
            <td>${item.estado}</td><td>${linkLimpio}</td><td>${new Date(item.created_at).toLocaleString()}</td>
        </tr>`;
    });
    excelCode += '</table></body></html>';

    const blob = new Blob([excelCode], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Reporte_GAD_LITA.xls"; a.click();
}
// PASO D: REGISTRO DEL SERVICE WORKER PARA ACTIVAR EL BOTÓN INSTALAR
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ El sistema de instalación está listo:', reg))
      .catch(err => console.error('❌ Error al preparar la instalación:', err));
  });
}
// FUNCIÓN PARA EL ACCESO SECRETO AL PANEL
function accesoAdmin() {
    const clave = prompt("Ingrese la clave de administrador:");
    
    if (clave === "LITA2026") {
        alert("Acceso concedido");
        document.getElementById('panelAdmin').style.display = 'block';
        document.getElementById('formReporte').style.display = 'none';
        cargarReportes(); // Esta función cargará los datos de la tabla
    } else {
        alert("Clave incorrecta");
    }
}