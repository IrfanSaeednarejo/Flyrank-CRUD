export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly success: false = false;
    public readonly data: null = null;
    public readonly errors: unknown[];

    constructor(
        statusCode: number,
        message: string = 'Something went wrong',
        errors: unknown[] = [],
        stack?: string,
    ) {
        super(message);

        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace?.(this, this.constructor);
        }
    }
}