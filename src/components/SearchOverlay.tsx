import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, CornerDownLeft, BookOpen, User } from 'lucide-react';
import type { Comic, Profile } from '../types/comic';
import { filterComicsByQuery, matchesCharacterSearch } from '../lib/comicUtils';
import { searchProfiles } from '../lib/profiles';
import { proxyImageUrl } from '../lib/imageUrl';
import { useAuth } from '../context/AuthContext';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  comics: Comic[];
  characters?: import('../types/comic').Character[];
  onSelectComic: (comic: Comic) => void;
  onSelectCharacter?: (character: import('../types/comic').Character) => void;
  onSelectProfile: (profileId: string) => void;
  /** Enter sin resultado activo → pantalla de búsqueda completa. */
  onOpenFullSearch: (query: string) => void;
}

interface ResultRow {
  key: string;
  type: 'comic' | 'profile' | 'character';
  comic?: Comic;
  profile?: Profile;
}

/**
 * Paleta de búsqueda centrada (estilo glass). Se abre con Ctrl+K o tocando la
 * barra superior. Muestra resultados al instante y con Enter pasa a la
 * pantalla de búsqueda completa.
 */
export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  comics,
  characters = [],
  onSelectComic,
  onSelectCharacter,
  onSelectProfile,
  onOpenFullSearch,
}) => {
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { canManageContent } = useAuth();

  // v0.9: al público solo aparecen personajes con foto y rol elegido
  const visibleCharacters = useMemo(
    () =>
      canManageContent
        ? characters
        : characters.filter((c) => c.photo_url?.trim() && c.alignment?.trim()),
    [characters, canManageContent],
  );

  // Resetear al abrir y enfocar el input
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setProfiles([]);
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Perfiles con debounce
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProfiles([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchProfiles(q)
        .then((res) => !cancelled && setProfiles(res.slice(0, 4)))
        .catch(() => !cancelled && setProfiles([]));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const matchingComics = useMemo(
    () => filterComicsByQuery(comics, query).slice(0, 6),
    [comics, query],
  );

  const matchingCharacters = useMemo(
    () =>
      query.trim()
        ? visibleCharacters.filter((c) => matchesCharacterSearch(c, query.trim())).slice(0, 4)
        : [],
    [visibleCharacters, query],
  );

  const rows: ResultRow[] = useMemo(() => {
    if (!query.trim()) return [];
    return [
      ...profiles.map<ResultRow>((p) => ({ key: 'p-' + p.id, type: 'profile', profile: p })),
      ...matchingCharacters.map<ResultRow>((c) => ({ key: 'k-' + c.id, type: 'character' })),
      ...matchingComics.map<ResultRow>((c) => ({ key: 'c-' + c.id, type: 'comic', comic: c })),
    ];
  }, [profiles, matchingCharacters, matchingComics, query]);

  // Mantener el índice dentro de rango
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const openRow = (row: ResultRow) => {
    onClose();
    if (row.type === 'comic' && row.comic) onSelectComic(row.comic);
    if (row.type === 'character' && onSelectCharacter) {
      const match = matchingCharacters.find((c) => 'k-' + c.id === row.key);
      if (match) onSelectCharacter(match);
    }
    if (row.type === 'profile' && row.profile) onSelectProfile(row.profile.id);
  };

  const submit = () => {
    // Enter siempre lleva a la pantalla de búsqueda completa.
    // (Un clic sobre un resultado abre directo ese cómic/perfil).
    const q = query.trim();
    if (q) {
      onClose();
      onOpenFullSearch(q);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  // Scroll del resultado activo a la vista
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[10vh] sm:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar"
    >
      {/* Fondo glass */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-surface/85 shadow-2xl shadow-black/50 backdrop-blur-2xl animate-fade-in">
        {/* Input grande */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="w-5 h-5 shrink-0 text-accent" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cómics, personajes o perfiles..."
            className="min-w-0 flex-1 bg-transparent text-base sm:text-lg font-semibold text-ink placeholder:text-mute focus:outline-none"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
            className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resultados rápidos */}
        {hasQuery ? (
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-mute">
                Sin resultados para “{query}”.
                <br />
                <span className="text-xs text-faint">
                  Presioná Enter para abrir la búsqueda completa.
                </span>
              </div>
            ) : (
              <div className="p-2">
                {profiles.length > 0 && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-mute">
                    Perfiles
                  </p>
                )}
                {profiles.map((p, i) => {
                  const idx = i;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-row={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => openRow({ key: 'p-' + p.id, type: 'profile', profile: p })}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        activeIndex === idx ? 'bg-raised' : 'hover:bg-raised/60'
                      }`}
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-raised">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.username}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-accent2 text-[10px] font-black text-onaccent">
                            {p.username.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">@{p.username}</p>
                        <p className="truncate text-[11px] text-mute">
                          {p.bio?.trim() || 'Lector de Crow Comics'}
                        </p>
                      </div>
                      <User className="h-4 w-4 shrink-0 text-faint" />
                    </button>
                  );
                })}

                {matchingCharacters.length > 0 && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-mute">
                    Personajes
                  </p>
                )}
                {matchingCharacters.map((c, i) => {
                  const idx = profiles.length + i;
                  const isOpenable = Boolean(onSelectCharacter);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-row={isOpenable ? idx : undefined}
                      onMouseEnter={() => isOpenable && setActiveIndex(idx)}
                      onClick={() =>
                        openRow({ key: 'k-' + c.id, type: 'character' })
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isOpenable && activeIndex === idx ? 'bg-raised' : 'hover:bg-raised/60'
                      }`}
                    >
                      <div className="relative w-9 h-9 shrink-0 overflow-hidden rounded-full border border-line bg-raised">
                        {c.photo_url ? (
                          <img
                            src={c.photo_url}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="flex w-full h-full items-center justify-center bg-raised">
                            <User className="w-4 h-4 text-faint" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                        <p className="truncate text-[11px] text-mute">
                          {[c.alignment, c.publisher].filter(Boolean).join(' · ') ||
                            'Personaje del universo'}
                        </p>
                      </div>
                      <User className="h-4 w-4 shrink-0 text-faint" />
                    </button>
                  );
                })}

                {matchingComics.length > 0 && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-mute">
                    Cómics
                  </p>
                )}
                {matchingComics.map((comic, i) => {
                  const idx = profiles.length + matchingCharacters.length + i;
                  return (
                    <button
                      key={comic.id}
                      type="button"
                      data-row={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => openRow({ key: 'c-' + comic.id, type: 'comic', comic })}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        activeIndex === idx ? 'bg-raised' : 'hover:bg-raised/60'
                      }`}
                    >
                      <img
                        src={proxyImageUrl(comic.cover_url)}
                        alt={comic.title}
                        className="h-12 w-9 shrink-0 rounded-md border border-line object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{comic.title}</p>
                        <p className="truncate text-[11px] text-mute">
                          <span className="font-semibold text-amber-400">{comic.publisher}</span>
                          {' · '}
                          {comic.tag}
                        </p>
                      </div>
                      <BookOpen className="h-4 w-4 shrink-0 text-faint" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* CTA búsqueda completa */}
            <button
              type="button"
              onClick={submit}
              className="flex w-full items-center justify-between gap-3 border-t border-line bg-surface/60 px-4 py-3 text-left hover:bg-raised/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-mute">
                <Search className="h-3.5 w-3.5" />
                Ver todos los resultados para “{query}”
              </span>
              <kbd className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px] font-mono text-mute">
                Enter <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
            </button>
          </div>
        ) : (
          <div className="px-5 py-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mute">
              Búsqueda rápida
            </p>
            <p className="mt-1 text-xs text-faint">
              Escribí para ver resultados al instante. Enter abre la búsqueda completa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Marvel', 'DC', 'Batman', 'Manga'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-line bg-raised/60 px-3 py-1.5 text-xs font-semibold text-mute hover:border-accent/40 hover:text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-4 text-[10px] text-faint">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono">↑</kbd>
                <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono">↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono">Enter</kbd>
                búsqueda completa
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono">Esc</kbd>
                cerrar
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
