/**
 * BulkDriveImportModal (v0.11.2): importar varios links de Drive de una vez.
 *
 * En vez de crear los tomos uno por uno, el admin pega un link por línea y
 * el sistema crea un capítulo por link, numerados en orden. Cada capítulo
 * queda con:
 *  - pdf_url = /preview  → lectura online en el visor.
 *  - link "Drive" con la descarga directa (uc?export=download).
 *
 * No toca Storage: solo se guardan links.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Link2, Loader2, Plus } from 'lucide-react';
import type { Chapter } from '../types/comic';
import { buildDriveDownloadUrl, buildDrivePreviewUrl, parseDriveId } from '../lib/driveLinks';
import { Modal } from './ui/Modal';

interface BulkDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Capítulos que ya existen en el formulario (para no duplicar links). */
  existingChapters: Chapter[];
  /** IDs de Drive que ya están usados (pdf_url o links). */
  onImport: (chapters: Chapter[]) => void;
}

interface ParsedRow {
  line: string;
  fileId: string | null;
  duplicate: boolean;
}

const TODAY = new Date().toISOString().split('T')[0];

const extractUsedIds = (chapters: Chapter[]): Set<string> => {
  const used = new Set<string>();
  for (const chapter of chapters) {
    for (const url of [chapter.pdf_url, ...(chapter.links ?? []).map((l) => l.url)]) {
      if (!url) continue;
      const id = parseDriveId(url);
      if (id) used.add(id);
    }
  }
  return used;
};

const buildChapterFromId = (comicId: string, fileId: string, n: number): Chapter => {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  return {
    id: `new_ch_${stamp}_${Math.random().toString(36).slice(2, 6)}`,
    comic_id: comicId,
    chapter_number: n,
    title: `Capítulo #${n}`,
    cover_url: '',
    pages_count: 32,
    release_date: TODAY,
    pdf_url: buildDrivePreviewUrl(fileId),
    links: [
      {
        id: `l_${stamp}_${Math.random().toString(36).slice(2, 6)}`,
        name: 'Drive',
        url: buildDriveDownloadUrl(fileId),
        type: 'cloud',
      },
    ],
  };
};

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint';

export const BulkDriveImportModal: React.FC<BulkDriveImportModalProps> = ({
  isOpen,
  onClose,
  existingChapters,
  onImport,
}) => {
  const [raw, setRaw] = useState('');
  const [start, setStart] = useState(1);
  const [touched, setTouched] = useState(false);

  const usedIds = useMemo(() => extractUsedIds(existingChapters), [existingChapters]);

  // Al abrir: arrancamos después del número más alto que ya existe.
  useEffect(() => {
    if (!isOpen) return;
    const max = existingChapters.reduce(
      (acc, ch) => Math.max(acc, Number(ch.chapter_number) || 0),
      0,
    );
    setStart(max + 1);
    setTouched(false);
  }, [isOpen, existingChapters]);

  const rows = useMemo<ParsedRow[]>(() => {
    const seen = new Set<string>();
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const fileId = parseDriveId(line);
        const duplicate = Boolean(fileId && (usedIds.has(fileId) || seen.has(fileId)));
        if (fileId) seen.add(fileId);
        return { line, fileId, duplicate };
      });
  }, [raw, usedIds]);

  const validRows = rows.filter((r) => r.fileId && !r.duplicate);
  const invalidCount = rows.filter((r) => !r.fileId).length;
  const duplicateCount = rows.filter((r) => r.duplicate).length;

  const startNumber = Number.isFinite(start) && start > 0 ? Math.floor(start) : 1;

  const preview = validRows.map((row, i) => ({
    ...row,
    number: startNumber + i,
  }));

  const handleImport = () => {
    if (preview.length === 0) return;
    const comicId = existingChapters[0]?.comic_id ?? '';
    const created = preview.map((row) =>
      buildChapterFromId(comicId, row.fileId as string, row.number),
    );
    onImport(created);
    setRaw('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-ink truncate">Importar varios links de Drive</h2>
            <p className="text-[11px] text-faint">Un link por línea · se crea un tomo por link</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 rounded-xl bg-raised hover:bg-line text-[11px] font-semibold text-mute hover:text-ink transition-colors"
        >
          Cerrar
        </button>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">
            Links de Drive
          </label>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setTouched(true);
            }}
            rows={6}
            spellCheck={false}
            placeholder={
              'https://drive.google.com/file/d/ID_DEL_TOMO_1/view\nhttps://drive.google.com/file/d/ID_DEL_TOMO_2/view\nhttps://drive.google.com/file/d/ID_DEL_TOMO_3/view'
            }
            className={`${inputCls} resize-y font-mono text-[11px] leading-relaxed`}
            autoFocus
          />
          <p className="text-[10px] text-faint">
            Sirve cualquier variante de Drive: <code>/file/d/ID/view</code>, <code>open?id=ID</code> o{' '}
            <code>uc?export=download&amp;id=ID</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 w-32">
            <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">
              Empezar en
            </label>
            <input
              type="number"
              min={1}
              value={start}
              onChange={(e) => setStart(parseInt(e.target.value, 10) || 1)}
              className={inputCls}
            />
          </div>
          <p className="text-[10px] text-faint pb-1">
            Los tomos se numeran desde acá, en el mismo orden en que pegaste los links.
          </p>
        </div>

        {/* Resumen / vista previa */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-line bg-bg/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> {preview.length} listo{preview.length === 1 ? '' : 's'}
              </span>
              {duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3 h-3" /> {duplicateCount} repetido{duplicateCount === 1 ? '' : 's'}
                </span>
              )}
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" /> {invalidCount} inválido{invalidCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-line/60">
              {rows.map((row, i) => {
                const ready = Boolean(row.fileId) && !row.duplicate;
                const number = startNumber + preview.findIndex((p) => p.line === row.line);
                return (
                  <div key={`${row.line}-${i}`} className="flex items-start gap-2.5 px-3 py-2">
                    <span
                      className={`shrink-0 mt-0.5 w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center border ${
                        ready
                          ? 'bg-accent/15 border-accent/30 text-accent'
                          : 'bg-raised border-line text-faint'
                      }`}
                    >
                      {ready ? number : '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-ink font-semibold truncate">
                        {ready ? `Capítulo #${number}` : 'No se puede importar'}
                      </p>
                      <p className="text-[10px] text-faint truncate font-mono">{row.line}</p>
                      {row.duplicate && (
                        <p className="text-[10px] text-amber-400">Ya existe un tomo con este link.</p>
                      )}
                      {!row.fileId && (
                        <p className="text-[10px] text-red-400">No parece un link de Drive válido.</p>
                      )}
                    </div>
                    {ready && <Download className="w-3 h-3 text-faint shrink-0 mt-1" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {touched && rows.length === 0 && (
          <p className="text-[11px] text-faint">Pegá al menos un link para ver la vista previa.</p>
        )}

        <div className="rounded-xl bg-accent/5 border border-accent/20 px-3 py-2.5 flex gap-2">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <p className="text-[10px] text-mute leading-relaxed">
            Cada tomo queda con <strong className="text-ink">lectura online</strong> (preview de Drive)
            y <strong className="text-ink">descarga directa</strong>. No ocupa Storage: solo guarda
            los links. Después podés editar títulos, portadas y fechas uno por uno.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-line flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-raised hover:bg-line text-xs font-semibold text-mute hover:text-ink transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={preview.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preview.length > 0 ? <Plus className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5" />}
          Crear {preview.length || ''} tomo{preview.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  );
};
