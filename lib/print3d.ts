export type FilamentSlot = {
  globalId: number;
  amsId: number;
  slotId: number;
  label: string;
  type?: string | null;
  color?: string | null;
  remain?: number | null;
  nozzleTempMin?: number | null;
  nozzleTempMax?: number | null;
  state?: number | null;
  active?: boolean;
  external?: boolean;
};

export type AmsUnit = {
  id: number;
  humidity?: number | null;
  humidityRaw?: number | null;
  temperature?: number | null;
  drying?: number | null;
  trays: FilamentSlot[];
};

export type Print3dStatus = {
  ok: boolean;
  printer: {
    name?: string;
    serial?: string;
    ip?: string;
    firmware?: string;
    state?: string;
    stateLabel?: string;
    progress?: number | null;
    remainingMinutes?: number | null;
    layer?: number | null;
    totalLayers?: number | null;
    subtask?: string | null;
    gcodeFile?: string | null;
    wifi?: string | null;
    sdcard?: boolean | null;
    developerMode?: boolean | null;
    signedCommandsRequired?: boolean | null;
    errors?: {
      printError?: number;
      mcError?: number;
      failReason?: string;
      hms?: Array<{
        attr: string;
        code: string;
        display?: string;
        timestamp?: string;
      }>;
    };
  };
  temperatures?: {
    bed?: { current?: number | null; target?: number | null };
    nozzles?: Array<{
      index: number;
      current?: number | null;
      target?: number | null;
      type?: string | null;
      diameter?: number | null;
      active?: boolean;
    }>;
    chamber?: { current?: number | null; target?: number | null };
  };
  fans?: Record<string, number | null>;
  ams?: {
    units?: AmsUnit[];
    slots?: FilamentSlot[];
    activeTray?: number | null;
    targetTray?: number | null;
  };
  camera?: { available?: boolean };
  capabilities?: { startPrint?: boolean };
  connection?: {
    mqtt?: boolean;
    lastUpdate?: number | null;
    lastError?: string | null;
  };
  limits?: Print3dLimits;
};

export type Print3dResult = {
  ok: boolean;
  dryRun?: boolean;
  uploaded?: boolean;
  started?: boolean;
  filename?: string;
  plate?: number;
  subtask?: string;
  printer?: string;
  filaments?: Array<{
    index: number;
    type?: string | null;
    color?: string | null;
    grams?: number | null;
    slot?: string | null;
    globalTray?: number | null;
  }>;
  warnings?: string[];
  settings?: {
    useAms?: boolean;
    amsMapping?: number[] | null;
    amsMapping2?: Array<{ ams_id: number; slot_id: number }> | null;
    bedLeveling?: boolean;
    flowCali?: boolean;
    vibrationCali?: boolean;
    layerInspect?: boolean;
    timelapse?: boolean;
  };
  state?: string;
};

export type MappingFilament = {
  id?: number;
  type?: string | null;
  color?: string | null;
  used_grams?: number | null;
};

export type FilamentMappingError = {
  needsMapping: true;
  error: string;
  filaments: MappingFilament[];
  slots: FilamentSlot[];
};

export type Print3dLimits = {
  maxFileBytes: number;
  maxFileMb: number;
};

export type PrintStateTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

export function isGcode3mfFile(file: { name: string }): boolean {
  return /\.gcode\.3mf$/i.test(file.name);
}

export function isValidFilamentMap(value: string): boolean {
  if (value.length > 64) return false;
  return /^[A-Za-z0-9]+(?:,[A-Za-z0-9]+)*$/.test(value);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export function formatMinutes(minutes?: number | null): string {
  if (typeof minutes !== 'number' || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export function formatTemp(current?: number | null, target?: number | null): string {
  const currentText = typeof current === 'number' ? `${current.toFixed(0)}°C` : '—';
  if (typeof target === 'number' && target > 0) {
    return `${currentText} → ${target.toFixed(0)}°C`;
  }
  return currentText;
}

export function stateTone(state?: string | null): PrintStateTone {
  switch (state) {
    case 'RUNNING':
      return 'blue';
    case 'PREPARE':
    case 'SLICING':
      return 'amber';
    case 'PAUSE':
      return 'amber';
    case 'FAILED':
      return 'red';
    case 'FINISH':
      return 'green';
    default:
      return 'neutral';
  }
}

export function isBusyState(state?: string | null): boolean {
  return (
    state === 'PREPARE' || state === 'RUNNING' || state === 'PAUSE' || state === 'SLICING'
  );
}

export function isMappingError(value: unknown): value is FilamentMappingError {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<FilamentMappingError>;
  return (
    payload.needsMapping === true &&
    typeof payload.error === 'string' &&
    Array.isArray(payload.filaments) &&
    Array.isArray(payload.slots)
  );
}
