// Utils/authMiddleware.ts
import { auth } from "../src/db/auth/auth.js";
import { ApiError } from "./apiError.js";
import { asyncHandler } from "./asyncHandler.js";
import { type Request, type Response, type NextFunction } from 'express';

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data, error } = await auth.getSession({
                fetchOptions: {
                    headers: {
                        ...req.headers,
                        Authorization: `Bearer ${token}`,
                    } as unknown as Record<string, string>

                }
            });

            if (error || !data?.user) {
                throw new ApiError(401, 'Invalid or expired session');
            }

            (req as any).user = data.user;
            (req as any).session = data.session;
            return next();
        }
        const { data, error } = await auth.getSession({
            fetchOptions: {
                headers: req.headers as Record<string, string>
            }
        });

        if (error || !data?.user) {
            console.warn('[requireAuth] No valid session found. Headers present:', !!req.headers.cookie);
            throw new ApiError(401, 'Not authenticated');
        }

        (req as any).user = data.user;
        (req as any).session = data.session;
        next();

    } catch (err) {
        console.error('[requireAuth] Error:', err);
        next(err instanceof ApiError ? err : new ApiError(401, 'Invalid or expired session'));
    }
});