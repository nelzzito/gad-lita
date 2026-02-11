import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

console.log("🔄 Intentando conectar con la nube del GAD Lita...")

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function enviarPrueba() {
    const { data, error } = await supabase
        .from('reportes')
        .insert([
            { 
                nombre_ciudadano: 'Nelson - Prueba Final', 
                descripcion: 'Verificación de manual replicable',
                sector: 'Lita Centro',
                estado: 'Pendiente'
            }
        ])

    if (error) {
        console.error("❌ Error de conexión:", error.message)
    } else {
        console.log("✅ ¡ÉXITO! El dato ya está en Supabase.")
    }
}

enviarPrueba()