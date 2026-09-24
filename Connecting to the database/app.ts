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

app.get('/tasks', getData);
app.get('/tasks/:id', getDataById);
app.get('/stats', getStats);
// app.post('/tasks', setData);
// app.put('/tasks/:id', updateData);
// app.delete('/tasks/:id', deleteData);



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