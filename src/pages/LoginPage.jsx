import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

function LoginPage() {
    const { user, loading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            console.log('User already logged in, redirecting to home...');
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-11 h-11 border-2 border-border border-t-primary rounded-full animate-spin-fast"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative font-sans">
            {/* 테마 전환 버튼 (우측 상단) */}
            <div className="absolute top-6 right-6">
                <button 
                    onClick={toggleTheme}
                    className="bg-card border border-border rounded px-3 py-2 text-base cursor-pointer text-foreground-muted shadow-lg hover:text-foreground transition-colors"
                >
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
            </div>
            
            <div className="w-full max-w-[460px] p-8">
                <div className="text-center mb-12">
                    <h1 className="m-0 text-5xl font-extrabold text-primary tracking-[8px] leading-none">
                        SPAMMY
                    </h1>
                    <p className="mt-3 text-[11px] text-foreground-dim tracking-[2px] uppercase font-semibold">
                        Space Pilot Asset Management & Monitoring Yard
                    </p>
                </div>

                <div className="bg-card border border-border rounded p-10 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                    
                    <p className="m-0 mb-8 text-sm text-foreground-muted text-center leading-[1.8]">
                        EVE SSO로 로그인하여 지갑, 자산,<br />
                        그리고 미션 수익을 전문적으로 분석하세요.
                    </p>

                    <button
                        onClick={() => window.location.href = '/oauth2/authorization/eve'}
                        className="w-full p-3.5 bg-transparent text-primary border border-primary rounded text-[15px] font-bold cursor-pointer tracking-[2px] transition-all uppercase hover:bg-primary/5 active:bg-primary/10"
                    >
                        EVE Online SSO LOGIN
                    </button>

                    <p className="m-0 mt-6 text-[11px] text-foreground-dim text-center leading-[1.6]">
                        모든 데이터는 ESI API를 통해 안전하게 처리되며<br/>
                        브라우저 내에서만 활용됩니다.
                    </p>
                </div>

                <div className="mt-8 text-center text-[10px] text-foreground-dim tracking-wider">
                    SPAMMY v0.1 · Space Pilot Asset Management & Monitoring Yard<br/>
                    EVE Online is a trademark of CCP hf.
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
