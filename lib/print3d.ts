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

export type PrintFilament = {
  index: number;
  id?: number | null;
  type?: string | null;
  color?: string | null;
  grams?: number | null;
  slot?: string | null;
  globalTray?: number | null;
};

export type Print3dResult = {
  ok: boolean;
  dryRun?: boolean;
  uploaded?: boolean;
  started?: boolean;
  uploadId?: string;
  filename?: string;
  plate?: number;
  subtask?: string;
  printer?: string;
  printerState?: string;
  capabilities?: { startPrint?: boolean };
  filaments?: PrintFilament[];
  slots?: FilamentSlot[];
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

export type Print3dUploadResult = Print3dResult & {
  uploadId: string;
  uploaded: true;
  filaments: PrintFilament[];
  slots: FilamentSlot[];
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

type ColorName = {
  name: string;
  rgb: [number, number, number];
};

const COLOR_NAMES: ColorName[] = [
  { name: 'Red', rgb: [231, 76, 60] },
  { name: 'Crimson', rgb: [180, 20, 50] },
  { name: 'Orange', rgb: [243, 156, 18] },
  { name: 'Gold', rgb: [212, 175, 55] },
  { name: 'Yellow', rgb: [241, 196, 15] },
  { name: 'Lime', rgb: [120, 220, 40] },
  { name: 'Green', rgb: [46, 204, 113] },
  { name: 'Dark Green', rgb: [20, 110, 60] },
  { name: 'Cyan', rgb: [26, 188, 156] },
  { name: 'Teal', rgb: [0, 128, 128] },
  { name: 'Blue', rgb: [52, 152, 219] },
  { name: 'Navy', rgb: [44, 62, 120] },
  { name: 'Purple', rgb: [155, 89, 182] },
  { name: 'Violet', rgb: [90, 60, 150] },
  { name: 'Indigo', rgb: [75, 0, 130] },
  { name: 'Magenta', rgb: [220, 60, 180] },
  { name: 'Pink', rgb: [245, 150, 190] },
  { name: 'Brown', rgb: [139, 69, 19] },
  { name: 'Olive', rgb: [128, 128, 0] },
  { name: 'Black', rgb: [20, 20, 20] },
  { name: 'Gray', rgb: [128, 128, 128] },
  { name: 'Silver', rgb: [192, 192, 192] },
  { name: 'White', rgb: [255, 255, 255] },
];

function parseHexColor(hex: string): [number, number, number] | null {
  const value = hex.replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{6}/.test(value)) return null;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function colorDistance(
  left: [number, number, number],
  right: [number, number, number],
): number {
  const redMean = (left[0] + right[0]) / 2;
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return (
    (((512 + redMean) * red * red) >> 8) +
    4 * green * green +
    (((767 - redMean) * blue * blue) >> 8)
  );
}

export function colorName(hex?: string | null): string {
  if (!hex) return 'Unknown';
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;

  let best: ColorName | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of COLOR_NAMES) {
    const distance = colorDistance(rgb, candidate.rgb);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best?.name ?? hex;
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
