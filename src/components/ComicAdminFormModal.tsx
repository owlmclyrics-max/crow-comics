import React, { useState } from 'react';
import type { Comic, ComicTag, ComicPublisher, ComicStatus, Chapter, ChapterLink } from '../types/comic';
import {
  X,
  Plus,
  Trash2,
  Save,
  Layers,
  AlertCircle,
  Package,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  FileText,
  Link2,
  Download,
  Edit3,
  Check,
} from 'lucide-react';
import { PUBLISHERS, TAGS, STATUSES } from '../lib/constants';
import { Modal } from './ui/Modal';

interface ComicAdminFormModalProps {
  isOpen: boolean;
  comicToEdit?: Comic | null;
  onClose: () => void;
  onSave: (
    comic: Omit<Comic, 'id' | 'chapters'> & { id?: string },
    chapters: Chapter[],
  ) => Promise<{ success: boolean; error?: string }>;
}

type WizardStep = 'info' | 'chapters';

const TODAY = new Date().toISOString().split('T')[0];

const LINK_TYPES: { value: NonNullable<ChapterLink['type']>; label: string }[] = [
  { value: 'pdf',      label: 'PDF' },
  { value: 'cloud',    label: 'Nube' },
  { value: 'download', label: 'Descarga' },
  { value: 'other',    label: 'Otro' },
];

const buildChapter = (comicId: string, n: number): Chapter => ({
  id: `new_ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  comic_id: comicId,
  chapter_number: n,
  title: `Capítulo #${n}`,
  cover_url: '',
  pages_count: 32,
  release_date: TODAY,
  links: [],
});

const createLink = (): ChapterLink => ({
  id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: 'Mega',
  url: '',
  type: 'cloud',
});

/* ─── input compartido ─── */
const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  col2?: boolean;
}> = ({ label, children, col2 }) => (
  <div className={`space-y-1 ${col2 ? 'md:col-span-2' : ''}`}>
    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-red-500 text-sm text-zinc-100 outline-none transition-colors';

/* ══════════════════════════════════════════════════
   EDITOR DE UN CAPÍTULO (panel derecho)
══════════════════════════════════════════════════ */
const ChapterEditor: React.FC<{
  chapter: Chapter;
  onUpdate: <K extends keyof Chapter>(field: K, value: Chapter[K]) => void;
  onAddLink: () => void;
  onUpdateLink: <K extends keyof ChapterLink>(li: number, field: K, value: ChapterLink[K]) => void;
  onRemoveLink: (li: number) => void;
}> = ({ chapter, onUpdate, onAddLink, onUpdateLink, onRemoveLink }) => (
  <div className="space-y-5 h-full">
    {/* Datos básicos */}
    <div className="grid grid-cols-2 gap-3">
      <Field label="Título" col2>
        <input type="text" value={chapter.title}
          onChange={e => onUpdate('title', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Número">
        <input type="number" value={chapter.chapter_number}
          onChange={e => onUpdate('chapter_number', parseInt(e.target.value, 10))} className={inputCls} />
      </Field>
      <Field label="Portada (URL)">
        <input type="text" value={chapter.cover_url ?? ''}
          onChange={e => onUpdate('cover_url', e.target.value)}
          placeholder="https://..." className={inputCls} />
      </Field>
      <Field label="Fecha">
        <input type="date" value={chapter.release_date ?? TODAY}
          onChange={e => onUpdate('release_date', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Páginas del tomo" col2>
        <input type="number" min={1}
          value={chapter.pages_count ?? ''}
          onChange={e => {
            const n = parseInt(e.target.value, 10);
            onUpdate('pages_count', Number.isFinite(n) && n > 0 ? n : undefined);
          }}
          placeholder="Ej. 32"
          className={inputCls} />
      </Field>
    </div>

    {/* PDF Online */}
    <div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wide">Leer Online — PDF</span>
      </div>
      <input
        type="text"
        value={chapter.pdf_url ?? ''}
        onChange={e => onUpdate('pdf_url', e.target.value)}
        placeholder="https://drive.google.com/file/d/FILE_ID/preview"
        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-sky-800/50 focus:border-sky-400 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600"
      />
      <p className="text-[10px] text-zinc-500">
        Google Drive: archivo → Compartir → cambia <code className="text-sky-500">/view</code> por <code className="text-sky-500">/preview</code>
      </p>
    </div>

    {/* Links de descarga */}
    <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-bold text-red-300 uppercase tracking-wide">Links de Descarga</span>
          {(chapter.links ?? []).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
              {(chapter.links ?? []).length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAddLink}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-semibold transition-colors border border-red-500/30"
        >
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>

      {(chapter.links ?? []).length === 0 ? (
        <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-zinc-950/40 border border-zinc-700/30">
          <Link2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <p className="text-[11px] text-zinc-500 italic">Sin links. Añade Mega, Drive, Mediafire…</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(chapter.links ?? []).map((link, li) => (
            <div key={link.id} className="grid grid-cols-12 gap-1.5 items-center">
              <input
                type="text"
                value={link.name}
                onChange={e => onUpdateLink(li, 'name', e.target.value)}
                placeholder="Servidor"
                className="col-span-3 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-red-500 text-xs text-zinc-100 outline-none"
              />
              <input
                type="text"
                value={link.url}
                onChange={e => onUpdateLink(li, 'url', e.target.value)}
                placeholder="https://mega.nz/..."
                className="col-span-6 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-red-500 text-xs text-zinc-100 outline-none"
              />
              <select
                value={link.type ?? 'cloud'}
                onChange={e => onUpdateLink(li, 'type', e.target.value as ChapterLink['type'])}
                className="col-span-2 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-red-500 text-xs text-zinc-100 outline-none"
              >
                {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => onRemoveLink(li)}
                className="col-span-1 flex justify-center p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition-colors border border-rose-800/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════
   MODAL PRINCIPAL
══════════════════════════════════════════════════ */
export const ComicAdminFormModal: React.FC<ComicAdminFormModalProps> = ({
  isOpen, comicToEdit, onClose, onSave,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');

  // Comic info
  const [title, setTitle]                               = useState(comicToEdit?.title ?? '');
  const [originalTitle, setOriginalTitle]               = useState(comicToEdit?.original_title ?? '');
  const [coverUrl, setCoverUrl]                         = useState(comicToEdit?.cover_url ?? '');
  const [synopsis, setSynopsis]                         = useState(comicToEdit?.synopsis ?? '');
  const [publisher, setPublisher]                       = useState<ComicPublisher>(comicToEdit?.publisher ?? 'Marvel');
  const [tag, setTag]                                   = useState<ComicTag>(comicToEdit?.tag ?? 'Novedad');
  const [status, setStatus]                             = useState<ComicStatus>(comicToEdit?.status ?? 'En curso');
  const [writer, setWriter]                             = useState(comicToEdit?.writer ?? '');
  const [artist, setArtist]                             = useState(comicToEdit?.artist ?? '');
  const [translatorTypesetter, setTranslatorTypesetter] = useState(comicToEdit?.translator_typesetter ?? '');
  const [year, setYear]                                 = useState(() =>
    comicToEdit?.year ? String(comicToEdit.year) : String(new Date().getFullYear()),
  );

  // Pack completo
  const [totalIssuesLabel, setTotalIssuesLabel] = useState(comicToEdit?.total_issues_label ?? '#1-4 Serie Completa');
  const [fullDownloadLinks, setFullDownloadLinks] = useState<ChapterLink[]>(
    () => comicToEdit?.full_download_links ?? [
      { id: `pack_${Date.now()}`, name: 'Mega (Pack Completo)', url: '', type: 'cloud' },
    ],
  );

  // Capítulos + selección
  const [chapters, setChapters]         = useState<Chapter[]>(
    () => comicToEdit?.chapters ?? [buildChapter(comicToEdit?.id ?? '', 1)],
  );
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);

  const [saving, setSaving]     = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps = [
    { id: 'info',     label: 'Editar Cómic',    icon: BookOpen, desc: 'Info + pack completo' },
    { id: 'chapters', label: 'Capítulos',        icon: Layers,   desc: 'PDF + links de descarga' },
  ] as const;

  const stepIndex  = steps.findIndex(s => s.id === currentStep);
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = () => { if (stepIndex < steps.length - 1) setCurrentStep(steps[stepIndex + 1].id); };
  const handleBack = () => { if (stepIndex > 0)               setCurrentStep(steps[stepIndex - 1].id); };

  const handleSave = async () => {
    setSaving(true); setErrorMsg(null);
    try {
      const result = await onSave({
        id: comicToEdit?.id,
        title: title.trim(),
        original_title: originalTitle.trim() || undefined,
        cover_url: coverUrl.trim(),
        synopsis: synopsis.trim(),
        publisher, tag, status,
        writer: writer.trim(),
        artist: artist.trim() || undefined,
        translator_typesetter: translatorTypesetter.trim(),
        year: year ? parseInt(year, 10) : undefined,
        total_issues_label: totalIssuesLabel.trim() || undefined,
        full_download_links: fullDownloadLinks.filter(l => l.url.trim()),
      }, chapters);
      if (result.success) onClose();
      else setErrorMsg(result.error ?? 'Error al guardar');
    } catch { setErrorMsg('Error al guardar el cómic'); }
    finally { setSaving(false); }
  };

  /* ── Pack helpers ── */
  const addPackLink    = () => setFullDownloadLinks(c => [...c, { id: `p_${Date.now()}`, name: 'Google Drive', url: '', type: 'cloud' }]);
  const removePackLink = (i: number) => setFullDownloadLinks(c => c.filter((_, idx) => idx !== i));
  const updatePackLink = <K extends keyof ChapterLink>(i: number, f: K, v: ChapterLink[K]) =>
    setFullDownloadLinks(c => c.map((l, idx) => idx === i ? { ...l, [f]: v } : l));

  /* ── Chapter helpers ── */
  const addChapter = () => {
    const next = [...chapters, buildChapter(comicToEdit?.id ?? '', chapters.length + 1)];
    setChapters(next);
    setSelectedChapterIdx(next.length - 1);
  };

  const removeChapter = (i: number) => {
    const next = chapters.filter((_, idx) => idx !== i);
    setChapters(next);
    setSelectedChapterIdx(Math.min(selectedChapterIdx, next.length - 1));
  };

  const updateChapter = <K extends keyof Chapter>(i: number, f: K, v: Chapter[K]) =>
    setChapters(c => c.map((ch, idx) => idx === i ? { ...ch, [f]: v } : ch));

  const addChapterLink    = (ci: number) =>
    setChapters(c => c.map((ch, i) => i === ci ? { ...ch, links: [...(ch.links ?? []), createLink()] } : ch));
  const removeChapterLink = (ci: number, li: number) =>
    setChapters(c => c.map((ch, i) => i === ci ? { ...ch, links: (ch.links ?? []).filter((_, j) => j !== li) } : ch));
  const updateChapterLink = <K extends keyof ChapterLink>(ci: number, li: number, f: K, v: ChapterLink[K]) =>
    setChapters(c => c.map((ch, i) =>
      i === ci ? { ...ch, links: (ch.links ?? []).map((lk, j) => j === li ? { ...lk, [f]: v } : lk) } : ch,
    ));

  /* ══════ RENDER PASO 1: INFO ══════ */
  const renderInfo = () => (
    <div className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Título *">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título del cómic" className={inputCls} />
        </Field>
        <Field label="Título Original">
          <input type="text" value={originalTitle} onChange={e => setOriginalTitle(e.target.value)}
            placeholder="Original title" className={inputCls} />
        </Field>
        <Field label="URL de Portada *">
          <input type="text" value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
            placeholder="https://..." className={inputCls} />
        </Field>
        <Field label="Editorial">
          <select value={publisher} onChange={e => setPublisher(e.target.value as ComicPublisher)} className={inputCls}>
            {PUBLISHERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Etiqueta">
          <select value={tag} onChange={e => setTag(e.target.value as ComicTag)} className={inputCls}>
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select value={status} onChange={e => setStatus(e.target.value as ComicStatus)} className={inputCls}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Año">
          <input type="number" value={year} onChange={e => setYear(e.target.value)}
            placeholder="2024" className={inputCls} />
        </Field>
        <Field label="Sinopsis *" col2>
          <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)}
            placeholder="Sinopsis del cómic..." rows={3}
            className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Guionista *">
          <input type="text" value={writer} onChange={e => setWriter(e.target.value)}
            placeholder="Nombre del guionista" className={inputCls} />
        </Field>
        <Field label="Dibujante">
          <input type="text" value={artist} onChange={e => setArtist(e.target.value)}
            placeholder="Nombre del dibujante" className={inputCls} />
        </Field>
        <Field label="Maquetador / Traductor *" col2>
          <input type="text" value={translatorTypesetter} onChange={e => setTranslatorTypesetter(e.target.value)}
            placeholder="Nombre del maquetador o fansub" className={inputCls} />
        </Field>
      </div>

      {/* Pack completo */}
      <div className="rounded-2xl border border-amber-800/30 bg-amber-950/10 p-4 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Pack Completo</p>
            <p className="text-[10px] text-zinc-500">Descargar toda la serie de golpe</p>
          </div>
        </div>
        <Field label="Etiqueta del Pack">
          <input type="text" value={totalIssuesLabel} onChange={e => setTotalIssuesLabel(e.target.value)}
            placeholder="#1-4 Serie Completa"
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-amber-800/40 focus:border-amber-500 text-sm text-zinc-100 outline-none" />
        </Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Links del pack</span>
            <button type="button" onClick={addPackLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-semibold border border-amber-500/30 transition-colors">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {fullDownloadLinks.map((link, i) => (
            <div key={link.id} className="flex gap-2 items-center">
              <input type="text" value={link.name} onChange={e => updatePackLink(i, 'name', e.target.value)}
                placeholder="Servidor" className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-sm text-zinc-100 outline-none" />
              <input type="text" value={link.url} onChange={e => updatePackLink(i, 'url', e.target.value)}
                placeholder="URL del pack" className="flex-[2] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-sm text-zinc-100 outline-none" />
              <button type="button" onClick={() => removePackLink(i)}
                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ══════ RENDER PASO 2: CAPÍTULOS ══════ */
  const selectedChapter = chapters[selectedChapterIdx];

  const renderChapters = () => (
    <div className="flex gap-4 h-full min-h-[420px]">

      {/* ── COLUMNA IZQUIERDA: lista compacta ── */}
      <div className="w-52 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
            Tomos ({chapters.length})
          </span>
          <button
            type="button"
            onClick={addChapter}
            className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors"
            title="Agregar capítulo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 max-h-[380px]">
          {chapters.length === 0 && (
            <div className="py-8 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-700">
              <p className="text-[11px] text-zinc-500">Sin capítulos</p>
            </div>
          )}
          {chapters.map((ch, i) => {
            const hasLinks = (ch.links ?? []).length > 0;
            const hasPdf   = Boolean(ch.pdf_url);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChapterIdx(i)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all group flex items-center gap-2 ${
                  i === selectedChapterIdx
                    ? 'bg-red-500/15 border-red-500/40 text-white'
                    : 'bg-zinc-900/50 border-zinc-700/40 text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <span className={`w-5 h-5 shrink-0 rounded-md text-[10px] font-bold flex items-center justify-center ${
                  i === selectedChapterIdx ? 'bg-red-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {ch.chapter_number}
                </span>
                <span className="flex-1 text-xs font-semibold truncate">{ch.title}</span>
                <div className="flex gap-0.5 shrink-0">
                  {hasPdf  && <span title="PDF" className="w-2 h-2 rounded-full bg-sky-400" />}
                  {hasLinks && <span title="Links" className="w-2 h-2 rounded-full bg-red-400" />}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeChapter(i); }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-400 hover:text-rose-300 transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-2 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> PDF online
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Links descarga
          </div>
        </div>
      </div>

      {/* ── Divisor ── */}
      <div className="w-px bg-zinc-800 shrink-0" />

      {/* ── COLUMNA DERECHA: editor ── */}
      <div className="flex-1 overflow-y-auto">
        {selectedChapter ? (
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs font-bold text-white">
                Editando: <span className="text-red-400">{selectedChapter.title}</span>
              </p>
            </div>
            <p className="text-[10px] text-zinc-500 ml-5">
              Los cambios se guardan al presionar "Guardar Cómic".
            </p>
          </div>
        ) : null}

        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Layers className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-500 text-center">
              Usa el botón <strong className="text-zinc-400">+</strong> de la izquierda para añadir el primer capítulo.
            </p>
          </div>
        ) : selectedChapter ? (
          <ChapterEditor
            chapter={selectedChapter}
            onUpdate={(f, v) => updateChapter(selectedChapterIdx, f, v)}
            onAddLink={() => addChapterLink(selectedChapterIdx)}
            onUpdateLink={(li, f, v) => updateChapterLink(selectedChapterIdx, li, f, v)}
            onRemoveLink={li => removeChapterLink(selectedChapterIdx, li)}
          />
        ) : null}
      </div>
    </div>
  );

  /* ══════ JSX PRINCIPAL ══════ */
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white">
            {comicToEdit ? 'Editar Cómic' : 'Nuevo Cómic'}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Paso {stepIndex + 1} de {steps.length} — {steps[stepIndex].desc}
          </p>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Wizard tabs */}
      <div className="flex border-b border-zinc-800">
        {steps.map((step, i) => {
          const isActive   = currentStep === step.id;
          const isComplete = i < stepIndex;
          const isDisabled = i > stepIndex;
          return (
            <button key={step.id} type="button"
              onClick={() => !isDisabled && setCurrentStep(step.id)}
              disabled={isDisabled}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-semibold transition-all ${
                isActive   ? 'text-red-400 bg-red-500/5' :
                isComplete ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/50' :
                             'text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                isActive   ? 'bg-red-500 border-red-500 text-zinc-950' :
                isComplete ? 'bg-zinc-700 border-zinc-600 text-zinc-300' :
                             'bg-transparent border-zinc-700 text-zinc-600'
              }`}>
                {isComplete ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <step.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto px-6 py-5 ${currentStep === 'chapters' ? 'overflow-hidden' : ''}`}>
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p>{errorMsg}</p>
          </div>
        )}
        {currentStep === 'info'     && renderInfo()}
        {currentStep === 'chapters' && renderChapters()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/20">
        <button type="button" onClick={handleBack} disabled={stepIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${
              i === stepIndex ? 'w-5 bg-red-400' : 'w-1.5 bg-zinc-700'
            }`} />
          ))}
        </div>

        {isLastStep ? (
          <button type="button" onClick={handleSave}
            disabled={saving || !title.trim() || !coverUrl.trim() || !synopsis.trim() || !writer.trim() || !translatorTypesetter.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cómic'}
          </button>
        ) : (
          <button type="button" onClick={handleNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95">
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </Modal>
  );
};
