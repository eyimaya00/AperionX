'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Image from 'next/image';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Videolar', href: '/videos', icon: '🎬' },
    { label: 'Video İndir', href: '/download', icon: '⬇️' },
    { label: 'Tarama', href: '/scan', icon: '🔍' },
];

const navItems2 = [
    { label: 'YouTube Kanalları', href: '/youtube', icon: '▶️' },
    { label: 'Loglar', href: '/logs', icon: '📋' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                    <Image
                        src="/logo.png"
                        alt="AperionX Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>
                <div>
                    <h2>AperionX</h2>
                    <span>Shorts Otomasyonu</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Ana Menü</div>
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}

                <div className="nav-section-label" style={{ marginTop: '8px' }}>Entegrasyon</div>
                {navItems2.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
