// 1. CONEXIÓN ÚNICA A SUPABASE
const _supabase = supabase.createClient('https://vclmcliofzjofzllvytj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q');

// 2. FUNCIÓN PARA EL BOTÓN DE ACCESO (ADMIN)
function accesoAdmin() {
    const clave = prompt("Seguridad GAD Lita - Clave:");
    if (clave === "LITA2026") {
        document.getElementById('formReporte').style.display = 'none';
        document.getElementById('panelAdmin').style.display = 'block';
        cargarReportes(); // Carga los datos solo si la clave es correcta
    } else {
        alert("Clave incorrecta");
    }
}

// 3. FUNCIÓN PARA ENVIAR REPORTE CIUDADANO
async function enviarReporte() {
    const btn = document.getElementById('btnEnviar');
    const nom = document.getElementById('nombre').value;
    const sec = document.getElementById('sector').value;
    const des = document.getElementById('descripcion').value;

    if (!nom || !sec || !des) {
        alert("⚠️ Llena todos los campos");
        return;
    }

    btn.innerText = "Obteniendo GPS...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await _supabase.from('reportes').insert([{ 
            nombre_ciudadano: nom, 
            sector: sec, 
            descripcion: des, 
            ubicacion: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            estado: 'Pendiente'
        }]);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            alert("✅ Reporte enviado al GAD con éxito");
            location.reload(); 
        }
        btn.disabled = false;
        btn.innerText = "Enviar Reporte con GPS";
    }, (err) => {
        alert("📍 Debes activar el GPS del celular");
        btn.disabled = false;
        btn.innerText = "Enviar Reporte con GPS";
    });
}

// 4. FUNCIÓN PARA CARGAR LOS REPORTES EN LA TABLA
async function cargarReportes() {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='4'>Cargando datos del GAD...</td></tr>";
    
    const { data, error } = await _supabase
        .from('reportes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = "<tr><td colspan='4'>Error al conectar con la base</td></tr>";
        return;
    }

    lista.innerHTML = ""; // Limpiar el mensaje de carga
    data.forEach(r => {
        lista.innerHTML += `
            <tr>
                <td>${r.nombre_ciudadano}</td>
                <td>${r.sector}</td>
                <td>${r.descripcion}</td>
                <td><a href="${r.ubicacion}" target="_blank">📍 Ver</a></td>
            </tr>`;
    });
}