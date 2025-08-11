BEGIN;

-- 1) Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- 2) Tipos (ENUM)
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('ADMINISTRADOR','CONDUCTOR','ESTUDIANTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_viaje AS ENUM ('PLANIFICADO','EN_CURSO','FINALIZADO','CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_reserva AS ENUM ('SOLICITADA','ACEPTADA','RECHAZADA','CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tablas
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol rol_usuario NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  avatar_url TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  info_vehiculo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tel_largo CHECK (telefono IS NULL OR length(telefono) BETWEEN 7 AND 20)
);

CREATE TABLE IF NOT EXISTS viajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_conductor UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  origen_latitud DOUBLE PRECISION NOT NULL,
  origen_longitud DOUBLE PRECISION NOT NULL,
  destino_latitud DOUBLE PRECISION NOT NULL,
  destino_longitud DOUBLE PRECISION NOT NULL,
  salida_en TIMESTAMPTZ NOT NULL,
  asientos_totales INT NOT NULL CHECK (asientos_totales > 0),
  asientos_disponibles INT NOT NULL CHECK (asientos_disponibles >= 0),
  estado estado_viaje NOT NULL DEFAULT 'PLANIFICADO',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_viaje UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  id_estudiante UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  recogida_latitud DOUBLE PRECISION,
  recogida_longitud DOUBLE PRECISION,
  estado estado_reserva NOT NULL DEFAULT 'SOLICITADA',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_reserva_unica UNIQUE (id_viaje, id_estudiante)
);

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_rol               ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_viajes_conductor           ON viajes(id_conductor);
CREATE INDEX IF NOT EXISTS idx_viajes_estado_salida       ON viajes(estado, salida_en);
CREATE INDEX IF NOT EXISTS idx_reservas_viaje             ON reservas(id_viaje);
CREATE INDEX IF NOT EXISTS idx_reservas_estudiante_estado ON reservas(id_estudiante, estado);

-- 5) Triggers para actualizado_en
CREATE OR REPLACE FUNCTION touch_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_usuarios ON usuarios;
CREATE TRIGGER trg_touch_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION touch_actualizado_en();

DROP TRIGGER IF EXISTS trg_touch_viajes ON viajes;
CREATE TRIGGER trg_touch_viajes
BEFORE UPDATE ON viajes
FOR EACH ROW EXECUTE FUNCTION touch_actualizado_en();

DROP TRIGGER IF EXISTS trg_touch_reservas ON reservas;
CREATE TRIGGER trg_touch_reservas
BEFORE UPDATE ON reservas
FOR EACH ROW EXECUTE FUNCTION touch_actualizado_en();

-- 6) Vistas útiles
CREATE OR REPLACE VIEW vw_viajes_disponibles AS
SELECT
  r.id,
  r.id_conductor,
  u.nombre_completo AS nombre_conductor,
  u.info_vehiculo,
  r.origen_latitud, r.origen_longitud,
  r.destino_latitud, r.destino_longitud,
  r.salida_en,
  r.asientos_disponibles, r.asientos_totales,
  r.estado
FROM viajes r
JOIN usuarios u ON u.id = r.id_conductor
WHERE r.estado IN ('PLANIFICADO','EN_CURSO')
ORDER BY r.salida_en ASC;

CREATE OR REPLACE VIEW vw_reservas_detalle AS
SELECT
  b.id AS id_reserva,
  b.estado AS estado_reserva,
  b.creado_en AS reserva_creada,
  est.id AS id_estudiante,
  est.nombre_completo AS estudiante,
  r.id AS id_viaje,
  r.salida_en,
  r.origen_latitud, r.origen_longitud,
  r.destino_latitud, r.destino_longitud,
  drv.id AS id_conductor,
  drv.nombre_completo AS conductor
FROM reservas b
JOIN viajes r ON r.id = b.id_viaje
JOIN usuarios est ON est.id = b.id_estudiante
JOIN usuarios drv ON drv.id = r.id_conductor;

-- 7) SEED (opcional para desarrollo)
-- Comenta esta sección en producción si no quieres datos demo.
DO $$
DECLARE
  pass TEXT := '123456';
  hash TEXT;
  id_driver UUID;
BEGIN
  SELECT crypt(pass, gen_salt('bf')) INTO hash;  -- bcrypt

  -- Admin, Conductor, Estudiante (idempotente por correo)
  INSERT INTO usuarios (rol, correo, contrasena_hash, nombre_completo, telefono, info_vehiculo, latitud, longitud)
  VALUES 
    ('ADMINISTRADOR','admin@appride.com',hash,'Admin AppRide',NULL,NULL,NULL,NULL)
  ON CONFLICT (correo) DO NOTHING;

  INSERT INTO usuarios (rol, correo, contrasena_hash, nombre_completo, telefono, info_vehiculo, latitud, longitud)
  VALUES 
    ('CONDUCTOR','driver@appride.com',hash,'Conductor Demo','0999999999','Auto azul - PBA1234',-0.18,-78.47)
  ON CONFLICT (correo) DO NOTHING;

  INSERT INTO usuarios (rol, correo, contrasena_hash, nombre_completo, telefono, latitud, longitud)
  VALUES 
    ('ESTUDIANTE','student@appride.com',hash,'Estudiante Demo','0888888888',-0.19,-78.48)
  ON CONFLICT (correo) DO NOTHING;

  SELECT id INTO id_driver FROM usuarios WHERE correo='driver@appride.com' LIMIT 1;

  IF id_driver IS NOT NULL THEN
    INSERT INTO viajes (id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, salida_en, asientos_totales, asientos_disponibles, estado)
    VALUES (id_driver, -0.1807, -78.4678, -0.2093, -78.4911, now() + interval '2 hour', 3, 3, 'PLANIFICADO')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
