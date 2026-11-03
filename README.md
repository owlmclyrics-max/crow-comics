# 🦅 Crow Comics — Directorio de Cómics & Maquetaciones

Aplicación web moderna y segura diseñada para catalogar cómic independiente, underground, mangas y scanlations con soporte para **múltiples enlaces de lectura online y descarga directa por capítulo** y un **sistema de autenticación robusto para administradores**.

---

## 🚀 Características Principales

1. **Frontend Moderno & Modo Oscuro**:
   - Paleta limpia `slate-950` / `slate-900` con acentos en verde esmeralda (`#10B981`).
   - Portadas responsivas con proporción vertical estricta `aspect-[2/3] object-cover` que garantiza que nunca se recorten ni deformen.
   - Búsqueda en tiempo real por título, título original, guionista o maquetador/traductor.
   - Filtros dinámicos por categorías: `Popular`, `Novedad`, `Éxitos`, `Más Descargados`, `Trending`.

2. **Modal de Ficha y Lectura Multiformato**:
   - Información técnica completa: guionista, dibujante, maquetador, año de publicación y sinopsis.
   - Cada capítulo cuenta con botones independientes para distintos formatos y servidores: *PDF Online*, *Mega*, *Google Drive*, *Mediafire*, etc.

3. **Seguridad y Control de Acceso (Resuelve vulnerabilidades de versiones anteriores)**:
   - **Cero contraseñas en el frontend**: Sin contraseñas en texto plano ni comprobaciones inseguras en el navegador.
   - **Row Level Security (RLS)**: Las tablas en PostgreSQL/Supabase tienen políticas activas donde visitantes anónimos solo pueden leer (`SELECT`), impidiendo que alguien mediante consola o peticiones HTTP cree, modifique o borre registros.
   - **Botones protegidos**: Las acciones de *Crear Cómic*, *Editar Ficha* y *Eliminar Cómic* solo se renderizan y ejecutan cuando se detecta un token o sesión de administrador verificado.

---

## 🛠️ Tecnologías Utilizadas

- **React 19 + TypeScript**: Para una arquitectura modular y tipado estricto.
- **Tailwind CSS v4**: Estilizado responsivo con tema oscuro y transiciones suaves.
- **Lucide React**: Iconografía moderna.
- **Supabase (PostgreSQL + Supabase Auth)**: Backend como servicio **100% gratuito** (capa gratuita permanente para bases de datos pequeñas/medianas).

---

## 📦 Puesta en Marcha Local

### 1. Clonar e Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en modo desarrollo
```bash
npm run dev
```
La aplicación abrirá en `http://localhost:5173/`. Por defecto incluye un catálogo demo inicial y un **Modo Demo de Administrador** para que puedas explorar y probar todas las funciones de inmediato antes de conectar la base de datos externa.

---

## 🔑 Conectar a Supabase (100% Gratis)

Para tener persistencia real en la nube y autenticación de usuarios segura con PostgreSQL:

1. Entra a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (por ejemplo: `crow-comics`).
3. Ve a **SQL Editor** en el panel de Supabase y pega todo el contenido de [`supabase-schema.sql`](./supabase-schema.sql). Dale a **Run** para crear las tablas y las políticas de seguridad RLS.
4. En Supabase ve a **Authentication** -> **Users** y añade tu usuario administrador con su correo y contraseña.
5. Ve a **Project Settings** -> **API** y copia tu `Project URL` y la llave `anon / public`.
6. Crea un archivo `.env` en la raíz de este proyecto con tus credenciales:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-public-key
   ```
7. Reinicia tu servidor de desarrollo (`npm run dev`) y tu directorio ya estará conectado a la nube en tiempo real.

---

## 📁 Estructura del Proyecto

```text
Crow Comics/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Modal.tsx               # Contenedor común de modales (Escape, backdrop)
│   │   │   └── StarRating.tsx          # Selector / visualizador de calificación
│   │   ├── AuthModal.tsx               # Modal de login seguro
│   │   ├── CategoryBar.tsx             # Filtros por categoría / etiqueta
│   │   ├── ChapterCharactersModal.tsx  # Asignación de personajes por tomo
│   │   ├── ChapterDetailPage.tsx       # Detalle del tomo, lector PDF y personajes
│   │   ├── CharacterDetailPage.tsx     # Ficha individual de personaje
│   │   ├── CharactersAdminModal.tsx    # Gestión de personajes
│   │   ├── CharactersPage.tsx          # Catálogo de personajes
│   │   ├── ComicAdminFormModal.tsx     # Wizard de creación/edición de cómics
│   │   ├── ComicCard.tsx               # Tarjeta con proporción vertical fija aspect-[2/3]
│   │   ├── ComicDetailPage.tsx         # Detalle del cómic y listado de tomos
│   │   ├── ComicsCatalogView.tsx       # Catálogo agrupado por editorial
│   │   ├── CommentsSection.tsx         # Comentarios y calificaciones reutilizables
│   │   ├── Navbar.tsx                  # Barra superior con estado de sesión admin
│   │   └── SteamHeroCarousel.tsx       # Carrusel de novedades tipo Steam
│   ├── context/
│   │   ├── AuthContext.tsx             # Contexto seguro de sesión y autenticación
│   │   ├── CharactersContext.tsx       # Proveedor compartido de personajes
│   │   └── ComicsContext.tsx           # Proveedor del catálogo compartido
│   ├── data/
│   │   └── mockComics.ts               # Datos de catálogo inicial y respaldo
│   ├── hooks/
│   │   ├── useCharacters.ts            # CRUD de personajes con Supabase / Local
│   │   └── useComics.ts                # Hook de consulta y mutación con Supabase / Local
│   ├── lib/
│   │   ├── chapterCharacters.ts        # Asignaciones de personajes por capítulo
│   │   ├── comicUtils.ts               # Utilidades de búsqueda y mapeo de capítulos
│   │   ├── constants.ts                # Editoriales, etiquetas y estados compartidos
│   │   ├── localStore.ts               # Persistencia local para el modo demo
│   │   └── supabase.ts                 # Cliente Supabase inicializado de forma segura
│   ├── types/
│   │   └── comic.ts                    # Tipos TypeScript para cómics, capítulos y enlaces
│   ├── App.tsx                         # Vista principal responsiva
│   ├── index.css                       # Tailwind CSS v4 y tema slate-950
│   └── main.tsx                        # Punto de entrada de la aplicación
├── supabase-schema.sql                 # Script SQL con tablas y Row Level Security
├── .env.example                        # Ejemplo de variables de entorno
└── package.json
```
