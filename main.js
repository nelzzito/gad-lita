// 1. CONFIGURACIÓN SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://kmqvhgmscebycwfjmawa.supabase.co'
const supabaseKey = 'sb_publishable_3zVaSitNPLjesbRMx3CRyA_6SwAjjiF'
window.supabase = createClient(supabaseUrl, supabaseKey)

let listaFotos = []; // Almacén temporal de archivos

// --- NUEVAS FUNCIONES DE VALIDACIÓN Y CARGA ---

// Cargar sectores desde la base de datos al iniciar
async function cargarSectores() {
    const combo = document.getElementById('sector');
    if (!combo) return;
    try {
        const { data } = await supabase.from('sectores').select('nombre_sector').eq('activo', true).order('nombre_sector');
        if (data) {
            combo.innerHTML = '<option value="" disabled selected>Seleccione el sector...</option>';
            data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.nombre_sector;
                opt.textContent = s.nombre_sector;
                combo.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error al cargar sectores", e); }
}

// Escuchar cuando el DOM esté listo para cargar los sectores
//document.addEventListener('DOMContentLoaded', cargarSectores);
cargarSectores();

// Lógica de validación de cédula y bloqueo de nombre
setTimeout(() => { // Usamos un pequeño delay para asegurar que el DOM cargó
    const cedulaInput = document.getElementById('cedula');
    const nombreInput = document.getElementById('nombre');

    if (cedulaInput && nombreInput) {
        // VALIDACIÓN PROFESIONAL DE NOMBRE (Solo letras y Mayúsculas)
nombreInput.addEventListener('input', (e) => {
    let valor = e.target.value;
    
    // 1. Solo permite letras (incluye Ñ y tildes) y espacios
    valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, "");
    
    // 2. Convierte todo a MAYÚSCULAS automáticamente
    e.target.value = valor.toUpperCase();
});
cedulaInput.addEventListener('input', async (e) => {
            const ci = e.target.value;
            
            // Limpieza de estilos cada vez que escribe
            cedulaInput.classList.remove('border-red-500', 'border-green-500', 'ring-2', 'ring-red-200', 'border-blue-500');

            if (ci.length === 10) {
                // 1. CASO ESPECIAL: COMODÍN 9999999999
                if (ci === "9999999999") {
                    cedulaInput.classList.add('border-blue-500');
                    nombreInput.value = "";
                    nombreInput.disabled = false;
                    nombreInput.placeholder = "REGISTRO ESPECIAL: INGRESE NOMBRE";
                    nombreInput.classList.remove('bg-gray-100');
                    nombreInput.focus();
                    return;
                }

                // 2. VALIDACIÓN MATEMÁTICA
                if (validarCedulaEcuatoriana(ci)) {
                    cedulaInput.classList.add('border-green-500');
                    nombreInput.placeholder = "Buscando en base de datos... ⏳";
                    
                    const { data } = await supabase.from('ciudadanos').select('nombre_completo').eq('cedula', ci).single();

                    if (data) {
                        nombreInput.value = data.nombre_completo;
                        nombreInput.disabled = true;
                        nombreInput.classList.add('bg-gray-100', 'font-bold', 'text-blue-900');
                    } else {
                        nombreInput.value = "";
                        nombreInput.disabled = false;
                        nombreInput.placeholder = "Ciudadano nuevo: Ingrese Nombre";
                        nombreInput.classList.remove('bg-gray-100');
                        nombreInput.focus();
                    }
                } else {
                    // CÉDULA INVÁLIDA (No pasa el algoritmo)
                    cedulaInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
                    nombreInput.value = "";
                    nombreInput.disabled = true;
                    nombreInput.placeholder = "Cédula Incorrecta o Falsa ❌";
                }
            } else {
                // Si tiene menos de 10 dígitos, reseteamos el nombre
                nombreInput.value = "";
                nombreInput.disabled = true;
                nombreInput.classList.add('bg-gray-100');
                nombreInput.placeholder = "Ingrese cédula primero...";
            }
        });
    }
}, 500);

// --- FUNCIÓN COMPRESIÓN: OPTIMIZADA ---
async function comprimirImagen(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Tamaño profesional para reportes
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
            
            // Calidad 0.6 para asegurar que 3 fotos pesen menos de 1MB en total
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
    });
}


// --- FUNCIÓN MATEMÁTICA: VALIDAR CÉDULA ECUATORIANA ---
function validarCedulaEcuatoriana(cedula) {
    if (cedula === "9999999999") return true; // Comodín para casos especiales
    if (cedula.length !== 10) return false;
    
    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (!((provincia > 0 && provincia <= 24) || provincia === 30)) return false;

    const digitoVerificador = parseInt(cedula.substring(9, 10), 10);
    let suma = 0;
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];

    for (let i = 0; i < 9; i++) {
        let valor = parseInt(cedula.substring(i, i + 1), 10) * coeficientes[i];
        if (valor > 9) valor -= 9;
        suma += valor;
    }

    const total = (Math.ceil(suma / 10) * 10);
    const resultado = total - suma;
    
    return (resultado === 10 ? 0 : resultado) === digitoVerificador;
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
// --- FUNCIÓN GPS: CORREGIDA ---
async function obtenerLinkMapa() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve("No soportado");
        } else {
            navigator.geolocation.getCurrentPosition(
                (p) => {
                    // Corrección de sintaxis en la URL de Google Maps
                    const lat = p.coords.latitude;
                    const lon = p.coords.longitude;
                    const link = `https://www.google.com/maps?q=${lat},${lon}`;
                    resolve(link);
                },
                (error) => {
                    console.warn("GPS Error:", error);
                    resolve("No proporcionada");
                }, 
                { 
                    timeout: 8000, 
                    enableHighAccuracy: true 
                }
            );
        }
    });
}

// 3. ENVÍO DEL CIUDADANO (ESTRATEGIA HÍBRIDA OFFLINE/ONLINE)
window.enviarReporte = async function() {
    const ci = document.getElementById('cedula').value;
    const nombreInput = document.getElementById('nombre'); 
    const n = nombreInput.value; 
    const s = document.getElementById('sector').value;
    const d = document.getElementById('detalle').value;
    
    if (!ci || ci.length < 10 || !n || !s || !d || listaFotos.length === 0) {
        return alert("⚠️ Complete todos los campos correctamente e incluya al menos una foto.");
    }

    const btn = document.querySelector("button[onclick='enviarReporte()']");
    if(btn) { btn.disabled = true; btn.innerText = "Enviando... ⏳"; }

    try {
        const gps = await obtenerLinkMapa();

        // --- GUARDADO INTELIGENTE DE CIUDADANO ---
        // Se ejecuta siempre (Online u Offline) para asegurar el registro
        if (nombreInput.disabled === false && ci.length === 10) {
            await supabase.from('ciudadanos').upsert({ 
                cedula: ci, 
                nombre_completo: n 
            }, { onConflict: 'cedula' });
        }

        if (!navigator.onLine) {
            // PROCESO OFFLINE CON COMPRESIÓN
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
                cedula_ciudadano: ci, // Agregado para consistencia
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

            alert("📡 Sin internet: Reporte guardado localmente. Se enviará cuando vuelvas a tener conexión.");
            location.reload();
            return;
        }

        // PROCESO ONLINE
        const subidas = [];
        for (const f of listaFotos) {
            subidas.push(await subirFoto(f));
        }
        
        // --- INSERTAR REPORTE ---
        const { error } = await supabase.from('reportes').insert([{ 
            cedula_ciudadano: ci,
            nombre_ciudadano: n, 
            sector: s, 
            descripcion: d, 
            ubicacion: gps, 
            foto_url: subidas.join(', '), 
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

// 4. ADMINISTRACIÓN (ACTUALIZADO CON REALTIME)
window.verificarAdmin = async function() {
    const clave = prompt("Clave de acceso:");

    const { data, error } = await supabase
        .from('admin_config')
        .select('clave')
        .eq('id', 1)
        .single();

    if (error || !data) {
        return alert("Error al validar clave");
    }

    if (clave === data.clave) {
        document.getElementById('panelAdmin').classList.remove('hidden');
        if (document.getElementById('btnAccesoAdmin')) {
            document.getElementById('btnAccesoAdmin').classList.add('hidden');
        }

        // 🔥 ESTO SE MANTIENE IGUAL (NO TOCAR)
        actualizarTabla();

        supabase.channel('cambios_reportes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'reportes' 
            }, () => {
                console.log('Cambio detectado en tiempo real');
                actualizarTabla();
            })
            .subscribe();

    } else {
        alert("Clave incorrecta");
    }
};

window.cambiarClaveAdmin = async function() {
    const nueva = prompt("Nueva clave:");
    if (!nueva) return;

    const { error } = await supabase
        .from('admin_config')
        .update({ clave: nueva })
        .eq('id', 1);

    if (error) {
        alert("Error al cambiar clave");
    } else {
        alert("Clave actualizada correctamente");
    }
};

// 5. TABLA WEB
async function actualizarTabla() {
    const { data, error } = await supabase.from('reportes').select('id, created_at, nombre_ciudadano, sector, descripcion, estado, ubicacion, foto_url, cedula_ciudadano').order('created_at', { ascending: false });
    const cont = document.getElementById('tablaReportes');
    if (error || !cont) return;

    cont.innerHTML = `
    <div style="max-height: 60vh; overflow-y: auto;">    
    <table class="w-full text-left text-[10px] border-collapse">
           <thead class="bg-gray-200 text-gray-800 border-b border-gray-400">
    <tr class="uppercase font-black text-[10px]">
        <th class="p-2 relative">
    FECHA
    <span onclick="abrirFiltro(event, 'fecha')" class="cursor-pointer ml-1">🔽</span>
</th>
        <th class="p-2 relative">
    CIUDADANO
    <span onclick="abrirFiltro(event, 'ciudadano')" class="cursor-pointer ml-1">🔽</span>
</th>
        <th class="p-2 relative">
    SECTOR
    <span onclick="abrirFiltro(event, 'sector')" class="cursor-pointer ml-1">🔽</span>
</th>
        <th class="p-2 text-center">FOTOS</th>
        <th class="p-2 text-center">MAPA</th>
        <th class="p-2">DETALLE</th>
       <th class="p-2 text-center relative">
    ESTADO
    <span onclick="abrirFiltro(event, 'estado')" class="cursor-pointer ml-1">🔽</span>
</th>
        <th class="p-2 text-center">ACCIONES</th>
    </tr>
   
</thead>            <tbody>
                ${data.map(item => {
                  
                    const fotos = item.foto_url ? item.foto_url.split(', ') : [];
                    const fotosHtml = fotos.map((url, i) => `<a href="${url}" target="_blank" class="mr-1">🖼️${i+1}</a>`).join('');
  console.log("ID EN TABLA:", item.id);
                    console.log("ITEM:", item);
                    return `
                    <tr class="border-b border-gray-200">
                        <td class="p-2 text-gray-600">${new Date(item.created_at).toLocaleDateString()}</td>
                      <td class="p-2 font-bold text-blue-900 leading-tight">
    <div class="text-[9px] text-gray-400 font-normal">${item.cedula_ciudadano || 'S/C'}</div>
    ${item.nombre_ciudadano}
</td>
                        <td class="p-2 text-gray-700 uppercase font-semibold">${item.sector}</td>
                        <td class="p-2 text-center">${fotosHtml || '—'}</td>
                        <td class="p-2 text-center text-base">
                            ${item.ubicacion && item.ubicacion.includes('http') 
                                ? `<a href="${item.ubicacion}" target="_blank">📍</a>` 
                                : '<span class="text-gray-400 text-[8px]">N/A</span>'}
                        </td>
                        <td class="p-2 text-gray-500 italic max-w-[200px]">${item.descripcion}</td>
                        <td class="p-2 text-center">
    <span class="px-2 py-0.5 rounded shadow-sm font-black text-[8px] border ${
        item.estado === 'Finalizado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
        item.estado === 'Atendido' ? 'bg-blue-50 text-blue-700 border-blue-200' :
        item.estado === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
        'bg-yellow-50 text-yellow-800 border-yellow-200'
    }">${item.estado}</span>
</td>
                       <td class="p-2 text-center">
    <div class="flex justify-center gap-1">
        ${item.estado === 'Pendiente' && item.id ? `
            
            <button onclick="window.cambiarEstado(${item.id})" 
                    title="Marcar como Atendido" 
                    class="bg-green-600 hover:bg-green-700 text-white font-bold text-[8px] py-1 px-2 rounded transition-colors">
                OK
            </button>
            <button onclick="window.eliminarReporte(${item.id})" 
                    title="Eliminar/Cancelar Reporte" 
                    class="bg-red-600 hover:bg-red-700 text-white font-bold text-[8px] py-1 px-2 rounded transition-colors">
                X
            </button>
        ` : (item.estado === 'Atendido' ? '✅' : (item.estado === 'Cancelado' ? '❌' : '—'))}
    </div>
</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

window.filtrosActivos = {};

window.abrirFiltro = function(event, columna) {
    event.stopPropagation();

    const dropdown = document.getElementById('filtroDropdown');
    dropdown.innerHTML = "";

    const filas = document.querySelectorAll("#tablaReportes tbody tr");

    const indexCol =
        columna === 'fecha' ? 0 :
        columna === 'ciudadano' ? 1 :
        columna === 'sector' ? 2 :
        columna === 'estado' ? 6 : 0;

    const valores = new Set();

    filas.forEach(fila => {
        const texto = fila.querySelectorAll("td")[indexCol]?.innerText.trim();
        if (texto) valores.add(texto);
    });

    const lista = Array.from(valores).sort();

    // 🔥 SI YA HAY FILTRO ACTIVO, USARLO
    const seleccionadosPrevios = filtrosActivos[columna] || lista;

    let html = `
        <label class="flex items-center gap-1 font-bold">
            <input type="checkbox" id="checkAll"> TODOS
        </label>
        <hr class="my-1">
    `;

    lista.forEach(valor => {
        const checked = seleccionadosPrevios.includes(valor) ? "checked" : "";
        html += `
            <label class="flex items-center gap-1">
                <input type="checkbox" class="checkItem" value="${valor}" ${checked}>
                ${valor}
            </label>
        `;
    });

    html += `
        <button onclick="aplicarFiltro('${columna}')" class="mt-2 bg-blue-600 text-white px-2 py-1 rounded w-full">
            Aplicar
        </button>
    `;

    dropdown.innerHTML = html;

    // 📍 POSICIÓN
    dropdown.classList.remove("hidden");
    dropdown.style.top = event.pageY + "px";
    dropdown.style.left = event.pageX + "px";

    // 🔥 ESTADO DEL CHECK TODOS
    const todosMarcados = lista.length === seleccionadosPrevios.length;
    document.getElementById("checkAll").checked = todosMarcados;

    // 🔥 CONTROL SELECT ALL
    document.getElementById("checkAll").addEventListener("change", function() {
        document.querySelectorAll(".checkItem").forEach(c => c.checked = this.checked);
    });
};


window.aplicarFiltro = function(columna) {
    const checks = document.querySelectorAll(".checkItem:checked");

    const seleccionados = Array.from(checks).map(c => c.value);

    filtrosActivos[columna] = seleccionados;

    aplicarFiltrosGlobal();

    const dropdown = document.getElementById('filtroDropdown');
dropdown.classList.add("hidden");

};

function aplicarFiltrosGlobal() {
    const filas = document.querySelectorAll("#tablaReportes tbody tr");

    filas.forEach(fila => {
        const celdas = fila.querySelectorAll("td");

        const data = {
            fecha: celdas[0]?.innerText.trim(),
            ciudadano: celdas[1]?.innerText.trim(),
            sector: celdas[2]?.innerText.trim(),
            estado: celdas[6]?.innerText.trim()
        };

        let visible = true;

        for (let col in filtrosActivos) {
            if (!filtrosActivos[col].includes(data[col])) {
                visible = false;
                break;
            }
        }

        fila.style.display = visible ? "" : "none";
    });
}

document.addEventListener("click", (e) => {
    const dropdown = document.getElementById('filtroDropdown');

    if (!dropdown) return;

    // 🔥 Si el click fue DENTRO del dropdown → NO cerrar
    if (dropdown.contains(e.target)) return;

    // 🔥 Si el click fue en el botón 🔽 → tampoco cerrar
    if (e.target.closest("th")) return;

    dropdown.classList.add("hidden");
});


// ============================================================
// 6. GESTIÓN DE REPORTES (MODAL DINÁMICO)
// ============================================================

// DECLARAR SOLO UNA VEZ COMO GLOBALES DE WINDOW
window.idReporteSeleccionado = null;
window.accionSeleccionada = null;

window.cambiarEstado = (id) => {
    console.log("CLICK cambiarEstado ID:", id);
    console.log("ID Recibido:", id);
  window.idReporteSeleccionado = id; // Aseguramos que se guarde en window
    window.accionSeleccionada = 'Atendido';
    abrirModalGestion("Finalizar Reporte", 'Atendido');
};

window.eliminarReporte = (id) => {
    console.log("CLICK eliminarReporte ID:", id);
   window.idReporteSeleccionado = id; // Aseguramos que se guarde en window
    window.accionSeleccionada = 'Cancelado';
    abrirModalGestion("Eliminar/Cancelar Reporte", 'Cancelado');
};

async function abrirModalGestion(titulo, tipoAccion) {
    const modal = document.getElementById('modalGestion');
    const combo = document.getElementById('comboMotivo');
    const tituloElemento = document.getElementById('modalTitulo');
    
    if (!modal || !combo) return;

    tituloElemento.innerText = titulo;
    combo.innerHTML = '<option disabled selected>Cargando opciones...</option>';
    modal.style.display = 'flex';

    try {
        // CONSULTA DINÁMICA A LA BBDD
        const { data, error } = await supabase
            .from('config_combos')
            .select('opcion')
            .eq('tipo', tipoAccion)
            .eq('activo', true);

        if (error) throw error;

        if (data && data.length > 0) {
            combo.innerHTML = data.map(d => `<option value="${d.opcion}">${d.opcion}</option>`).join('');
        } else {
            combo.innerHTML = '<option value="General">General / Otros</option>';
        }
    } catch (e) {
        console.error("Error cargando motivos:", e);
        combo.innerHTML = '<option value="Error">Error al cargar opciones</option>';
    }
    
    document.getElementById('txtObservacion').value = ""; 
}

// Configuración de eventos del Modal (Se ejecuta una sola vez)


document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    const btnCancelar = document.getElementById('btnCancelarModal');

    // 1. Lógica para cerrar el modal
    if (btnCancelar) {
        btnCancelar.onclick = () => {
            const modal = document.getElementById('modalGestion');
            if (modal) modal.style.display = 'none';
        };
    }
console.log("CONFIRMAR ID:", window.idReporteSeleccionado);
    if (btnConfirmar) {
    btnConfirmar.onclick = async () => {
         console.log("ID GLOBAL ACTUAL:", window.idReporteSeleccionado);
        const motivoElement = document.getElementById('comboMotivo');
        const observacionElement = document.getElementById('txtObservacion');
        
        if (!motivoElement || !observacionElement) return;

        const motivo = motivoElement.value;
        const observacion = observacionElement.value;

        // VALIDACIÓN: Evita el error de "undefined" en bigint
       if (
    window.idReporteSeleccionado === null ||
    window.idReporteSeleccionado === undefined ||
    isNaN(Number(window.idReporteSeleccionado))
) {
    console.error("ID inválido detectado:", window.idReporteSeleccionado);
    return alert("Error: ID inválido");
}

        if (!motivo || motivo.includes("Cargando")) {
            return alert("Por favor seleccione un motivo.");
        }

        btnConfirmar.disabled = true;
        btnConfirmar.innerText = "Guardando...";

        try {
            const { error } = await supabase
                .from('reportes')
                .update({ 
                    estado: window.accionSeleccionada,
                    motivo_accion: motivo,
                    observacion_cierre: observacion,
                    fecha_gestion: new Date().toISOString()
                })
                .eq('id', Number(window.idReporteSeleccionado));

            if (!error) {
                document.getElementById('modalGestion').style.display = 'none';
            } else {
                alert("Error al actualizar: " + error.message);
            }
        } catch (err) {
            console.error("Error en la petición:", err);
            alert("Error de conexión con el servidor.");
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.innerText = "Confirmar";
             }
        }; 
    } 

}); // Cierre de document.addEventListener

// 7. EXPORTAR EXCEL PROFESIONAL
window.exportarExcel = async function() {
    const { data, error } = await supabase.from('reportes').select('*').order('created_at', { ascending: false });
    if (error) return alert("Error al obtener datos");

    let xmlRows = "";
    data.forEach(r => {
        const f = new Date(r.created_at).toLocaleString();
        const fotosArray = r.foto_url ? r.foto_url.split(', ') : [];
        const linkFoto = fotosArray.length > 0 ? fotosArray[0] : "";
        const motivoAccion = r.motivo_accion || "N/A";
        const observacion = r.observacion_cierre || "N/A";

        xmlRows += `
        <Row>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${f}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.cedula_ciudadano}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.nombre_ciudadano}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.sector}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.descripcion}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${r.estado}</Data></Cell>
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${motivoAccion}</Data></Cell> 
            <Cell ss:StyleID="sDatos"><Data ss:Type="String">${observacion}</Data></Cell> 
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
        <Table ss:ExpandedColumnCount="10">
            <Column ss:Width="110"/><Column ss:Width="130"/><Column ss:Width="100"/><Column ss:Width="200"/><Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="150"/><Column ss:Width="150"/><Column ss:Width="80"/>
            <Row ss:Height="30"><Cell ss:MergeAcross="9" ss:StyleID="sTitulo"><Data ss:Type="String">🛡️ REPORTE GAD PARROQUIAL DE LITA</Data></Cell></Row>
            <Row ss:Height="20">
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">FECHA</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">CEDULA</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">NOMBRE</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">SECTOR</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">DETALLE</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">ESTADO</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">MOTIVO ACCIÓN</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">OBSERVACIONES</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">MAPA</Data></Cell>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">FOTO</Data></Cell>
            </Row>
            ${xmlRows}
            
            <Row>
                <Cell><Data ss:Type="String"> </Data></Cell>
                 <Cell colspan="9"><Data ss:Type="String"> </Data></Cell>
            </Row>
            <Row>
                 <Cell><Data ss:Type="String"> </Data></Cell>
                 <Cell colspan="9"><Data ss:Type="String"> </Data></Cell>
            </Row>
           

            
            
            <Row>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">Generado por:</Data></Cell>
                <Cell ss:StyleID="sDatos" colspan="9"><Data ss:Type="String">Administrador</Data></Cell>
            </Row>
            <Row>
                <Cell ss:StyleID="sHeader"><Data ss:Type="String">Fecha de Generación:</Data></Cell>
                <Cell ss:StyleID="sDatos" colspan="9"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
            </Row>
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
            
            for (const b64 of reporte.foto_url) {
                const res = await fetch(b64);
                const blob = await res.blob();
                const archivo = new File([blob], `offline_${Date.now()}.jpg`, { type: "image/jpeg" });
                const url = await subirFoto(archivo);
                urlsFinales.push(url);
            }

            reporte.foto_url = urlsFinales.join(', ');
            const { error } = await supabase.from('reportes').insert([{
                cedula_ciudadano: reporte.cedula_ciudadano,
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
// --- SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker registrado');

                // Detecta si hay una actualización en espera
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // Hay contenido nuevo disponible, el sw.js hará el resto
                                console.log('Nueva versión detectada en GitHub.');
                            }
                        }
                    };
                };
            })
            .catch(err => console.error('Error al registrar el SW:', err));
    });

    // Este evento se dispara cuando el sw.js activa el self.clients.claim()
   navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Nueva versión lista (sin recarga automática)');

    });
}

window.addEventListener('online', sincronizarPendientes);
sincronizarPendientes();