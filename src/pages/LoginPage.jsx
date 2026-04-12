import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    // 로딩 중이거나 유저가 이미 있는 경우(리다이렉트 중)에는 아무것도 렌더링하지 않음
    if (loading || user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>잠시만 기다려주세요...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 16px',
            }}>

                {/* 로고 */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        marginBottom: '16px',
                    }}>🚀</div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#0f172a',
                        letterSpacing: '4px',
                    }}>SPAMMY</h1>
                    <p style={{
                        margin: '6px 0 0',
                        fontSize: '13px',
                        color: '#94a3b8',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                    }}>Personal Asset Manager</p>
                </div>

                {/* 카드 */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                }}>
                    <p style={{
                        margin: '0 0 24px',
                        fontSize: '14px',
                        color: '#64748b',
                        textAlign: 'center',
                        lineHeight: '1.6',
                    }}>
                        EVE Online 계정으로 로그인하여<br />
                        자산과 시장 데이터를 확인하세요
                    </p>

                    <button
                        onClick={() => window.location.href = '/auth/login'}
                        onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                        style={{
                            width: '100%',
                            padding: '13px',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.15s',
                        }}>
                        ⚡ EVE Online으로 로그인
                    </button>

                    <p style={{
                        margin: '16px 0 0',
                        fontSize: '12px',
                        color: '#cbd5e1',
                        textAlign: 'center',
                    }}>
                        ESI API를 통해 안전하게 연동됩니다
                    </p>
                </div>

                <p style={{
                    margin: '20px 0 0',
                    fontSize: '11px',
                    color: '#cbd5e1',
                    textAlign: 'center',
                }}>
                    SPAMMY v0.1 · EVE Online is a trademark of CCP hf.
                </p>
            </div>
        </div>
    )
}

export default LoginPage