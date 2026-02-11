const SUPABASE_URL = 'https://vclmcliofzjofzllvytj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function accesoAdmin() {
    const clave = prompt("Clave GAD:");
    if (clave === "LITA2026") {
        document.getElementById('formReporte').style.display = 'none';
        document.getElementById('panelAdmin').style.display = 'block';
        cargarReportes(3); // Intenta cargar hasta 3 veces si falla
    }
}

async function enviarReporte() {
    const nom = document.getElementById('nombre').value;
    const sec = document.getElementById('sector').value;
    const des = document.getElementById('descripcion').value;
    if (!nom || !sec || !des) return alert("Llene todos los campos");

    document.getElementById('btnEnviar').innerText = "Enviando...";
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await _supabase.from('reportes').insert([{ 
            nombre_ciudadano: nom, sector: sec, descripcion: des, 
            ubicacion: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            estado: 'Pendiente'
        }]);
        if (error) alert("Error: " + error.message);
        else { alert("✅ Enviado"); location.reload(); }
    }, () => alert("Active el GPS"));
}

async function cargarReportes(intentos) {
    const lista = document.getElementById('listaReportes');
    lista.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Conectando...</td></tr>";
    
    const { data, error } = await _supabase.from('reportes').select('*').order('created_at', { ascending: false });

    if (error) {
        if (intentos > 0) {
            console.log("Reintentando conexión...");
            setTimeout(() => cargarReportes(intentos - 1), 1000);
        } else {
            lista.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error crítico de red. Refresque (Ctrl+F5).</td></tr>";
        }
        return;
    }

    lista.innerHTML = "";
    data.forEach(r => {
        lista.innerHTML += `
            <tr>
                <td>${r.nombre_ciudadano}</td>
                <td>${r.sector}</td>
                <td>${r.descripcion || '-'}</td>
                <td><span class="badge">${r.estado}</span></td>
                <td><a href="${r.ubicacion}" target="_blank">📍 Ver</a></td>
                <td>
                    <button class="btn-resolver" onclick="actualizar('${r.id}', 'Resuelto')">OK</button>
                    <button class="btn-ignorar" onclick="actualizar('${r.id}', 'Ignorado')">X</button>
                </td>
            </tr>`;
    });
}

async function actualizar(id, estado) {
    await _supabase.from('reportes').update({ estado: estado }).eq('id', id);
    cargarReportes(1);
}