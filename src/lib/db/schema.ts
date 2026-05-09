export const SCHEMA_V1 = `
CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO schema_meta (key, value) VALUES ('version', '1');

CREATE TABLE companeros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cinturon TEXT,
  peso_relativo TEXT,
  notas TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sesiones (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  foco TEXT,
  tecnica_clase TEXT,
  obs_profesor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rolls (
  id TEXT PRIMARY KEY,
  sesion_id TEXT NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  companero_id TEXT REFERENCES companeros(id) ON DELETE SET NULL,
  orden INTEGER NOT NULL,
  tamano_relativo TEXT,
  duracion_min INTEGER,
  resultado TEXT,
  que_intente TEXT,
  que_fallo TEXT,
  posiciones_problema TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_rolls_sesion ON rolls(sesion_id);
CREATE INDEX idx_rolls_companero ON rolls(companero_id);
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha DESC);
`;
