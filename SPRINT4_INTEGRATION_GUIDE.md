# Sprint 4: Onboarding Wizard y Perfil Gamer - Guía de Integración

## ✅ Componentes Creados

### 1. Base de Datos
- **add-profiles-schema.sql**: Tabla `profiles` con username, avatar_url, bio, prefs (JSONB)
- **add-favorites-schema.sql**: Tabla `favorites` para gamificación
- **update-comments-auth.sql**: Actualiza tabla `comments` con `user_id`

### 2. Componentes React
- **OnboardingWizard.tsx**: Wizard de 3 pasos (username + avatar, preferencias, estilo de lectura)
- **ProfilePage.tsx**: Página de perfil con header épico y pestañas (Favoritos, Listas, Historial)
- **UserBadges.tsx**: Sistema de insignias (Novato, Coleccionista, Crítico)
- **EditProfileModal.tsx**: Modal para editar username, avatar y bio

### 3. Tipos TypeScript
- **comic.ts**: Agregado `Profile` y `ChapterCharacter` interfaces
- `Comment` ahora incluye `user_id`

### 4. AuthContext Actualizado
- Agregado `profile: Profile | null` al contexto
- Agregado `refreshProfile()` para recargar perfil
- `fetchProfile()` se llama automáticamente cuando el usuario se autentica

## 🔧 Pasos para Completar la Integración

### Paso 1: Ejecutar Scripts SQL en Supabase
```bash
# En orden:
1. add-profiles-schema.sql
2. add-favorites-schema.sql
3. update-comments-auth.sql
```

### Paso 2: Integrar OnboardingWizard en App.tsx

En `src/App.tsx`, agregar:

```typescript
// Imports ya agregados
import { OnboardingWizard } from './components/OnboardingWizard';
import { EditProfileModal } from './components/EditProfileModal';

// Estado para modales
const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

// Efecto para mostrar wizard si es necesario
React.useEffect(() => {
  if (user && profile && !profile.prefs.onboarding_completed) {
    setIsOnboardingWizardOpen(true);
  }
}, [user, profile]);

// Manejador para completar onboarding
const handleOnboardingComplete = (updatedProfile: Profile) => {
  refreshProfile();
  setIsOnboardingWizardOpen(false);
};

// Manejador para editar perfil
const handleEditProfile = () => {
  setIsEditProfileModalOpen(true);
};

const handleProfileSaved = (updatedProfile: Profile) => {
  refreshProfile();
  setIsEditProfileModalOpen(false);
};

// En el JSX, antes de cerrar los modales:
{isOnboardingWizardOpen && profile && (
  <OnboardingWizard
    isOpen={isOnboardingWizardOpen}
    profile={profile}
    onComplete={handleOnboardingComplete}
  />
)}

{isEditProfileModalOpen && profile && (
  <EditProfileModal
    isOpen={isEditProfileModalOpen}
    profile={profile}
    onClose={() => setIsEditProfileModalOpen(false)}
    onSave={handleProfileSaved}
  />
)}
```

### Paso 3: Integrar ProfilePage en Navbar

Agregar navegación a perfil en `src/components/Navbar.tsx`:

```typescript
// Agregar botón de perfil cuando el usuario está autenticado
{user && (
  <button
    onClick={() => onNavigate('profile')}
    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
  >
    <User className="w-3.5 h-3.5" />
    <span>Perfil</span>
  </button>
)}
```

### Paso 4: Agregar vista 'profile' a CurrentView

En `src/components/Navbar.tsx`:
```typescript
export type CurrentView = 'landing' | 'inicio' | 'comics' | 'personajes' | 'character-detail' | 'comic-detail' | 'chapter-detail' | 'profile' | 'list-detail';
```

### Paso 5: Renderizar ProfilePage en App.tsx

```typescript
) : currentView === 'profile' && profile ? (
  <ProfilePage
    profile={profile}
    onEditProfile={handleEditProfile}
  />
) : currentView === 'comics' ? (
```

### Paso 6: Modificar Sistema de Comentarios

En `ComicDetailPage.tsx` y `ChapterDetailPage.tsx`:

```typescript
// Importar useAuth
import { useAuth } from '../context/AuthContext';

// En el componente
const { user, profile } = useAuth();

// Validar que el usuario esté autenticado antes de comentar
const handleAddComment = async () => {
  if (!user || !profile) {
    // Abrir modal de autenticación
    setIsAuthModalOpen(true);
    return;
  }

  const comment = {
    user_id: user.id,
    user_name: profile.username,
    content: newCommentText,
    rating: userRating,
  };

  await addComment(comic.id, comment);
  setNewCommentText('');
  setUserRating(0);
};
```

### Paso 7: Usar Username del Perfil en Comentarios

Al mostrar comentarios, usar `profile.username` en lugar de pedir nombre manual:

```typescript
// Remover input de nombre en el formulario de comentarios
// Usar el username del perfil automáticamente
```

## 🎯 Funcionalidades Implementadas

### Onboarding Wizard
- ✅ Paso 1: Username con validación + 8 avatares estáticos
- ✅ Paso 2: Selección de editoriales y personajes favoritos
- ✅ Paso 3: Estilo de lectura (Digital, Físico, Ambos)
- ✅ Guarda en `profiles.prefs` con `onboarding_completed: true`

### ProfilePage
- ✅ Header épico con fondo degradado
- ✅ Avatar grande con badge de verificación
- ✅ Username y bio
- ✅ Botón "Editar Perfil"
- ✅ Insignias de gamificación
- ✅ Pestañas: Favoritos, Listas, Historial

### UserBadges
- ✅ Badge "Novato" (tiene cuenta)
- ✅ Badge "Coleccionista" (5+ favoritos)
- ✅ Badge "Crítico" (3+ comentarios)
- ✅ Tooltips explicativos
- ✅ Iconos de lucide-react

### EditProfileModal
- ✅ Editar username con validación
- ✅ Cambiar avatar
- ✅ Editar bio
- ✅ Guarda en Supabase

## 📝 Notas Importantes

1. **El proyecto ya tiene una estructura avanzada** con LandingPage, AuthSplash, ListDetailPage, etc. La integración debe respetar esta estructura.

2. **AuthContext ya actualizado** con `profile` y `refreshProfile()`.

3. **Los componentes están listos** para ser integrados, solo requieren las conexiones en App.tsx.

4. **Los scripts SQL deben ejecutarse en orden** en Supabase.

5. **Los comentarios ahora requieren autenticación** y usan el username del perfil.

## 🚀 Próximos Pasos Sugeridos

1. Ejecutar los scripts SQL en Supabase
2. Integrar OnboardingWizard en App.tsx
3. Agregar navegación a perfil en Navbar
4. Modificar sistema de comentarios para usar username del perfil
5. Probar el flujo completo de onboarding
6. Probar la gamificación (insignias)
