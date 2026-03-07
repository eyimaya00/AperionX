'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
}

export default function VideosPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Scheduling State
    const [schedulingVideo, setSchedulingVideo] = useState<Video | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    useEffect(() => {
        loadVideos();
    }, [page, statusFilter]);

    async function loadVideos() {
        setLoading(true);
        try {
            const res = await api.getVideos(page, 20, statusFilter || undefined, search || undefined);
            if (res.success) {
                setVideos(res.data.items);
                setTotal(res.data.total);
            }
        } catch (err) {
            console.error('Video listesi yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setPage(1);
        loadVideos();
    }

    async function handleDelete(id: number, filename: string) {
        const MySwal = withReactContent(Swal);
        const result = await MySwal.fire({
            title: 'Emin misiniz?',
            text: `"${filename}" videosunu silmek istediğinize emin misiniz?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4f4f4f',
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal',
            background: '#1e1e1e',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        const res = await api.deleteVideo(id);
        if (res.success) {
            MySwal.fire({
                title: 'Silindi!',
                text: 'Video başarıyla silindi.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1e1e1e',
                color: '#fff'
            });
            loadVideos();
        }
    }

    async function handleScheduleSave() {
        if (!schedulingVideo || !scheduleDate) return;
        try {
            // Eğer saat boşsa 00:00 yap
            const timeStr = scheduleTime || '00:00';
            const dateStr = `${scheduleDate}T${timeStr}:00`;
            const dateObj = new Date(dateStr);

            const res = await api.updateVideo(schedulingVideo.id, {
                scheduled_date: dateObj.toISOString()
            });

            if (res.success) {
                setSchedulingVideo(null);
                loadVideos();
            }
        } catch (err) {
            console.error('Planlama hatası:', err);
        }
    }

    function parseTags(tags: string): string[] {
        try {
            return JSON.parse(tags);
        } catch {
            return [];
        }
    }

    const statusOptions = [
        { value: '', label: 'Tümü' },
        { value: 'pending', label: 'Bekleyen' },
        { value: 'processing', label: 'İşleniyor' },
        { value: 'uploaded', label: 'Yayınlandı' }, // Changed to Yayınlandı
        { value: 'failed', label: 'Başarısız' },
    ];

    return (
        <>
            <div className="page-header">
                <h1>🎬 Videolar</h1>
                <p>Tüm videoları görüntüle ve yönet ({total} video)</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <input
                        className="form-input"
                        placeholder="Video ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    <button type="submit" className="btn btn-secondary btn-sm">Ara</button>
                </form>

                <div style={{ display: 'flex', gap: '6px' }}>
                    {statusOptions.map(opt => (
                        <button
                            key={opt.value}
                            className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : videos.length === 0 ? (
                <div className="table-container">
                    <div className="empty-state">
                        <div className="empty-icon">🎬</div>
                        <h3>Video bulunamadı</h3>
                        <p>Henüz sistemde video yok. Videoları tarayarak veya indirerek ekleyin.</p>
                        <Link href="/download" className="btn btn-primary" style={{ marginTop: '8px' }}>
                            Video İndir
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Dosya</th>
                                <th>Başlık</th>
                                <th>Etiketler</th>
                                <th>Planlanan Tarih</th>
                                <th>Durum</th>
                                <th style={{ width: '130px' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.map(video => (
                                <tr key={video.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{video.filename}</div>
                                    </td>
                                    <td>
                                        <div style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {video.title || '—'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {parseTags(video.tags).slice(0, 3).map((tag, i) => (
                                                <span key={i} style={{
                                                    padding: '2px 8px',
                                                    background: 'var(--accent-secondary-soft)',
                                                    color: 'var(--accent-secondary-hover)',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {video.scheduled_date ? (
                                            <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                {new Date(video.scheduled_date).toLocaleString('tr-TR', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>Planlanmadı</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${video.status}`}>
                                            <span className="badge-dot" />
                                            {video.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                title="Tarih Planla"
                                                onClick={() => {
                                                    setSchedulingVideo(video);
                                                    if (video.scheduled_date) {
                                                        const d = new Date(video.scheduled_date);
                                                        // Adjust for local timezone offset when setting input values
                                                        const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                                                        const iso = localDate.toISOString();
                                                        setScheduleDate(iso.split('T')[0]);
                                                        setScheduleTime(iso.split('T')[1].substring(0, 5));
                                                    } else {
                                                        setScheduleDate('');
                                                        setScheduleTime('');
                                                    }
                                                }}
                                            >
                                                📅
                                            </button>
                                            <Link href={`/videos/${video.id}`} className="btn btn-ghost btn-sm" title="Düzenle">
                                                ✏️
                                            </Link>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDelete(video.id, video.filename)}
                                                style={{ color: 'var(--error)' }}
                                                title="Sil"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {total > 20 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: '8px',
                            padding: '16px', borderTop: '1px solid var(--border)'
                        }}>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                ← Önceki
                            </button>
                            <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Sayfa {page}
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={videos.length < 20}
                            >
                                Sonraki →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Schedule Modal Overlay */}
            {schedulingVideo && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📅 Planlama Ayarla
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            <strong>{schedulingVideo.filename}</strong> videosunun ne zaman yayınlanacağını (Shorts olarak atılacağını) seçin.
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Yayın Tarihi
                            </label>
                            <input
                                type="date"
                                value={scheduleDate}
                                onChange={e => setScheduleDate(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px',
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Yayın Saati
                            </label>
                            <input
                                type="time"
                                value={scheduleTime}
                                onChange={e => setScheduleTime(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px',
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={() => setSchedulingVideo(null)}>
                                İptal
                            </button>
                            <button className="btn btn-primary" onClick={handleScheduleSave} disabled={!scheduleDate}>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
