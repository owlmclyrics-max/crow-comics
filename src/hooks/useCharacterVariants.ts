import { useCallback, useEffect, useState } from 'react';
import type { CharacterVariant } from '../types/comic';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { LOCAL_KEYS, readLocalJSON, writeLocalJSON } from '../lib/localStore';

// ============================================================================
// VARIANTES DE PERSONAJES (v0.9.7)
// Cada personaje puede tener versiones alternativas (ej: "Absolute Black
// Canary" dentro de "Black Canary"). La ficha principal las lista y al
// hacer clic se despliega su ficha propia.
//  - Lectura: pública (RLS: anon + authenticated).
//  - Escritura/borrado: solo admins (RLS via is_crow_admin()).
//  - Respaldo: en modo local (sin Supabase) o si la tabla aún no existe,
//    se usa localStorage como el resto del catálogo.
// ============================================================================

export type CharacterVariantInput = Omit<CharacterVariant, 'id' | 'created_at'>;

export interface VariantResult {
  success: boolean;
  error?: string;
  /** La variante ya persistida (con id/created_at reales si vino de Supabase). */
  variant?: CharacterVariant;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown };
    if (typeof e.message === 'string') {
      return [e.message, e.details, e.hint]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' · ');
    }
  }
  return 'Error desconocido';
};

const readLocalAll = (): CharacterVariant[] =>
  readLocalJSON<CharacterVariant[]>(LOCAL_KEYS.characterVariants, []);

const writeLocalAll = (all: CharacterVariant[]): void =>
  writeLocalJSON(LOCAL_KEYS.characterVariants, all);

/** Orden estable: más nuevas primero. */
const sortByNewest = (variants: CharacterVariant[]): CharacterVariant[] =>
  [...variants].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

/** Payload limpio para Supabase: vacíos → null (columnas opcionales). */
const buildPayload = (input: CharacterVariantInput) => ({
  character_id: input.character_id,
  name: input.name.trim(),
  universe: input.universe.trim(),
  earth: input.earth?.trim() || null,
  image_url: input.image_url.trim(),
  description: input.description.trim(),
  first_appearance: input.first_appearance?.trim() || null,
  differences: input.differences?.trim() || null,
  aliases: input.aliases?.trim() || null,
});

export const useCharacterVariants = (characterId?: string) => {
  const [variants, setVariants] = useState<CharacterVariant[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(characterId));

  const load = useCallback(async () => {
    if (!characterId) {
      setVariants([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setVariants(
        sortByNewest(
          readLocalAll().filter((v) => v.character_id === characterId),
        ),
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('character_variants')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVariants((data ?? []) as CharacterVariant[]);
    } catch (err: unknown) {
      // Tabla inexistente u otro fallo: caemos al respaldo local del personaje.
      console.error('Error cargando variantes:', err);
      setVariants(
        sortByNewest(
          readLocalAll().filter((v) => v.character_id === characterId),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addVariant = useCallback(
    async (input: CharacterVariantInput): Promise<VariantResult> => {
      if (!input.name.trim() || !input.universe.trim() || !input.image_url.trim() || !input.description.trim()) {
        return { success: false, error: 'Nombre, universo, imagen y descripción son obligatorios' };
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error: insertError } = await supabase
            .from('character_variants')
            .insert([buildPayload(input)])
            .select()
            .single();

          if (insertError) throw insertError;

          const created = data as CharacterVariant;
          setVariants((current) => sortByNewest([created, ...current]));
          return { success: true, variant: created };
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          // Resiliencia: si la base aún no tiene la columna aliases (SQL viejo),
          // reintentar sin ella para no bloquear el alta.
          if (/column|aliases/i.test(msg)) {
            try {
              const { aliases: _aliases, ...withoutAliases } = buildPayload(input);
              void _aliases;
              const { data, error: retryError } = await supabase
                .from('character_variants')
                .insert([withoutAliases])
                .select()
                .single();
              if (retryError) throw retryError;

              const created = data as CharacterVariant;
              setVariants((current) => sortByNewest([created, ...current]));
              return { success: true, variant: created };
            } catch (retryErr) {
              console.error('Error agregando variante (retry sin aliases):', retryErr);
              return { success: false, error: getErrorMessage(retryErr) };
            }
          }
          console.error('Error agregando variante:', err);
          return { success: false, error: msg };
        }
      }

      // Modo local: guardar junto a las variantes de otros personajes.
      const created: CharacterVariant = {
        id: `local_var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...input,
        created_at: new Date().toISOString(),
      };
      const all = readLocalAll().filter((v) => v.character_id !== characterId);
      writeLocalAll([...all, created]);
      setVariants((current) => sortByNewest([...current, created]));
      return { success: true, variant: created };
    },
    [characterId],
  );

  const deleteVariant = useCallback(
    async (id: string): Promise<VariantResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: deleteError } = await supabase
            .from('character_variants')
            .delete()
            .eq('id', id);
          if (deleteError) throw deleteError;

          setVariants((current) => current.filter((v) => v.id !== id));
          return { success: true };
        } catch (err: unknown) {
          console.error('Error eliminando variante:', err);
          return { success: false, error: getErrorMessage(err) };
        }
      }

      const all = readLocalAll().filter((v) => v.id !== id);
      writeLocalAll(all);
      setVariants((current) => current.filter((v) => v.id !== id));
      return { success: true };
    },
    [],
  );

  return { variants, loading, addVariant, deleteVariant, refreshVariants: load };
};
