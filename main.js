// 1. CONFIGURACIÓN SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

let listaFotos = []; // Almacén temporal de archivos

// --- FUNCIÓN DE COMPRESIÓN (PARA EVITAR ERROR DE CUOTA CON 3 FOTOS OFFLINE) ---
async function comprimirImagen(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_WIDTH) {
                    width *= MAX_WIDTH / height;
                    height = MAX_WIDTH;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // Comprimimos al 60% para que 3 fotos pesen menos de 1MB en total
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
    });
}

// --- LÓGICA DE FOTOS (AÑADIR Y BORRAR) ---
const fotoInput = document.getElementById('fotoInput');
if (fotoInput) {
    fotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (listaFotos.length >= 3) {
            alert("⚠️ Máximo 3 fotos por reporte.");
            return;
        }

        listaFotos.push(file);
        actualizarMiniaturas();
        e.target.value = ""; 
    });
}

function actualizarMiniaturas() {
    const cont = document.getElementById('previsualizacion');
    const btnCapturar = document.getElementById('btnCapturar');
    if (!cont) return;
    
    cont.innerHTML = "";
    listaFotos.forEach((foto, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = "relative h-20 w-full";
            div.innerHTML = `
                <img src="${e.target.result}" class="h-full w-full object-cover rounded-lg border border-blue-200 shadow-sm">
                <button onclick="quitarFoto(${index})" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center shadow-lg border border-white">X</button>
            `;
            cont.appendChild(div);
        };
        reader.readAsDataURL(foto);
    });

    if (btnCapturar) {
        btnCapturar.style.display = listaFotos.length >= 3 ? 'none' : 'flex';
    }
}

window.quitarFoto = function(index) {
    listaFotos.splice(index, 1);
    actualizarMiniaturas();
};

// --- SUBIDA AL STORAGE ---
async function subirFoto(archivo) {
    const nombreArchivo = `${Date.now()}_${archivo.name || 'foto.jpg'}`;
    const { data, error } = await supabase.storage
        .from('fotos_reportes')
        .upload(nombreArchivo, archivo);
    
    if (error) throw new Error("Error al subir una de las imágenes");
    
    const { data: urlData } = supabase.storage.from('fotos_reportes').getPublicUrl(nombreArchivo);
    return urlData.publicUrl;
}

// 2. GPS (CORREGIDO)
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) resolve("No soportado");
        else {
            navigator.geolocation.getCurrentPosition(
                (p) => {
                    const link = `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`;
                    resolve(link);
                },
                () => resolve("No proporcionada"), 
                { timeout: 8000, enableHighAccuracy: true }
            );
        }
    });
}

// 3. ENVÍO DEL CIUDADANO (ESTRATEGIA HÍBRIDA)
window.enviarReporte = async function() {
    const n = document.getElementById('nombre').value;
    const s = document.getElementById('sector').value;
    const d = document.getElementById('detalle').value;
    
    if (!n || !s || !d || listaFotos.length === 0) {
        return alert("⚠️ Complete todos los campos e incluya al menos una foto.");
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    if(btn) { btn.disabled = true; btn.innerText = "Procesando... ⏳"; }

    try {
        const gps = await obtenerLinkMapa();

        if (!navigator.onLine) {
            // PROCESO OFFLINE CON COMPRESIÓN PARA LAS 3 FOTOS
            const fotosComprimidas = [];
            for (const file of listaFotos) {
                const b64 = await new Promise(res => {
                    const r = new FileReader();
                    r.onload = (e) => res(e.target.result);
                    r.readAsDataURL(file);
                });
                const comprimida = await comprimirImagen(b64);
                fotosComprimidas.push(comprimida);
            }

            const reporteOffline = {
                nombre_ciudadano: n,
                sector: s,
                descripcion: d,
                ubicacion: gps,
                foto_url: fotosComprimidas, 
                estado: 'Pendiente',
                created_at: new Date().toISOString()
            };

            let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || "[]");
            pendientes.push(reporteOffline);
            localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));

            alert("📡 Sin internet: Reporte guardado localmente con éxito. Se enviará al GAD automáticamente al recuperar conexión.");
            location.reload();
            return;
        }

        // PROCESO ONLINE NORMAL
        const subidas = listaFotos.map(file => subirFoto(file));
        const urlsFinales = await Promise.all(subidas);
        
        const { error } = await supabase.from('reportes').insert([{ 
            nombre_ciudadano: n, 
            sector: s, 
            descripcion: d, 
            ubicacion: gps, 
            foto_url: urlsFinales.join(', '), 
            estado: 'Pendiente' 
        }]);

        if (error) throw error;
        alert("✅ Reporte enviado con éxito.");
        location.reload(); 

    } catch (e) {
        alert("❌ Error: " + e.message);
        if(btn) { btn.disabled = false; btn.innerText = "Enviar al GAD"; }
    }
};

// 4. ADMINISTRACIÓN
window.verificarAdmin = function() {
    const clave = prompt("Clave de acceso:");
    if (clave === "LITA2026") {
        document.getElementById('panelAdmin').classList.remove('hidden');
        if (document.getElementById('btnAccesoAdmin')) document.getElementById('btnAccesoAdmin').classList.add('hidden');
        actualizarTabla();
    } else { alert("Clave incorrecta"); }
};

// 5. TABLA WEB
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
                    const fotosHtml = fotos.map((url, i) => `<a href="${url}" target="_blank" class="mr-1">🖼️${i+1}</a>`).join('');

                    return `
                    <tr class="border-b border-gray-200">
                        <td class="p-2 text-gray-600">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="p-2 font-bold text-blue-900">${item.nombre_ciudadano}</td>
                        <td class="p-2 text-gray-700 uppercase font-semibold">${item.sector}</td>
                        <td class="p-2 text-center">${fotosHtml || '—'}</td>
                        <td class="p-2 text-center text-base">
                            ${item.ubicacion && item.ubicacion.includes('http') 
                                ? `<a href="${item.ubicacion}" target="_blank">📍</a>` 
                                : '<span class="text-gray-400 text-[8px]">N/A</span>'}
                        </td>
                        <td class="p-2 text-gray-500 italic max-w-[150px] truncate">${item.descripcion}</td>
                        <td class="p-2 text-center">
                            <span class="px-2 py-0.5 rounded shadow-sm font-black text-[8px] border ${
                                item.estado === 'Finalizado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                            }">${item.estado}</span>
                        </td>
                        <td class="p-2 text-center">
                            <div class="flex justify-center gap-1">
                                ${item.estado !== 'Finalizado' ? `
                                    <button onclick="window.cambiarEstado('${item.id}')" class="bg-green-600 text-white font-bold text-[8px] py-1 px-2 rounded">OK</button>
                                    <button onclick="window.eliminarReporte('${item.id}')" class="bg-red-600 text-white font-bold text-[8px] py-1 px-2 rounded">X</button>
                                ` : '✅'}
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// 6. ACCIONES
window.cambiarEstado = async (id) => {
    await supabase.from('reportes').update({ estado: 'Finalizado' }).eq('id', id);
    actualizarTabla();
};

window.eliminarReporte = async (id) => {
    if(confirm("¿Eliminar reporte?")) {
        await supabase.from('reportes').delete().eq('id', id);
        actualizarTabla();
    }
};

// 7. EXPORTAR EXCEL PROFESIONAL
window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error) return alert("Error al obtener datos");

    let xmlRows = "";
    data.forEach(r => {
        const f = new Date(r.created_at).toLocaleString();
        const fotosArray = r.foto_url ? r.foto_url.split(', ') : [];
        const linkFoto = fotosArray.length > 0 ? fotosArray[0] : "";

        xmlRows += `
        <Row>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${f}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.nombre_ciudadano}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.sector}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.descripcion}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.estado}</Data></Cell>
            <Cell ss:StyleID="sDatos" ss:HRef="${r.ubicacion}"><Data ss:Type="String">VER MAPA</Data></Cell>
            ${linkFoto ? `<Cell ss:StyleID="sLink" ss:HRef="${linkFoto}"><Data ss:Type="String">VER FOTO</Data></Cell>` : '<Cell ss:StyleID="sDatos"><Data ss:Type="String">SIN FOTO</Data></Cell>'}
        </Row>`;
    });

    const excelTemplate = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
     <Styles>
      <Style ss:ID="sTitulo"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#228B22"/></Style>
      <Style ss:ID="sHeader"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#D3D3D3" ss:Pattern="Solid"/></Style>
      <Style ss:ID="sDatos"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
      <Style ss:ID="sLink"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Color="#0000FF" ss:Underline="Single"/></Style>
     </Styles>
     <Worksheet ss:Name="Reportes">
      <Table ss:ExpandedColumnCount="7">
       <Column ss:Width="110"/><Column ss:Width="130"/><Column ss:Width="100"/><Column ss:Width="200"/><Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="80"/>
       <Row ss:Height="30"><Cell ss:MergeAcross="6" ss:StyleID="sTitulo"><Data ss:Type="String">🛡️ REPORTE GAD LITA</Data></Cell></Row>
       <Row ss:Height="20">
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">FECHA</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">CIUDADANO</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">SECTOR</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">DETALLE</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">ESTADO</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">MAPA</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">FOTO</Data></Cell>
       </Row>
       ${xmlRows}
      </Table>
     </Worksheet>
    </Workbook>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_GAD_Lita.xls`;
    link.click();
};

// 8. SINCRONIZADOR FINAL (DEPURADO)
async function sincronizarPendientes() {
    if (!navigator.onLine) return;
    let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || "[]");
    if (pendientes.length === 0) return;

    for (let i = 0; i < pendientes.length; i++) {
        try {
            const reporte = pendientes[i];
            const urlsFinales = [];
            
            for (const b64 de reporte.foto_url) {
                const res = await fetch(b64);
                const blob = await res.blob();
                const archivo = new File([blob], `offline_${Date.now()}.jpg`, { type: "image/jpeg" });
                const url = await subirFoto(archivo);
                urlsFinales.push(url);
            }

            reporte.foto_url = urlsFinales.join(', ');
            const { error } = await supabase.from('reportes').insert([{
                nombre_ciudadano: reporte.nombre_ciudadano,
                sector: reporte.sector,
                descripcion: reporte.descripcion,
                ubicacion: reporte.ubicacion,
                foto_url: reporte.foto_url,
                estado: reporte.estado
            }]);

            if (!error) {
                pendientes.splice(i, 1);
                i--;
            }
        } catch (e) { console.error("Error sincronizando", e); break; }
    }
    localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
}

window.addEventListener('online', sincronizarPendientes);
sincronizarPendientes();