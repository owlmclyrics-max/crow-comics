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
