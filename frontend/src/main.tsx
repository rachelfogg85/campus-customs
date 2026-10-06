import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'
import { CartProvider } from './cart.tsx'
import { ChatMatchesProvider } from './chatMatches.tsx'
import { ChatUIProvider } from './chatUI.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ChatMatchesProvider>
            <ChatUIProvider>
              <App />
            </ChatUIProvider>
          </ChatMatchesProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
