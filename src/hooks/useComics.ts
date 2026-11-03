import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter, Comic, Comment, LinkReport } from '../types/comic';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { INITIAL_MOCK_COMICS } from '../data/mockComics';
import { LOCAL_KEYS, readLocalJSON, writeLocalJSON } from '../lib/localStore';

export interface SaveResult {
  success: boolean;
  error?: string;
}

export type ComicInput = Omit<Comic, 'id' | 'chapters'> & { id?: string };

const TODAY = new Date().toISOString().split('T')[0];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido';
};

const isTemporaryChapterId = (id: string): boolean =>
  id.startsWith('new_ch_') || id.startsWith('local_');

const readLocalComments = (): Comment[] => readLocalJSON<Comment[]>(LOCAL_KEYS.comments, []);

const writeLocalComments = (comments: Comment[]): void =>
  writeLocalJSON(LOCAL_KEYS.comments, comments);

const averageRating = (comments: Comment[], comicId: string): { average: number; total: number } => {
  const ratings = comments
    .filter((comment) => comment.comic_id === comicId && (comment.rating ?? 0) > 0)
    .map((comment) => comment.rating as number);

  if (ratings.length === 0) return { average: 0, total: 0 };

  return {
    average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
    total: ratings.length,
  };
};

export const useComicsData = () => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const comicsRef = useRef<Comic[]>([]);

  const loadFallback = useCallback(() => {
    const cached = readLocalJSON<Comic[] | null>(LOCAL_KEYS.comics, null);
    const next = cached ?? INITIAL_MOCK_COMICS;

    comicsRef.current = next;
    setComics(next);

    if (!cached) {
      writeLocalJSON(LOCAL_KEYS.comics, next);
    }
  }, []);

  const fetchComics = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      loadFallback();
      setLoading(false);
      return;
    }

    try {
      const [comicsResult, chaptersResult] = await Promise.all([
        supabase.from('comics').select('*').order('created_at', { ascending: false }),
        supabase.from('chapters').select('*').order('chapter_number', { ascending: true }),
      ]);

      if (comicsResult.error) throw comicsResult.error;
      if (chaptersResult.error) throw chaptersResult.error;

      const chapters = (chaptersResult.data ?? []) as Chapter[];
      const combined = ((comicsResult.data ?? []) as Omit<Comic, 'chapters'>[]).map((comic) => ({
        ...comic,
        full_download_links: comic.full_download_links ?? [],
        chapters: chapters.filter((chapter) => chapter.comic_id === comic.id),
      }));

      comicsRef.current = combined;
      setComics(combined);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      loadFallback();
    } finally {
      setLoading(false);
    }
  }, [loadFallback]);

  useEffect(() => {
    void fetchComics();
  }, [fetchComics]);

  const applyLocalComics = useCallback((updater: (current: Comic[]) => Comic[]) => {
    const next = updater(comicsRef.current);
    comicsRef.current = next;
    setComics(next);
    writeLocalJSON(LOCAL_KEYS.comics, next);
  }, []);

  const saveComic = useCallback(
    async (comicData: ComicInput, chapters: Chapter[]): Promise<SaveResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          let comicId = comicData.id;

          const comicPayload = {
            title: comicData.title,
            original_title: comicData.original_title ?? null,
            cover_url: comicData.cover_url,
            synopsis: comicData.synopsis,
            publisher: comicData.publisher,
            tag: comicData.tag,
            status: comicData.status,
            writer: comicData.writer,
            artist: comicData.artist ?? null,
            translator_typesetter: comicData.translator_typesetter,
            year: comicData.year ?? null,
            total_issues_label: comicData.total_issues_label ?? null,
            full_download_links: comicData.full_download_links ?? [],
          };

          if (comicId) {
            const { error: updateError } = await supabase
              .from('comics')
              .update(comicPayload)
              .eq('id', comicId);

            if (updateError) throw updateError;
          } else {
            const { data, error: insertError } = await supabase
              .from('comics')
              .insert([comicPayload])
              .select('id')
              .single();

            if (insertError) throw insertError;
            comicId = data.id as string;
          }

          if (comicId) {
            const resolvedComicId = comicId;
            let insertedIds: string[] = [];
            const existing = chapters.filter(
              (chapter) => chapter.id && !isTemporaryChapterId(chapter.id),
            );
            const toCreate = chapters.filter(
              (chapter) => !chapter.id || isTemporaryChapterId(chapter.id),
            );

            const chapterPayload = (chapter: Chapter) => ({
              comic_id: resolvedComicId,
              chapter_number: chapter.chapter_number,
              title: chapter.title,
              cover_url: chapter.cover_url || null,
              pages_count: chapter.pages_count ?? null,
              release_date: chapter.release_date || TODAY,
              links: (chapter.links ?? []).filter((link) => link.url.trim()),
              pdf_url: chapter.pdf_url || null,
            });

            for (const chapter of existing) {
              const { error: updateError } = await supabase
                .from('chapters')
                .update(chapterPayload(chapter))
                .eq('id', chapter.id)
                .eq('comic_id', resolvedComicId);

              if (updateError) throw updateError;
            }

            if (toCreate.length > 0) {
              const { data: inserted, error: insertError } = await supabase
                .from('chapters')
                .insert(toCreate.map(chapterPayload))
                .select('id');

              if (insertError) throw insertError;
              insertedIds = ((inserted ?? []) as { id: string }[]).map((row) => row.id);
            }

            // Copia del editor que se conserva: los capítulos ya existentes
            // MÁS los recién insertados (sin esto, el borrado de abajo
            // eliminaba los tomos nuevos justo después de crearlos).
            const keepIds = [...existing.map((chapter) => chapter.id), ...insertedIds];
            let deleteQuery = supabase.from('chapters').delete().eq('comic_id', resolvedComicId);

            if (keepIds.length > 0) {
              deleteQuery = deleteQuery.not(
                'id',
                'in',
                `(${keepIds.map((id) => `"${id}"`).join(',')})`,
              );
            }

            const { error: deleteError } = await deleteQuery;
            if (deleteError) {
              console.warn('No se pudieron borrar capítulos obsoletos:', deleteError.message);
            }
          }

          await fetchComics();
          return { success: true };
        } catch (err: unknown) {
          console.error('Error guardando en Supabase:', err);
          return { success: false, error: getErrorMessage(err) };
        }
      }

      const comicId = comicData.id ?? `local_${Date.now()}`;
      const previous = comicData.id
        ? comicsRef.current.find((comic) => comic.id === comicData.id)
        : undefined;

      const newComic: Comic = {
        ...previous,
        ...comicData,
        id: comicId,
        created_at: previous?.created_at ?? new Date().toISOString(),
        chapters: chapters.map((chapter) => ({
          ...chapter,
          links: (chapter.links ?? []).filter((link) => link.url.trim()),
          comic_id: comicId,
          id:
            chapter.id && !isTemporaryChapterId(chapter.id)
              ? chapter.id
              : `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
      };

      applyLocalComics((current) =>
        comicData.id
          ? current.map((comic) => (comic.id === comicData.id ? newComic : comic))
          : [newComic, ...current],
      );

      return { success: true };
    },
    [applyLocalComics, fetchComics],
  );

  const deleteComic = useCallback(
    async (id: string): Promise<SaveResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: deleteError } = await supabase.from('comics').delete().eq('id', id);
          if (deleteError) throw deleteError;

          await fetchComics();
          return { success: true };
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) };
        }
      }

      applyLocalComics((current) => current.filter((comic) => comic.id !== id));
      return { success: true };
    },
    [applyLocalComics, fetchComics],
  );

  const syncComicRating = useCallback(async (comicId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error: fetchError } = await supabase
      .from('comments')
      .select('rating')
      .eq('comic_id', comicId)
      .gt('rating', 0);

    if (fetchError) throw fetchError;

    const ratings = (data ?? [])
      .map((comment) => comment.rating as number | null)
      .filter((rating): rating is number => rating !== null);

    const average =
      ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

    const { error: updateError } = await supabase
      .from('comics')
      .update({ average_rating: average, total_ratings: ratings.length })
      .eq('id', comicId);

    if (updateError) throw updateError;
  }, []);

  const addComment = useCallback(
    async (
      comicId: string,
      comment: Omit<Comment, 'id' | 'comic_id' | 'created_at'>,
    ): Promise<SaveResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          let { error: insertError } = await supabase.from('comments').insert([
            {
              comic_id: comicId,
              user_id: comment.user_id ?? null,
              user_name: comment.user_name,
              user_email: comment.user_email ?? null,
              content: comment.content,
              rating: comment.rating ?? null,
            },
          ]);

          // Respaldo: si la columna user_id aún no existe (SQL sin correr),
          // reintenta el insert sin ella para no romper los comentarios.
          if (insertError && /user_id/i.test(insertError.message)) {
            console.warn('comments.user_id no existe; insertando sin él. Corre update-comments-auth.sql.');
            ({ error: insertError } = await supabase.from('comments').insert([
              {
                comic_id: comicId,
                user_name: comment.user_name,
                user_email: comment.user_email ?? null,
                content: comment.content,
                rating: comment.rating ?? null,
              },
            ]));
          }

          if (insertError) throw insertError;

          if ((comment.rating ?? 0) > 0) {
            try {
              await syncComicRating(comicId);
              await fetchComics();
            } catch (ratingError: unknown) {
              console.warn('No se pudo actualizar el rating:', getErrorMessage(ratingError));
            }
          }

          return { success: true };
        } catch (err: unknown) {
          console.error('Error agregando comentario:', err);
          return { success: false, error: getErrorMessage(err) };
        }
      }

      const newComment: Comment = {
        id: `local_comment_${Date.now()}`,
        comic_id: comicId,
        user_name: comment.user_name,
        user_email: comment.user_email,
        content: comment.content,
        rating: comment.rating,
        created_at: new Date().toISOString(),
      };

      const comments = [newComment, ...readLocalComments()];
      writeLocalComments(comments);

      const { average, total } = averageRating(comments, comicId);
      applyLocalComics((current) =>
        current.map((comic) =>
          comic.id === comicId
            ? { ...comic, average_rating: average, total_ratings: total }
            : comic,
        ),
      );

      return { success: true };
    },
    [applyLocalComics, fetchComics, syncComicRating],
  );

  const getComments = useCallback(async (comicId: string): Promise<Comment[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: fetchError } = await supabase
          .from('comments')
          .select('*')
          .eq('comic_id', comicId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        return (data ?? []) as Comment[];
      } catch (err: unknown) {
        console.error('Error obteniendo comentarios:', err);
        return [];
      }
    }

    return readLocalComments()
      .filter((comment) => comment.comic_id === comicId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

  const incrementDownloadCount = useCallback(
    async (comicId: string) => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: rpcError } = await supabase.rpc('increment_download_count', {
            comic_id: comicId,
          });
          if (rpcError) throw rpcError;

          await fetchComics();
        } catch (err: unknown) {
          console.error('Error incrementando descargas:', err);
        }
        return;
      }

      applyLocalComics((current) =>
        current.map((comic) =>
          comic.id === comicId
            ? { ...comic, download_count: (comic.download_count ?? 0) + 1 }
            : comic,
        ),
      );
    },
    [applyLocalComics, fetchComics],
  );

  /* ── Reportes de enlaces caídos ── */
  const reportBrokenLink = useCallback(
    async (report: Omit<LinkReport, 'id' | 'created_at' | 'status'>): Promise<SaveResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: insertError } = await supabase.from('link_reports').insert([{
            chapter_id:    report.chapter_id,
            comic_title:   report.comic_title,
            chapter_title: report.chapter_title,
            link_name:     report.link_name,
            link_url:      report.link_url,
            reporter_name: report.reporter_name ?? null,
            message:       report.message ?? null,
            status: 'pending',
          }]);
          if (insertError) throw insertError;
          return { success: true };
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) };
        }
      }
      // Fallback local: solo guardamos en localStorage
      const LOCAL_REPORTS = 'crow_link_reports';
      const prev: LinkReport[] = JSON.parse(localStorage.getItem(LOCAL_REPORTS) ?? '[]');
      localStorage.setItem(LOCAL_REPORTS, JSON.stringify([
        { ...report, id: `lr_${Date.now()}`, status: 'pending', created_at: new Date().toISOString() },
        ...prev,
      ]));
      return { success: true };
    },
    [],
  );

  const getLinkReports = useCallback(async (): Promise<LinkReport[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: fetchError } = await supabase
          .from('link_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        return (data ?? []) as LinkReport[];
      } catch (err: unknown) {
        console.error('Error obteniendo reportes:', err);
        return [];
      }
    }
    const LOCAL_REPORTS = 'crow_link_reports';
    return JSON.parse(localStorage.getItem(LOCAL_REPORTS) ?? '[]') as LinkReport[];
  }, []);

  const updateLinkReportStatus = useCallback(
    async (reportId: string, status: LinkReport['status']): Promise<SaveResult> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: updateError } = await supabase
            .from('link_reports')
            .update({ status })
            .eq('id', reportId);
          if (updateError) throw updateError;
          return { success: true };
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) };
        }
      }
      return { success: true };
    },
    [],
  );

  return {
    comics,
    loading,
    error,
    saveComic,
    deleteComic,
    addComment,
    getComments,
    incrementDownloadCount,
    reportBrokenLink,
    getLinkReports,
    updateLinkReportStatus,
    refreshComics: fetchComics,
  };
};
