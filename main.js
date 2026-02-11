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

// 3. FUNCIONES ADMINISTRATIVAS (Resolver e Ignorar)
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

// 4. LÓGICA DE ENVÍO DEL CIUDADANO
window.enviarReporte = async function() {
    // ... (Tu código de enviarReporte que ya funciona)
    // Asegúrate de que al final de un envío exitoso llame a actualizarTabla();
}

// 5. ACCESO Y DIBUJO DE TABLA
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
    const contenedor = document.getElementById('tablaReportes');
    if (error || !contenedor) return;

    // Aquí pegas la estructura de la tabla con las 5 columnas: 
    // CIUDADANO, SECTOR, ESTADO, UBICACIÓN y ACCIONES
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
            <td class="p-3 text-sm">${item.nombre_ciudadano}</td>
            <td class="p-3 text-sm">${item.sector}</td>
            <td class="p-3 text-xs">${item.estado}</td>
            <td class="p-3 text-center">
                <a href="${item.ubicacion}" target="_blank" class="text-xl">📍</a>
            </td>
            <td class="p-3 text-center flex gap-2 justify-center">
                <button onclick="cambiarEstado('${item.id}', 'Finalizado')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs">Resolver</button>
                <button onclick="eliminarReporte('${item.id}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Ignorar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}
window.exportarExcel = async function() {
    // 1. Obtenemos los datos frescos de la base de datos
    const { data, error } = await supabase
        .from('reportes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) return alert("No hay datos para exportar");

    // 2. Iniciamos la construcción del archivo Excel
    let excelCode = '<html><head><meta charset="UTF-8"></head><body>';
    excelCode += '<table border="1">';
    
    // Encabezados del reporte
    excelCode += `
        <tr style="background-color: #f3f4f6;">
            <th>CIUDADANO</th>
            <th>SECTOR</th>
            <th>DESCRIPCIÓN</th>
            <th>ESTADO</th>
            <th>MAPA (LINK)</th>
            <th>FECHA DE REPORTE</th>
        </tr>`;
    
    // 3. Llenamos las filas
    data.forEach(item => {
        // Aquí ocurre la magia: Si hay ubicación, creamos un link con el texto "Ver Ubicación"
        const linkLimpio = item.ubicacion && item.ubicacion.includes('http') 
            ? `<a href="${item.ubicacion}">Ver Ubicación</a>` 
            : 'No disponible';

        excelCode += `
            <tr>
                <td>${item.nombre_ciudadano || '---'}</td>
                <td>${item.sector || '---'}</td>
                <td>${item.descripcion || '---'}</td>
                <td>${item.estado}</td>
                <td>${linkLimpio}</td>
                <td>${new Date(item.created_at).toLocaleString()}</td>
            </tr>`;
    });

    excelCode += '</table></body></html>';

    // 4. Descarga del archivo
    const blob = new Blob([excelCode], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_GAD_LITA_${new Date().toLocaleDateString()}.xls`;
    a.click();
}