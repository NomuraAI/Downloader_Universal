import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import ProtectedRoute from './components/ProtectedRoute'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <AuthProvider>
                    <AppProvider>
                        <Routes>
                            <Route path="/" element={
                                <ProtectedRoute>
                                    <App />
                                </ProtectedRoute>
                            } />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                        </Routes>
                    </AppProvider>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>,
)
