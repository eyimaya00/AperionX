'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface DownloadMetadata {
    description: string;
    tags: string[];
    uploader: string;
    duration: number;
}

export default function DownloadPage() {
    const [downloadUrl, setDownloadUrl] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [fetchingMeta, setFetchingMeta] = useState(false);
    const [dlDescription, setDlDescription] = useState('');
    const [dlTags, setDlTags] = useState('');
    const [dlResult, setDlResult] = useState<{ success: boolean; message: string } | null>(null);
    const [metaPreview, setMetaPreview] = useState<DownloadMetadata | null>(null);

    async function handleFetchMetadata() {
        if (!downloadUrl.trim()) return;
        setFetchingMeta(true);
        setMetaPreview(null);
        try {
            const res = await api.getDownloadMetadata(downloadUrl.trim());
            if (res.success && res.data) {
                const meta = res.data as DownloadMetadata;
                setMetaPreview(meta);
                setDlDescription(meta.description || '');
                setDlTags(meta.tags?.join(', ') || '');
            }
        } catch (err) {
            console.error('Metadata hatası:', err);
        } finally {
            setFetchingMeta(false);
        }
    }

    async function handleDownload() {
        if (!downloadUrl.trim()) return;
        setDownloading(true);
        setDlResult(null);
        try {
            const res = await api.downloadVideo({
                url: downloadUrl.trim(),
                description: dlDescription || undefined,
                tags: dlTags || undefined,
            });
            if (res.success) {
                setDlResult({
                    success: true,
                    message: `✅ Video indirildi ve eklendi: ${res.data?.filename || 'başarılı'}`,
                });
                setDownloadUrl('');
                setDlDescription('');
                setDlTags('');
                setMetaPreview(null);
            } else {
                setDlResult({
                    success: false,
                    message: `❌ Hata: ${res.error || 'İndirme başarısız'}`,
                });
            }
        } catch (err: any) {
            setDlResult({ success: false, message: `❌ Hata: ${err.message}` });
        } finally {
            setDownloading(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1>⬇️ Video İndir (AI Destekli)</h1>
                <p>Instagram, TikTok veya YouTube'dan link ile video indir</p>
            </div>

            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '3rem' }}>🔗</span>
                </div>
                <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>Google Gemini AI ile İndir</h3>
                <p style={{
                    color: 'var(--text-secondary)', fontSize: '0.875rem',
                    textAlign: 'center', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px'
                }}>
                    Linki yapıştır. Başlık (otomatik), açıklama ve etiketler AI tarafından Youtube Shorts formatına uygun şekilde oluşturulup kaydedilecektir.
                </p>

                {/* URL Input */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="url"
                        value={downloadUrl}
                        onChange={e => setDownloadUrl(e.target.value)}
                        placeholder="https://www.instagram.com/reel/... veya TikTok/YouTube linki"
                        style={{
                            flex: 1, padding: '12px 16px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                            fontSize: '0.95rem', outline: 'none',
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleFetchMetadata()}
                    />
                    <button
                        className="btn btn-ghost"
                        onClick={handleFetchMetadata}
                        disabled={fetchingMeta || !downloadUrl.trim()}
                        style={{ minWidth: '120px' }}
                    >
                        {fetchingMeta ? (
                            <>
                                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                Çekiliyor...
                            </>
                        ) : (
                            '📋 Bilgi Çek'
                        )}
                    </button>
                </div>

                {/* Metadata Preview */}
                {metaPreview && (
                    <div style={{
                        background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
                        padding: '12px 16px', marginBottom: '16px', border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px' }}>
                            🎯 Kaynaktan Çekilen Bilgiler (AI'a gönderilecek)
                            {metaPreview.uploader && ` — ${metaPreview.uploader}`}
                            {metaPreview.duration > 0 && ` (${Math.round(metaPreview.duration)}s)`}
                        </div>
                    </div>
                )}

                {/* Editable Metadata Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Orijinal Açıklama (AI bu metni baz alarak Shorts açıklaması üretecek)
                        </label>
                        <textarea
                            value={dlDescription}
                            onChange={e => setDlDescription(e.target.value)}
                            placeholder="Otomatik çekilecek veya manuel yaz"
                            rows={4}
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                                fontSize: '0.9rem', outline: 'none', resize: 'vertical',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Orijinal Etiketler (virgülle ayır)
                        </label>
                        <input
                            type="text"
                            value={dlTags}
                            onChange={e => setDlTags(e.target.value)}
                            placeholder="etiket1, etiket2, etiket3"
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                                fontSize: '0.9rem', outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Download Button */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleDownload}
                        disabled={downloading || !downloadUrl.trim()}
                        style={{ fontSize: '1rem', padding: '12px 40px' }}
                    >
                        {downloading ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                İndir ve AI ile Optimize Et
                            </>
                        ) : (
                            '✨ İndir ve AI ile Ekle'
                        )}
                    </button>
                </div>

                {/* Download Result */}
                {dlResult && (
                    <div style={{
                        marginTop: '16px', padding: '12px 16px',
                        borderRadius: 'var(--radius)',
                        background: dlResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
                        color: dlResult.success ? 'var(--success)' : 'var(--error)',
                        textAlign: 'center', fontWeight: 600,
                    }}>
                        {dlResult.message}
                    </div>
                )}
            </div>
        </>
    );
}
