const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

async function request<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    const json = await res.json();
    return json;
}

// ===== Videos =====
export const api = {
    // Health
    health: () => request('/health'),

    // Videos
    getVideos: (page = 1, limit = 20, status?: string, search?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        return request(`/videos?${params}`);
    },

    getVideo: (id: number) => request(`/videos/${id}`),

    createVideo: (data: any) =>
        request('/videos', { method: 'POST', body: JSON.stringify(data) }),

    updateVideo: (id: number, data: any) =>
        request(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    deleteVideo: (id: number) =>
        request(`/videos/${id}`, { method: 'DELETE' }),

    scanVideos: () =>
        request('/videos/scan', { method: 'POST' }),

    getStats: () => request('/videos/stats'),

    // Logs
    getLogs: (limit = 50) => request(`/logs?limit=${limit}`),
    getVideoLogs: (videoId: number) => request(`/logs/video/${videoId}`),

    // YouTube
    getAuthUrl: () => request('/youtube/auth-url'),
    getChannels: () => request('/youtube/channels'),
    deleteChannel: (id: number) =>
        request(`/youtube/channels/${id}`, { method: 'DELETE' }),

    // Download
    downloadVideo: (data: { url: string; description?: string; tags?: string }) =>
        request('/download', { method: 'POST', body: JSON.stringify(data) }),

    getDownloadMetadata: (url: string) =>
        request('/download/metadata', { method: 'POST', body: JSON.stringify({ url }) }),
};
