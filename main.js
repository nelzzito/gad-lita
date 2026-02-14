// 1. CONFIGURACIÓN SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://hnqshnbdndsvurffrpjs.supabase.co'
const supabaseKey = 'sb_publishable_wgDPu5O49WPdWsm_xE_jmA_hJ4PoEXp'
const supabase = createClient(supabaseUrl, supabaseKey)

// 2. GPS (CORREGIDO)
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) resolve("No soportado");
        else {
            navigator.geolocation.getCurrentPosition(
                (p) => resolve(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`),
                () => resolve("No proporcionada"), { timeout: 8000 }
            );
        }
    });
}

// 3. ENVÍO DEL CIUDADANO
window.enviarReporte = async function() {
    const n = document.getElementById('nombre').value;
    const s = document.getElementById('sector').value;
    const d = document.getElementById('detalle').value;
    
    if (!n || !s || !d) return alert("⚠️ Llene todos los campos");
    
    const btn = document.querySelector("button[onclick='enviarReporte()']");
    if(btn) { btn.disabled = true; btn.innerText = "Enviando..."; }

    const gps = await obtenerLinkMapa();
    const nuevoReporte = { nombre_ciudadano: n, sector: s, descripcion: d, ubicacion: gps, estado: 'Pendiente' };

    try {
        const { error } = await supabase.from('reportes').insert([nuevoReporte]);
        if (error) throw error;
        
        alert("✅ Reporte enviado con éxito");
        location.reload(); 
    } catch (e) {
        let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || "[]");
        pendientes.push(nuevoReporte);
        localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
        alert("📡 Sin conexión. El reporte se guardó localmente.");
        location.reload();
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

// 5. TABLA WEB (COLUMNA UBICACIÓN CON ICONO 📍)
async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const cont = document.getElementById('tablaReportes');
    if (error || !cont) return;

    const panelAdmin = document.getElementById('panelAdmin');
    const cabecera = panelAdmin.querySelector('.flex.justify-between.items-center');
    
    if (cabecera) {
        cabecera.className = "flex flex-col w-full mb-6";
        cabecera.innerHTML = `
            <h2 class="text-2xl font-black text-blue-900 text-center w-full mb-2 uppercase">GESTIÓN DE REPORTES</h2>
            <div class="flex justify-end w-full">
                <button id="btnExportar" class="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded text-[10px] font-bold shadow-sm transition-all uppercase">
                    REPORTE EXCEL
                </button>
            </div>
        `;
        document.getElementById('btnExportar').onclick = () => window.exportarExcel();
    }

    cont.innerHTML = `
        <table class="w-full text-left text-[10px] border-collapse">
            <thead class="bg-gray-200 text-gray-800 uppercase font-black border-b border-gray-400">
                <tr>
                    <th class="p-2">FECHA</th>
                    <th class="p-2">CIUDADANO</th>
                    <th class="p-2">SECTOR</th>
                    <th class="p-2 text-center">MAPA</th>
                    <th class="p-2">DETALLE</th>
                    <th class="p-2 text-center">ESTADO</th>
                    <th class="p-2 text-center">ACCIONES</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr class="border-b border-gray-200">
                        <td class="p-2 text-gray-600">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="p-2 font-bold text-blue-900">${item.nombre_ciudadano}</td>
                        <td class="p-2 text-gray-700 uppercase font-semibold">${item.sector}</td>
                        <td class="p-2 text-center text-base">
                            ${item.ubicacion && item.ubicacion.includes('http') 
                                ? `<a href="${item.ubicacion}" target="_blank" title="Abrir Mapa" style="text-decoration: none;">📍</a>` 
                                : '<span class="text-gray-400 text-[8px]">N/A</span>'}
                        </td>
                        <td class="p-2 text-gray-500 italic max-w-[150px] truncate">${item.descripcion}</td>
                        <td class="p-2 text-center">
                            <span class="px-2 py-0.5 rounded shadow-sm font-black text-[8px] border ${
                                item.estado === 'Finalizado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                            }">${item.estado}</span>
                        </td>
                        <td class="p-2">
                            <div class="flex justify-center gap-1">
                                ${item.estado !== 'Finalizado' ? `
                                    <button onclick="window.cambiarEstado('${item.id}')" class="bg-green-600 text-white font-bold text-[8px] py-1 px-2 rounded hover:bg-green-700">OK</button>
                                    <button onclick="window.eliminarReporte('${item.id}')" class="bg-red-600 text-white font-bold text-[8px] py-1 px-2 rounded hover:bg-red-700">X</button>
                                ` : '✅'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
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

// 7. EXPORTAR EXCEL
window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error) return alert("Error al obtener datos");

    const ahora = new Date().toLocaleString();
    let xmlRows = "";
    data.forEach(r => {
        const f = new Date(r.created_at).toLocaleString();
        xmlRows += `
        <Row>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${f}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.nombre_ciudadano}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.sector}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.descripcion}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.estado}</Data></Cell>
            <Cell ss:StyleID="sDatos" ss:HRef="${r.ubicacion}"><Data ss:Type="String">VER MAPA</Data></Cell>
        </Row>`;
    });

    const excelTemplate = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
     <Styles>
      <Style ss:ID="sTitulo"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#228B22"/></Style>
      <Style ss:ID="sHeader"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#D3D3D3" ss:Pattern="Solid"/></Style>
      <Style ss:ID="sDatos"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
      <Style ss:ID="sFooter"><Font ss:Size="9" ss:Italic="1" ss:Color="#666666"/></Style>
     </Styles>
     <Worksheet ss:Name="Reportes">
      <Table ss:ExpandedColumnCount="6">
       <Column ss:Width="110"/><Column ss:Width="150"/><Column ss:Width="120"/><Column ss:Width="250"/><Column ss:Width="80"/><Column ss:Width="100"/>
       <Row ss:Height="30"><Cell ss:MergeAcross="5" ss:StyleID="sTitulo"><Data ss:Type="String">🛡️ REPORTE GAD LITA</Data></Cell></Row>
       <Row ss:Height="20">
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">FECHA</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">CIUDADANO</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">SECTOR</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">DETALLE</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">ESTADO</Data></Cell>
        <Cell ss:StyleID="sHeader"><Data ss:Type="String">UBICACIÓN GPS</Data></Cell>
       </Row>
       ${xmlRows}
      </Table>
     </Worksheet>
    </Workbook>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Lita.xls`;
    link.click();
};

// 8. SINCRONIZADOR
async function sincronizarPendientes() {
    if (!navigator.onLine) return;
    let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || "[]");
    if (pendientes.length === 0) return;
    for (let i = 0; i < pendientes.length; i++) {
        const { error } = await supabase.from('reportes').insert([pendientes[i]]);
        if (!error) { pendientes.splice(i, 1); i--; }
    }
    localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
}

window.addEventListener('online', sincronizarPendientes);
sincronizarPendientes();