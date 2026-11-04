import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { ComicsProvider } from './context/ComicsContext'
import { CharactersProvider } from './context/CharactersContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <ComicsProvider>
            <CharactersProvider>
              <App />
            </CharactersProvider>
          </ComicsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

