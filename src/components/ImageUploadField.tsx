import React, { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const BUCKET = 'comic-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /**
   * Layout horizontal compacto: preview fija a la izquierda (o placeholder)
   * y controles apilados a la derecha. Ideal dentro de formularios altos,
   * donde la variante normal deja la preview huérfana junto a otros campos.
   */
  compact?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, value, onChange, compact }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Usa una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen debe pesar 10 MB o menos.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Configura Supabase y el bucket comic-images para subir imágenes.');
      return;
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '31536000', contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /* ── Variante compacta: preview a la izquierda + controles a la derecha ── */
  if (compact) {
    return (
      <div className="flex gap-3">
        <div className="w-20 h-28 shrink-0 rounded-lg border border-line bg-bg overflow-hidden flex items-center justify-center">
          {value ? (
            <img
              key={value}
              src={value}
              alt={`Vista previa: ${label}`}
              className="w-full h-full object-cover"
              onError={event => { event.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <ImagePlus className="w-6 h-6 text-faint" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <label className="block text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full min-w-0 rounded-xl border border-dashed border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-mute file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-onaccent hover:border-accent/70"
            onChange={event => void handleUpload(event.target.files?.[0])}
          />
          <input
            type="text"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="o pega un enlace a la imagen (opcional)"
            aria-label={`${label} por URL`}
            className="w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
          {error && <p role="alert" className="text-xs text-accent2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="block w-full min-w-0 rounded-xl border border-dashed border-accent/30 bg-accent/10 px-3 py-3 text-xs text-mute file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:text-onaccent hover:border-accent/70"
        onChange={event => void handleUpload(event.target.files?.[0])}
      />
      <p className="text-[10px] text-faint">Elige un archivo de tu celular o computadora (JPG, PNG o WebP; máximo 10 MB).</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs font-bold text-accent transition-colors hover:bg-accent/15 disabled:opacity-60 sm:w-auto"
        >
          {uploading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {uploading ? 'Subiendo archivo...' : 'Subir portada desde archivo'}
        </button>
        <span className="hidden self-center text-[10px] uppercase tracking-wider text-faint sm:inline">o pega un enlace</span>
        <input
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="URL de imagen (opcional)"
          aria-label={`${label} por URL`}
          className="w-full min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
      </div>
      {value && (
        <img
          key={value}
          src={value}
          alt={`Vista previa: ${label}`}
          className="h-28 w-20 rounded-lg border border-line bg-bg object-cover"
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      )}
      {error && <p role="alert" className="text-xs text-accent2">{error}</p>}
    </div>
  );
};
