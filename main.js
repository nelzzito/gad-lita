// 1. CONFIGURACIÓN SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

let listaFotos = []; 

// --- CONFIGURACIÓN DE BODEGA OFFLINE (IndexedDB) ---
// Necesario para guardar archivos de fotos reales sin internet
const dbRequest = indexedDB.open("BodegaReportesLita", 1);
dbRequest.onupgradeneeded = e => {
    e.target.result.createObjectStore("pendientes", { autoIncrement: true });
};

// --- GESTIÓN DE FOTOS ---
const fotoInput = document.getElementById('fotoInput');
if (fotoInput) {
    fotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (listaFotos.length >= 3) {
            alert("⚠️ Máximo 3 fotos permitidas por reporte.");
            e.target.value = ""; 
            return;
        }

        listaFotos.push(file);
        actualizarMiniaturas();
        e.target.value = ""; 
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
    const btnCapturar = document.getElementById('btnCapturar');
    if (btnCapturar) btnCapturar.style.display = listaFotos.length >= 3 ? 'none' : 'flex';
}

window.quitarFoto = (index) => {
    listaFotos.splice(index, 1);
    actualizarMiniaturas();
};

// COMPRESIÓN Y SUBIDA
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

// 2. GPS
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) resolve("No soportado");
        navigator.geolocation.getCurrentPosition(
            (p) => resolve(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`),
            () => resolve("Ubicación no proporcionada"), { timeout: 8000, enableHighAccuracy: true }
        );
    });
}

// 3. ENVÍO (CON LÓGICA MEJORADA PARA FOTOS OFFLINE)
window.enviarReporte = async function() {
    const n = document.getElementById('nombre').value;
    const s = document.getElementById('sector').value;
    const d = document.getElementById('detalle').value;
    
    if (!n || !s || !d) return alert("⚠️ Llene los campos obligatorios.");
    if (listaFotos.length === 0) return alert("⚠️ ERROR: Debe incluir al menos una foto.");

    // Capturamos el GPS de una vez (funciona mejor si se pide antes de entrar en lógica de guardado)
    const gps = await obtenerLinkMapa();

    // --- CASO: SIN INTERNET ---
    if (!navigator.onLine) {
        const db = dbRequest.result;
        const tx = db.transaction("pendientes", "readwrite");
        const store = tx.objectStore("pendientes");
        
        // Guardamos TODO el objeto incluyendo los archivos de las fotos
        store.add({ 
            nombre_ciudadano: n, 
            sector: s, 
            descripcion: d, 
            ubicacion: gps, 
            fotos_binarias: listaFotos, // Guardamos los archivos reales
            estado: 'Pendiente',
            created_at: new Date().toISOString()
        });

        alert("📡 MODO OFFLINE: Reporte, Fotos y GPS guardados en el celular. Se subirán automáticamente al recuperar internet.");
        location.reload();
        return;
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    btn.disabled = true;
    btn.innerText = "Procesando evidencias... ⏳";

    try {
        const urls = await Promise.all(listaFotos.map(f => procesarYSubir(f)));
        const urlFotos = urls.join(', ');
        
        const { error } = await supabase.from('reportes').insert([{ 
            nombre_ciudadano: n, sector: s, descripcion: d, 
            ubicacion: gps, foto_url: urlFotos, estado: 'Pendiente' 
        }]);

        if (error) throw error;
        alert("✅ Reporte enviado al GAD Lita.");
        location.reload(); 
    } catch (e) {
        alert("❌ Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Enviar al GAD";
    }
};

// 4. ADMINISTRACIÓN Y TABLA
window.verificarAdmin = function() {
    if (prompt("Clave:") === "LITA2026") {
        document.getElementById('panelAdmin').classList.remove('hidden');
        document.getElementById('btnAccesoAdmin')?.classList.add('hidden');
        actualizarTabla();
    } else { alert("Clave incorrecta"); }
};

async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cont = document.getElementById('tablaReportes');
    if (error || !cont) return;

    cont.innerHTML = `
        <table class="w-full text-left text-[10px] border-collapse">
            <thead class="bg-gray-200 text-gray-800 uppercase font-black border-b border-gray-400">
                <tr>
                    <th class="p-2">FECHA</th>
                    <th class="p-2">CIUDADANO</th>
                    <th class="p-2">SECTOR</th>
                    <th class="p-2 text-center">FOTOS</th>
                    <th class="p-2 text-center">MAPA</th>
                    <th class="p-2">DETALLE</th>
                    <th class="p-2 text-center">ESTADO</th>
                    <th class="p-2 text-center">ACCIONES</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => {
                    const fotos = item.foto_url ? item.foto_url.split(', ') : [];
                    const fotosHtml = fotos.map((u, i) => `<a href="${u}" target="_blank" class="mr-1">🖼️${i+1}</a>`).join('');
                    return `
                    <tr class="border-b border-gray-200">
                        <td class="p-2">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="p-2 font-bold">${item.nombre_ciudadano}</td>
                        <td class="p-2 uppercase">${item.sector}</td>
                        <td class="p-2 text-center">${fotosHtml || '—'}</td>
                        <td class="p-2 text-center text-base">
                            ${item.ubicacion?.includes('http') ? `<a href="${item.ubicacion}" target="_blank">📍</a>` : '—'}
                        </td>
                        <td class="p-2 italic truncate max-w-[100px]">${item.descripcion}</td>
                        <td class="p-2 text-center font-bold text-blue-600">${item.estado}</td>
                        <td class="p-2 text-center">
                            <div class="flex justify-center gap-1">
                                ${item.estado !== 'Finalizado' ? `
                                    <button onclick="window.cambiarEstado('${item.id}')" class="bg-green-600 text-white p-1 rounded">OK</button>
                                    <button onclick="window.eliminarReporte('${item.id}')" class="bg-red-600 text-white p-1 rounded">X</button>
                                ` : '✅'}
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

window.cambiarEstado = async (id) => { await supabase.from('reportes').update({ estado: 'Finalizado' }).eq('id', id); actualizarTabla(); };
window.eliminarReporte = async (id) => { if(confirm("¿Eliminar?")) { await supabase.from('reportes').delete().eq('id', id); actualizarTabla(); } };

// --- NUEVA SINCRONIZACIÓN AUTOMÁTICA (TEXTO + FOTOS BINARIAS) ---
async function sincronizarPendientes() {
    if (!navigator.onLine || !dbRequest.result) return;
    
    const db = dbRequest.result;
    const tx = db.transaction("pendientes", "readwrite");
    const store = tx.objectStore("pendientes");
    const request = store.openCursor();

    request.onsuccess = async e => {
        const cursor = e.target.result;
        if (cursor) {
            const res = cursor.value;
            try {
                // 1. Subir las fotos que estaban guardadas en binario
                const urls = await Promise.all(res.fotos_binarias.map(f => procesarYSubir(f)));
                const urlFotos = urls.join(', ');

                // 2. Insertar el reporte completo
                const { error } = await supabase.from('reportes').insert([{
                    nombre_ciudadano: res.nombre_ciudadano,
                    sector: res.sector,
                    descripcion: res.descripcion,
                    ubicacion: res.ubicacion,
                    foto_url: urlFotos,
                    estado: 'Pendiente'
                }]);

                if (!error) store.delete(cursor.key); // Borrar si se subió con éxito
            } catch (err) {
                console.error("Error sincronizando reporte:", err);
            }
            cursor.continue();
        }
    };
}

window.addEventListener('online', sincronizarPendientes);
// Intentar sincronizar al arrancar la app por si ya hay red
setTimeout(sincronizarPendientes, 3000);