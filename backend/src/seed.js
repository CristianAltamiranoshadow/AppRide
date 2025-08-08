require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const pass = '123456';
    const hash = await bcrypt.hash(pass, 10);

    // Crear usuarios demo (admin, conductor, estudiante)
    await pool.query(`
      INSERT INTO usuarios (rol, correo, contrasena_hash, nombre_completo, telefono, info_vehiculo, latitud, longitud)
      VALUES 
        ('ADMINISTRADOR','admin@appride.com',$1,'Admin AppRide','',NULL,NULL,NULL),
        ('CONDUCTOR','driver@appride.com',$1,'Conductor Demo','0999999999','Auto azul - PBA1234',-0.18,-78.47),
        ('ESTUDIANTE','student@appride.com',$1,'Estudiante Demo','0888888888',NULL,-0.19,-78.48)
      ON CONFLICT (correo) DO NOTHING;
    `, [hash]);

    // Buscar id del conductor
    const { rows: drows } = await pool.query(
      `SELECT id FROM usuarios WHERE correo='driver@appride.com' LIMIT 1`
    );
    const driverId = drows[0]?.id;

    // Crear un viaje de ejemplo si hay conductor
    if (driverId) {
      await pool.query(`
        INSERT INTO viajes (id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, salida_en, asientos_totales, asientos_disponibles, estado)
        VALUES ($1, -0.1807, -78.4678, -0.2093, -78.4911, now() + interval '2 hour', 3, 3, 'PLANIFICADO')
        ON CONFLICT DO NOTHING;
      `, [driverId]);
    }

    console.log('Seed OK');
    console.log('Usuarios de prueba:');
    console.log('  admin@appride.com / 123456');
    console.log('  driver@appride.com / 123456');
    console.log('  student@appride.com / 123456');
  } catch (e) {
    console.error('Error en seed:', e.message);
  } finally {
    await pool.end();
  }
})();
