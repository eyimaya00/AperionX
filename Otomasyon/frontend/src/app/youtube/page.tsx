'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface Channel {
    id: number;
    channel_id: string;
    channel_name: string;
    is_active: boolean;
    token_expiry: string;
    created_at: string;
}

export default function YouTubePage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [authUrl, setAuthUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const [chRes, authRes] = await Promise.all([
                api.getChannels(),
                api.getAuthUrl(),
            ]);
            if (chRes.success) setChannels(chRes.data);
            if (authRes.success) setAuthUrl(authRes.data.url);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number, name: string) {
        const MySwal = withReactContent(Swal);
        const result = await MySwal.fire({
            title: 'Kaldırmak İstediğinize Emin Misiniz?',
            text: `"${name}" kanalının bağlantısını kaldırmak üzeresiniz. Otomatik yüklemeler duracaktır.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4f4f4f',
            confirmButtonText: 'Evet, Kaldır!',
            cancelButtonText: 'İptal',
            background: '#1e1e1e',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        const res = await api.deleteChannel(id);
        if (res.success) {
            MySwal.fire({
                title: 'Kaldırıldı!',
                text: 'Kanal bağlantısı başarıyla kesildi.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1e1e1e',
                color: '#fff'
            });
            loadData();
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    return (
        <>
            <div className="page-header">
                <h1>▶️ YouTube Kanalları</h1>
                <p>YouTube kanallarınızı bağlayın ve yönetin</p>
            </div>

            {/* Connect Button */}
            <div className="card" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '3rem' }}>🔗</span>
                </div>
                <h3 style={{ marginBottom: '8px' }}>Yeni Kanal Bağla</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                    Google OAuth2 ile YouTube kanalınızı bağlayın. Video yükleme için kanal yetkilendirmesi gereklidir.
                </p>
                {authUrl ? (
                    <a
                        href={authUrl}
                        className="btn btn-primary"
                        style={{ fontSize: '1rem', padding: '12px 32px' }}
                    >
                        ▶️ Google ile Bağlan
                    </a>
                ) : (
                    <p style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>
                        ⚠️ YouTube API anahtarları yapılandırılmamış. .env dosyasındaki YOUTUBE_CLIENT_ID ve YOUTUBE_CLIENT_SECRET değerlerini doldurun.
                    </p>
                )}
            </div>

            {/* Channel List */}
            {channels.length > 0 && (
                <div className="table-container">
                    <div className="table-header">
                        <h3>Bağlı Kanallar ({channels.length})</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Kanal</th>
                                <th>Kanal ID</th>
                                <th>Durum</th>
                                <th>Token Bitiş</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map(ch => (
                                <tr key={ch.id}>
                                    <td style={{ fontWeight: 600 }}>{ch.channel_name}</td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                        {ch.channel_id}
                                    </td>
                                    <td>
                                        <span className={`badge ${ch.is_active ? 'badge-uploaded' : 'badge-failed'}`}>
                                            <span className="badge-dot" />
                                            {ch.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(ch.token_expiry).toLocaleString('tr-TR')}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(ch.id, ch.channel_name)}
                                        >
                                            Kaldır
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
