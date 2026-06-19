import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import PortfolioPage from './pages/PortfolioPage'
import AssetsPage from './pages/AssetsPage'
import MissionsPage from './pages/MissionsPage'
import MarketPage from './pages/MarketPage'
import SettingsPage from './pages/SettingsPage'
import IndustryPage from './pages/IndustryPage'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider, useAuth } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import { ConfigProvider } from './store/ConfigContext'

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
                    <ConfigProvider>
                        <Routes>
                            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                            
                            {/* 공통 레이아웃이 적용되는 인증 보호 라우트들 */}
                            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                                <Route path="/" element={<PortfolioPage />} />
                                <Route path="/inventory" element={<AssetsPage />} />
                                <Route path="/missions" element={<MissionsPage />} />
                                <Route path="/market" element={<MarketPage />} />
                                <Route path="/market/region/:regionId/type/:typeId" element={<MarketPage />} />
                                <Route path="/industry" element={<IndustryPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                            </Route>
                            
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ConfigProvider>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App
