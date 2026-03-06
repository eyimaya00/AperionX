'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface LogEntry {
    id: number;
    video_id: number;
    message: string;
    level: string;
    created_at: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadLogs(); }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const res = await api.getLogs(100);
            if (res.success) setLogs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const levelIcons: Record<string, string> = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔧',
    };

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>📋 Sistem Logları</h1>
                    <p>Son 100 işlem kaydı</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadLogs}>🔄 Yenile</button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : logs.length === 0 ? (
                <div className="table-container">
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Henüz log yok</h3>
                        <p>Video tarama veya yükleme yapıldığında loglar görünecek.</p>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <div className="log-list" style={{ padding: '8px' }}>
                        {logs.map(log => (
                            <div key={log.id} className={`log-item log-${log.level}`}>
                                <span style={{ fontSize: '0.9rem', width: '24px' }}>
                                    {levelIcons[log.level] || 'ℹ️'}
                                </span>
                                <span className="log-time">
                                    {new Date(log.created_at + 'Z').toLocaleString('tr-TR')}
                                </span>
                                <span style={{
                                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                    fontSize: '0.7rem', fontWeight: 600,
                                    background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                                }}>
                                    Video #{log.video_id}
                                </span>
                                <span className="log-msg">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
