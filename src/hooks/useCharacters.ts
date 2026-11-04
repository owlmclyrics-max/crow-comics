import { useCallback, useEffect, useState } from 'react';
import type { Character } from '../types/comic';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { LOCAL_KEYS, readLocalJSON, writeLocalJSON } from '../lib/localStore';

export type CharacterInput = Omit<Character, 'id' | 'created_at'>;

export interface CharacterResult {
  success: boolean;
  error?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido';
};

const clean = (value?: string): string | undefined => value?.trim() || undefined;

const readLocalCharacters = (): Character[] =>
  readLocalJSON<Character[]>(LOCAL_KEYS.characters, []);

const writeLocalCharacters = (characters: Character[]): void =>
  writeLocalJSON(LOCAL_KEYS.characters, characters);

const sortByName = (characters: Character[]): Character[] =>
  [...characters].sort((a, b) => a.name.localeCompare(b.name, 'es'));

/**
 * Campos de la mini-wiki (ficha estilo Marvel). Se guardan como TEXT
 * (listas con un elemento por línea) y viajan como null si quedan vacíos.
 */
const WIKI_FIELDS = [
  'aliases',
  'species',
  'universe',
  'origin_place',
  'creators',
  'enemies',
  'powers',
  'weapon',
] as const;

type WikiField = (typeof WIKI_FIELDS)[number];

const wikiPayload = (input: Partial<Character>): Partial<Record<WikiField, string | null>> =>
  Object.fromEntries(
    WIKI_FIELDS.map((field) => [field, clean(input[field]) ?? null]),
  );

/** Igual que wikiPayload, pero con `undefined` (formato del modo local). */
const wikiLocal = (input: Partial<Character>): Partial<Record<WikiField, string>> =>
  Object.fromEntries(
    WIKI_FIELDS.map((field) => [field, clean(input[field])]).filter(([, value]) => value !== undefined),
  ) as Partial<Record<WikiField, string>>;

/** Campos completos en formato local (string | undefined, sin nulls). */
const toLocalInput = (input: CharacterInput): Omit<Character, 'id' | 'created_at'> => ({
  name: input.name.trim(),
  name_spanish: clean(input.name_spanish),
  real_name: clean(input.real_name),
  photo_url: clean(input.photo_url),
  description: clean(input.description),
  first_appearance: clean(input.first_appearance),
  publisher: clean(input.publisher),
  ...wikiLocal(input),
});

export const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setCharacters(sortByName(readLocalCharacters()));
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCharacters((data ?? []) as Character[]);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setCharacters(sortByName(readLocalCharacters()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const addCharacter = useCallback(
    async (input: CharacterInput): Promise<CharacterResult> => {
      const name = input.name.trim();
      if (!name) return { success: false, error: 'El nombre es obligatorio' };

      const payload = {
        name,
        name_spanish: clean(input.name_spanish) ?? null,
        real_name: clean(input.real_name) ?? null,
        photo_url: clean(input.photo_url) ?? null,
        description: clean(input.description) ?? null,
        first_appearance: clean(input.first_appearance) ?? null,
        publisher: clean(input.publisher) ?? null,
        ...wikiPayload(input),
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error: insertError } = await supabase.from('characters').insert([payload]);
          if (insertError) throw insertError;

          await fetchCharacters();
          return { success: true };
        } catch (err: unknown) {
          // Si la base aún no tiene las columnas de la mini-wiki, reintentar
          // con los campos clásicos para no bloquear la creación.
          const msg = getErrorMessage(err);
          if (/column|aliases|species|universe|origin_place|creators|enemies|powers|weapon/i.test(msg)) {
            try {
              const { error: retryError } = await supabase
                .from('characters')
                .insert([{ ...payload, ...Object.fromEntries(WIKI_FIELDS.map((f) => [f, null])) }]);
              if (retryError) throw retryError;
              await fetchCharacters();
              return { success: true };
            } catch (retryErr) {
              console.error('Error agregando personaje (retry sin wiki):', retryErr);
              return { success: false, error: getErrorMessage(retryErr) };
            }
          }
          console.error('Error agregando personaje:', err);
          return { success: false, error: msg };
        }
      }

      const newCharacter: Character = {
        id: `char_${Date.now()}`,
        ...toLocalInput(input),
        created_at: new Date().toISOString(),
      };

      setCharacters((current) => {
        const next = sortByName([...current, newCharacter]);
        writeLocalCharacters(next);
        return next;
      });

      return { success: true };
    },
    [fetchCharacters],
  );

  const updateCharacter = useCallback(
    async (id: string, input: CharacterInput): Promise<CharacterResult> => {
      const name = input.name.trim();
      if (!name) return { success: false, error: 'El nombre es obligatorio' };

      const payload = {
        name,
        name_spanish: clean(input.name_spanish) ?? null,
        real_name: clean(input.real_name) ?? null,
        photo_url: clean(input.photo_url) ?? null,
        description: clean(input.description) ?? null,
        first_appearance: clean(input.first_appearance) ?? null,
        publisher: clean(input.publisher) ?? null,
        ...wikiPayload(input),
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error: updateError } = await supabase
            .from('characters')
            .update(payload)
            .eq('id', id);
          if (updateError) throw updateError;

          await fetchCharacters();
          return { success: true };
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          // Resiliencia: si la base aún no tiene las columnas de la mini-wiki,
          // guardar solo los campos clásicos para no perder la edición.
          if (/column|aliases|species|universe|origin_place|creators|enemies|powers|weapon/i.test(msg)) {
            try {
              const { error: retryError } = await supabase
                .from('characters')
                .update({ ...payload, ...Object.fromEntries(WIKI_FIELDS.map((f) => [f, null])) })
                .eq('id', id);
              if (retryError) throw retryError;
              await fetchCharacters();
              return { success: true };
            } catch (retryErr) {
              console.error('Error actualizando personaje (retry sin wiki):', retryErr);
              return { success: false, error: getErrorMessage(retryErr) };
            }
          }
          console.error('Error actualizando personaje:', err);
          return { success: false, error: msg };
        }
      }

      setCharacters((current) => {
        const next = sortByName(
          current.map((character) =>
            character.id === id
              ? { ...character, ...toLocalInput(input) }
              : character,
          ),
        );
        writeLocalCharacters(next);
        return next;
      });

      return { success: true };
    },
    [fetchCharacters],
  );

  const deleteCharacter = useCallback(
    async (id: string): Promise<CharacterResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: deleteError } = await supabase.from('characters').delete().eq('id', id);
          if (deleteError) throw deleteError;

          await fetchCharacters();
          return { success: true };
        } catch (err: unknown) {
          console.error('Error eliminando personaje:', err);
          return { success: false, error: getErrorMessage(err) };
        }
      }

      setCharacters((current) => {
        const next = current.filter((character) => character.id !== id);
        writeLocalCharacters(next);
        return next;
      });

      return { success: true };
    },
    [fetchCharacters],
  );

  return {
    characters,
    loading,
    error,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    refreshCharacters: fetchCharacters,
  };
};
