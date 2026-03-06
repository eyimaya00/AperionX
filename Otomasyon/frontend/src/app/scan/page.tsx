'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface ScanDetail {
    filename: string;
    status: 'added' | 'skipped' | 'error';
    message: string;
}

interface ScanResult {
    scanned: number;
    added: number;
    skipped: number;
    errors: number;
    details: ScanDetail[];
}

export default function ScanPage() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);

    async function handleScan() {
        setScanning(true);
        setResult(null);
        try {
            const res = await api.scanVideos();
            if (res.success) {
                setResult(res.data);
            }
        } catch (err) {
            console.error('Tarama hatası:', err);
        } finally {
            setScanning(false);
        }
    }

    const statusColors: Record<string, { bg: string; color: string; icon: string }> = {
        added: { bg: 'var(--success-soft)', color: 'var(--success)', icon: '✅' },
        skipped: { bg: 'var(--warning-soft)', color: 'var(--warning)', icon: '⏭️' },
        error: { bg: 'var(--error-soft)', color: 'var(--error)', icon: '❌' },
    };

    return (
        <>
            <div className="page-header">
                <h1>🔍 Manuel Video Tarama</h1>
                <p>
                    <code style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        backend/videos/
                    </code>
                    {' '}klasöründeki .mp4 ve .txt dosyalarını tara ve sisteme ekle.
                </p>
            </div>

            <div className="card" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '3rem' }}>📂</span>
                </div>
                <h3 style={{ marginBottom: '8px' }}>Klasör Taraması</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px', maxWidth: '480px', margin: '0 auto 20px' }}>
                    Bu işlem sadece sunucuya manuel olarak video yüklediğiniz durumlarda gereklidir. İndirme sekmesinden indirdiğiniz
                    videolar otomatik olarak taranır.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleScan}
                    disabled={scanning}
                    style={{ fontSize: '1rem', padding: '12px 32px' }}
                >
                    {scanning ? (
                        <>
                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                            Taranıyor...
                        </>
                    ) : (
                        '🔍 Taramayı Başlat'
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Summary Stats */}
                    <div className="stats-grid" style={{ marginBottom: '20px' }}>
                        <div className="stat-card">
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{result.scanned}</div>
                            <div className="stat-label">Taranan</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{result.added}</div>
                            <div className="stat-label">Eklenen</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--warning)' }}>{result.skipped}</div>
                            <div className="stat-label">Atlanan</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--error)' }}>{result.errors}</div>
                            <div className="stat-label">Hata</div>
                        </div>
                    </div>

                    {/* Detail List */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3>Tarama Detayları</h3>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Durum</th>
                                    <th>Dosya</th>
                                    <th>Mesaj</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.details.map((d, i) => {
                                    const s = statusColors[d.status];
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                                    background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 600
                                                }}>
                                                    {s.icon} {d.status}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{d.filename}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.message}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </>
    );
}
