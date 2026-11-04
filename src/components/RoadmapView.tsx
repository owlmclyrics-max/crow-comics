import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
  ListVideo,
  Map as MapIcon,
  MessageSquare,
  RotateCcw,
  Rocket,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  ROADMAP_VERSIONS,
  type RoadmapTask,
} from '../data/roadmap';
import { showToast } from './ui/Toast';

// ============================================================================
// VISTA: ROADMAP INTERACTIVO
// Línea de tiempo horizontal tipo mapa de campaña con tarjetas por versión.
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
  const [progress, setProgress] = useState<ProgressMap>((): ProgressMap => loadProgress());

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
    showToast('Roadmap restablecido al estado inicial');
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
                Marca las tareas completadas — tu progreso se guarda en este navegador.
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

      {/* ── Línea de tiempo horizontal ── */}
      <div className="relative overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory">
        <div className="flex gap-5 min-w-max px-1 py-2 items-stretch">
          {ROADMAP_VERSIONS.map((version, index) => {
            const Icon = ICONS[version.icon] ?? Rocket;
            const info = versionProgress[version.version] ?? { checked: 0, total: version.tasks.length, complete: false };
            const percent = info.total ? Math.round((info.checked / info.total) * 100) : 0;

            return (
              <div key={version.version} className="shrink-0 w-[19.5rem] snap-start flex flex-col">
                {/* Conector: punto + tramo de línea hacia la siguiente tarjeta */}
                <div className="flex items-center gap-2 min-h-[1rem]">
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ring-4 transition-colors ${
                      info.complete
                        ? 'bg-emerald-500 ring-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                        : 'bg-accent ring-accent/15'
                    } ${index < ROADMAP_VERSIONS.length - 1 ? '' : ''}`}
                    aria-hidden="true"
                  />
                  {index < ROADMAP_VERSIONS.length - 1 && (
                    <span className="flex-1 h-0.5 bg-line rounded-full" aria-hidden="true" />
                  )}
                </div>

                {/* Tarjeta de versión */}
                <article
                  className={`mt-3 flex-1 rounded-3xl border overflow-hidden bg-surface transition-all duration-300 ${
                    info.complete
                      ? 'border-emerald-500 shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40'
                      : 'border-line hover:border-accent/40 hover:shadow-xl'
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
                        <span className="text-lg font-black text-ink font-mono tracking-tight">
                          {version.version}
                        </span>
                      </div>

                      {/* Badge cuando la fase llega al 100% */}
                      {info.complete && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.35)]">
                          <CheckCircle2 className="w-3 h-3" />
                          Completada ✓
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-sm font-bold text-ink leading-tight">{version.title}</h3>
                    <p className="text-[11px] text-mute italic mt-0.5">{version.subtitle}</p>

                    {/* Mini-progreso de la versión */}
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-raised overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-400 ${
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

                  {/* Lista de tareas con checkboxes */}
                  <ul className="divide-y divide-line">
                    {version.tasks.map((task) => {
                      const checked = isTaskChecked(task, progress);
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleTask(task.id)}
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
