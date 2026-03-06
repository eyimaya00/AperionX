'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Stats {
    total: number;
    pending: number;
    processing: number;
    uploaded: number;
    failed: number;
}

interface LogEntry {
    id: number;
    video_id: number;
    message: string;
    level: string;
    created_at: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [statsRes, logsRes] = await Promise.all([
                api.getStats(),
                api.getLogs(15),
            ]);
            if (statsRes.success) {
                setStats(statsRes.data.stats);
            }
            if (logsRes.success) {
                setLogs(logsRes.data);
            }
        } catch (err) {
            console.error('Dashboard yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    const statCards = [
        { label: 'Toplam Video', value: stats?.total || 0, icon: '🎬', color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-soft)' },
        { label: 'Bekleyen', value: stats?.pending || 0, icon: '⏳', color: 'var(--warning)', bg: 'var(--warning-soft)' },
        { label: 'Yüklendi', value: stats?.uploaded || 0, icon: '✅', color: 'var(--success)', bg: 'var(--success-soft)' },
        { label: 'Başarısız', value: stats?.failed || 0, icon: '❌', color: 'var(--error)', bg: 'var(--error-soft)' },
    ];

    return (
        <>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>YouTube Shorts otomasyon sistemi genel durumu</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map(card => (
                    <div className="stat-card" key={card.label}>
                        <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                            {card.icon}
                        </div>
                        <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
                        <div className="stat-label">{card.label}</div>
                        <div className="stat-glow" style={{ background: card.color }} />
                    </div>
                ))}
            </div>

            {/* Recent Logs */}
            <div className="table-container">
                <div className="table-header">
                    <h3>📋 Son İşlem Logları</h3>
                    <button className="btn btn-ghost btn-sm" onClick={loadData}>Yenile</button>
                </div>
                {logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Henüz log yok</h3>
                        <p>Video taraması yapıldığında loglar burada görünecek.</p>
                    </div>
                ) : (
                    <div className="log-list" style={{ padding: '8px' }}>
                        {logs.map(log => (
                            <div key={log.id} className={`log-item log-${log.level}`}>
                                <span className="log-time">
                                    {new Date(log.created_at + 'Z').toLocaleString('tr-TR')}
                                </span>
                                <span className="log-msg">{log.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
