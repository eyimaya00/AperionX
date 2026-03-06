import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../models/types';

/**
 * Global hata yakalama middleware
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    logger.error(`Hata: ${err.message}`, { stack: err.stack });

    const response: ApiResponse = {
        success: false,
        error: err.message || 'Sunucu hatası',
    };

    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json(response);
}

/**
 * 404 — Route bulunamadı
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        error: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`,
    });
}
