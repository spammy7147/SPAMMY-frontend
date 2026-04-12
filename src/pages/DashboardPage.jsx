import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const API = ''

function formatISK(amount) {
    if (!amount) return '0.00'
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(2) + ' B'
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(2) + ' M'
    if (amount >= 1_000) return (amount / 1_000).toFixed(2) + ' K'
    return amount.toFixed(2)
}

function CharacterCard({ char, onSetMain, onUpdateOmega }) {
    const [isEditing, setIsEditing] = useState(false);
    
    // 날짜 계산 헬퍼 함수
    const addDuration = (days, months = 0) => {
        // 기존 만료일이 있고, 그날이 오늘 이후라면 그날을 기준으로 연장
        // 그렇지 않으면 오늘을 기준으로 연장
        const now = new Date();
        let baseDate = char.omegaExpiresAt && new Date(char.omegaExpiresAt) > now 
            ? new Date(char.omegaExpiresAt) 
            : now;
        
        // 새 날짜 객체 생성 (원본 변조 방지)
        const newDate = new Date(baseDate.getTime());
        
        if (months > 0) {
            newDate.setMonth(newDate.getMonth() + months);
        } else {
            newDate.setDate(newDate.getDate() + days);
        }
        
        console.log(`[Omega] Extending duration: ${char.characterName} -> ${newDate.toISOString()}`);
        onUpdateOmega(char.characterId, newDate.toISOString());
        setIsEditing(false);
    };

    const quickButtons = [
        { label: '15D', days: 15 },
        { label: '30D', days: 30 },
        { label: '3M', months: 3 },
        { label: '6M', months: 6 },
        { label: '12M', months: 12 },
        { label: '24M', months: 24 },
    ];
    
    // 남은 날짜 계산
    const getRemainingDays = (dateStr) => {
        if (!dateStr) return null;
        const diff = new Date(dateStr) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const remainingDays = getRemainingDays(char.omegaExpiresAt);
    
    // 오메가 상태 색상 결정
    const getOmegaColor = () => {
        if (remainingDays === null) return '#94a3b8';
        if (remainingDays <= 3) return '#ef4444'; // 3일 이내 (빨강)
        if (remainingDays <= 7) return '#f59e0b'; // 7일 이내 (주황)
        return '#2563eb'; // 정상 (파랑)
    };

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: char.isMain ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: char.isMain ? '0 10px 15px -3px rgba(37, 99, 235, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            transition: 'transform 0.15s, box-shadow 0.15s',
            position: 'relative'
        }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
        }}>
            
            {/* 메인 설정 버튼 */}
            {!char.isMain && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMain(char.characterId);
                    }}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        filter: 'grayscale(1)',
                        opacity: 0.3,
                        transition: 'opacity 0.2s, filter 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.filter = 'none'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.3; e.currentTarget.style.filter = 'grayscale(1)'; }}
                    title="메인으로 설정"
                >⭐</button>
            )}
            {char.isMain && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '18px',
                }} title="메인 캐릭터">⭐</div>
            )}

            {/* 캐릭터 헤더 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img 
                    src={char.portraitUrl || 'https://images.evetech.net/characters/1/portrait?size=64'} 
                    alt={char.characterName}
                    style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f1f5f9' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {char.characterName}
                        </h3>
                        {char.isMain && (
                            <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>MAIN</span>
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {char.corporationName || `Corp: ${char.corporationId}`}
                    </p>
                    {char.allianceName && (
                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {char.allianceName}
                        </p>
                    )}
                </div>
            </div>

            {/* 주요 지표 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wallet</p>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{formatISK(char.balance)}</p>
                </div>
                <div style={{ position: 'relative', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Omega {isEditing ? '●' : ''}
                        </p>
                        <span 
                            onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                            style={{ fontSize: '12px', cursor: 'pointer', opacity: isEditing ? 1 : 0.4, transition: 'opacity 0.2s' }}
                            title="기간 수정"
                        >📅</span>
                    </div>

                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                {quickButtons.map(btn => (
                                    <button
                                        key={btn.label}
                                        onClick={() => addDuration(btn.days || 0, btn.months || 0)}
                                        style={{
                                            padding: '4px 0',
                                            fontSize: '9px',
                                            fontWeight: '700',
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: '#64748b'
                                        }}
                                    >+{btn.label}</button>
                                ))}
                            </div>
                            <input 
                                type="date"
                                defaultValue={char.omegaExpiresAt ? char.omegaExpiresAt.split('T')[0] : ''}
                                onChange={(e) => {
                                    const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                    onUpdateOmega(char.characterId, newDate);
                                    setIsEditing(false);
                                }}
                                style={{ width: '100%', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px' }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ 
                                fontSize: '13px', 
                                fontWeight: '800', 
                                color: getOmegaColor(),
                                marginBottom: '2px'
                            }}>
                                {remainingDays !== null ? (remainingDays > 0 ? `${remainingDays} Days` : 'Expired') : 'N/A'}
                            </span>
                            {char.omegaExpiresAt && (
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                                    {new Date(char.omegaExpiresAt).toISOString().split('T')[0]}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 동기화 정보 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last synced</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                    {char.lastSyncedAt ? new Date(char.lastSyncedAt).toLocaleDateString() : 'Never'}
                </span>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { logout, checkAuth } = useAuth()
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API}/api/summary`, { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setSummary(data)
            }
        } catch (error) {
            console.error('Summary fetch failed', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSetMain = async (charId) => {
        console.log('[Dashboard] Setting main character:', charId);
        try {
            const res = await fetch(`/auth/characters/${charId}/main`, { 
                method: 'PATCH',
                credentials: 'include'
            })
            if (res.ok) {
                await fetchSummary();
                await checkAuth();
            }
        } catch (error) {
            console.error('[Dashboard] Error calling set main API:', error);
        }
    }

    const handleUpdateOmega = async (charId, omegaExpiresAt) => {
        try {
            const res = await fetch(`/api/characters/${charId}/omega`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ omegaExpiresAt }),
                credentials: 'include'
            })
            if (res.ok) {
                await fetchSummary();
            }
        } catch (error) {
            console.error('[Dashboard] Error updating omega:', error);
        }
    }

    useEffect(() => {
        fetchSummary()
    }, [])

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>초상화를 그리는 중...</p>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: '"Inter", system-ui, sans-serif' }}>
            
            {/* 사이드바 대용 상단 네비 */}
            <nav style={{ 
                background: '#ffffff', borderBottom: '1px solid #e2e8f0', 
                padding: '0 24px', height: '64px', display: 'flex', 
                alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '4px', color: '#2563eb' }}>SPAMMY</h1>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#2563eb', borderBottom: '2px solid #2563eb', padding: '22px 0', cursor: 'pointer' }}>Dashboard</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', padding: '22px 0', cursor: 'pointer' }}>Wallet</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', padding: '22px 0', cursor: 'pointer' }}>Assets</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={() => navigate('/settings')}
                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#64748b' }}
                    >⚙️</button>
                    <button 
                        onClick={logout}
                        style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >Logout</button>
                </div>
            </nav>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
                
                {/* 글로벌 요약 섹션 */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Global Overview</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '20px', padding: '24px', color: '#ffffff', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>Total Balance</p>
                            <h3 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>{formatISK(summary?.totalBalance)} <span style={{ fontSize: '16px', fontWeight: '400', opacity: 0.8 }}>ISK</span></h3>
                        </div>
                        {/* 추가 요약 카드 자리 (예: 총 예상 수익, 활성 잡 등) */}
                        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>More stats coming soon...</p>
                        </div>
                    </div>
                </div>

                {/* 캐릭터 그리드 섹션 */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Characters</h2>
                        <button 
                            onClick={() => window.location.href = '/auth/link'}
                            style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                        >+ Add Character</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                        {summary?.characters.map(char => (
                            <CharacterCard 
                                key={char.characterId} 
                                char={char} 
                                onSetMain={handleSetMain}
                                onUpdateOmega={handleUpdateOmega}
                            />
                        ))}
                    </div>
                </div>

            </main>
        </div>
    )
}
