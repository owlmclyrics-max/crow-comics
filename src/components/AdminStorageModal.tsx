/**
 * AdminStorageModal (v0.9.9.9.9.1): almacenamiento del bucket "pages".
 *
 * Para admins: muestra cuánto espacio del plan gratis de Supabase (1 GB)
 * están usando las páginas WebP de los tomos, listado por cómic con el
 * peso de cada tomo, y permite quitar las páginas de un tomo que ya tiene
 * PDF de respaldo (así libera espacio y el tomo sigue legible por Drive).
 * También detecta páginas "huérfanas" — subidas viejas que ningún tomo usa.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  HardDrive,
  Image,
  Images,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';
import {
  deleteChapterPages,
  fetchStorageUsage,
  formatBytes,
  STORAGE_QUOTA_BYTES,
  type StorageUsage,
} from '../lib/storageUsage';

interface AdminStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminStorageModal: React.FC<AdminStorageModalProps> = ({ isOpen, onClose }) => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null); // comicId expandido
  const [confirming, setConfirming] = useState<string | null>(null); // chapterId con confirmación pendiente
  const [cleaning, setCleaning] = useState<string | null>(null); // chapterId en proceso

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStorageUsage();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo medir el bucket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const handleDeleteChapter = async (chapterId: string) => {
    if (confirming !== chapterId) {
      setConfirming(chapterId);
      return;
    }
    setCleaning(chapterId);
    setConfirming(null);
    try {
      await deleteChapterPages(chapterId);
      showToast('Páginas quitadas — el tomo vuelve a leerse por su PDF', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudieron quitar las páginas', 'error');
    } finally {
      setCleaning(null);
    }
  };

  const usedPct = usage ? Math.min(100, Math.round((usage.totalBytes / STORAGE_QUOTA_BYTES) * 100)) : 0;
  const remaining = usage ? STORAGE_QUOTA_BYTES - usage.totalBytes : 0;

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line">
        <div>
          <h2 className="text-xl font-black text-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-accent2" />
            Almacenamiento
          </h2>
          <p className="text-xs text-faint mt-0.5">Páginas WebP de los tomos en Supabase</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
            aria-label="Actualizar"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
            aria-label="Cerrar almacenamiento"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {loading && !usage && (
          <div className="py-10 text-center">
            <RefreshCw className="w-6 h-6 text-accent2 animate-spin mx-auto" />
            <p className="text-xs text-mute mt-2">Midiendo el bucket…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {usage && (
          <>
            {/* ── Resumen de espacio ── */}
            <div className="rounded-xl border border-line bg-bg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-accent2" />
                  Espacio usado
                </span>
                <span className="text-xs font-black text-ink">
                  {formatBytes(usage.totalBytes)}{' '}
                  <span className="text-faint font-semibold">de 1 GB</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-raised overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    usedPct > 85 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-400' : 'bg-accent2'
                  }`}
                  style={{ width: `${Math.max(usedPct, 1)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-mute flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5" />
                  {usage.numObjects} páginas · {usage.comics.length} cómics con páginas
                </span>
                <span className={`font-bold ${usedPct > 85 ? 'text-red-400' : 'text-accent2'}`}>
                  Libre: {formatBytes(Math.max(0, remaining))} ({100 - usedPct}%)
                </span>
              </div>
            </div>

            {/* ── Huérfanas (espacio recuperable) ── */}
            {usage.orphanCount > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-300">
                      {usage.orphanCount} páginas sin usar ({formatBytes(usage.orphanBytes)})
                    </p>
                    <p className="text-[11px] text-mute mt-0.5 leading-relaxed">
                      Son de subidas viejas (por ejemplo, cuando re-subís el CBZ de un tomo
                      la subida anterior queda guardada). Se liberan al quitar las páginas
                      de ese tomo con el botón de abajo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Listado por cómic ── */}
            {usage.comics.length === 0 ? (
              <div className="py-8 text-center">
                <Image className="w-8 h-8 text-faint mx-auto" />
                <p className="text-xs text-mute mt-2">
                  Todavía no hay páginas subidas al visor propio.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {usage.comics.map((comic) => {
                  const isExpanded = expanded === comic.comicId;
                  return (
                    <div key={comic.comicId} className="rounded-xl border border-line bg-bg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : comic.comicId)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-raised transition-colors text-left"
                      >
                        {comic.coverUrl ? (
                          <img
                            src={comic.coverUrl}
                            alt={comic.title}
                            className="w-9 h-13 rounded-md object-cover border border-line shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-9 h-13 rounded-md bg-raised border border-line shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ink truncate">{comic.title}</p>
                          <p className="text-[11px] text-mute">
                            {comic.numPages} páginas · {formatBytes(comic.bytes)}
                            {comic.orphanBytes > 0 && (
                              <span className="text-amber-400"> · {formatBytes(comic.orphanBytes)} sin usar</span>
                            )}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-mute shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-mute shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 border-t border-line pt-3">
                          {comic.chapters.map((chapter) => (
                            <div
                              key={chapter.chapterId}
                              className="rounded-lg bg-raised border border-line p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-ink truncate">{chapter.label}</p>
                                  <p className="text-[11px] text-mute">
                                    {chapter.numPages} páginas · {formatBytes(chapter.bytes)}
                                    {chapter.orphanBytes > 0 && (
                                      <span className="text-amber-400">
                                        {' '}· {formatBytes(chapter.orphanBytes)} sin usar
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Aviso: sin PDF, al quitar las páginas el tomo
                                      queda sin lectura — por eso el aviso. */}
                                  {chapter.hasPdf ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 leading-none"
                                      title="Tiene PDF de respaldo: puede leerse sin las páginas"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      Con PDF
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 leading-none"
                                      title="Sin PDF: si quitás las páginas el tomo queda sin lectura"
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Sin PDF
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteChapter(chapter.chapterId)}
                                    disabled={cleaning === chapter.chapterId}
                                    className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                      confirming === chapter.chapterId
                                        ? 'bg-red-500 text-white'
                                        : 'bg-raised hover:bg-line text-mute hover:text-red-400 border border-line'
                                    }`}
                                    title={
                                      chapter.hasPdf
                                        ? 'Quitar las páginas del bucket y volver a leer por PDF'
                                        : '¡Cuidado: sin PDF ni páginas el tomo no se puede leer!'
                                    }
                                  >
                                    {cleaning === chapter.chapterId ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                    {confirming === chapter.chapterId ? '¿Seguro?' : 'Quitar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-faint leading-relaxed">
              «Quitar» borra las páginas WebP del bucket y el tomo vuelve a leerse con su PDF de
              Drive. Ideal para liberar espacio de tomos que ya no necesitan el visor propio.
              Las páginas son inmutables: re-subir un CBZ usa una carpeta nueva (por eso las
              viejas quedan «sin usar» hasta que las limpiás).
            </p>
          </>
        )}
      </div>
    </Modal>,
    document.body,
  );
};
