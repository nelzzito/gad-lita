const URL = 'https://vclmcliofzjofzllvytj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbG1jbGlvZnpqb2Z6bGx2eXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMTM5NjMsImV4cCI6MjA1MzY4OTk2M30.6_tUisI56r3mR_z098i7-nU-P1fG_y2q1r-P1fG_y2q';
const sb = supabase.createClient(URL, KEY);

function abrirAdmin() {
    if(prompt("Clave:") === "LITA2026") {
        document.getElementById('formReporte').style.display = 'none';
        document.getElementById('panelAdmin').style.display = 'block';
        cargar(3); // Intenta 3 veces
    }
}

async function enviar() {
    const n = document.getElementById('nombre').value;
    const s = document.getElementById('sector').value;
    const d = document.getElementById('descripcion').value;
    if(!n || !s || !d) return alert("Llene todo");

    document.getElementById('btnEnviar').innerText = "Enviando...";
    
    navigator.geolocation.getCurrentPosition(async (p) => {
        const { error } = await sb.from('reportes').insert([{ 
            nombre_ciudadano: n, sector: s, descripcion: d, 
            ubicacion: `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`,
            estado: 'Pendiente'
        }]);
        if(error) alert("Error: " + error.message);
        else { alert("Enviado!"); location.reload(); }
    }, () => alert("Active el GPS"));
}

async function cargar(intentos) {
    const t = document.getElementById('tablaCuerpo');
    t.innerHTML = "<tr><td colspan='6'>Conectando...</td></tr>";

    const { data, error } = await sb.from('reportes').select('*').order('created_at', { ascending: false });

    if (error) {
        if (intentos > 0) return setTimeout(() => cargar(intentos - 1), 1000);
        t.innerHTML = "<tr><td colspan='6' style='color:red;'>Falla de red. Reinicie.</td></tr>";
        return;
    }

    t.innerHTML = "";
    data.forEach(r => {
        t.innerHTML += `
            <tr>
                <td>${r.nombre_ciudadano}</td>
                <td>${r.sector}</td>
                <td>${r.descripcion}</td>
                <td><span class="badge">${r.estado}</span></td>
                <td><a href="${r.ubicacion}" target="_blank">Ver</a></td>
                <td>
                    <button class="btn-accion" style="background:#2563eb" onclick="act('${r.id}','OK')">OK</button>
                    <button class="btn-accion" style="background:#ef4444" onclick="act('${r.id}','X')">X</button>
                </td>
            </tr>`;
    });
}

async function act(id, est) {
    await sb.from('reportes').update({ estado: est }).eq('id', id);
    cargar(1);
}