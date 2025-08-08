CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('ADMINISTRADOR','CONDUCTOR','ESTUDIANTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE estado_viaje AS ENUM ('PLANIFICADO','EN_CURSO','FINALIZADO','CANCELADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE estado_reserva AS ENUM ('SOLICITADA','ACEPTADA','RECHAZADA','CANCELADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

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
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
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
  UNIQUE (id_viaje, id_estudiante)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_viajes_conductor ON viajes(id_conductor);
CREATE INDEX IF NOT EXISTS idx_viajes_estado_hora ON viajes(estado, salida_en);
CREATE INDEX IF NOT EXISTS idx_reservas_viaje ON reservas(id_viaje);
