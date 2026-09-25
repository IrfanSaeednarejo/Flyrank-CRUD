// app.ts
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { eq } from 'drizzle-orm';

import { ApiError } from './Utils/apiError.js';
import { ApiResponse } from './Utils/apiResponse.js';
import { asyncHandler } from './Utils/asyncHandler.js';
import { db } from './src/db/index.ts';
import {
    task,
    type selectTask,
    type insertNewTask,
    type updateTask,
} from './src/db/schema/tasks.ts';
import openapiSpec from './openapi.json' with { type: 'json' };
import { auth } from './src/db/auth/auth.ts';
import {
    userProfiles,
    type insertUserProfile,
    type selectUserProfile,
    type updateUserProfile,
} from './src/db/schema/userProfile.ts';

// ─────────────────────────────────────────────
// App + Config
// ─────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

app.set('trust proxy', 1); // correct client IPs behind reverse proxies

// ─────────────────────────────────────────────
// Global middleware
// ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

// Rate limit only in prod (dev would annoy you)
if (isProd) {
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 300,
            standardHeaders: true,
            legacyHeaders: false,
        }),
    );
}

// ─────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────

// GET /tasks — list all (empty array is a valid response)
const getData = asyncHandler(async (_req: Request, res: Response) => {
    const tasks: selectTask[] = await db.select().from(task);
    return res
        .status(200)
        .json(new ApiResponse(200, tasks, 'Success'));
});

// GET /tasks/:id
const getDataById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError(400, 'Invalid task id');
    }

    const [found] = await db.select().from(task).where(eq(task.id, id));
    if (!found) {
        throw new ApiError(404, `Task ${id} not found`);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, found, 'Success'));
});

// POST /tasks
const setData = asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body as { title?: unknown };

    if (typeof title !== 'string' || title.trim().length === 0) {
        throw new ApiError(400, 'Title is required and must be a non-empty string');
    }
    if (title.length > 255) {
        throw new ApiError(400, 'Title must be 255 characters or fewer');
    }

    const payload: insertNewTask = { title: title.trim() };

    const [created] = await db
        .insert(task)
        .values(payload)
        .returning();

    if (!created) {
        throw new ApiError(500, 'Failed to create task');
    }

    return res
        .status(201)
        .json(new ApiResponse(201, created, 'Task created successfully'));
});

// PUT /tasks/:id
const updateData = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError(400, 'Invalid task id');
    }

    const body = req.body as { title?: unknown; done?: unknown };
    const updates: updateTask = {};

    if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim().length === 0) {
            throw new ApiError(400, 'Title must be a non-empty string');
        }
        if (body.title.length > 255) {
            throw new ApiError(400, 'Title must be 255 characters or fewer');
        }
        updates.title = body.title.trim();
    }

    if (body.done !== undefined) {
        if (typeof body.done !== 'boolean') {
            throw new ApiError(400, 'done must be a boolean');
        }
        updates.done = body.done;
    }

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, 'Nothing to update');
    }

    const [updated] = await db
        .update(task)
        .set(updates)
        .where(eq(task.id, id))
        .returning();

    if (!updated) {
        throw new ApiError(404, `Task ${id} not found`);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updated, 'Task updated successfully'));
});

// DELETE /tasks/:id
const deleteData = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError(400, 'Invalid task id');
    }

    const [deleted] = await db
        .delete(task)
        .where(eq(task.id, id))
        .returning();

    if (!deleted) {
        throw new ApiError(404, `Task ${id} not found`);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, deleted, 'Task deleted successfully'));
});

// GET /stats
const getStats = asyncHandler(async (_req: Request, res: Response) => {
    const all = await db.select().from(task);
    const total = all.length;
    const done = all.filter((t) => t.done).length;
    const open = total - done;
    return res
        .status(200)
        .json(new ApiResponse(200, { total, done, open }, 'Success'));
});




app.get('/', (_req, res) => {
    res.status(200).json(
        new ApiResponse(
            200,
            { name: 'Task API', version: '1.0', endpoints: ['/tasks', '/stats'] },
            'Welcome to the Task API',
        ),
    );
});

app.get('/health', (_req, res) => {
    res.status(200).json(new ApiResponse(200, { status: 'ok' }, 'Server is healthy'));
});


// AUTH ROUTES CONTROLLERS

const signUp = asyncHandler(async (req: Request, res: Response) => {

    const { fullName, email, password, department, bio, project } = req.body as {
        fullName?: string,
        email?: string,
        password?: string,
        department?: string,
        bio?: string,
        project?: string,
    }

    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
        throw new ApiError(400, 'Full name is required and must be a non-empty string');
    }
    if (typeof email !== 'string' || email.trim().length === 0) {
        throw new ApiError(400, 'Email is required and must be a non-empty string');
    }
    if (typeof password !== 'string' || password.trim().length === 0) {
        throw new ApiError(400, 'Password is required and must be a non-empty string');
    }
    if (typeof department !== 'string' || department.trim().length === 0) {
        throw new ApiError(400, 'Department is required and must be a non-empty string');
    }

    const { data, error } = await auth.signUp.email({
        email: email.trim(),
        password,
        name: fullName.trim(),
        callbackURL: "http://localhost:3000"
    });

    if (error) {
        throw new ApiError(500, error.message);
    }

    if (!data.user) {
        throw new ApiError(500, 'User not created');
    }



    const userProfilePayload: insertUserProfile = {
        userId: data.user?.id,
        fullName: fullName.trim(),
        department: department.trim(),
        bio: bio?.trim(),
        project: project?.trim(),
    };

    const [createdProfile] = await db
        .insert(userProfiles)
        .values(userProfilePayload)
        .returning();

    if (!createdProfile) {
        throw new ApiError(500, 'User profile not created');
    }

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            { user: data.user, profile: createdProfile },
            'User profile created successfully'
        ));
});

// GET /public/info
const publicInfo = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({ message: "Welcome stranger! This info is public." });
});

// GET /protected/profile
const protectedProfile = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access token required" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }

    // Returning 200 on success
    return res.status(200).json(new ApiResponse(200, { token }, 'Profile access granted'));
});

// POST /auth/login — sign in
const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as {
        email?: string;
        password?: string;
    };

    if (typeof email !== 'string' || !email.trim()) {
        throw new ApiError(400, 'Email is required');
    }
    if (typeof password !== 'string' || !password) {
        throw new ApiError(400, 'Password is required');
    }

    const { data, error } = await auth.signIn.email({
        email: email.trim(),
        password,
    });

    if (error) {
        // Map Better Auth error codes to proper HTTP statuses
        const statusMap: Record<string, number> = {
            INVALID_EMAIL_OR_PASSWORD: 401,
            USER_NOT_FOUND: 404,
            TOO_MANY_REQUESTS: 429,
        };
        const status = statusMap[error.code] ?? 401;
        throw new ApiError(status, error.message);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { session: data }, 'Login successful'));
});


app.get('/tasks', getData);
app.get('/tasks/:id', getDataById);
app.get('/stats', getStats);
app.post('/tasks', setData);
app.put('/tasks/:id', updateData);
app.delete('/tasks/:id', deleteData);

// auth Routes
app.post('/auth/signup', signUp);
app.post('/auth/login', login);

// custom endpoints
app.get('/public/info', publicInfo);
app.get('/protected/profile', protectedProfile);
// app.post('/auth/logout', logout);
// app.get('/auth/session', getSession);

if (!isProd) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
}


// Unknown route
app.use((req: Request, res: Response) => {
    res.status(404).json(new ApiResponse(404, null, `Route ${req.originalUrl} not found`));
});

// Global error handler — Express detects this by the 4-arg signature
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof ApiError ? err.statusCode : 500;
    const message =
        err instanceof ApiError
            ? err.message
            : isProd
                ? 'Internal Server Error'
                : (err as Error)?.message ?? 'Unknown error';

    if (!(err instanceof ApiError)) {
        console.error('[UnhandledError]', err);
    }

    res.status(status).json(new ApiResponse(status, null, message));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${NODE_ENV}]`);
});