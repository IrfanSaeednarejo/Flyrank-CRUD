// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../Utils/apiError.js';

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction, // must have 4 params for Express to detect it
) => {
    const isProd = process.env.NODE_ENV === 'production';

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors,
        });
    }

    // Unknown / unexpected error
    console.error('[UnhandledError]', err);

    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: isProd ? 'Internal Server Error' : (err as Error)?.message ?? 'Unknown error',
        errors: [],
    });
};
