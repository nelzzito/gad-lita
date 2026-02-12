// 1. IMPORTACIÓN Y CONFIGURACIÓN (Verificado)
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
                    resolve(`https://maps.google.com/?q=${lat},${lon}`);
                },
                () => resolve("No proporcionada"),
                { timeout: 8000 }
            );
        }
    });
}

function limpiarCampos() {
    document.getElementById('nombre').value = "";
    document.getElementById('sector').value = "";
    document.getElementById('detalle').value = "";
}

// 3. LÓGICA DE ENVÍO DEL CIUDADANO
window.enviarReporte = async function() {
    const nombre = document.getElementById('nombre').value;
    const sector = document.getElementById('sector').value;
    const detalle = document.getElementById('detalle').value;

    if (!nombre || !sector || !detalle) {
        return alert("⚠️ Por favor, llene todos los campos.");
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        const linkGps = await obtenerLinkMapa();
        const reporte = {
            nombre_ciudadano: nombre,
            sector: sector,
            descripcion: detalle,
            ubicacion: linkGps,
            estado: 'Pendiente'
        };

        if (navigator.onLine) {
            const { error } = await supabase.from('reportes').insert([reporte]);
            if (error) throw error;
            alert("✅ Reporte enviado con éxito al GAD Lita.");
            limpiarCampos();
        } else {
            guardarEnLocal(reporte);
            limpiarCampos();
        }
    } catch (err) {
        alert("❌ Error: " + err.message);
    } finally {
        btn.innerText = "Enviar al GAD";
        btn.disabled = false;
    }
};

// 4. FUNCIONES ADMINISTRATIVAS (Restauradas)
window.verificarAdmin = function() {
    const clave = prompt("Ingrese la clave:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').style.setProperty('display', 'block', 'important');
        actualizarTabla(); // Carga la tabla inmediatamente
    } else {
        alert("Clave incorrecta");
    }
}

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const contenedor = document.getElementById('tablaReportes');
    if (error || !contenedor) return;

    // Dibujar estructura de tabla
    contenedor.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-100 border-b">
                    <th class="p-3 text-xs font-bold">CIUDADANO</th>
                    <th class="p-3 text-xs font-bold">SECTOR</th>
                    <th class="p-3 text-xs font-bold">DETALLE</th>
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
            <td class="p-3 text-sm">${item.descripcion || '---'}</td>
            <td class="p-3 text-xs">
                <span class="px-2 py-1 rounded-full ${item.estado === 'Finalizado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${item.estado}
                </span>
            </td>
            <td class="p-3 text-center">
                <a href="${item.ubicacion}" target="_blank" class="text-xl">📍</a>
            </td>
            <td class="p-3 text-center flex gap-2 justify-center">
                ${item.estado !== 'Finalizado' ? `
                    <button onclick="cambiarEstado('${item.id}', 'Finalizado')" style="color: #2563eb; font-weight: bold; cursor:pointer;">Finalizar</button>
                    <button onclick="eliminarReporte('${item.id}')" style="color: #dc2626; font-weight: bold; cursor:pointer; margin-left:10px;">Ignorar</button>
                ` : `<span style="color: #16a34a; font-weight: bold;">Completado ✅</span>`}
            </td>
        `;
        tbody.appendChild(fila);
    });
}

window.cambiarEstado = async function(id, nuevoEstado) {
    const { error } = await supabase.from('reportes').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
        alert("✅ Reporte Actualizado.");
        actualizarTabla(); 
    }
}

window.eliminarReporte = async function(id) {
    if (confirm("⚠️ ¿Estás seguro de IGNORAR este reporte?")) {
        const { error } = await supabase.from('reportes').delete().eq('id', id);
        if (!error) {
            alert("🗑️ Reporte eliminado.");
            actualizarTabla();
        }
    }
}

// 5. EXPORTACIÓN EXCEL
window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error || !data) return alert("No hay datos");

    let excelCode = '<html><head><meta charset="UTF-8"></head><body><table border="1">';
    excelCode += '<tr style="background:#eeeeee"><th>CIUDADANO</th><th>SECTOR</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>FECHA</th></tr>';
    data.forEach(item => {
        excelCode += `<tr><td>${item.nombre_ciudadano}</td><td>${item.sector}</td><td>${item.descripcion}</td><td>${item.estado}</td><td>${new Date(item.created_at).toLocaleString()}</td></tr>`;
    });
    excelCode += '</table></body></html>';

    const blob = new Blob([excelCode], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Reporte_GAD_LITA.xls"; a.click();
}

// 6. MODO OFFLINE Y SERVICE WORKER (Corregido)
function guardarEnLocal(datos) {
    let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes')) || [];
    pendientes.push(datos);
    localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
    alert("📡 Sin conexión. Guardado en el dispositivo.");
}

window.addEventListener('online', async () => {
    // Esperamos 3 segundos para que la conexión sea real y estable
    console.log("Internet detectado. Estabilizando conexión...");
    
    setTimeout(async () => {
        let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes')) || [];
        
        if (pendientes.length > 0) {
            try {
                for (let reporte of pendientes) {
                    // Intento de envío a Supabase
                    const { error } = await supabase.from('reportes').insert([reporte]);
                    if (error) throw error;
                }
                
                // Si todos se enviaron bien, limpiamos la memoria local
                localStorage.removeItem('reportes_pendientes');
                alert("✅ ¡Conexión recuperada! Los reportes guardados se han enviado con éxito.");
                
                // Refrescamos la tabla si el administrador tiene el panel abierto
                if (typeof actualizarTabla === "function") actualizarTabla();
                
            } catch (err) {
                console.error("Error en sincronización:", err);
                alert("⚠️ El internet volvió, pero Supabase aún no responde. Se intentará enviar más tarde.");
            }
        }
    }, 3000); 
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    });
}