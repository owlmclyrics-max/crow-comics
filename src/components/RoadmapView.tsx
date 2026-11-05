import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
  Flame,
  ListVideo,
  Map as MapIcon,
  MessageSquare,
  RotateCcw,
  Rocket,
  Sparkles,
  User,
  Users,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import {
  ROADMAP_VERSIONS,
  type RoadmapTask,
} from '../data/roadmap';
import { showToast } from './ui/Toast';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// VISTA: ROADMAP INTERACTIVO
// Línea de tiempo horizontal con EFECTO FOCO: la versión que se está
// trabajando se muestra grande y nítida al centro; las laterales se ven
// más pequeñas, atenuadas y con blur. Tocar una tarjeta lateral la centra.
// El progreso (checkboxes) se persiste en localStorage y sobrevive
// recargas: clave única por tarea con fallback al valor `done` del dato.
// ============================================================================

const STORAGE_KEY = 'crow_roadmap_progress_v1';

/** Mapa usuario→tarea. Si una tarea no existe en el mapa, se usa su `done`. */
type ProgressMap = Record<string, boolean>;

const loadProgress = (): ProgressMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
};

const saveProgress = (progress: ProgressMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    showToast('No se pudo persistir el progreso (localStorage lleno o bloqueado)', 'error');
  }
};

const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  book: BookOpen,
  message: MessageSquare,
  user: User,
  list: ListVideo,
  sparkles: Sparkles,
  users: Users,
  map: MapIcon,
  flame: Flame,
};

interface RoadmapViewProps {
  onBack: () => void;
}

/** ¿Está marcada esta tarea (teniendo en cuenta fallback)? */
const isTaskChecked = (task: RoadmapTask, progress: ProgressMap) =>
  progress[task.id] ?? task.done;

interface VersionProgress {
  checked: number;
  total: number;
  complete: boolean;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ onBack }) => {
  const { isAdmin } = useAuth();
  const [progress, setProgress] = useState<ProgressMap>((): ProgressMap => loadProgress());

  // ── Efecto foco: qué tarjeta está centrada en el carril ──
  const trackRef = useRef<HTMLDivElement>(null); // contenedor de las tarjetas
  const [activeIndex, setActiveIndex] = useState(0);

  /** El carril scrolleable es el padre del track de tarjetas. */
  const getRail = (): HTMLElement | null =>
    (trackRef.current?.parentElement as HTMLElement | null) ?? null;

  // Índice de la versión en construcción (primera incompleta al cargar).
  useEffect(() => {
    const rail = getRail();
    const track = trackRef.current;
    if (!rail || !track) return;
    const initial = buildVersionProgress(loadProgress());
    const pending = ROADMAP_VERSIONS.findIndex((v) => !initial[v.version]?.complete);
    const target = pending === -1 ? ROADMAP_VERSIONS.length - 1 : pending;
    const el = track.children[target] as HTMLElement | undefined;
    if (el) rail.scrollLeft = Math.max(0, el.offsetLeft + el.offsetWidth / 2 - rail.clientWidth / 2);
    setActiveIndex(target);
    // Intencionalmente una sola vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRailScroll = () => {
    const track = trackRef.current;
    const rail = getRail();
    if (!track || !rail) return;
    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - railCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIndex(best);
  };

  /** Centra una tarjeta con animación suave. */
  const focusCard = (index: number) => {
    const rail = getRail();
    const el = trackRef.current?.children[index] as HTMLElement | undefined;
    if (!rail || !el) return;
    rail.scrollTo({
      left: el.offsetLeft + el.offsetWidth / 2 - rail.clientWidth / 2,
      behavior: 'smooth',
    });
  };

  // Barras de progreso y contadores derivados del estado.
  const versionProgress = useMemo<Record<string, VersionProgress>>(
    () => buildVersionProgress(progress),
    [progress],
  );

  const global = useMemo(() => {
    let checked = 0;
    let total = 0;
    for (const version of ROADMAP_VERSIONS) {
      for (const task of version.tasks) {
        total += 1;
        if (isTaskChecked(task, progress)) checked += 1;
      }
    }
    return { checked, total, percent: total ? Math.round((checked / total) * 100) : 0 };
  }, [progress]);

  const completedVersions = useMemo(
    () => ROADMAP_VERSIONS.filter((v) => versionProgress[v.version]?.complete).length,
    [versionProgress],
  );

  // Versión "en construcción": la primera incompleta. Los usuarios normales
  // solo ven en detalle esta y las completadas; las futuras quedan en secreto.
  const currentVersionIndex = useMemo(
    () => ROADMAP_VERSIONS.findIndex((v) => !versionProgress[v.version]?.complete),
    [versionProgress],
  );

  const toggleTask = (taskId: string) => {
    setProgress((prev) => {
      const next: ProgressMap = { ...prev };
      // Valor actual considerando fallback; togglar sobre él.
      const task = findTask(taskId);
      const current = next[taskId] ?? task?.done ?? false;
      next[taskId] = !current;
      saveProgress(next);
      return next;
    });
  };

  const resetProgress = () => {
    if (!window.confirm('¿Restablecer TODAS las casillas del roadmap a su estado inicial?')) return;
    setProgress({});
    saveProgress({});
    showToast('Roadmap restablecido a su estado inicial');
  };

  const exportJSON = () => {
    const payload = {
      app: 'crow-comics',
      export: 'roadmap',
      generatedAt: new Date().toISOString(),
      overall: { checked: global.checked, total: global.total, percent: global.percent },
      versions: ROADMAP_VERSIONS.map((version) => ({
        version: version.version,
        title: version.title,
        complete: versionProgress[version.version]?.complete ?? false,
        tasks: version.tasks.map((task) => ({
          id: task.id,
          label: task.label,
          checked: isTaskChecked(task, progress),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `crow-comics-roadmap-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Roadmap exportado como JSON');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Barra superior ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-accent" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={exportJSON}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-ink text-xs font-semibold transition-colors border border-line hover:border-accent/40"
            title="Exportar el progreso como JSON"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Exportar JSON</span>
          </button>
          <button
            onClick={resetProgress}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-accent2 text-xs font-semibold transition-colors border border-line"
            title="Reiniciar todas las casillas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* ── Encabezado con progreso global ── */}
      <header className="relative rounded-[2rem] border border-accent/25 bg-surface overflow-hidden shadow-2xl">
        <div className="relative p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-black text-ink">
                <MapIcon className="w-7 h-7 text-accent" />
                Roadmap
              </h2>
              <p className="text-xs sm:text-sm text-mute max-w-xl">
                El mapa de campaña de Crow Comics: cada tarjeta es una versión.
                Desliza con libertad — la tarjeta del centro toma el foco y ahí
                se marcan las casillas. Tu progreso se guarda en este navegador.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-3xl sm:text-4xl font-black text-accent leading-none">
                  {global.percent}%
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mt-1">
                  {global.checked} de {global.total} tareas
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mt-0.5">
                  {completedVersions}/{ROADMAP_VERSIONS.length} versiones
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progreso global */}
          <div className="h-3 w-full rounded-full bg-raised border border-line overflow-hidden" role="progressbar" aria-valuenow={global.percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-500 shadow-[0_0_12px_oklch(0.63_0.21_var(--crow-hue)/40%)]"
              style={{ width: `${global.percent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Línea de tiempo con efecto foco (scroll libre: el foco sigue al centro) ── */}
      <div
        onScroll={handleRailScroll}
        className="relative overflow-x-auto pb-4 [scrollbar-width:thin]"
      >
        {/* El padding calc permite centrar la primera y última tarjeta en
            pantallas anchas: 50% del carril menos la mitad de una tarjeta. */}
        <div
          ref={trackRef}
          className="flex gap-5 min-w-max py-2 items-stretch ps-[calc(50%-9.75rem)] pe-[calc(50%-9.75rem)]"
        >
          {ROADMAP_VERSIONS.map((version, index) => {
            const Icon = ICONS[version.icon] ?? Rocket;
            const info = versionProgress[version.version] ?? { checked: 0, total: version.tasks.length, complete: false };
            const percent = info.total ? Math.round((info.checked / info.total) * 100) : 0;
            const isActive = index === activeIndex;
            const isFuture = !info.complete && index !== currentVersionIndex;
            // Los usuarios normales no pueden leer versiones futuras; el admin ve todo.
            const locked = isFuture && !isAdmin;

            return (
              <div
                key={version.version}
                onClick={() => {
                  // Navegar siempre: el secreto lo guarda el overlay, no el foco.
                  if (!isActive) focusCard(index);
                }}
                className={`group relative shrink-0 w-[19.5rem] flex flex-col ${isActive ? '' : 'cursor-pointer'}`}
              >
                {/* Conector: punto navegable + tramo de línea hacia la siguiente tarjeta */}
                <div className="flex items-center gap-2 min-h-[1rem]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      focusCard(index);
                    }}
                    title={`Ir a ${version.version}`}
                    aria-label={`Ir a la versión ${version.version}`}
                    className={`rounded-full shrink-0 cursor-pointer hover:scale-125 transition-all duration-500 ${
                      isActive ? 'w-4 h-4 ring-4' : 'w-2.5 h-2.5 ring-2'
                    } ${
                      info.complete
                        ? 'bg-emerald-500 ring-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                        : 'bg-accent ring-accent/15 shadow-[0_0_8px_oklch(0.63_0.21_var(--crow-hue)/50%)]'
                    }`}
                  />
                  {index < ROADMAP_VERSIONS.length - 1 && (
                    <span
                      className={`flex-1 rounded-full transition-colors duration-500 ${
                        isActive ? 'h-0.5 bg-gradient-to-r from-accent to-accent2/60' : 'h-0.5 bg-line'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Tarjeta de versión (enfocada: grande y nítida / lateral: pequeña y borrosa) */}
                <article
                  className={`mt-3 flex-1 rounded-3xl border overflow-hidden bg-surface origin-center transition-all duration-500 ease-out ${
                    isActive
                      ? 'scale-100 opacity-100 blur-0 saturate-100 ' +
                        (info.complete
                          ? 'border-emerald-500 shadow-2xl shadow-emerald-500/25'
                          : 'border-accent/60 shadow-2xl shadow-accent/30')
                      : isAdmin
                        ? // Admin: laterales más pequeñas pero SIEMPRE legibles (sin blur)
                          'scale-[0.92] opacity-85 blur-0 ' +
                          (info.complete ? 'border-emerald-500/40' : 'border-line')
                        : 'scale-[0.9] opacity-60 blur-[2px] saturate-[0.8] ' +
                          (info.complete ? 'border-emerald-500/40' : 'border-line')
                  }`}
                >
                  {/* Cabecera de versión */}
                  <div className={`relative p-4 border-b ${info.complete ? 'border-emerald-500/30' : 'border-line'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            info.complete
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-accent/10 text-accent border-accent/30'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className={`font-black text-ink font-mono tracking-tight ${isActive ? 'text-xl' : 'text-lg'}`}>
                          {version.version}
                        </span>
                      </div>

                      {/* Badge cuando la fase llega al 100% */}
                      {info.complete ? (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.35)]">
                          <CheckCircle2 className="w-3 h-3" />
                          Completada ✓
                        </span>
                      ) : isActive ? (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-accent/15 text-accent border border-accent/40 flex items-center gap-1 animate-pulse">
                          En construcción
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2.5 text-sm font-bold text-ink leading-tight">{version.title}</h3>
                    <p className="text-[11px] text-mute italic mt-0.5">{version.subtitle}</p>

                    {/* Mini-progreso de la versión */}
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-raised overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            info.complete
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                              : 'bg-accent'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          info.complete ? 'text-emerald-400' : 'text-mute'
                        }`}
                      >
                        {info.checked}/{info.total}
                      </span>
                    </div>
                  </div>

                  {/* Lista de tareas con checkboxes (solo togglean en la tarjeta enfocada) */}
                  <ul className="divide-y divide-line">
                    {version.tasks.map((task) => {
                      const checked = isTaskChecked(task, progress);
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => {
                              if (locked) return;
                              // Admin puede marcar en cualquier tarjeta; usuarios solo en la enfocada.
                              if (isActive || isAdmin) toggleTask(task.id);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                              checked ? 'bg-emerald-500/[0.06]' : 'hover:bg-raised/50'
                            } ${info.complete ? 'hover:bg-emerald-500/[0.08]' : ''}`}
                          >
                            {checked ? (
                              <CheckCircle2
                                className={`w-5 h-5 mt-px shrink-0 transition-colors ${
                                  info.complete
                                    ? 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]'
                                    : 'text-accent'
                                }`}
                                strokeWidth={2.4}
                              />
                            ) : (
                              <Circle className="w-5 h-5 mt-px shrink-0 text-faint hover:text-accent transition-colors" />
                            )}
                            <span
                              className={`text-[13px] leading-snug font-medium transition-colors ${
                                checked
                                  ? 'text-ink line-through decoration-accent/40 decoration-2'
                                  : 'text-mute'
                              }`}
                            >
                              {task.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Pie de tarjeta */}
                  <div className={`px-4 py-3 border-t text-right ${info.complete ? 'border-emerald-500/30' : 'border-line'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${info.complete ? 'text-emerald-400' : 'text-faint'}`}>
                      {percent}% de la fase
                    </p>
                  </div>
                </article>

                {/* Overlay de secreto: usuarios no pueden leer versiones futuras */}
                {locked && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 top-7 rounded-3xl bg-bg/55 backdrop-blur-md border border-line/50 flex flex-col items-center justify-center gap-3 text-center p-6">
                    <span className="w-12 h-12 rounded-2xl bg-raised border border-line flex items-center justify-center text-mute shadow-lg">
                      <Lock className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-mute">
                        Versión en secreto
                      </p>
                      <p className="text-[11px] text-faint mt-1">
                        El cuervo todavía está cocinando estos planes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comodidad móvil: volver al final */}
      <button
        onClick={onBack}
        className="md:hidden w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4 text-accent" />
        Volver al Inicio
      </button>
    </div>
  );
};

// ── helpers ──

function findTask(taskId: string) {
  for (const version of ROADMAP_VERSIONS) {
    const task = version.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return null;
}

function buildVersionProgress(progress: ProgressMap): Record<string, VersionProgress> {
  const map: Record<string, VersionProgress> = {};
  for (const version of ROADMAP_VERSIONS) {
    let checked = 0;
    for (const task of version.tasks) {
      if (isTaskChecked(task, progress)) checked += 1;
    }
    map[version.version] = {
      checked,
      total: version.tasks.length,
      complete: version.tasks.length > 0 && checked === version.tasks.length,
    };
  }
  return map;
}
