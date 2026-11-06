import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Debe evaluarse PRIMERO: registra el listener global de beforeinstallprompt
// (instalación PWA) antes de que Chrome dispare el evento.
import './lib/installPrompt'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { ComicsProvider } from './context/ComicsContext'
import { CharactersProvider } from './context/CharactersContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { FollowsProvider } from './context/FollowsContext'
import { ThemeProvider } from './context/ThemeContext'

// PWA: registro del service worker (solo producción; en dev estorbaría).
// Con esto la app es instalable y abre offline con el app shell cacheado.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Sin SW la web sigue funcionando normal; solo pierde el modo offline.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <FollowsProvider>
            <ComicsProvider>
              <CharactersProvider>
                <App />
              </CharactersProvider>
            </ComicsProvider>
          </FollowsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

