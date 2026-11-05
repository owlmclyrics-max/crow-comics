import type { Character } from '../types/comic';
import { isSupabaseConfigured, supabase } from './supabase';
import { LOCAL_KEYS, readLocalJSON, writeLocalJSON } from './localStore';

type LocalAssignments = Record<string, string[]>;

const readAssignments = (): LocalAssignments =>
  readLocalJSON<LocalAssignments>(LOCAL_KEYS.chapterCharacters, {});

const writeAssignments = (assignments: LocalAssignments): void =>
  writeLocalJSON(LOCAL_KEYS.chapterCharacters, assignments);

export const fetchChapterCharacterIds = async (chapterId: string): Promise<string[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('chapter_characters')
      .select('character_id')
      .eq('chapter_id', chapterId);

    if (error) throw error;
    return (data ?? []).map((row) => row.character_id as string);
  }

  return readAssignments()[chapterId] ?? [];
};

export const fetchCharacterChapterIds = async (characterId: string): Promise<string[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('chapter_characters')
      .select('chapter_id')
      .eq('character_id', characterId);

    if (error) throw error;
    return (data ?? []).map((row) => row.chapter_id as string);
  }

  return Object.entries(readAssignments())
    .filter(([, characterIds]) => characterIds.includes(characterId))
    .map(([chapterId]) => chapterId);
};

export const fetchChapterCharacters = async (chapterId: string): Promise<Character[]> => {
  const ids = await fetchChapterCharacterIds(chapterId);
  if (ids.length === 0) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('characters').select('*').in('id', ids);
    if (error) throw error;
    return (data ?? []) as Character[];
  }

  const allCharacters = readLocalJSON<Character[]>(LOCAL_KEYS.characters, []);
  return allCharacters.filter((character) => ids.includes(character.id));
};

export const setChapterCharacterAssigned = async (
  chapterId: string,
  characterId: string,
  assigned: boolean,
): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    if (assigned) {
      const { error } = await supabase.from('chapter_characters').insert([
        { chapter_id: chapterId, character_id: characterId, role: 'Personaje' },
      ]);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('chapter_characters')
        .delete()
        .eq('chapter_id', chapterId)
        .eq('character_id', characterId);
      if (error) throw error;
    }
    return;
  }

  const assignments = readAssignments();
  const current = new Set(assignments[chapterId] ?? []);

  if (assigned) {
    current.add(characterId);
  } else {
    current.delete(characterId);
  }

  assignments[chapterId] = [...current];
  writeAssignments(assignments);
};

/**
 * Asigna VARIOS personajes a VARIOS capítulos de una (ej: "aparece en toda
 * la serie"). Solo inserta los pares que falten; devuelve cuántos agregó.
 */
export const assignCharactersToChapters = async (
  chapterIds: string[],
  characterIds: string[],
): Promise<number> => {
  if (chapterIds.length === 0 || characterIds.length === 0) return 0;

  if (isSupabaseConfigured && supabase) {
    // Traer los pares ya existentes para no duplicar.
    const { data: existing, error } = await supabase
      .from('chapter_characters')
      .select('chapter_id,character_id')
      .in('chapter_id', chapterIds);
    if (error) throw error;

    const existingSet = new Set(
      (existing ?? []).map((row) => `${row.chapter_id}:${row.character_id}`),
    );
    const rows = chapterIds.flatMap((chapterId) =>
      characterIds
        .filter((characterId) => !existingSet.has(`${chapterId}:${characterId}`))
        .map((characterId) => ({
          chapter_id: chapterId,
          character_id: characterId,
          role: 'Personaje',
        })),
    );

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('chapter_characters')
        .insert(rows);
      if (insertError) throw insertError;
    }
    return rows.length;
  }

  // Modo local
  const assignments = readAssignments();
  let added = 0;
  chapterIds.forEach((chapterId) => {
    const current = new Set(assignments[chapterId] ?? []);
    characterIds.forEach((characterId) => {
      if (!current.has(characterId)) {
        current.add(characterId);
        added += 1;
      }
    });
    assignments[chapterId] = [...current];
  });
  writeAssignments(assignments);
  return added;
};
