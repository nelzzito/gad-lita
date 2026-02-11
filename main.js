// ESPERAR A QUE LA LIBRERÍA CARGUE PARA EVITAR ERROR DE CONEXIÓN
let _supabase;

window.onload = () => {
    _supabase = supabase.createClient('https://vclmcliofzjofzllvytj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q');
    console.log("Conexión inicializada");
};

function accesoAdmin() {
    const clave = prompt("Clave de Acceso:");
    if (clave === "LITA2026") {
        document.getElementById('formReporte').style.display = 'none';
        document.getElementById('panelAdmin').style.display = 'block';
        cargarReportes();
    } else {
        alert("Clave incorrecta");
    }
}

async function enviarReporte() {
    const nom = document.getElementById('nombre').value;
    const sec = document.getElementById('sector').value;
    const des = document.getElementById('descripcion').value;
    
    if (!nom || !sec || !des) return alert("Por favor, llena todo.");

    const btn = document.getElementById('btnEnviar');
    btn.innerText = "Enviando...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await _supabase.from('reportes').insert([{ 
            nombre_ciudadano: nom, sector: sec, descripcion: des, 
            ubicacion: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            estado: 'Pendiente'
        }]);
        if (error) alert("Error al guardar: " + error.message);
        else { alert("✅ Reporte enviado!"); location.reload(); }
    }, () => {
        alert("Debes activar el GPS");
        btn.innerText = "Enviar al GAD";
        btn.disabled = false;
    });
}

async function cargarReportes() {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='6'>Cargando datos...</td></tr>";

    const { data, error } = await _supabase.from('reportes').select('*').order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = "<tr><td colspan='6'>Error de conexión. Intenta de nuevo.</td></tr>";
        return;
    }

    lista.innerHTML = "";
    data.forEach(r => {
        lista.innerHTML += `
            <tr>
                <td>${r.nombre_ciudadano}</td>
                <td>${r.sector}</td>
                <td>${r.descripcion || ''}</td>
                <td><span class="badge">${r.estado}</span></td>
                <td><a href="${r.ubicacion}" target="_blank">📍 Ver</a></td>
                <td>
                    <button class="btn-resolver" onclick="actualizarEstado('${r.id}', 'Resuelto')">Resolver</button>
                    <button class="btn-ignorar" onclick="actualizarEstado('${r.id}', 'Ignorado')">Ignorar</button>
                </td>
            </tr>`;
    });
}

async function actualizarEstado(id, nuevoEstado) {
    const { error } = await _supabase.from('reportes').update({ estado: nuevoEstado }).eq('id', id);
    if (error) alert("Error al actualizar");
    else cargarReportes();
}