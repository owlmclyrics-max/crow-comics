import React, { useRef, useState } from 'react';
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
  Eye,
  Sparkles,
  HelpCircle,
  Globe,
  Images,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { PUBLISHERS, TAGS, STATUSES } from '../lib/constants';
import { AdminHelpModal } from './AdminHelpModal';
import { showToast } from './ui/Toast';
import {
  buildDriveDownloadUrl,
  buildDrivePreviewUrl,
  detectServer,
  GENERIC_SERVER_NAMES,
  isDriveLink,
  parseDriveId,
} from '../lib/driveLinks';
import { fetchFandomInfo, isFandomWikiUrl } from '../lib/fandomImport';
import { isFandomImageUrl, mirrorFandomCover } from '../lib/comicImages';
import {
  openComicArchive,
  toWebpPages,
  uploadChapterPages,
} from '../lib/comicArchive';
import { Modal } from './ui/Modal';
import { ImageUploadField } from './ImageUploadField';
import { BulkDriveImportModal } from './BulkDriveImportModal';
import { ScheduleDatePicker } from './ui/ScheduleDatePicker';
import { isoToColombiaInput } from '../lib/releases';

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
  release_date: undefined, // Sin fecha por defecto, el admin elige cuándo lanzar
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
    <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors';

/* ══════════════════════════════════════════════════
   VISTA PREVIA (cómo se verá en el hero y en la ficha)
   Replica en pequeño el lenguaje visual real: banner a sangre,
   título del CÓMIC + chip "Tomo #N", y la ficha con su portada.
══════════════════════════════════════════════════ */
const ComicFormPreview: React.FC<{
  title: string;
  coverUrl: string;
  bannerUrl: string;
  synopsis: string;
  publisher: string;
  year: string;
  status: string;
  chapterCount: number;
}> = ({ title, coverUrl, bannerUrl, synopsis, publisher, year, status, chapterCount }) => {
  const displayTitle = title.trim() || 'Título del cómic';
  const art = bannerUrl.trim() || coverUrl.trim();
  const hasBanner = Boolean(bannerUrl.trim());

  return (
    <div className="rounded-2xl border border-line bg-bg/60 p-3 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-bold text-mute uppercase tracking-wide">Vista previa</span>
        {!hasBanner && (
          <span className="text-[10px] text-amber-400 font-semibold">· sin banner, se usa la portada</span>
        )}
      </div>

      {/* ── MOCK HERO ── */}
      <div className="relative overflow-hidden rounded-xl aspect-[16/7] bg-surface border border-line">
        {art ? (
          hasBanner ? (
            <img src={art} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              {/* Relleno difuminado para no estirar la portada vertical */}
              <img
                src={art}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-50"
              />
              <img
                src={art}
                alt=""
                aria-hidden="true"
                className="absolute inset-y-0 right-0 h-full w-auto max-w-[55%] object-contain object-right"
              />
            </>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-faint">
            Pega una portada o un banner para verlo aquí
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

        <div className="absolute left-0 bottom-0 p-4 max-w-[75%] space-y-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg/70 backdrop-blur-md border border-line text-[9px] font-black uppercase tracking-wider text-ink">
            <Sparkles className="w-2.5 h-2.5 text-accent" /> #1 en novedades
          </span>
          <h3 className="text-lg sm:text-2xl font-black text-ink leading-tight line-clamp-2">
            {displayTitle}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-mute font-semibold">
            <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent font-bold">
              Tomo #1
            </span>
            {year.trim() && <span>{year}</span>}
            {publisher.trim() && <span className="text-accent">· {publisher}</span>}
            <span>· {chapterCount} {chapterCount === 1 ? 'tomo' : 'tomos'}</span>
            {status.trim() && <span>· {status}</span>}
          </p>
        </div>
      </div>

      {/* ── MOCK FICHA ── */}
      <div className="rounded-xl border border-line bg-surface/40 p-3">
        <p className="text-[10px] font-bold text-faint uppercase tracking-wide mb-2">Ficha del cómic</p>
        <div className="flex gap-3">
          <div className="w-16 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-bg border border-line">
            {coverUrl.trim() ? (
              <img src={coverUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-faint">Portada</div>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-ink truncate">{displayTitle}</h4>
            <p className="text-[10px] text-mute font-semibold">
              {[year.trim(), publisher.trim(), status.trim()].filter(Boolean).join(' · ') || 'Año · Editorial · Estado'}
            </p>
            <p className="text-[10px] text-mute leading-snug line-clamp-3">
              {synopsis.trim() || 'La sinopsis aparecerá aquí…'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════════════
   EDITOR DE UN CAPÍTULO (panel derecho)
══════════════════════════════════════════════════ */
const ChapterEditor: React.FC<{
  chapter: Chapter;
  onUpdate: <K extends keyof Chapter>(field: K, value: Chapter[K]) => void;
  onAddLink: () => void;
  onUpdateLink: <K extends keyof ChapterLink>(li: number, field: K, value: ChapterLink[K]) => void;
  /** v0.9.9.9.3: pegar un link de Drive en "Leer Online" convierte solo. */
  onDrivePdf: (fileId: string) => void;
  /** v0.9.9.9.3: pegar un link de Drive en una fila de descarga lo
      convierte solo a descarga directa. */
  onLinkUrl: (li: number, raw: string, link: ChapterLink) => void;
  onRemoveLink: (li: number) => void;
}> = ({ chapter, onUpdate, onAddLink, onUpdateLink, onDrivePdf, onLinkUrl, onRemoveLink }) => (
  <div className="space-y-5">
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
      <Field label="Fecha de publicación">
        <input type="date" value={chapter.release_date ?? ''}
          onChange={e => onUpdate('release_date', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Programar lanzamiento en página" col2>
        <ScheduleDatePicker
          value={chapter.schedule_date ? isoToColombiaInput(chapter.schedule_date) : ''}
          onChange={(val) => onUpdate('schedule_date', val)}
          label="Fecha y hora para aparecer en horario de lanzamientos"
        />
      </Field>
      {/* Portada en fila propia y compacta: la preview no queda huérfana
          flotando junto a otros campos (era el layout roto de antes). */}
      <div className="col-span-2">
        <ImageUploadField
          label="Portada del capítulo"
          value={chapter.cover_url ?? ''}
          onChange={url => onUpdate('cover_url', url)}
          compact
        />
      </div>
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
        onChange={e => {
          // v0.9.9.9.3: si es un link de Drive (compartir, /view o /preview)
          // se convierte solo: lectura online + descarga directa de una vez.
          const fileId = parseDriveId(e.target.value);
          if (fileId) onDrivePdf(fileId);
          else onUpdate('pdf_url', e.target.value);
        }}
        placeholder="Pegá el link de compartir de Drive (se convierte solo)"
        className="w-full px-3 py-2 rounded-xl bg-bg border border-sky-800/50 focus:border-sky-400 text-sm text-ink outline-none transition-colors placeholder:text-faint"
      />
      <p className="text-[10px] text-faint">
        Pegá el link de compartir de Drive tal cual ✨ — se convierte solo a lectura online y
        agrega el link de descarga directa abajo.
      </p>
    </div>

    {/* Visor propio: páginas WebP desde CBZ/CBR (v0.9.9.9.6) */}
    <PagesImportCard chapter={chapter} onUpdate={onUpdate} />

    {/* Links de descarga */}
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px] font-bold text-accent uppercase tracking-wide">Links de Descarga</span>
          {(chapter.links ?? []).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold border border-accent/30">
              {(chapter.links ?? []).length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAddLink}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent2/20 text-accent text-[11px] font-semibold transition-colors border border-accent/30"
        >
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>

      {(chapter.links ?? []).length === 0 ? (
        <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-bg/40 border border-line/30">
          <Link2 className="w-3.5 h-3.5 text-faint shrink-0" />
          <p className="text-[11px] text-faint italic">Sin links. Añade Mega, Drive, Mediafire…</p>
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
                className="col-span-3 px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-accent text-xs text-ink outline-none"
              />
              <input
                type="text"
                value={link.url}
                onChange={e => onLinkUrl(li, e.target.value, link)}
                placeholder="https://mega.nz/... o link de Drive"
                className="col-span-6 px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-accent text-xs text-ink outline-none"
              />
              <select
                value={link.type ?? 'cloud'}
                onChange={e => onUpdateLink(li, 'type', e.target.value as ChapterLink['type'])}
                className="col-span-2 px-2 py-1.5 rounded-lg bg-surface border border-line focus:border-accent text-xs text-ink outline-none"
              >
                {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => onRemoveLink(li)}
                className="col-span-1 flex justify-center p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 transition-colors border border-accent/30"
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
   CARD: IMPORTAR CBZ/CBR → PÁGINAS WEBP (visor propio)
   v0.9.9.9.6: todo en el navegador del admin — abre el archivo, convierte
   las imágenes a WebP (calidad fiel, poco peso) y las sube a R2 una por una.
   Si el tomo además tiene PDF de Drive, ese queda como respaldo.
══════════════════════════════════════════════════ */
const PagesImportCard: React.FC<{
  chapter: Chapter;
  onUpdate: <K extends keyof Chapter>(field: K, value: Chapter[K]) => void;
}> = ({ chapter, onUpdate }) => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0); // 0..1 (50% convirtiendo, 100% subido)
  const inputRef = useRef<HTMLInputElement>(null);

  const pageCount = chapter.pages?.length ?? 0;

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      setStatus('Abriendo archivo…');
      const pages = await openComicArchive(file);
      const blobs = await toWebpPages(pages, (done, total) => {
        setStatus(`Convirtiendo a WebP… (${done}/${total})`);
        setProgress((done / total) * 0.5);
      });
      setStatus(`Subiendo… (0/${blobs.length})`);
      const urls = await uploadChapterPages(chapter.id, blobs, (done, total) => {
        setStatus(`Subiendo… (${done}/${total})`);
        setProgress(0.5 + (done / total) * 0.5);
      });
      onUpdate('pages', urls);
      onUpdate('pages_count', blobs.length);
      showToast(`${blobs.length} páginas listas para el visor propio ✅`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'No se pudo procesar el archivo',
        'error',
      );
    } finally {
      setBusy(false);
      setStatus('');
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const pickFile = () => inputRef.current?.click();

  return (
    <div className="rounded-xl border border-accent2/40 bg-accent2/5 p-3.5 space-y-2.5">
      <div className="flex items-center gap-2">
        <Images className="w-3.5 h-3.5 text-accent2" />
        <span className="text-[11px] font-bold text-accent2 uppercase tracking-wide">
          Visor propio — páginas WebP
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".cbz,.zip,.cbr,.rar"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {pageCount > 0 && !busy ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink">
            <strong className="font-bold text-accent2">{pageCount} páginas</strong> subidas ✅
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={pickFile}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent2/15 hover:bg-accent2/25 text-accent2 text-[11px] font-semibold border border-accent2/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Reemplazar
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate('pages', undefined as Chapter['pages']);
                showToast('Páginas quitadas — el tomo vuelve a leerse por PDF', 'info');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-raised hover:bg-line text-mute hover:text-ink text-[11px] font-semibold transition-colors"
            >
              <X className="w-3 h-3" /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent2/15 hover:bg-accent2/25 text-accent2 text-xs font-bold border border-accent2/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {busy ? status || 'Procesando…' : 'Subir CBZ / CBR del tomo'}
        </button>
      )}

      {busy && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full rounded-full bg-accent2 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-faint text-center">{status}</p>
        </div>
      )}

      <p className="text-[10px] text-faint leading-relaxed">
        La web convierte las imágenes a WebP (calidad fiel, poco peso) y las sube sola.
        CBR con soporte mejor esfuerzo — si uno falla, pasalo a CBZ con WinRAR.
        El PDF de Drive (arriba) queda como respaldo.
      </p>
    </div>
  );
};

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
  const [bannerUrl, setBannerUrl]                       = useState(comicToEdit?.banner_url ?? '');
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
  // v0.6: vista previa del hero (banner) y de la ficha antes de guardar.
  const [showPreview, setShowPreview] = useState(false);
  // v0.9.9.9.1: ayuda para admins al alcance de un click dentro del form.
  const [isAdminHelpOpen, setIsAdminHelpOpen] = useState(false);
  // v0.9.9.9.4: importar datos desde Fandom (pegar link → título/portada/
  // sinopsis solos, sin pisar lo que ya está escrito).
  const [fandomUrl, setFandomUrl] = useState('');
  const [importingFandom, setImportingFandom] = useState(false);
  // v0.11.2: importar varios links de Drive de una sola vez.
  const [isBulkDriveOpen, setIsBulkDriveOpen] = useState(false);

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
        banner_url: bannerUrl.trim() || undefined,
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

  /** v0.9.9.9.3: pegar un link de compartir de Drive en "Leer Online" hace
      TODO solo — convierte a /preview para el visor Y agrega el link de
      descarga directa (uc?export=download) a la lista, sin duplicarlo. */
  const handleDrivePdfLink = (ci: number, fileId: string) => {
    const preview = buildDrivePreviewUrl(fileId);
    const download = buildDriveDownloadUrl(fileId);
    setChapters(c => c.map((ch, i) => {
      if (i !== ci) return ch;
      const already = (ch.links ?? []).some(lk => lk.url === download);
      const links = already
        ? ch.links
        : [...(ch.links ?? []), {
            id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: 'Drive',
            url: download,
            type: 'cloud' as const,
          }];
      return { ...ch, pdf_url: preview, links };
    }));
    showToast('Drive detectado: lectura online + descarga directa listos ✅', 'success');
  };

  /** v0.11.2: importación masiva — agrega todos los tomos de una y deja
      seleccionado el primero de los nuevos. */
  const handleBulkDriveImport = (created: Chapter[]) => {
    if (created.length === 0) return;
    setChapters(prev => [...prev, ...created]);
    setSelectedChapterIdx(chapters.length);
    showToast(
      `${created.length} tomo${created.length === 1 ? '' : 's'} agregado${created.length === 1 ? '' : 's'} ✅`,
      'success',
    );
  };

  /** En una fila de descarga, un link de compartir de Drive se convierte
      solo en descarga directa (y de 'Mega' default pasa a llamarse 'Drive'). */
  const handleChapterLinkUrl = (ci: number, li: number, raw: string, current: ChapterLink) => {
    const fileId = parseDriveId(raw);
    if (fileId && isDriveLink(raw) && !raw.includes('export=download')) {
      updateChapterLink(ci, li, 'url', buildDriveDownloadUrl(fileId));
      if (GENERIC_SERVER_NAMES.includes(current.name.toLowerCase())) {
        updateChapterLink(ci, li, 'name', 'Drive');
        updateChapterLink(ci, li, 'type', 'cloud');
      }
      showToast('Convertido a descarga directa de Drive ✅', 'success');
      return;
    }
    // v0.9.9.9.4: auto-detección del servidor (Mega/Mediafire/1Fichier/Drive):
    // pone el nombre y el tipo solos, salvo que el nombre sea uno a mano.
    const server = detectServer(raw);
    if (server) {
      updateChapterLink(ci, li, 'url', raw);
      if (GENERIC_SERVER_NAMES.includes(current.name.toLowerCase())) {
        updateChapterLink(ci, li, 'name', server.name);
      }
      updateChapterLink(ci, li, 'type', server.type as ChapterLink['type']);
      return;
    }
    updateChapterLink(ci, li, 'url', raw);
  };

  /** Misma detección para los links del Pack Completo. */
  const handlePackLinkUrl = (i: number, raw: string, currentName: string) => {
    const fileId = parseDriveId(raw);
    if (fileId && isDriveLink(raw) && !raw.includes('export=download')) {
      updatePackLink(i, 'url', buildDriveDownloadUrl(fileId));
      if (GENERIC_SERVER_NAMES.includes(currentName.toLowerCase())) {
        updatePackLink(i, 'name', 'Drive');
        updatePackLink(i, 'type', 'cloud');
      }
      showToast('Convertido a descarga directa de Drive ✅', 'success');
      return;
    }
    const server = detectServer(raw);
    if (server) {
      updatePackLink(i, 'url', raw);
      if (GENERIC_SERVER_NAMES.includes(currentName.toLowerCase())) {
        updatePackLink(i, 'name', server.name);
      }
      updatePackLink(i, 'type', server.type as ChapterLink['type']);
      return;
    }
    updatePackLink(i, 'url', raw);
  };

  /* ══════ RENDER PASO 1: INFO ══════ */

  /** v0.9.9.9.4: importa título/portada/sinopsis desde una página de Fandom.
      SOLO rellena los campos vacíos — jamás pisa lo que el admin ya escribió. */
  const handleFandomImport = async () => {
    const url = fandomUrl.trim();
    if (!isFandomWikiUrl(url)) {
      showToast('Pegá un link de wiki de Fandom (…fandom.com/wiki/…)', 'info');
      return;
    }
    setImportingFandom(true);
    try {
      const info = await fetchFandomInfo(url);
      if (!info) {
        showToast('No se pudo leer la página de Fandom', 'error');
        return;
      }
      const filled: string[] = [];
      if (info.title && !title.trim()) {
        setTitle(info.title);
        filled.push('título');
      }
      if (info.image && (!coverUrl.trim() || isFandomImageUrl(coverUrl))) {
        // El link directo de Fandom da 403 al hotlinkearlo: lo descargamos
        // por /fandom-image, lo pasamos a WebP y lo guardamos en el bucket.
        setCoverUrl(await mirrorFandomCover(info.image));
        filled.push('portada');
      }
      if (info.description && !synopsis.trim()) {
        setSynopsis(info.description);
        filled.push('sinopsis');
      }
      if (info.writer && !writer.trim()) {
        setWriter(info.writer);
        filled.push('guionista');
      }
      if (info.artist && !artist.trim()) {
        setArtist(info.artist);
        filled.push('artista');
      }
      showToast(
        filled.length > 0
          ? `Importado de Fandom: ${filled.join(', ')} ✅`
          : 'Los datos ya estaban completos — no pisé nada',
        filled.length > 0 ? 'success' : 'info',
      );
    } finally {
      setImportingFandom(false);
    }
  };

  const renderFandomImport = () => (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-bold text-accent uppercase tracking-wide">
          Importar desde Fandom
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={fandomUrl}
          onChange={e => setFandomUrl(e.target.value)}
          placeholder="https://dc.fandom.com/wiki/Red_Lanterns_Vol_1_1"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void handleFandomImport()}
          disabled={importingFandom || !isFandomWikiUrl(fandomUrl)}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {importingFandom ? 'Importando…' : 'Importar'}
        </button>
      </div>
      <p className="text-[10px] text-faint">
        Pegá el link de la página del cómic en Fandom: rellena título, portada y sinopsis solos.
        Solo completa los campos vacíos — lo que ya escribiste no se toca.
      </p>
    </div>
  );

  const renderInfo = () => (
    <div className="space-y-7">
      {renderFandomImport()}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Título *">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título del cómic" className={inputCls} />
        </Field>
        <Field label="Título Original">
          <input type="text" value={originalTitle} onChange={e => setOriginalTitle(e.target.value)}
            placeholder="Original title" className={inputCls} />
        </Field>
        <div className="md:col-span-2 space-y-3">
          <ImageUploadField label="Portada del cómic * (vertical 2:3)" value={coverUrl} onChange={setCoverUrl} compact />
          <ImageUploadField
            label="Banner del hero (horizontal, opcional)"
            value={bannerUrl}
            onChange={setBannerUrl}
            compact
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              aria-expanded={showPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-raised hover:bg-line text-ink text-[11px] font-bold border border-line transition-colors active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 text-accent" />
              {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
            </button>
            <p className="text-[10px] text-faint">
              {bannerUrl.trim()
                ? 'Se verá a sangre completa en el hero del inicio.'
                : 'Sin banner, la portada se ancla a la derecha con relleno difuminado.'}
            </p>
          </div>
          {showPreview && (
            <ComicFormPreview
              title={title}
              coverUrl={coverUrl}
              bannerUrl={bannerUrl}
              synopsis={synopsis}
              publisher={publisher}
              year={year}
              status={status}
              chapterCount={chapters.length || 1}
            />
          )}
        </div>
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
            <p className="text-sm font-bold text-ink">Pack Completo</p>
            <p className="text-[10px] text-faint">Descargar toda la serie de golpe</p>
          </div>
        </div>
        <Field label="Etiqueta del Pack">
          <input type="text" value={totalIssuesLabel} onChange={e => setTotalIssuesLabel(e.target.value)}
            placeholder="#1-4 Serie Completa"
            className="w-full px-3 py-2 rounded-xl bg-bg border border-amber-800/40 focus:border-amber-500 text-sm text-ink outline-none" />
        </Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-faint uppercase tracking-wide">Links del pack</span>
            <button type="button" onClick={addPackLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-semibold border border-amber-500/30 transition-colors">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {fullDownloadLinks.map((link, i) => (
            <div key={link.id} className="flex gap-2 items-center">
              <input type="text" value={link.name} onChange={e => updatePackLink(i, 'name', e.target.value)}
                placeholder="Servidor" className="flex-1 px-3 py-1.5 rounded-xl bg-bg border border-line focus:border-amber-500 text-sm text-ink outline-none" />
              <input type="text" value={link.url} onChange={e => handlePackLinkUrl(i, e.target.value, link.name)}
                placeholder="URL del pack" className="flex-[2] px-3 py-1.5 rounded-xl bg-bg border border-line focus:border-amber-500 text-sm text-ink outline-none" />
              <button type="button" onClick={() => removePackLink(i)}
                className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 border border-accent/30 transition-colors">
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
    <div className="flex flex-col md:flex-row gap-4 md:min-h-[420px]">

      {/* ── COLUMNA IZQUIERDA: lista compacta ── */}
      <div className="w-full md:w-52 md:shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-mute uppercase tracking-wide">
            Tomos ({chapters.length})
          </span>
          <button
            type="button"
            onClick={addChapter}
            className="p-1 rounded-lg bg-accent/15 hover:bg-accent2/20 text-accent border border-accent/30 transition-colors"
            title="Agregar capítulo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsBulkDriveOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 text-[11px] font-bold transition-colors"
          title="Pegar varios links de Drive y crear un tomo por link"
        >
          <Link2 className="w-3.5 h-3.5" />
          Importar varios
        </button>

        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-x-visible md:overflow-y-auto pr-0.5 md:max-h-[380px]">
          {chapters.length === 0 && (
            <div className="py-8 text-center rounded-xl bg-bg/60 border border-dashed border-line">
              <p className="text-[11px] text-faint">Sin capítulos</p>
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
                className={`min-w-[180px] md:min-w-0 md:w-full text-left px-3 py-2.5 rounded-xl border transition-all group flex items-center gap-2 ${
                  i === selectedChapterIdx
                    ? 'bg-accent/10 border-accent/30 text-ink'
                    : 'bg-surface/50 border-line/40 text-mute hover:text-ink hover:bg-raised/60'
                }`}
              >
                <span className={`w-5 h-5 shrink-0 rounded-md text-[10px] font-bold flex items-center justify-center ${
                  i === selectedChapterIdx ? 'bg-accent text-onaccent' : 'bg-line text-mute'
                }`}>
                  {ch.chapter_number}
                </span>
                <span className="flex-1 text-xs font-semibold truncate">{ch.title}</span>
                <div className="flex gap-0.5 shrink-0">
                  {hasPdf  && <span title="PDF" className="w-2 h-2 rounded-full bg-sky-400" />}
                  {hasLinks && <span title="Links" className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeChapter(i); }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-accent2 hover:text-accent2 transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-2 p-2.5 rounded-xl bg-bg/40 border border-line space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-faint">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> PDF online
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-faint">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" /> Links descarga
          </div>
        </div>
      </div>

      {/* ── Divisor ── */}
      <div className="hidden md:block w-px bg-line shrink-0" />

      {/* ── COLUMNA DERECHA: editor ── */}
      <div className="flex-1 min-w-0">
        {selectedChapter ? (
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-accent" />
              <p className="text-xs font-bold text-ink">
                Editando: <span className="text-accent">{selectedChapter.title}</span>
              </p>
            </div>
            <p className="text-[10px] text-faint ml-5">
              Los cambios se guardan al presionar "Guardar Cómic".
            </p>
          </div>
        ) : null}

        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Layers className="w-10 h-10 text-faint" />
            <p className="text-sm text-faint text-center">
              Usa el botón <strong className="text-mute">+</strong> de la izquierda para añadir el primer capítulo.
            </p>
          </div>
        ) : selectedChapter ? (
          <ChapterEditor
            chapter={selectedChapter}
            onUpdate={(f, v) => updateChapter(selectedChapterIdx, f, v)}
            onDrivePdf={fileId => handleDrivePdfLink(selectedChapterIdx, fileId)}
            onLinkUrl={(li, raw, link) =>
              handleChapterLinkUrl(selectedChapterIdx, li, raw, link)
            }
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
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line">
        <div>
          <h2 className="text-xl font-black text-ink">
            {comicToEdit ? 'Editar Cómic' : 'Nuevo Cómic'}
          </h2>
          <p className="text-xs text-faint mt-0.5">
            Paso {stepIndex + 1} de {steps.length} — {steps[stepIndex].desc}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Ayuda de admins: guía + conversor de links de Drive (v0.9.9.9.1) */}
          <button
            type="button"
            onClick={() => setIsAdminHelpOpen(true)}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-accent transition-colors"
            title="Ayuda para subir cómics y convertir links de Drive"
            aria-label="Ayuda para admins"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Wizard tabs */}
      <div className="flex border-b border-line">
        {steps.map((step, i) => {
          const isActive   = currentStep === step.id;
          const isComplete = i < stepIndex;
          const isDisabled = i > stepIndex;
          return (
            <button key={step.id} type="button"
              onClick={() => !isDisabled && setCurrentStep(step.id)}
              disabled={isDisabled}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-semibold transition-all ${
                isActive   ? 'text-accent bg-accent/5' :
                isComplete ? 'text-mute hover:text-ink hover:bg-raised/50' :
                             'text-faint cursor-not-allowed'
              }`}
            >
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                isActive   ? 'bg-accent border-accent text-onaccent' :
                isComplete ? 'bg-line border-line text-mute' :
                             'bg-transparent border-line text-faint'
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
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <p>{errorMsg}</p>
          </div>
        )}
        {currentStep === 'info'     && renderInfo()}
        {currentStep === 'chapters' && renderChapters()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t border-line bg-surface/20">
        <button type="button" onClick={handleBack} disabled={stepIndex === 0}
          className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${
              i === stepIndex ? 'w-5 bg-accent' : 'w-1.5 bg-line'
            }`} />
          ))}
        </div>

        {isLastStep ? (
          <button type="button" onClick={handleSave}
            disabled={saving || !title.trim() || !coverUrl.trim() || !synopsis.trim() || !writer.trim() || !translatorTypesetter.trim()}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cómic'}
          </button>
        ) : (
          <button type="button" onClick={handleNext}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95">
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Ayuda para admins (guía + conversor de Drive) — sobre el modal del form. */}
      <AdminHelpModal isOpen={isAdminHelpOpen} onClose={() => setIsAdminHelpOpen(false)} />
      {/* v0.11.2: importación masiva de links de Drive. */}
      <BulkDriveImportModal
        isOpen={isBulkDriveOpen}
        onClose={() => setIsBulkDriveOpen(false)}
        existingChapters={chapters}
        onImport={handleBulkDriveImport}
      />
    </Modal>
  );
};
