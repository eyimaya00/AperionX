import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const basicAuth = request.headers.get('authorization');

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        const validUser = process.env.BASIC_AUTH_USER || 'admin';
        const validPass = process.env.BASIC_AUTH_PASS || 'AperionX2026';

        if (user === validUser && pwd === validPass) {
            return NextResponse.next();
        }
    }

    // Require authentication
    const url = request.nextUrl;

    // Yalnızca public static dosyalar veya Next.js assetlerine istisna yapılabilir
    if (url.pathname.startsWith('/_next/') || url.pathname.includes('/api/')) {
        return NextResponse.next();
    }

    return new NextResponse('Auth required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}

export const config = {
    matcher: ['/:path*'], // Tüm sayfalarda çalışsın
};
