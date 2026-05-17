import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import PortfolioPage from './pages/PortfolioPage'
import AssetsPage from './pages/AssetsPage'
import MissionsPage from './pages/MissionsPage'
import MarketPage from './pages/MarketPage'
import SettingsPage from './pages/SettingsPage'
import { AuthProvider, useAuth } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null; 
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to="/" replace />;
    return children;
};

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
                        <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
                        <Route path="/missions" element={<ProtectedRoute><MissionsPage /></ProtectedRoute>} />
                        <Route path="/market" element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App
