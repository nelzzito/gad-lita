// 1. CONFIGURACIÓN SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

let listaFotos = []; 

// --- BODEGA OFFLINE (IndexedDB) ---
const dbRequest = indexedDB.open("BodegaReportesLita", 1);
dbRequest.onupgradeneeded = e => {
    e.target.result.createObjectStore("pendientes", { autoIncrement: true });
};

// --- GESTIÓN DE FOTOS ---
const fotoInput = document.getElementById('fotoInput');
if (fotoInput) {
    fotoInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file || listaFotos.length >= 3) return;
        listaFotos.push(file);
        actualizarMiniaturas();
    });
}

function actualizarMiniaturas() {
    const cont = document.getElementById('previsualizacion');
    if (!cont) return;
    cont.innerHTML = "";
    listaFotos.forEach((foto, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = "relative h-20 w-full";
            div.innerHTML = `
                <img src="${e.target.result}" class="h-full w-full object-cover rounded-lg border border-blue-200">
                <button onclick="quitarFoto(${index})" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center border border-white">X</button>
            `;
            cont.appendChild(div);
        };
        reader.readAsDataURL(foto);
    });
}

window.quitarFoto = (index) => {
    listaFotos.splice(index, 1);
    actualizarMiniaturas();
};

// --- COMPRESIÓN Y SUBIDA ---
async function procesarYSubir(archivo) {
    const bitmap = await createImageBitmap(archivo);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const escala = Math.min(1200 / bitmap.width, 1200 / bitmap.height, 1);
    canvas.width = bitmap.width * escala;
    canvas.height = bitmap.height * escala;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
    const nombre = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
    const { data, error } = await supabase.storage.from('fotos_reportes').upload(nombre, blob);
    if (error) throw error;
    return (supabase.storage.from('fotos_reportes').getPublicUrl(nombre)).data.publicUrl;
}

// --- GPS CORREGIDO ---
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) resolve("No soportado");
        navigator.geolocation.getCurrentPosition(
            (p) => resolve(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`),
            () => resolve("Ubicación no proporcionada"), { timeout: 8000, enableHighAccuracy: true }
        );
    });
}

// --- ENVÍO DE REPORTE ---
window.enviarReporte = async function() {
    const n = document.getElementById('nombre').value;
    const s = document.getElementById('sector').value;
    const d = document.getElementById('detalle').value;
    
    if (!n || !s || !d || listaFotos.length === 0) return alert("⚠️ Complete todos los campos y añada al menos una foto.");

    const gps = await obtenerLinkMapa();

    // Lógica Offline
    if (!navigator.onLine) {
        const db = dbRequest.result;
        const tx = db.transaction("pendientes", "readwrite");
        tx.objectStore("pendientes").add({ 
            nombre_ciudadano: n, sector: s, descripcion: d, 
            ubicacion: gps, fotos_binarias: listaFotos, 
            estado: 'Pendiente', created_at: new Date().toISOString()
        });
        alert("📡 MODO SIN INTERNET: Reporte guardado en el teléfono. Se subirá automáticamente cuando detecte conexión.");
        location.reload();
        return;
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    btn.disabled = true; btn.innerText = "Subiendo... ⏳";

    try {
        const urls = await Promise.all(listaFotos.map(f => procesarYSubir(f)));
        const { error } = await supabase.from('reportes').insert([{ 
            nombre_ciudadano: n, sector: s, descripcion: d, 
            ubicacion: gps, foto_url: urls.join(', '), estado: 'Pendiente' 
        }]);
        if (error) throw error;
        alert("✅ Reporte enviado exitosamente.");
        location.reload(); 
    } catch (e) {
        alert("❌ Error: " + e.message);
        btn.disabled = false; btn.innerText = "Enviar al GAD";
    }
};

// --- ADMINISTRACIÓN Y EXCEL ---
window.verificarAdmin = function() {
    if (prompt("Clave:") === "LITA2026") {
        document.getElementById('panelAdmin').classList.remove('hidden');
        document.getElementById('btnAccesoAdmin')?.classList.add('hidden');
        actualizarTabla();
    } else { alert("Clave incorrecta"); }
};

window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error) return alert("Error al exportar: " + error.message);
    
    // Requiere la librería SheetJS en el HTML
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    XLSX.writeFile(wb, "Reportes_GAD_LITA.xlsx");
};

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cont = document.getElementById('tablaReportes');
    if (error || !cont) return;

    cont.innerHTML = `
        <table class="w-full text-left text-[10px] border-collapse">
            <thead class="bg-gray-200 text-gray-800 uppercase font-black border-b border-gray-400">
                <tr>
                    <th class="p-2">FECHA</th><th class="p-2">CIUDADANO</th><th class="p-2">SECTOR</th>
                    <th class="p-2 text-center">FOTOS</th><th class="p-2 text-center">MAPA</th>
                    <th class="p-2">DETALLE</th><th class="p-2 text-center">ACCIONES</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr class="border-b border-gray-200">
                        <td class="p-2">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="p-2 font-bold">${item.nombre_ciudadano}</td>
                        <td class="p-2 uppercase">${item.sector}</td>
                        <td class="p-2 text-center text-blue-600">${item.foto_url ? '✅ Ver' : '—'}</td>
                        <td class="p-2 text-center">${item.ubicacion?.includes('http') ? `<a href="${item.ubicacion}" target="_blank">📍</a>` : '—'}</td>
                        <td class="p-2 italic truncate max-w-[100px]">${item.descripcion}</td>
                        <td class="p-2 text-center">
                            <button onclick="window.eliminarReporte('${item.id}')" class="bg-red-600 text-white p-1 rounded text-[8px]">BORRAR</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

window.eliminarReporte = async (id) => { 
    if(confirm("¿Eliminar?")) { await supabase.from('reportes').delete().eq('id', id); actualizarTabla(); } 
};

// --- SINCRONIZADOR AUTOMÁTICO REFORZADO ---
async function sincronizarPendientes() {
    if (!navigator.onLine || !dbRequest.result) return;
    const db = dbRequest.result;
    const tx = db.transaction("pendientes", "readonly");
    const store = tx.objectStore("pendientes");
    const pendientes = [];

    const request = store.openCursor();
    request.onsuccess = async e => {
        const cursor = e.target.result;
        if (cursor) {
            pendientes.push({ id: cursor.key, data: cursor.value });
            cursor.continue();
        } else if (pendientes.length > 0) {
            alert(`🔄 Detectada conexión. Sincronizando ${pendientes.length} reportes pendientes...`);
            for (const item of pendientes) {
                try {
                    const urls = await Promise.all(item.data.fotos_binarias.map(f => procesarYSubir(f)));
                    await supabase.from('reportes').insert([{
                        nombre_ciudadano: item.data.nombre_ciudadano,
                        sector: item.data.sector,
                        descripcion: item.data.descripcion,
                        ubicacion: item.data.ubicacion,
                        foto_url: urls.join(', '),
                        estado: 'Pendiente'
                    }]);
                    const deleteTx = db.transaction("pendientes", "readwrite");
                    deleteTx.objectStore("pendientes").delete(item.id);
                } catch (err) { console.error("Error al sincronizar:", err); }
            }
            alert("✅ Sincronización completa.");
            actualizarTabla();
        }
    };
}

window.addEventListener('online', () => setTimeout(sincronizarPendientes, 3000));
setTimeout(sincronizarPendientes, 3000);