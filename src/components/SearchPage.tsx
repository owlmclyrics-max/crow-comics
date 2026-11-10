import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X, User, BookOpen } from 'lucide-react';
import type { Comic, Profile } from '../types/comic';
import { filterComicsByQuery } from '../lib/comicUtils';
import { searchProfiles } from '../lib/profiles';
import { ComicCard } from './ComicCard';

interface SearchPageProps {
  initialQuery: string;
  comics: Comic[];
  onSelectComic: (comic: Comic) => void;
  onSelectProfile: (profileId: string) => void;
  onBack: () => void;
}

type Tab = 'all' | 'comics' | 'profiles';

/**
 * Pantalla de búsqueda completa. Se abre al presionar Enter en la paleta
 * rápida (o desde la barra superior). Muestra todos los cómics y perfiles.
 */
export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery,
  comics,
  onSelectComic,
  onSelectProfile,
  onBack,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProfiles([]);
      return;
    }
    let cancelled = false;
    setLoadingProfiles(true);
    const timer = window.setTimeout(() => {
      searchProfiles(q)
        .then((res) => {
          if (!cancelled) setProfiles(res);
        })
        .catch(() => {
          if (!cancelled) setProfiles([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingProfiles(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const matchingComics = useMemo(
    () => filterComicsByQuery(comics, query),
    [comics, query],
  );

  const total = matchingComics.length + profiles.length;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-mute hover:bg-raised hover:text-ink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-accent group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-black text-ink flex items-center gap-2 justify-end">
            <Search className="w-5 h-5 text-accent" />
            Búsqueda
          </h1>
          {hasQuery && (
            <p className="text-[11px] text-mute mt-0.5">
              {total} resultado{total === 1 ? '' : 's'} para “{query}”
            </p>
          )}
        </div>
      </div>

      {/* Barra glass */}
      <div className="sticky top-16 lg:top-3 z-20">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-surface/80 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl">
          <Search className="w-5 h-5 shrink-0 text-accent" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cómics, personajes o perfiles..."
            className="min-w-0 flex-1 bg-transparent text-sm sm:text-base font-semibold text-ink placeholder:text-mute focus:outline-none"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: 'all', label: 'Todo', count: total },
          { id: 'comics', label: 'Cómics', count: matchingComics.length },
          { id: 'profiles', label: 'Perfiles', count: profiles.length },
        ] as { id: Tab; label: string; count: number }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === t.id
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-line bg-surface text-mute hover:text-ink hover:border-faint'
            }`}
          >
            {t.label}
            <span className="text-[10px] font-mono opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line/60 bg-surface/40 px-6 py-20 text-center">
          <Search className="w-10 h-10 text-mute" />
          <h2 className="mt-4 text-base font-bold text-ink">¿Qué querés leer hoy?</h2>
          <p className="mt-1 max-w-sm text-xs text-mute">
            Escribí el nombre de un cómic, un personaje o un perfil para ver todos los resultados.
          </p>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line/60 bg-surface/40 px-6 py-20 text-center">
          <BookOpen className="w-10 h-10 text-mute" />
          <h2 className="mt-4 text-base font-bold text-ink">Sin resultados</h2>
          <p className="mt-1 max-w-sm text-xs text-mute">
            No encontramos nada para “{query}”. Probá con otra palabra o revisá la ortografía.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Perfiles */}
          {(tab === 'all' || tab === 'profiles') && (profiles.length > 0 || loadingProfiles) && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mute">
                <User className="w-3.5 h-3.5" />
                Perfiles {loadingProfiles && <span className="text-[10px] text-faint">buscando…</span>}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProfile(p.id)}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-accent/40 hover:bg-raised/60"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-line bg-raised">
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
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-accent2 text-xs font-black text-onaccent">
                          {p.username.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">@{p.username}</p>
                      <p className="truncate text-[11px] text-mute">
                        {p.bio?.trim() || 'Lector de Crow Comics'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Cómics */}
          {(tab === 'all' || tab === 'comics') && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mute">
                <BookOpen className="w-3.5 h-3.5" />
                Cómics
              </h2>
              {matchingComics.length === 0 ? (
                <p className="rounded-2xl border border-line/60 bg-surface/40 px-4 py-8 text-center text-xs text-mute">
                  No hay cómics que coincidan con “{query}”.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                  {matchingComics.map((comic) => (
                    <ComicCard key={comic.id} comic={comic} onClick={onSelectComic} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
