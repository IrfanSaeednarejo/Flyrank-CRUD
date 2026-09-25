# Visual AI Workflow System

Visual AI workflow where each node is a YES/NO AI decision step.
Execution runs through Inngest; the frontend visualizes with React Flow.

## Stack
- Bun · React (Vite) · React Flow · Zustand · Zod · shadcn
- Node + Express · Inngest · Groq SDK (openai/gpt-oss-20b)

## Dev
1. `bun install`
2. Set env vars in `client/.env` and `server/.env`
3. `bun dev` — starts client (5173), server (3001), Inngest dev (8288)

### Ports
- Client: http://localhost:5173
- Server: http://localhost:3001
- Inngest dev UI: http://localhost:8288
