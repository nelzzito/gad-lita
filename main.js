// Conexión estable a Supabase
const _supabase = supabase.createClient('https://vclmcliofzjofzllvytj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q');

function accesoAdmin() {
    const clave = prompt("Seguridad GAD Lita - Clave:");
    if (clave === "LITA2026") {
        document.getElementById('formReporte').style.display = 'none';
        document.getElementById('panelAdmin').style.display = 'block';
        cargarReportes();
    }
}

async function enviarReporte() {
    const nom = document.getElementById('nombre').value;
    const sec = document.getElementById('sector').value;
    const des = document.getElementById('descripcion').value;
    const btn = document.getElementById('btnEnviar');

    if (!nom || !sec || !des) return alert("Por favor complete todos los campos");

    btn.innerText = "Localizando GPS...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await _supabase.from('reportes').insert([{ 
            nombre_ciudadano: nom, sector: sec, descripcion: des, 
            ubicacion: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            estado: 'Pendiente'
        }]);

        if (error) {
            alert("Error de conexión: " + error.message);
            btn.disabled = false;
            btn.innerText = "Enviar Reporte con GPS";
        } else {
            alert("✅ Reporte enviado correctamente");
            location.reload();
        }
    }, () => {
        alert("Active el GPS de su celular/PC");
        btn.disabled = false;
        btn.innerText = "Enviar Reporte con GPS";
    });
}

async function cargarReportes() {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Consultando base de datos...</td></tr>";

    const { data, error } = await _supabase.from('reportes').select('*').order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error al cargar datos. Verifique su internet.</td></tr>";
        return;
    }

    lista.innerHTML = "";
    data.forEach(r => {
        lista.innerHTML += `
            <tr>
                <td>${r.nombre_ciudadano}</td>
                <td>${r.sector}</td>
                <td>${r.descripcion}</td>
                <td><span class="badge">${r.estado}</span></td>
                <td><a href="${r.ubicacion}" target="_blank" style="text-decoration:none;">📍 Ver Mapa</a></td>
                <td>
                    <button class="btn-resolver" onclick="cambiarEstado('${r.id}', 'Resuelto')">Resolver</button>
                    <button class="btn-ignorar" onclick="cambiarEstado('${r.id}', 'Ignorado')">Ignorar</button>
                </td>
            </tr>`;
    });
}

async function cambiarEstado(id, nuevo) {
    const { error } = await _supabase.from('reportes').update({ estado: nuevo }).eq('id', id);
    if (!error) cargarReportes();
    else alert("Error al actualizar estado");
}