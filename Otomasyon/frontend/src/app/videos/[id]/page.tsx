'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Video {
    id: number;
    filename: string;
    title: string;
    description: string;
    tags: string;
    scheduled_date: string | null;
    status: string;
    youtube_video_id: string | null;
    created_at: string;
    updated_at: string;
    logs: Array<{ id: number; message: string; level: string; created_at: string }>;
}

export default function VideoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    useEffect(() => {
        loadVideo();
    }, []);

    async function loadVideo() {
        try {
            const res = await api.getVideo(Number(params.id));
            if (res.success) {
                const v = res.data;
                setVideo(v);
                setTitle(v.title || '');
                setDescription(v.description || '');
                try {
                    const tagsArr = JSON.parse(v.tags);
                    setTags(Array.isArray(tagsArr) ? tagsArr.join(', ') : '');
                } catch { setTags(''); }
                setScheduledDate(v.scheduled_date ? v.scheduled_date.split('T')[0] : '');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const MySwal = withReactContent(Swal);
        try {
            const tagsArr = tags.split(',').map(t => t.trim()).filter(t => t);
            await api.updateVideo(Number(params.id), {
                title,
                description,
                tags: tagsArr,
                scheduled_date: scheduledDate || null,
            });
            await loadVideo();
            MySwal.fire({
                title: 'Başarılı!',
                text: 'Video başarıyla güncellendi.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1e1e1e',
                color: '#fff'
            });
        } catch (err) {
            console.error(err);
            MySwal.fire({
                title: 'Hata!',
                text: 'Güncelleme sırasında bir sorun oluştu.',
                icon: 'error',
                background: '#1e1e1e',
                color: '#fff'
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    if (!video) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🚫</div>
                <h3>Video bulunamadı</h3>
                <button className="btn btn-primary" onClick={() => router.push('/videos')}>
                    Videolara Dön
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>✏️ Video Düzenle</h1>
                    <p>{video.filename}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`badge badge-${video.status}`}>
                        <span className="badge-dot" />
                        {video.status}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/videos')}>
                        ← Geri
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
                {/* Edit Form */}
                <div className="card">
                    <h3 style={{ marginBottom: '20px' }}>Metadata Düzenle</h3>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">Başlık</label>
                            <input
                                className="form-input"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Video başlığı..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Açıklama</label>
                            <textarea
                                className="form-textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Video açıklaması..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Etiketler (virgülle ayır)</label>
                            <input
                                className="form-input"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder="etiket1, etiket2, etiket3"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Planlanan Tarih</label>
                            <input
                                type="date"
                                className="form-input"
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar: Info + Logs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Video Info */}
                    <div className="card">
                        <h3 style={{ marginBottom: '16px' }}>Bilgiler</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Dosya: </span>
                                <span style={{ fontWeight: 600 }}>{video.filename}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Oluşturulma: </span>
                                {new Date(video.created_at + 'Z').toLocaleString('tr-TR')}
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Güncelleme: </span>
                                {new Date(video.updated_at + 'Z').toLocaleString('tr-TR')}
                            </div>
                            {video.youtube_video_id && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>YouTube: </span>
                                    <a
                                        href={`https://youtube.com/shorts/${video.youtube_video_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {video.youtube_video_id}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '12px' }}>📋 İşlem Geçmişi</h3>
                        {video.logs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Henüz log yok</p>
                        ) : (
                            <div className="log-list">
                                {video.logs.map(log => (
                                    <div key={log.id} className={`log-item log-${log.level}`}>
                                        <span className="log-time" style={{ minWidth: 'auto', fontSize: '0.7rem' }}>
                                            {new Date(log.created_at + 'Z').toLocaleTimeString('tr-TR')}
                                        </span>
                                        <span className="log-msg">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
