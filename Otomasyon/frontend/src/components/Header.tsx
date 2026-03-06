'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Header() {
    const [healthy, setHealthy] = useState(false);

    useEffect(() => {
        api.health().then(res => setHealthy(res.success)).catch(() => setHealthy(false));
        const interval = setInterval(() => {
            api.health().then(res => setHealthy(res.success)).catch(() => setHealthy(false));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="header">
            <div className="header-left">
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>YouTube Shorts Otomasyon</h3>
            </div>
            <div className="header-right">
                <div className="header-status">
                    <span className="dot" style={{ background: healthy ? 'var(--success)' : 'var(--error)' }} />
                    {healthy ? 'API Bağlı' : 'API Bağlantı Yok'}
                </div>
            </div>
        </header>
    );
}
