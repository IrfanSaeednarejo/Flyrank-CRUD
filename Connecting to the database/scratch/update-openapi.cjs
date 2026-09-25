const fs = require('fs');

const data = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));

// Add security schemes
if (!data.components.securitySchemes) data.components.securitySchemes = {};
data.components.securitySchemes.bearerAuth = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Session Token'
};
data.components.securitySchemes.sessionCookie = {
    type: 'apiKey',
    in: 'cookie',
    name: '__Secure-neonauth.session_token'
};

// Add Schemas
data.components.schemas.ApiResponse = {
    type: 'object',
    properties: {
        statusCode: { type: 'integer' },
        data: { type: 'object' },
        message: { type: 'string' },
        success: { type: 'boolean' }
    }
};

data.components.schemas.User = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        emailVerified: { type: 'boolean' },
        image: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
    }
};

data.components.schemas.UserProfile = {
    type: 'object',
    properties: {
        userId: { type: 'string' },
        fullName: { type: 'string' },
        department: { type: 'string' },
        bio: { type: 'string' },
        project: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
    }
};

data.components.schemas.Session = {
    type: 'object',
    properties: {
        token: { type: 'string' },
        url: { type: 'string' },
        redirect: { type: 'string' },
        user: { $ref: '#/components/schemas/User' }
    }
};

// Add Paths
data.paths['/auth/signup'] = {
    post: {
        tags: ['Auth'],
        summary: 'Sign up a new user',
        description: 'Creates a new user and user profile.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['fullName', 'email', 'password', 'department'],
                        properties: {
                            fullName: { type: 'string', example: 'John Doe' },
                            email: { type: 'string', example: 'john@example.com' },
                            password: { type: 'string', example: 'strongpass123' },
                            department: { type: 'string', example: 'Engineering' },
                            bio: { type: 'string', example: 'Developer' },
                            project: { type: 'string', example: 'Project X' }
                        }
                    }
                }
            }
        },
        responses: {
            '201': {
                description: 'User profile created successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 201 },
                                data: {
                                    type: 'object',
                                    properties: {
                                        user: { $ref: '#/components/schemas/User' },
                                        profile: { $ref: '#/components/schemas/UserProfile' }
                                    }
                                },
                                message: { type: 'string', example: 'User profile created successfully' }
                            }
                        }
                    }
                }
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '409': { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
    }
};

data.paths['/auth/login'] = {
    post: {
        tags: ['Auth'],
        summary: 'Log in',
        description: 'Authenticates a user and returns a session.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['email', 'password'],
                        properties: {
                            email: { type: 'string', example: 'john@example.com' },
                            password: { type: 'string', example: 'strongpass123' }
                        }
                    }
                }
            }
        },
        responses: {
            '200': {
                description: 'Login successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 200 },
                                data: {
                                    type: 'object',
                                    properties: {
                                        session: { $ref: '#/components/schemas/Session' }
                                    }
                                },
                                message: { type: 'string', example: 'Login successful' }
                            }
                        }
                    }
                }
            },
            '400': { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '429': { description: 'Rate limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
    }
};

data.paths['/auth/logout'] = {
    post: {
        tags: ['Auth'],
        summary: 'Log out',
        description: 'Ends the current session.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
            '200': {
                description: 'Logged out successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 200 },
                                data: { type: 'null' },
                                message: { type: 'string', example: 'Logged out successfully' }
                            }
                        }
                    }
                }
            },
            '401': { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
    }
};

data.paths['/auth/session'] = {
    get: {
        tags: ['Auth'],
        summary: 'Get current session',
        description: 'Retrieves the current session data.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
            '200': {
                description: 'Session retrieved',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 200 },
                                data: {
                                    type: 'object',
                                    properties: {
                                        session: { $ref: '#/components/schemas/Session' }
                                    }
                                },
                                message: { type: 'string', example: 'Session retrieved' }
                            }
                        }
                    }
                }
            },
            '401': { description: 'No valid session', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
    }
};

data.paths['/public/info'] = {
    get: {
        tags: ['Public'],
        summary: 'Public info',
        description: 'A public endpoint requiring no authentication.',
        responses: {
            '200': {
                description: 'Public message',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 200 },
                                data: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Welcome stranger! This info is public.' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

data.paths['/protected/profile'] = {
    get: {
        tags: ['Protected'],
        summary: 'Get user profile',
        description: 'Retrieves the user and their profile.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
            '200': {
                description: 'Profile access granted',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'integer', example: 200 },
                                data: {
                                    type: 'object',
                                    properties: {
                                        user: { $ref: '#/components/schemas/User' },
                                        profile: { $ref: '#/components/schemas/UserProfile' }
                                    }
                                },
                                message: { type: 'string', example: 'Profile access granted' }
                            }
                        }
                    }
                }
            },
            '401': { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
    }
};

// Ensure existing tasks routes have tags
if (data.paths['/tasks'] && data.paths['/tasks'].get) data.paths['/tasks'].get.tags = ['Tasks'];
if (data.paths['/tasks'] && data.paths['/tasks'].post) data.paths['/tasks'].post.tags = ['Tasks'];
if (data.paths['/tasks/{id}'] && data.paths['/tasks/{id}'].get) data.paths['/tasks/{id}'].get.tags = ['Tasks'];
if (data.paths['/tasks/{id}'] && data.paths['/tasks/{id}'].put) data.paths['/tasks/{id}'].put.tags = ['Tasks'];
if (data.paths['/tasks/{id}'] && data.paths['/tasks/{id}'].delete) data.paths['/tasks/{id}'].delete.tags = ['Tasks'];

// Reorder Paths so they are somewhat logical (/, /health, /public/info, /tasks..., /auth..., /protected...)
const orderedPaths = {};
const order = ['/', '/health', '/public/info'];
order.forEach(k => { if(data.paths[k]) orderedPaths[k] = data.paths[k]; });

Object.keys(data.paths).filter(k => k.startsWith('/tasks')).forEach(k => orderedPaths[k] = data.paths[k]);
Object.keys(data.paths).filter(k => k.startsWith('/auth')).forEach(k => orderedPaths[k] = data.paths[k]);
Object.keys(data.paths).filter(k => k.startsWith('/protected')).forEach(k => orderedPaths[k] = data.paths[k]);

data.paths = orderedPaths;

fs.writeFileSync('openapi.json', JSON.stringify(data, null, 4));
console.log('Successfully updated openapi.json');
