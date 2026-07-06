import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { BackgroundProvider } from './context/BackgroundContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <BackgroundProvider>
          <App />
        </BackgroundProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
