export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MAX_LABELS_PER_TASK = 10;
export const LABEL_MIN_LENGTH = 1;
export const LABEL_MAX_LENGTH = 20;

// Clave del advisory lock global que serializa las escrituras que reordenan (plan 4.4).
export const BOARD_LOCK_KEY = 727001;

// Orden fijo de las columnas del tablero (RN-01).
export const STATUS_ORDER = [
  'pendiente',
  'en_progreso',
  'en_revision',
  'hecho',
] as const;
