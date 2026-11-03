import { supabase, isSupabaseConfigured } from './supabase';
import type { ReadingEvent, ReadingEventItem } from '../types/comic';

// ==============================================================================
// SPRINT 5: Capa de datos de "Guías de Lectura y Eventos".
// Lee las tablas events / event_items (lectura pública vía RLS).
// Los ítems con comic_id null son números que aún no están maquetados en
// el catálogo y se muestran con candado ("Próximamente") en la interfaz.
// ==============================================================================

/** Devuelve todos los eventos ordenados del más reciente al más antiguo. */
export const getEvents = async (): Promise<ReadingEvent[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[events] Sin Supabase configurado: no hay guías de lectura. Ejecuta sprint5-reading-events.sql.');
    return [];
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando eventos:', error.message);
    return [];
  }
  return (data ?? []) as ReadingEvent[];
};

/** Devuelve los ítems de un evento, ordenados por position asc (orden de lectura). */
export const getEventItems = async (eventId: string): Promise<ReadingEventItem[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('event_items')
    .select('*')
    .eq('event_id', eventId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error cargando items del evento:', error.message);
    return [];
  }
  return (data ?? []) as ReadingEventItem[];
};

/** Nombre visible de un ítem: el título del cómic si existe, o su etiqueta propia. */
export const getEventItemLabel = (
  item: ReadingEventItem,
  comicTitle?: string
): string => {
  if (comicTitle) return comicTitle;
  if (item.title) return item.title;
  return `Nº ${item.position}`;
};

// ==============================================================================
// SPRINT 5 - ADMINISTRACIÓN: crear / editar / borrar guías desde la página.
// La RLS exige sesión autenticada para escribir (los usuarios anónimos no
// podrán, aunque la UI igualmente solo muestra estos controles al admin).
// ==============================================================================

export interface EventInput {
  id?: string;              // presente = edición; ausente = evento nuevo
  title: string;
  description?: string;
  publisher?: string;
  cover_url?: string;
  year?: number;
  is_complete: boolean;
}

export interface EventItemInput {
  position: number;
  comic_id: string | null;  // null = "Próximamente" (aún no está en el catálogo)
  title?: string;           // etiqueta propia del paso
  is_optional: boolean;
}

/** Crea o actualiza el evento y devuelve su id (necesario para los items). */
export const saveEvent = async (
  input: EventInput
): Promise<{ success: boolean; id?: string; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const row = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    publisher: input.publisher?.trim() || null,
    cover_url: input.cover_url?.trim() || null,
    year: input.year ?? null,
    is_complete: input.is_complete,
  };

  let eventId = input.id;

  if (eventId) {
    const { error } = await supabase.from('events').update(row).eq('id', eventId);
    if (error) return { success: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('events')
      .insert(row)
      .select('id')
      .single();
    if (error || !data) {
      return { success: false, error: error?.message ?? 'No se pudo crear el evento.' };
    }
    eventId = (data as { id: string }).id;
  }

  return { success: true, id: eventId };
};

/**
 * Reemplaza completo el orden de lectura de un evento (borra los items
 * anteriores e inserta la lista nueva). Es la forma más simple de manejar
 * reordenamientos y ediciones sin gestión item por item.
 */
export const saveEventItems = async (
  eventId: string,
  items: EventItemInput[]
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const deleteResult = await supabase.from('event_items').delete().eq('event_id', eventId);
  if (deleteResult.error) return { success: false, error: deleteResult.error.message };

  if (items.length > 0) {
    const { error } = await supabase.from('event_items').insert(
      items.map((item) => ({
        event_id: eventId,
        comic_id: item.comic_id,
        position: item.position,
        is_essential: !item.is_optional,
        is_optional: item.is_optional,
        title: item.title?.trim() || null,
      }))
    );
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
};

/** Borra el evento. Sus items se eliminan automáticamente (ON DELETE CASCADE). */
export const deleteEvent = async (
  eventId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) return { success: false, error: error.message };
  return { success: true };
};
