import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterWithComic, ChapterLink, Chapter, Comic, Character } from '../types/comic';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  User,
  Feather,
  Sparkles,
  Star,
  Users,
  Edit3,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  X,
  Send,
  CheckCircle,
  Check,
  SkipForward,
  Bookmark,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { saveReadingProgress, deleteReadingProgress, getReadingProgressForChapter } from '../lib/profile';
import { showToast } from './ui/Toast';
import { fetchChapterCharacters } from '../lib/chapterCharacters';
import { CommentsSection } from './CommentsSection';
import { StarRating } from './ui/StarRating';
import { ChaptersModal } from './ChaptersModal';

interface ChapterDetailPageProps {
  chapter: ChapterWithComic;
  onBack: () => void;
  onOpenCharactersModal: (onUpdated: () => void) => void;
  onSelectCharacter: (character: Character) => void;
  /** Sprint 2.5: navega a otro tomo usado por "Leer Siguiente Tomo". */
  onOpenChapter: (chapter: Chapter, comic: Comic) => void;
}

// SPRINT 2.5: tarjetas de navegación entre tomos (anterior / siguiente de la
// misma serie). Se muestra tanto encima como justo debajo del visor PDF.
interface ChapterNavCardsProps {
  prevChapter: Chapter | null;
  nextChapter: Chapter | null;
  navDirection: 'prev' | 'next' | null;
  onRead: (direction: 'prev' | 'next') => void;
}

const ChapterNavCards: React.FC<ChapterNavCardsProps> = ({ prevChapter, nextChapter, navDirection, onRead }) => {
  if (!prevChapter && !nextChapter) return null;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 overflow-hidden">
      <div className="relative p-4 sm:p-5 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-400 text-center">
          ¿Ya terminaste este tomo?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Tomo anterior */}
          {prevChapter && (
            <button
              onClick={() => onRead('prev')}
              disabled={navDirection !== null}
              className="group flex-1 min-w-0 inline-flex items-center justify-center gap-3 px-4 sm:px-6 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-red-500/40 text-white text-xs sm:text-sm font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {navDirection === 'prev' ? (
                <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin shrink-0" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-red-400 shrink-0 group-hover:-translate-x-1 transition-transform" />
              )}
              <span className="truncate">
                Leer Tomo Anterior: {prevChapter.title}
              </span>
            </button>
          )}

          {/* Tomo siguiente */}
          {nextChapter && (
            <button
              onClick={() => onRead('next')}
              disabled={navDirection !== null}
              className="group flex-1 min-w-0 inline-flex items-center justify-center gap-3 px-4 sm:px-6 py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-xl shadow-red-950/50 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {navDirection === 'next' ? (
                <span className="w-4 h-4 border-2 border-zinc-950/40 border-t-zinc-950 rounded-full animate-spin shrink-0" />
              ) : (
                <SkipForward className="w-5 h-5 fill-current shrink-0 group-hover:translate-x-1 transition-transform" />
              )}
              <span className="truncate">
                Leer Siguiente Tomo: {nextChapter.title}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-zinc-950/25 shrink-0">
                #{nextChapter.chapter_number}
              </span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 text-center">
          Al continuar, este tomo se retira de "Continuar Leyendo" y el nuevo queda como último leído.
        </p>
      </div>
    </div>
  );
};

export const ChapterDetailPage: React.FC<ChapterDetailPageProps> = ({
  chapter,
  onBack,
  onOpenCharactersModal,
  onSelectCharacter,
  onOpenChapter
}) => {
  const { canManageContent, user } = useAuth();
  const { comics, reportBrokenLink } = useComics();

  // ── SPRINT 2: guardado automático de progreso de lectura ──
  // Al abrir un tomo, se registra (upsert) en reading_progress para
  // alimentar la fila "Continuar Leyendo". La restricción unique
  // (user_id, chapter_id) hace que reabrir el mismo tomo actualice
  // updated_at en lugar de duplicar filas.
  useEffect(() => {
    if (!user?.id) return;
    saveReadingProgress(user.id, chapter.comic_id, chapter.id, chapter.chapter_number).catch(() => {
      // Fallo silencioso: "Continuar Leyendo" solo se alimenta si Supabase acepta.
    });
  }, [user?.id, chapter.id]);

  // ── SPRINT 2.5: control del historial de lectura ──────────────────────────
  // El visor PDF (iframe) no puede detectar cuándo termina el usuario, así que
  // el cierre del tomo es manual: "Marcar como leído" o "Leer Siguiente Tomo".
  const parentComic = useMemo(
    () => comics.find((comic) => comic.id === chapter.comic_id) ?? null,
    [comics, chapter.comic_id],
  );

  // Tarea 2: siguiente y anterior tomo de la serie comparando chapter_number
  const nextChapter = useMemo<Chapter | null>(() => {
    if (!parentComic?.chapters) return null;
    const following = parentComic.chapters.filter((ch) => ch.chapter_number > chapter.chapter_number);
    if (following.length === 0) return null;
    return following.reduce((a, b) => (b.chapter_number < a.chapter_number ? b : a));
  }, [parentComic, chapter.chapter_number]);

  const prevChapter = useMemo<Chapter | null>(() => {
    if (!parentComic?.chapters) return null;
    const previous = parentComic.chapters.filter((ch) => ch.chapter_number < chapter.chapter_number);
    if (previous.length === 0) return null;
    return previous.reduce((a, b) => (b.chapter_number > a.chapter_number ? b : a));
  }, [parentComic, chapter.chapter_number]);

  const [markingAsRead, setMarkingAsRead] = useState(false);

  // Tarea 1: quita este tomo del historial ("Continuar Leyendo") y regresa al cómic
  const handleMarkAsRead = async () => {
    if (!user?.id) {
      showToast('Inicia sesión para marcar tomos como terminados', 'info');
      return;
    }
    setMarkingAsRead(true);
    try {
      await deleteReadingProgress(user.id, chapter.id);
      showToast('¡Añadido a terminados!');
      onBack();
    } catch (err) {
      showToast(`No se pudo marcar como terminado: ${err instanceof Error ? err.message : 'error desconocido'}`, 'error');
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Dirección en curso para mostrar el spinner en el botón correspondiente
  const [navDirection, setNavDirection] = useState<'prev' | 'next' | null>(null);

  // Tarea 2: borra el tomo actual del historial, inserta el tomo destino como
  // el último leído y navega hacia él (sirve para anterior y siguiente)
  const handleReadRelative = async (direction: 'prev' | 'next') => {
    const target = direction === 'next' ? nextChapter : prevChapter;
    if (!target || !parentComic) return;
    if (user?.id) {
      setNavDirection(direction);
      await deleteReadingProgress(user.id, chapter.id).catch(() => {
        // Si falla el borrado seguimos igual: navegar al tomo destino.
      });
      await saveReadingProgress(user.id, parentComic.id, target.id, target.chapter_number).catch(() => {
        // Sin sesión de Supabase válida seguimos igual: navegar al tomo.
      });
      setNavDirection(null);
    }
    onOpenChapter(target, parentComic);
  };

  // ── Sprint 3.5: marcador de página manual ─────────────────────────────────
  // El iframe de Drive no reporta la página actual (w.drc.../frameset), así
  // que el usuario anota donde se quedó y lo guardamos en reading_progress.
  // Al abrir el tomo, cargamos el marcador guardado para mostrarlo junto al
  // visor: "Tu marcador: página X".
  const [savedPage, setSavedPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSavedPage(0);
    if (!user?.id) return;
    getReadingProgressForChapter(user.id, chapter.id).then((row) => {
      if (!cancelled && row?.page_number) setSavedPage(row.page_number);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, chapter.id]);

  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [savingPage, setSavingPage] = useState(false);

  const openPageModal = () => {
    setPageInput('');
    setIsPageModalOpen(true);
  };

  const handleSavePage = async () => {
    const pageNumber = parseInt(pageInput, 10);
    if (!Number.isFinite(pageNumber) || pageNumber < 1) return;
    if (!user?.id) {
      showToast('Inicia sesión para guardar tu marcador', 'info');
      return;
    }
    setSavingPage(true);
    try {
      await saveReadingProgress(user.id, chapter.comic_id, chapter.id, chapter.chapter_number, pageNumber);
      setSavedPage(pageNumber);
      setIsPageModalOpen(false);
      setPageInput('');
      showToast(`Marcador guardado: te quedaste en la página ${pageNumber}`);
    } catch (err) {
      showToast(
        `No se pudo guardar el marcador: ${err instanceof Error ? err.message : 'error desconocido'}`,
        'error',
      );
    } finally {
      setSavingPage(false);
    }
  };

  // Sprint 3.5: botón "Finalizado" del modal → borra el registro de
  // reading_progress, así el tomo desaparece de "Continuar Leyendo"
  // (mismo mecanismo que "Marcar como leído", pero sin salir del tomo).
  const [finishingPage, setFinishingPage] = useState(false);

  const handleFinishFromModal = async () => {
    if (!user?.id) {
      showToast('Inicia sesión para marcar tomos como terminados', 'info');
      return;
    }
    setFinishingPage(true);
    try {
      await deleteReadingProgress(user.id, chapter.id);
      setIsPageModalOpen(false);
      setPageInput('');
      setSavedPage(0);
      showToast('¡Tomo terminado! Se quitó de "Continuar Leyendo"');
    } catch (err) {
      showToast(
        `No se pudo marcar como terminado: ${err instanceof Error ? err.message : 'error desconocido'}`,
        'error',
      );
    } finally {
      setFinishingPage(false);
    }
  };

  // Modal de reporte de enlace caído
  const [reportingLink, setReportingLink] = useState<ChapterLink | null>(null);
  const [reporterName, setReporterName]   = useState('');
  const [reportMsg, setReportMsg]         = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent]       = useState(false);

  // Modal de capítulos
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);

  const handleReport = async () => {
    if (!reportingLink) return;
    setReportSending(true);
    await reportBrokenLink({
      chapter_id:    chapter.id,
      comic_title:   chapter.comic_title,
      chapter_title: chapter.title,
      link_name:     reportingLink.name,
      link_url:      reportingLink.url,
      reporter_name: reporterName.trim() || undefined,
      message:       reportMsg.trim() || undefined,
    });
    setReportSending(false);
    setReportSent(true);
    setTimeout(() => {
      setReportingLink(null);
      setReportSent(false);
      setReporterName('');
      setReportMsg('');
    }, 2000);
  };

  // Ref para el scroll al visor PDF
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  // Ref y estado para el carrusel horizontal de personajes
  const charactersScrollerRef = useRef<HTMLDivElement>(null);
  const [characterScroll, setCharacterScroll] = useState({ left: false, right: false });

  // Estado de calificación del usuario
  const [userRating, setUserRating] = useState(0);

  // Estado de personajes en este tomo
  const [chapterCharacters, setChapterCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const loadChapterCharacters = useCallback(async () => {
    setLoadingCharacters(true);
    try {
      setChapterCharacters(await fetchChapterCharacters(chapter.id));
    } catch (err) {
      console.error('Error cargando personajes del tomo:', err);
    } finally {
      setLoadingCharacters(false);
    }
  }, [chapter.id]);

  // Cargar personajes al montar
  useEffect(() => {
    void loadChapterCharacters();
  }, [loadChapterCharacters]);

  const updateCharacterScroll = useCallback(() => {
    const el = charactersScrollerRef.current;
    if (!el) return;

    setCharacterScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  // Detecta si hay personajes fuera de la vista para mostrar las flechas.
  useEffect(() => {
    const el = charactersScrollerRef.current;
    if (!el) return;

    updateCharacterScroll();
    el.addEventListener('scroll', updateCharacterScroll, { passive: true });

    const observer = new ResizeObserver(updateCharacterScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateCharacterScroll);
      observer.disconnect();
    };
  }, [updateCharacterScroll, chapterCharacters.length]);

  const scrollCharacters = (direction: -1 | 1) => {
    const el = charactersScrollerRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 240),
      behavior: 'smooth',
    });
  };

  // Scroll to top al montar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScrollToPdf = () => {
    pdfViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Separar links de descarga de posibles links de lectura online
  const downloadLinks = (chapter.links || []).filter(l => {
    const name = (l.name || '').toLowerCase();
    return !name.includes('leer') && !name.includes('online') && !name.includes('pdf online');
  });

  const getLinkIcon = (type?: string, name?: string) => {
    const lowerName = (name || '').toLowerCase();
    if (type === 'pdf' || lowerName.includes('pdf')) return <FileText className="w-4 h-4 text-red-400" />;
    if (lowerName.includes('mega')) return <HardDrive className="w-4 h-4 text-rose-400" />;
    if (lowerName.includes('drive')) return <HardDrive className="w-4 h-4 text-amber-400" />;
    if (lowerName.includes('mediafire')) return <HardDrive className="w-4 h-4 text-sky-400" />;
    if (lowerName.includes('1fichier')) return <HardDrive className="w-4 h-4 text-violet-400" />;
    return <Download className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* Botón de Regresar */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-tranzinc-x-1 transition-transform text-red-400" />
          <span>Volver al Cómic</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* HERO CARD: portada + info + descargas + calificación + leer online */}
      {/* ================================================================ */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Fondo desenfocado */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={chapter.cover_url || chapter.comic_cover_url}
            alt={chapter.title}
            className="w-full h-full object-cover blur-3xl scale-125 opacity-30 animate-parallax-float"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-10 md:p-12 z-10 space-y-8">
          {/* Fila superior: portada + metadata */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            {/* Portada */}
            <div className="relative aspect-[2/3] w-48 sm:w-56 md:w-60 rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-950 shrink-0 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <img
                src={chapter.cover_url || chapter.comic_cover_url}
                alt={chapter.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <span className="px-3.5 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20">
                  {chapter.comic_publisher}
                </span>
                <span className="px-3 py-1 text-xs font-semibold uppercase rounded-lg bg-zinc-900/90 text-red-400 border border-red-500/30">
                  {chapter.comic_tag}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                  chapter.comic_status === 'En curso'
                    ? 'bg-red-950/90 text-red-300 border-red-500/40'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {chapter.comic_status}
                </span>
                {chapter.comic_year && (
                  <span className="px-3 py-1 text-xs text-zinc-300 bg-zinc-950/80 rounded-lg border border-zinc-800">
                    Año {chapter.comic_year}
                  </span>
                )}
              </div>

              {/* Título */}
              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {chapter.title}
                </h1>
                <p className="text-sm sm:text-base text-zinc-300 italic mt-1">{chapter.comic_title}</p>
              </div>

              {/* Sinopsis */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl bg-zinc-950/60 p-4 sm:p-5 rounded-2xl border border-zinc-800/80 text-left">
                {chapter.comic_synopsis}
              </p>

              {/* Ficha técnica */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <Feather className="w-4 h-4 text-red-400" />
                  <span><strong className="text-zinc-400">Guion:</strong> {chapter.comic_writer}</span>
                </div>
                {chapter.comic_artist && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    <span><strong className="text-zinc-400">Arte:</strong> {chapter.comic_artist}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-red-400" />
                  <span><strong className="text-zinc-400">Maqueta / Fansub:</strong> <span className="text-red-400 font-bold">{chapter.comic_translator_typesetter}</span></span>
                </div>
                {chapter.pages_count && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span><strong className="text-zinc-400">Páginas:</strong> {chapter.pages_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---- DESCARGAS + CALIFICACIÓN + LEER ONLINE dentro del hero ---- */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/60">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-red-400" />
              Tomo #{chapter.chapter_number}
            </h3>

            {/* Todos los botones + calificación en una sola línea */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Leer Online primero si hay PDF */}
              {chapter.pdf_url && (
                <button
                  onClick={handleScrollToPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600 hover:border-red-500/60 transition-all shadow-md group"
                >
                  <BookOpen className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                  <span>Leer Online</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:tranzinc-y-0.5 transition-transform" />
                </button>
              )}
              {/* Sprint 2.5: marcar como terminado (soluciona el atasco de "Continuar Leyendo") */}
              <button
                onClick={handleMarkAsRead}
                disabled={markingAsRead}
                title="Quitar este tomo de 'Continuar Leyendo'"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-emerald-50 border border-emerald-500/40 transition-all shadow-md shadow-emerald-950/40 group active:scale-95 disabled:opacity-60"
              >
                {markingAsRead ? (
                  <span className="w-4 h-4 border-2 border-emerald-200 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span>{markingAsRead ? 'Procesando...' : 'Marcar como leído'}</span>
              </button>
              {/* Botón ver todos los capítulos */}
              {parentComic && parentComic.chapters && parentComic.chapters.length > 1 && (
                <button
                  onClick={() => setIsChaptersModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-zinc-950 border border-red-500/40 transition-all shadow-md shadow-red-950/40 group active:scale-95"
                >
                  <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Ver Capítulos</span>
                </button>
              )}
              {/* Botones de descarga + reporte */}
              {downloadLinks.length > 0 &&
                downloadLinks.map((link: ChapterLink) => (
                  <div key={link.id} className="flex items-center">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-l-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-zinc-950 transition-all shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95"
                    >
                      {getLinkIcon(link.type, link.name)}
                      <span>{link.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                    <button
                      type="button"
                      onClick={() => { setReportingLink(link); setReportSent(false); }}
                      title="Reportar enlace caído"
                      className="px-2.5 py-2.5 rounded-r-xl text-xs bg-rose-900/70 hover:bg-rose-800 text-rose-300 hover:text-rose-200 transition-all shadow-lg border-l border-rose-800/60 active:scale-95"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              {downloadLinks.length === 0 && !chapter.pdf_url && (
                <span className="text-xs text-zinc-500 italic">Próximamente disponible</span>
              )}

              {/* Calificación por estrellas, en línea con el resto de botones */}
              <div className="flex items-center gap-2 bg-zinc-950/60 px-4 py-2 rounded-xl border border-zinc-800 ml-auto">
                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-zinc-300 font-medium">Calificar:</span>
                <StarRating value={userRating} onChange={setUserRating} size="md" showValue />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SPRINT 2.5: NAVEGACIÓN ANTERIOR / SIGUIENTE (encima del PDF)      */}
      {/* ================================================================ */}
      <ChapterNavCards
        prevChapter={prevChapter}
        nextChapter={nextChapter}
        navDirection={navDirection}
        onRead={handleReadRelative}
      />

      {/* ================================================================ */}
      {/* SECCIÓN: VISOR PDF EMBEBIDO                                       */}
      {/* ================================================================ */}
      {chapter.pdf_url && (
        <div ref={pdfViewerRef} className="space-y-4 scroll-mt-6">
          <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-red-400" />
                <span>Leer Online — Tomo #{chapter.chapter_number}</span>
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Visor embebido. Para mejor experiencia, usa pantalla completa (ícono ⤢ en el visor).
              </p>
            </div>

            {/* Sprint 3.5: marcador manual de página */}
            <div className="flex items-center gap-2">
              {savedPage > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40"
                  title="Tu último marcador guardado en este tomo"
                >
                  <Bookmark className="w-4 h-4 fill-amber-400/40" />
                  <span>Quedaste en el Tomo {chapter.chapter_number} · Página {savedPage}</span>
                </span>
              )}
              <button
                onClick={openPageModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-all shadow-md group active:scale-95"
                title="Guardar tu marcador de página"
              >
                <Bookmark className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Guardar página actual</span>
              </button>
            </div>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl"
               style={{ paddingBottom: '133%' /* ratio 3:4 aprox para un PDF */ }}>
            <iframe
              src={chapter.pdf_url}
              title={`Leer ${chapter.title} online`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay"
              loading="lazy"
            />
          </div>

          {/* SPRINT 2.5: navegación anterior / siguiente (debajo del PDF) */}
          <ChapterNavCards
            prevChapter={prevChapter}
            nextChapter={nextChapter}
            navDirection={navDirection}
            onRead={handleReadRelative}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* SECCIÓN: PERSONAJES EN ESTE TOMO                                  */}
      {/* ================================================================ */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-red-400" />
              <span>Personajes en este Tomo</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Personajes que aparecen en este capítulo
            </p>
          </div>
          {canManageContent && (
            <button
              onClick={() => onOpenCharactersModal(loadChapterCharacters)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-red-500/20"
            >
              <Edit3 className="w-4 h-4" />
              <span>Asignar Personajes</span>
            </button>
          )}
        </div>

        {loadingCharacters ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Cargando personajes...</p>
          </div>
        ) : chapterCharacters.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <p className="text-sm text-zinc-400 text-center">
              {canManageContent
                ? 'Aún no hay personajes asignados. Usa el botón "Asignar Personajes" para añadirlos.'
                : 'Los personajes aparecerán aquí cuando se asignen a este tomo.'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {(characterScroll.left || characterScroll.right) && (
              <button
                type="button"
                onClick={() => scrollCharacters(-1)}
                disabled={!characterScroll.left}
                aria-label="Ver personajes anteriores"
                className="shrink-0 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div
              ref={charactersScrollerRef}
              className="flex flex-1 gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {chapterCharacters.map((char) => (
                <button
                  type="button"
                  key={char.id}
                  onClick={() => onSelectCharacter(char)}
                  className="group flex w-24 sm:w-28 shrink-0 flex-col items-center gap-2 text-center cursor-pointer focus:outline-none"
                  aria-label={`Ver la página de ${char.name}`}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-red-500/70 bg-zinc-950 shrink-0 transition-colors shadow-lg">
                    {char.photo_url ? (
                      <img
                        src={char.photo_url}
                        alt={char.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-9 h-9 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
                      {char.name}
                    </p>
                    {char.name_spanish && (
                      <p className="text-xs text-red-400 line-clamp-1">{char.name_spanish}</p>
                    )}
                    {char.real_name && (
                      <p className="text-xs text-zinc-500 line-clamp-1">{char.real_name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {(characterScroll.left || characterScroll.right) && (
              <button
                type="button"
                onClick={() => scrollCharacters(1)}
                disabled={!characterScroll.right}
                aria-label="Ver más personajes"
                className="shrink-0 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECCIÓN: COMENTARIOS                                              */}
      {/* ================================================================ */}
      <CommentsSection
        comicId={chapter.comic_id}
        rating={userRating}
        onRatingChange={setUserRating}
        showRatingInput
        subheading="Lee y comparte opiniones sobre este tomo con la comunidad."
      />

      {/* ================================================================ */}
      {/* MINI-MODAL: GUARDAR PÁGINA ACTUAL (Sprint 3.5)                    */}
      {/* ================================================================ */}
      {isPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setIsPageModalOpen(false)}>
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-zinc-900 rounded-2xl border border-amber-500/40 shadow-2xl p-5 space-y-4 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">¿En qué página te quedaste?</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {chapter.title} · Tomo #{chapter.chapter_number}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsPageModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="number"
              min={1}
              autoFocus
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSavePage(); }}
              placeholder="Ej. 27"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-sm text-zinc-100 outline-none transition-colors text-center font-bold"
            />

            <p className="text-[10px] text-zinc-600 text-center">
              Lo verás en "Continuar Leyendo" y en tu historial.
            </p>

            <div className="flex items-center gap-2.5">
              {/* Finalizado: quita el tomo de "Continuar Leyendo" */}
              <button
                type="button"
                onClick={handleFinishFromModal}
                disabled={finishingPage}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                title="Marca el tomo como terminado y lo quita de Continuar Leyendo"
              >
                {finishingPage ? <span className="w-3.5 h-3.5 border-2 border-zinc-950/40 border-t-zinc-950 rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {finishingPage ? 'Marcando...' : 'Finalizado'}
              </button>

              {/* Guardar marcador de página */}
              <button
                type="button"
                onClick={handleSavePage}
                disabled={savingPage || !pageInput || !Number.isFinite(parseInt(pageInput, 10)) || parseInt(pageInput, 10) < 1}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                {savingPage ? <span className="w-3.5 h-3.5 border-2 border-zinc-950/40 border-t-zinc-950 rounded-full animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                {savingPage ? 'Guardando...' : 'Guardar marcador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MINI-MODAL: REPORTAR ENLACE CAÍDO                                 */}
      {/* ================================================================ */}
      {reportingLink && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setReportingLink(null)}>
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl p-5 space-y-4 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {reportSent ? (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="w-10 h-10 text-red-400" />
                <p className="text-sm font-bold text-white">¡Reporte enviado!</p>
                <p className="text-xs text-zinc-400">El administrador revisará el enlace a la brevedad.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Flag className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold text-white">Reportar enlace caído</h3>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Enlace: <span className="text-zinc-300 font-semibold">{reportingLink.name}</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => setReportingLink(null)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={reporterName}
                    onChange={e => setReporterName(e.target.value)}
                    placeholder="Tu nombre (opcional)"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-rose-500 text-sm text-zinc-100 outline-none transition-colors"
                  />
                  <textarea
                    value={reportMsg}
                    onChange={e => setReportMsg(e.target.value)}
                    placeholder="Describe el problema (opcional)..."
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-rose-500 text-sm text-zinc-100 outline-none resize-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-zinc-600">
                    El admin será notificado automáticamente.
                  </p>
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={reportSending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {reportSending ? 'Enviando...' : 'Enviar Reporte'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Capítulos */}
      {parentComic && (
        <ChaptersModal
          isOpen={isChaptersModalOpen}
          chapters={parentComic.chapters || []}
          onClose={() => setIsChaptersModalOpen(false)}
          onSelectChapter={(selectedChapter) => {
            setIsChaptersModalOpen(false);
            onOpenChapter(selectedChapter, parentComic);
          }}
        />
      )}
    </div>
  );
};
