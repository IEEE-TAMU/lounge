'use client';

import { AlertCircle, Camera, RefreshCw, Square, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import useSWR from 'swr';

import {
  formatBytes,
  formatMinutes,
  formatTemp,
  isBusyState,
  isGcode3mfFile,
  isMappingError,
  isValidFilamentMap,
  stateTone,
  type FilamentMappingError,
  type FilamentSlot,
  type Print3dResult,
  type Print3dStatus,
} from '@/lib/print3d';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AppHeader } from '@/components/header';
import { Badge, Button, Card, Input, Spinner } from '@/components/ui';

type Toast = {
  tone: 'success' | 'error';
  message: string;
};

const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;

async function fetcher(url: string): Promise<Print3dStatus> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load the 3D printer.');
  }

  return payload as Print3dStatus;
}

export function Print3dConsole({ user }: { user: SessionUser }) {
  const {
    data: status,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Print3dStatus>('/api/print3d/status', fetcher, {
    refreshInterval: 5_000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plate, setPlate] = useState('1');
  const [filamentMap, setFilamentMap] = useState('');
  const [start, setStart] = useState(true);
  const [bedLeveling, setBedLeveling] = useState(true);
  const [flowCali, setFlowCali] = useState(false);
  const [vibrationCali, setVibrationCali] = useState(false);
  const [timelapse, setTimelapse] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [mappingError, setMappingError] = useState<FilamentMappingError | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [snapshotNonce, setSnapshotNonce] = useState(0);
  const [cameraError, setCameraError] = useState(false);

  const maxFileBytes = status?.limits?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const cameraAvailable = status?.camera?.available === true;

  useEffect(() => {
    if (!cameraAvailable) return;

    const timer = window.setInterval(() => {
      setCameraError(false);
      setSnapshotNonce((current) => current + 1);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [cameraAvailable]);

  function showToast(tone: Toast['tone'], message: string) {
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
    setToast({ tone, message });
    toastTimeout.current = window.setTimeout(() => setToast(null), 6_000);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (selected && !isGcode3mfFile(selected)) {
      showToast('error', 'Only pre-sliced .gcode.3mf files are supported.');
      event.target.value = '';
      setFile(null);
      return;
    }

    if (selected && selected.size > maxFileBytes) {
      showToast(
        'error',
        `That file is too large (${formatBytes(selected.size)}); the limit is ${formatBytes(maxFileBytes)}.`,
      );
      event.target.value = '';
      setFile(null);
      return;
    }

    setMappingError(null);
    setFile(selected);
  }

  async function submitPrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      showToast('error', 'Choose a pre-sliced .gcode.3mf file.');
      return;
    }

    if (!isGcode3mfFile(file)) {
      showToast('error', 'Only pre-sliced .gcode.3mf files are supported.');
      return;
    }

    if (file.size > maxFileBytes) {
      showToast(
        'error',
        `That file is too large; the limit is ${formatBytes(maxFileBytes)}.`,
      );
      return;
    }

    const plateNumber = Number(plate);
    if (!Number.isInteger(plateNumber) || plateNumber < 1 || plateNumber > 16) {
      showToast('error', 'Plate must be a whole number between 1 and 16.');
      return;
    }

    const mapping = filamentMap.trim();
    if (mapping && mapping.toLowerCase() !== 'auto' && !isValidFilamentMap(mapping)) {
      showToast('error', 'Filament mapping must look like 1 or 1,3.');
      return;
    }

    const form = new FormData();
    form.set('file', file);
    form.set('plate', String(plateNumber));
    form.set('start', String(start));
    form.set('bed_leveling', String(bedLeveling));
    form.set('flow_cali', String(flowCali));
    form.set('vibration_cali', String(vibrationCali));
    form.set('timelapse', String(timelapse));
    if (mapping && mapping.toLowerCase() !== 'auto') form.set('filament_map', mapping);

    setUploading(true);
    setMappingError(null);
    try {
      const response = await fetch('/api/print3d', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (isMappingError(payload)) {
          setMappingError(payload);
          showToast('error', payload.error || 'Filament mapping required.');
          return;
        }
        throw new Error(payload.error || 'Could not send the file to the 3D printer.');
      }

      const result = payload as Print3dResult;
      showToast(
        'success',
        result.uploaded
          ? `Uploaded ${result.filename ?? file.name}. Start it from the printer touchscreen.`
          : `Started ${result.filename ?? file.name} on ${result.printer ?? 'the X2D'}.`,
      );

      setFile(null);
      setFilamentMap('');
      setMappingError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await mutate();
    } catch (requestError) {
      showToast(
        'error',
        requestError instanceof Error
          ? requestError.message
          : 'Could not send the file to the 3D printer.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function stopPrint() {
    if (!window.confirm('Stop the current 3D print?')) return;

    setStopping(true);
    try {
      const response = await fetch('/api/print3d/stop', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not stop the print.');
      }

      showToast('success', 'The 3D printer was asked to stop.');
      await mutate();
    } catch (requestError) {
      showToast(
        'error',
        requestError instanceof Error
          ? requestError.message
          : 'Could not stop the print.',
      );
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <AppHeader user={user} active="print3d" />

      {error ? (
        <Card className="flex items-start gap-3 border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <div className="flex-1">
            <p className="font-medium">Could not load the lounge 3D printer.</p>
            <p className="mt-1 text-red-200/80">{error.message}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void mutate()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <main className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="flex flex-col gap-6">
          <StatusCard
            status={status}
            isLoading={isLoading || isValidating}
            stopping={stopping}
            onRefresh={() => void mutate()}
            onStop={() => void stopPrint()}
          />
          <CameraCard
            available={cameraAvailable}
            nonce={snapshotNonce}
            error={cameraError}
            onRetry={() => {
              setCameraError(false);
              setSnapshotNonce((current) => current + 1);
            }}
            onError={() => setCameraError(true)}
            onLoad={() => setCameraError(false)}
          />
        </section>

        <section className="flex flex-col gap-6">
          <UploadCard
            file={file}
            fileInputRef={fileInputRef}
            plate={plate}
            filamentMap={filamentMap}
            start={start}
            bedLeveling={bedLeveling}
            flowCali={flowCali}
            vibrationCali={vibrationCali}
            timelapse={timelapse}
            uploading={uploading}
            maxFileBytes={maxFileBytes}
            onFileChange={handleFileChange}
            onPlateChange={setPlate}
            onFilamentMapChange={setFilamentMap}
            onStartChange={setStart}
            onBedLevelingChange={setBedLeveling}
            onFlowCaliChange={setFlowCali}
            onVibrationCaliChange={setVibrationCali}
            onTimelapseChange={setTimelapse}
            onSubmit={submitPrint}
          />
          {mappingError ? <MappingRequiredCard mappingError={mappingError} /> : null}
          <FilamentsCard status={status} />
        </section>
      </main>

      {toast ? (
        <div
          className={cn(
            'fixed right-4 bottom-4 z-50 flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl',
            toast.tone === 'error'
              ? 'border-red-400/30 bg-red-950/95 text-red-100'
              : 'border-emerald-400/30 bg-emerald-950/95 text-emerald-100',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-60 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({
  status,
  isLoading,
  stopping,
  onRefresh,
  onStop,
}: {
  status?: Print3dStatus;
  isLoading: boolean;
  stopping: boolean;
  onRefresh: () => void;
  onStop: () => void;
}) {
  const printer = status?.printer;
  const state = printer?.state;
  const progress = typeof printer?.progress === 'number' ? printer.progress : null;
  const bed = status?.temperatures?.bed;
  const chamber = status?.temperatures?.chamber;
  const nozzles = status?.temperatures?.nozzles ?? [];
  const errors = printer?.errors;
  const hms = errors?.hms ?? [];
  const canStop = isBusyState(state);

  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
            Bambu Lab X2D
          </p>
          <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">
            {printer?.name ?? 'Lounge 3D printer'}
          </h2>
          {printer?.subtask ? (
            <p className="mt-1 truncate text-sm text-zinc-400">{printer.subtask}</p>
          ) : null}
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge tone={stateTone(state)}>{printer?.stateLabel ?? 'Unknown'}</Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh 3D printer status"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {printer?.developerMode === false ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <p>
            Printing is disabled because Developer Mode is off on the printer. Enable{' '}
            <strong>Settings → LAN Only → Developer Mode</strong> on the X2D.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{progress === null ? 'No active job' : `${progress}% complete`}</span>
          <span>{formatMinutes(printer?.remainingMinutes)} remaining</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Layer"
          value={
            typeof printer?.layer === 'number'
              ? `${printer.layer}${typeof printer.totalLayers === 'number' ? ` / ${printer.totalLayers}` : ''}`
              : '—'
          }
        />
        <Stat label="Bed" value={formatTemp(bed?.current, bed?.target)} />
        {nozzles.length > 0 ? (
          nozzles.map((nozzle) => (
            <Stat
              key={nozzle.index}
              label={`Nozzle ${nozzle.index + 1}`}
              value={formatTemp(nozzle.current, nozzle.target)}
            />
          ))
        ) : (
          <Stat label="Nozzle" value="—" />
        )}
        <Stat label="Chamber" value={formatTemp(chamber?.current, chamber?.target)} />
        <Stat label="Wi-Fi" value={printer?.wifi ?? '—'} />
        <Stat
          label="Connection"
          value={status?.connection?.mqtt === false ? 'Disconnected' : 'MQTT'}
        />
      </div>

      {errors?.failReason && errors.failReason !== '0' ? (
        <p className="mt-4 text-sm text-red-200">Printer reported: {errors.failReason}</p>
      ) : null}

      {hms.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3">
          <p className="text-xs font-semibold tracking-wide text-red-200 uppercase">
            Printer errors
          </p>
          <ul className="mt-2 space-y-1 text-xs text-red-100/90">
            {hms.map((code) => (
              <li key={`${code.attr}-${code.code}`}>
                <span className="font-mono">
                  {code.display ?? `${code.attr}_${code.code}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
        <Button variant="danger" onClick={onStop} disabled={!canStop || stopping}>
          {stopping ? <Spinner className="size-4" /> : <Square className="size-3.5" />}
          Stop print
        </Button>
        <p className="self-center text-xs text-zinc-500">
          Stops the active job. Uploads remain on the printer.
        </p>
      </div>
    </Card>
  );
}

function CameraCard({
  available,
  nonce,
  error,
  onRetry,
  onError,
  onLoad,
}: {
  available: boolean;
  nonce: number;
  error: boolean;
  onRetry: () => void;
  onError: () => void;
  onLoad: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-emerald-300" />
          <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase">
            Bed camera
          </h2>
        </div>
        {available ? (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        ) : null}
      </div>

      {available ? (
        <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
          <Image
            key={nonce}
            src={`/api/print3d/snapshot?frame=${nonce}`}
            alt="Bambu Lab X2D bed camera snapshot"
            fill
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={cn('object-contain', error && 'opacity-0')}
            onError={onError}
            onLoad={onLoad}
          />
          {error ? (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-zinc-400">
              Camera snapshot failed. The printer may be busy.
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          The chamber camera is not reporting a stream.
        </p>
      )}
    </Card>
  );
}

function UploadCard({
  file,
  fileInputRef,
  plate,
  filamentMap,
  start,
  bedLeveling,
  flowCali,
  vibrationCali,
  timelapse,
  uploading,
  maxFileBytes,
  onFileChange,
  onPlateChange,
  onFilamentMapChange,
  onStartChange,
  onBedLevelingChange,
  onFlowCaliChange,
  onVibrationCaliChange,
  onTimelapseChange,
  onSubmit,
}: {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  plate: string;
  filamentMap: string;
  start: boolean;
  bedLeveling: boolean;
  flowCali: boolean;
  vibrationCali: boolean;
  timelapse: boolean;
  uploading: boolean;
  maxFileBytes: number;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPlateChange: (value: string) => void;
  onFilamentMapChange: (value: string) => void;
  onStartChange: (value: boolean) => void;
  onBedLevelingChange: (value: boolean) => void;
  onFlowCaliChange: (value: boolean) => void;
  onVibrationCaliChange: (value: boolean) => void;
  onTimelapseChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
        New print
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        Upload a sliced file
      </h2>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <div>
          <label
            htmlFor="print3d-file"
            className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
          >
            File
          </label>
          <input
            ref={fileInputRef}
            id="print3d-file"
            type="file"
            accept=".gcode.3mf,.3mf"
            onChange={onFileChange}
            disabled={uploading}
            className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-6 text-sm text-zinc-300 transition file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-950 hover:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Pre-sliced .gcode.3mf for the X2D, up to {formatBytes(maxFileBytes)}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="print3d-plate"
              className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
            >
              Plate
            </label>
            <Input
              id="print3d-plate"
              type="number"
              min={1}
              max={16}
              value={plate}
              onChange={(event) => onPlateChange(event.target.value)}
              disabled={uploading}
              className="mt-2"
            />
          </div>
          <div>
            <label
              htmlFor="print3d-map"
              className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
            >
              Filament map
            </label>
            <Input
              id="print3d-map"
              value={filamentMap}
              onChange={(event) => onFilamentMapChange(event.target.value)}
              placeholder="Auto, or 1 / 1,3 / ext"
              maxLength={64}
              disabled={uploading}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
          <Option checked={start} disabled={uploading} onChange={onStartChange}>
            Start after upload
          </Option>
          <Option
            checked={bedLeveling}
            disabled={uploading}
            onChange={onBedLevelingChange}
          >
            Bed leveling
          </Option>
          <Option checked={flowCali} disabled={uploading} onChange={onFlowCaliChange}>
            Flow calibration
          </Option>
          <Option
            checked={vibrationCali}
            disabled={uploading}
            onChange={onVibrationCaliChange}
          >
            Vibration calibration
          </Option>
          <Option checked={timelapse} disabled={uploading} onChange={onTimelapseChange}>
            Timelapse
          </Option>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
            {uploading
              ? 'Sending to printer…'
              : start
                ? 'Upload and start'
                : 'Upload only'}
          </Button>
          {file ? (
            <span className="truncate text-xs text-zinc-500">
              {file.name} · {formatBytes(file.size)}
            </span>
          ) : null}
        </div>

        {uploading ? (
          <p className="text-xs text-zinc-500">
            Uploading over the LAN and starting the job can take a few minutes. Keep this
            tab open.
          </p>
        ) : null}
      </form>
    </Card>
  );
}

function MappingRequiredCard({ mappingError }: { mappingError: FilamentMappingError }) {
  return (
    <Card className="border-amber-400/20 bg-amber-400/[0.04] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 flex-none text-amber-300" />
        <div>
          <h2 className="text-sm font-semibold text-amber-100">
            Filament mapping required
          </h2>
          <p className="mt-1 text-sm text-amber-100/80">{mappingError.error}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] tracking-wide text-zinc-500 uppercase">
            Sliced filaments
          </p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-200">
            {mappingError.filaments.map((filament, index) => (
              <li key={`${filament.id ?? index}-${filament.type ?? 'filament'}`}>
                <span className="flex items-center gap-2">
                  <ColorDot color={filament.color} />
                  <span>
                    {index + 1}. {filament.type ?? 'Filament'}
                  </span>
                  {typeof filament.used_grams === 'number' ? (
                    <span className="text-xs text-zinc-500">{filament.used_grams} g</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] tracking-wide text-zinc-500 uppercase">
            Available slots
          </p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-200">
            {mappingError.slots.map((slot, index) => (
              <li key={`${slot.globalId}-${slot.label}`}>
                <span className="flex items-center gap-2">
                  <ColorDot color={slot.color} />
                  <span>
                    {index + 1}. {slot.label}
                  </span>
                  <span className="truncate text-xs text-zinc-500">
                    {slot.type ?? 'Unknown'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-amber-100/80">
        Set the filament map field to one slot per sliced filament, for example{' '}
        <code className="rounded bg-black/30 px-1">1</code> or{' '}
        <code className="rounded bg-black/30 px-1">1,3</code>. Use{' '}
        <code className="rounded bg-black/30 px-1">ext</code> for the external spool.
      </p>
    </Card>
  );
}

function FilamentsCard({ status }: { status?: Print3dStatus }) {
  const slots = status?.ams?.slots ?? [];
  const units = status?.ams?.units ?? [];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase">
            Filament
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {slots.length} {slots.length === 1 ? 'slot' : 'slots'} reporting
          </p>
        </div>
        <Badge tone="neutral">{units.length} AMS</Badge>
      </div>

      {units.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400"
            >
              <span className="font-medium text-zinc-200">AMS {unit.id + 1}</span>
              <span className="ml-2">{formatTemp(unit.temperature)}</span>
              <span className="ml-2">
                {typeof unit.humidityRaw === 'number'
                  ? `${unit.humidityRaw}% RH`
                  : '— RH'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
            No AMS slots or external spool are reporting filament.
          </div>
        ) : (
          slots.map((slot) => (
            <FilamentRow key={`${slot.globalId}-${slot.label}`} slot={slot} />
          ))
        )}
      </div>
    </Card>
  );
}

function FilamentRow({ slot }: { slot: FilamentSlot }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <ColorDot color={slot.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-100">{slot.label}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {slot.type ?? 'Unknown'}
          {slot.color ? ` · ${slot.color}` : ''}
          {typeof slot.remain === 'number' && slot.remain >= 0
            ? ` · ${slot.remain} g left`
            : ''}
        </p>
      </div>
      {slot.active ? <Badge tone="green">Active</Badge> : null}
      {slot.external ? <Badge tone="blue">External</Badge> : null}
    </div>
  );
}

function ColorDot({ color }: { color?: string | null }) {
  const valid = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);

  return (
    <span
      className="size-3.5 flex-none rounded-full border border-white/20"
      style={{ backgroundColor: valid ? color : '#52525b' }}
      aria-hidden
    />
  );
}

function Option({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-emerald-400"
      />
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
