import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import PublicUpload from './pages/PublicUpload'

// Read deployment mode from environment variable set in Vercel
// 'upload'    → Upload portal only (no dashboard access)
// 'dashboard' → Dashboard only (no upload route)
const APP_MODE = import.meta.env.VITE_APP_MODE || 'dashboard'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  // ── UPLOAD-ONLY DEPLOYMENT ──────────────────────────────────
  // If this Vercel project is the upload portal, render ONLY
  // the public upload page. Nothing else is reachable.
  if (APP_MODE === 'upload') {
    return <PublicUpload />
  }

  // ── DASHBOARD DEPLOYMENT ────────────────────────────────────
  // Check login state on mount
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const savedUser = localStorage.getItem('ceo_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setIsLoggedIn(true)
    }
    setInitializing(false)
  }, [])

  const handleLogin = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
    localStorage.setItem('ceo_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('ceo_user')
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">
        Loading Dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
