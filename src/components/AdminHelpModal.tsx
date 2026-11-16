/**
 * AdminHelpModal (v0.9.9.9.1): ayuda para admins.
 *
 * Dos pestañas:
 *  1. "Links de Drive": conversor — pegás el link de compartir y genera
 *     automáticamente el link /preview (para leer online en el visor) y el
 *     de descarga directa (uc?export=download), con botón de copiar.
 *     Así nadie necesita páginas raras de terceros para convertir links.
 *  2. "Guía rápida": paso a paso para subir cómics, pensado para alguien
 *     que nunca lo hizo (qué campo es obligatorio, cómo compartir el PDF,
 *     cómo agregar tomos y links).
 */
import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Copy,
  Download,
  Eye,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Link2,
  Lightbulb,
  X,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

type HelpTab = 'drive' | 'guia';

/** Extrae el FILE_ID de cualquier variante de link de Google Drive:
    /file/d/ID/view, open?id=ID, uc?export=download&id=ID, /d/ID. */
const parseDriveId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let m = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return null;
};

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copiado ✅`, 'success');
  } catch {
    showToast('No se pudo copiar el link', 'error');
  }
};

/** Un resultado del conversor (leer online o descarga directa). */
const DriveResultCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint: string;
  url: string;
}> = ({ icon, title, hint, url }) => (
  <div className="rounded-xl bg-bg border border-line p-3 space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-bold text-ink">{title}</span>
    </div>
    <p className="text-[11px] text-faint leading-relaxed">{hint}</p>
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 truncate px-2.5 py-2 rounded-lg bg-raised border border-line text-[11px] text-mute">
        {url}
      </code>
      <button
        type="button"
        onClick={() => void copyToClipboard(url, title)}
        className="shrink-0 p-2 rounded-lg bg-accent hover:bg-accent2 text-onaccent transition-colors"
        title={`Copiar ${title.toLowerCase()}`}
        aria-label={`Copiar ${title.toLowerCase()}`}
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/** Paso numerado de la guía. */
const GuideStep: React.FC<{
  step: string;
  title: string;
  children: React.ReactNode;
}> = ({ step, title, children }) => (
  <div className="flex gap-3">
    <span className="shrink-0 w-7 h-7 rounded-full bg-accent text-onaccent text-xs font-black flex items-center justify-center">
      {step}
    </span>
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-bold text-ink">{title}</p>
      <div className="text-[11px] text-mute leading-relaxed space-y-1">{children}</div>
    </div>
  </div>
);

interface AdminHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminHelpModal: React.FC<AdminHelpModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<HelpTab>('drive');
  const [rawLink, setRawLink] = useState('');

  const fileId = useMemo(() => parseDriveId(rawLink), [rawLink]);
  const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : '';

  const tabButton = (value: HelpTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
        tab === value
          ? 'bg-accent text-onaccent'
          : 'bg-bg text-mute hover:text-ink hover:bg-raised border border-line'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line">
        <div>
          <h2 className="text-xl font-black text-ink flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" />
            Ayuda para admins
          </h2>
          <p className="text-xs text-faint mt-0.5">Links de Drive y guía para subir cómics</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          aria-label="Cerrar ayuda"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 sm:px-6 pt-4">
        {tabButton('drive', 'Links de Drive', <Link2 className="w-3.5 h-3.5" />)}
        {tabButton('guia', 'Guía rápida', <BookOpen className="w-3.5 h-3.5" />)}
      </div>

      <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {tab === 'drive' ? (
          <>
            {/* Cómo preparar el link (3 pasos previos) */}
            <div className="rounded-xl bg-bg border border-line p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-accent" />
                Antes de convertir (una sola vez por PDF)
              </p>
              <ol className="text-[11px] text-mute leading-relaxed space-y-1 list-decimal list-inside">
                <li>Subí el PDF a tu <strong className="text-ink">Google Drive</strong>.</li>
                <li>
                  Clic derecho sobre el archivo → <strong className="text-ink">Compartir</strong> →
                  en "Acceso general" elegí <strong className="text-ink">Cualquiera con el link</strong>{' '}
                  (rol: Lector). <strong className="text-ink">Este paso es obligatorio</strong> —
                  si no, la web no puede mostrar el PDF.
                </li>
                <li>Copiá el link y pegalo aquí abajo 👇</li>
              </ol>
            </div>

            {/* Conversor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink" htmlFor="drive-input">
                Pegá el link de compartir de Drive
              </label>
              <input
                id="drive-input"
                type="url"
                value={rawLink}
                onChange={(e) => setRawLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/XXXXXXXX/view?usp=sharing"
                className="w-full px-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
                spellCheck={false}
                autoComplete="off"
              />
              {rawLink.trim() !== '' && !fileId && (
                <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  No se reconoce ese link. Tiene que ser de un archivo de Drive (algo con
                  <code className="mx-1 px-1 rounded bg-raised">/file/d/…</code> o
                  <code className="mx-1 px-1 rounded bg-raised">?id=…</code>).
                  Las carpetas completas no sirven, solo archivos.
                </p>
              )}
            </div>

            {/* Resultados */}
            {fileId && (
              <div className="space-y-3">
                <DriveResultCard
                  icon={<Eye className="w-4 h-4 text-accent" />}
                  title="Link para LEER ONLINE"
                  hint="Pegalo en el campo «Leer Online — PDF» del tomo (paso 2 del formulario). Es el que usa el visor de la web."
                  url={previewUrl}
                />
                <DriveResultCard
                  icon={<Download className="w-4 h-4 text-accent2" />}
                  title="Link de DESCARGA DIRECTA"
                  hint="Agregalo como link de descarga del tomo, con nombre «Drive» y tipo «Nube». Descarga el archivo sin abrir Drive."
                  url={downloadUrl}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-4">
              <GuideStep step="1" title="Datos de la serie (Paso 1 del formulario)">
                <p>
                  Completá título, portada (imagen <strong className="text-ink">vertical 2:3</strong>,
                  la de Fandom sirve tal cual), sinopsis, año y el equipo: guionista, artista y
                  maquetador. Editorial, etiqueta y estado se eligen de la lista.
                </p>
                <p className="text-faint">
                  El banner es opcional y horizontal — solo se ve grande en PC; si no tenés uno,
                  dejalo vacío y el hero usa la portada.
                </p>
              </GuideStep>

              <GuideStep step="2" title="Subí el PDF del tomo a Drive">
                <p>
                  Un PDF por tomo. Compartilo como{" "}
                  <strong className="text-ink">"Cualquiera con el link"</strong> (Lector) y pasá el
                  link por la pestaña <strong className="text-ink">"Links de Drive"</strong> de
                  arriba: te da el link para leer online y el de descarga directa, listos para
                  copiar.
                </p>
              </GuideStep>

              <GuideStep step="3" title="Tomo (Paso 2 del formulario)">
                <p>
                  Tocá <strong className="text-ink">"+ Agregar tomo"</strong>: número y título,
                  portada propia si querés (si la dejás vacía usa la de la serie), cantidad de
                  páginas, y en{" "}
                  <strong className="text-ink">"Leer Online — PDF"</strong> pegá el link /preview
                  del conversor.
                </p>
                <p className="text-faint">
                  En "Links de descarga" agregá uno por fila (Mega, Mediafire, 1Fichier…) con su
                  tipo. Los links vacíos se ignoran al guardar.
                </p>
              </GuideStep>

              <GuideStep step="4" title="Extras">
                <p>
                  <strong className="text-ink">Pack Completo</strong>: para series terminadas, con
                  un rótulo tipo "#1-6 Completo" y links para bajar toda la serie de una.
                </p>
                <p className="text-faint">
                  Guardás con el botón verde y ya aparece en la web. Si algo quedó mal, podés
                  editar el cómic cuando quieras desde su ficha.
                </p>
              </GuideStep>
            </div>

            <div className="rounded-xl bg-accent/10 border border-accent/30 p-3.5 space-y-1.5">
              <p className="text-xs font-bold text-accent flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Buenas prácticas
              </p>
              <ul className="text-[11px] text-mute leading-relaxed space-y-1 list-disc list-inside">
                <li>La etiqueta que elegís es solo decorativa: la web calcula Novedad, Popular, Trending y Éxitos solas con las lecturas reales.</li>
                <li>Las portadas de Fandom se cargan por el proxy automático de la web — no hace falta convertirlas.</li>
                <li>Si un tomo no tiene PDF, igual podés publicarlo solo con links de descarga.</li>
                <li>¿Portada que no carga en el celu? Probá Ctrl+F5 dos veces: el navegador guarda copias viejas.</li>
              </ul>
            </div>

            <p className="text-[11px] text-faint flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Los PDFs de Drive se muestran con el visor propio de Drive dentro de la web; por
              eso el link tiene que terminar en <code className="px-1 rounded bg-raised">/preview</code>.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};
