import React, { useMemo, useState } from 'react';
import type { Character } from '../types/comic';
import { CrowAmbience } from './ui/CrowAmbience';
import { User, Search, Edit3, Plus, Dna, Globe, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';
import { PUBLISHERS, CHARACTER_ALIGNMENTS, getAlignmentBadgeClass } from '../lib/constants';

interface CharactersPageProps {
  onOpenManageModal: () => void;
  onOpenCreateModal: () => void;
  onSelectCharacter: (character: Character) => void;
}

export const CharactersPage: React.FC<CharactersPageProps> = ({
  onOpenManageModal,
  onOpenCreateModal,
  onSelectCharacter,
}) => {
  const { canManageContent } = useAuth();
  const { characters, loading } = useCharactersContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [publisherFilter, setPublisherFilter] = useState('Todas');
  const [roleFilter, setRoleFilter] = useState('Todos');

  const filteredCharacters = useMemo(
    () =>
      characters.filter((character) => {
        if (!matchesCharacterSearch(character, searchTerm)) return false;
        if (publisherFilter !== 'Todas' && character.publisher !== publisherFilter) return false;
        if (roleFilter !== 'Todos' && character.alignment !== roleFilter) return false;
        return true;
      }),
    [characters, searchTerm, publisherFilter, roleFilter],
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-mute">Cargando personajes...</p>
      </div>
    );
  }

  const hasFilters = searchTerm !== '' || publisherFilter !== 'Todas' || roleFilter !== 'Todos';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header con ambiente Crow */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-bg p-5 sm:p-6">
        <CrowAmbience glow="right" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink flex items-center gap-3">
            <User className="w-8 h-8 text-accent" />
            <span>Personajes del Universo</span>
          </h1>
          <p className="text-sm text-mute mt-1">
            Explora todos los personajes de tus cómics favoritos
          </p>
        </div>

        {canManageContent && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenManageModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-raised text-ink text-xs font-semibold border border-line transition-colors"
            >
              <Edit3 className="w-4 h-4 text-accent" />
              <span>Gestionar</span>
            </button>
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Personaje</span>
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Filtros: búsqueda + editorial + rol en chips */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
            <input
              type="text"
              placeholder="Buscar por nombre, alias, especie, enemigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
            />
          </div>

          <div className="relative md:w-56">
            <select
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-3 rounded-xl bg-surface border border-line focus:border-accent text-sm text-ink outline-none transition-colors cursor-pointer"
            >
              <option value="Todas">Todas las editoriales</option>
              {PUBLISHERS.map((publisher) => (
                <option key={publisher} value={publisher}>
                  {publisher}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none" />
          </div>
        </div>

        {/* Chips de rol: Héroe / Villano / etc. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-mute mr-1">
            Rol:
          </span>
          <button
            onClick={() => setRoleFilter('Todos')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all active:scale-95 ${
              roleFilter === 'Todos'
                ? 'bg-accent text-onaccent border-accent shadow-md shadow-accent/30'
                : 'bg-surface border-line text-mute hover:text-ink hover:border-accent/40'
            }`}
          >
            Todos
          </button>
          {CHARACTER_ALIGNMENTS.map((alignment) => (
            <button
              key={alignment}
              onClick={() => setRoleFilter(roleFilter === alignment ? 'Todos' : alignment)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all active:scale-95 ${
                roleFilter === alignment
                  ? getAlignmentBadgeClass(alignment)
                  : 'bg-surface border-line text-mute hover:text-ink hover:border-accent/40'
              }`}
            >
              {alignment}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Personajes (fichas wiki) */}
      {filteredCharacters.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line p-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-raised text-mute">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-ink">
              {hasFilters ? 'No se encontraron personajes' : 'No hay personajes aún'}
            </h3>
            <p className="text-xs text-mute max-w-sm mx-auto">
              {hasFilters
                ? 'Prueba con otros filtros o términos de búsqueda'
                : canManageContent
                  ? 'Agrega el primer personaje con el botón "Crear Personaje"'
                  : 'Pronto se agregarán personajes'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filteredCharacters.map((character) => (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character)}
              className="group flex flex-col bg-surface border border-line hover:border-accent/50 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-accent/40 transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5"
            >
              {/* Retrato tipo wiki con rol y editorial superpuestos */}
              <div className="relative aspect-square overflow-hidden bg-bg">
                {character.photo_url ? (
                  <img
                    src={character.photo_url}
                    alt={character.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg">
                    <User className="w-14 h-14 text-faint" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-90" />

                {character.alignment && (
                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide rounded-lg border backdrop-blur-sm ${getAlignmentBadgeClass(character.alignment)}`}
                  >
                    {character.alignment}
                  </span>
                )}

                {character.publisher && (
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-bg/85 backdrop-blur-md text-amber-400 border border-amber-500/30">
                    {character.publisher}
                  </span>
                )}
              </div>

              {/* Datos de la ficha */}
              <div className="p-3.5 space-y-1.5 w-full">
                <h3 className="font-black text-ink text-sm leading-tight line-clamp-1 group-hover:text-accent transition-colors">
                  {character.name}
                </h3>
                {character.name_spanish && (
                  <p className="text-xs text-accent font-semibold line-clamp-1">
                    {character.name_spanish}
                  </p>
                )}
                {character.real_name && (
                  <p className="text-[11px] text-mute italic line-clamp-1">
                    ({character.real_name})
                  </p>
                )}
                {character.species && (
                  <p className="flex items-center gap-1.5 text-[11px] text-faint line-clamp-1">
                    <Dna className="w-3 h-3 text-accent shrink-0" />
                    {character.species}
                  </p>
                )}
                {character.universe && (
                  <p className="flex items-center gap-1.5 text-[11px] text-faint line-clamp-1">
                    <Globe className="w-3 h-3 text-accent shrink-0" />
                    {character.universe}
                  </p>
                )}
                {(character.aliases ?? '') !== '' && (
                  <p className="flex items-center gap-1.5 text-[10px] text-faint line-clamp-1 pt-0.5 border-t border-line/60">
                    <Sparkles className="w-3 h-3 text-accent shrink-0" />
                    {(character.aliases ?? '').split('\n')[0]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
