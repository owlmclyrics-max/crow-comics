import type { Character, CharacterVariant } from '../types/comic';
import { isSupabaseConfigured, supabase } from './supabase';
import { LOCAL_KEYS, readLocalJSON, writeLocalJSON } from './localStore';

type LocalAssignments = Record<string, string[]>;

const readAssignments = (): LocalAssignments =>
  readLocalJSON<LocalAssignments>(LOCAL_KEYS.chapterCharacters, {});

const writeAssignments = (assignments: LocalAssignments): void =>
  writeLocalJSON(LOCAL_KEYS.chapterCharacters, assignments);

/** Mapa local "chapterId:characterId" → variantId a mostrar en el reparto. */
type LocalVariantChoices = Record<string, string | null>;

const readVariantChoices = (): LocalVariantChoices =>
  readLocalJSON<LocalVariantChoices>(LOCAL_KEYS.chapterCharacterVariants, {});

const writeVariantChoices = (choices: LocalVariantChoices): void =>
  writeLocalJSON(LOCAL_KEYS.chapterCharacterVariants, choices);

/**
 * v0.9.9: entrada del REPARTO de un tomo — el personaje asignado y la
 * variante elegida para mostrarse en ese tomo (null = ficha principal).
 * `variants` trae TODAS las variantes del personaje (para que el admin
 * pueda elegir cuál mostrar sin otra consulta).
 */
export interface ChapterCastEntry {
  character: Character;
  variant: CharacterVariant | null;
  variants: CharacterVariant[];
}

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

/**
 * v0.9.9: reparto de un tomo con la variante elegida para cada personaje.
 * Si la columna variant_id aún no existe (SQL pendiente), cae con gracia:
 * se muestra la ficha principal de cada personaje.
 */
export const fetchChapterCast = async (chapterId: string): Promise<ChapterCastEntry[]> => {
  const ids = await fetchChapterCharacterIds(chapterId);
  if (ids.length === 0) return [];

  const variantsByCharacter = (variants: CharacterVariant[]) => {
    const map = new Map<string, CharacterVariant[]>();
    variants.forEach((v) => {
      const list = map.get(v.character_id) ?? [];
      list.push(v);
      map.set(v.character_id, list);
    });
    return map;
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const [charsRes, variantsRes, rowsRes] = await Promise.all([
        supabase.from('characters').select('*').in('id', ids),
        supabase.from('character_variants').select('*').in('character_id', ids),
        supabase
          .from('chapter_characters')
          .select('character_id, variant_id')
          .eq('chapter_id', chapterId),
      ]);

      if (charsRes.error) throw charsRes.error;
      // La consulta de variantes puede fallar si la tabla no existe aún.
      const variantList = (variantsRes.error ? [] : (variantsRes.data ?? [])) as CharacterVariant[];
      const variantMap = variantsByCharacter(variantList);

      // variant_id puede no existir aún → request de rows con fallback.
      const chosenById = new Map<string, string | null>();
      if (!rowsRes.error) {
        (rowsRes.data ?? []).forEach((row) => {
          chosenById.set(row.character_id as string, (row.variant_id as string | null) ?? null);
        });
      } else if (!/column|variant_id/i.test(rowsRes.error.message ?? '')) {
        throw rowsRes.error;
      }

      return ((charsRes.data ?? []) as Character[])
        .sort(
          (a, b) =>
            ids.indexOf(a.id) - ids.indexOf(b.id),
        )
        .map((character) => {
          const options = variantMap.get(character.id) ?? [];
          const chosenId = chosenById.get(character.id) ?? null;
          const variant = chosenId ? (options.find((v) => v.id === chosenId) ?? null) : null;
          return { character, variant, variants: options };
        });
    } catch (err: unknown) {
      const msg = getChapterCastError(err);
      if (!/column|variant_id/i.test(msg)) throw err;
      // Columna variant_id inexistente: reparto sin variantes elegidas.
      const characters = await fetchChapterCharacters(chapterId);
      return characters.map((character) => ({ character, variant: null, variants: [] }));
    }
  }

  // Modo local
  const allCharacters = readLocalJSON<Character[]>(LOCAL_KEYS.characters, []);
  const choices = readVariantChoices();
  const allVariants = readLocalJSON<CharacterVariant[]>(LOCAL_KEYS.characterVariants, []);
  const variantMap = variantsByCharacter(
    allVariants.filter((v) => ids.includes(v.character_id)),
  );

  return allCharacters
    .filter((character) => ids.includes(character.id))
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    .map((character) => {
      const options = variantMap.get(character.id) ?? [];
      const chosenId = choices[`${chapterId}:${character.id}`] ?? null;
      const variant = chosenId ? (options.find((v) => v.id === chosenId) ?? null) : null;
      return { character, variant, variants: options };
    });
};

const getChapterCastError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown };
    if (typeof e.message === 'string') return e.message;
  }
  return String(error ?? '');
};

/**
 * v0.9.9: guarda qué variante del personaje se muestra en el reparto de
 * este tomo (null = volver a la ficha principal).
 */
export const setChapterCharacterVariant = async (
  chapterId: string,
  characterId: string,
  variantId: string | null,
): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('chapter_characters')
      .update({ variant_id: variantId })
      .eq('chapter_id', chapterId)
      .eq('character_id', characterId);
    if (error) throw error;
    return;
  }

  const choices = readVariantChoices();
  choices[`${chapterId}:${characterId}`] = variantId;
  writeVariantChoices(choices);
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
