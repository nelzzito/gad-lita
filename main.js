const _supabase = supabase.createClient('https://vclmcliofzjofzllvytj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q');

function accesoAdmin() {
    const clave = prompt("Ingrese Clave de Administrador:");
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

    if (!nom || !sec || !des) {
        alert("Por favor complete todos los campos");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await _supabase.from('reportes').insert([{ 
            nombre_ciudadano: nom, 
            sector: sec, 
            descripcion: des, 
            ubicacion: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            estado: 'Pendiente'
        }]);

        if (error) alert("Error: " + error.message);
        else { alert("✅ Reporte enviado con éxito"); location.reload(); }
    }, () => alert("Debe activar el GPS para enviar"));
}

async function cargarReportes() {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='6'>Cargando base de datos...</td></tr>";

    const { data, error } = await _supabase.from('reportes').select('*').order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = "<tr><td colspan='6'>Error de conexión. Reintente.</td></tr>";
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
                <td><a href="${r.ubicacion}" target="_blank">📍</a></td>
                <td>
                    <button class="btn-res" onclick="updateEstado('${r.id}', 'Resuelto')">OK</button>
                    <button class="btn-ign" onclick="updateEstado('${r.id}', 'Falso')">X</button>
                </td>
            </tr>`;
    });
}

async function updateEstado(id, nuevo) {
    const { error } = await _supabase.from('reportes').update({ estado: nuevo }).eq('id', id);
    if (!error) cargarReportes();
}