# Visual AI Workflow System

A visual AI workflow editor where each node represents a **binary (YES/NO) AI decision step**. Build a branching graph on a React Flow canvas, hit **Run**, and the execution engine walks the graph through [Inngest](https://www.inngest.com/), asking an LLM at each node and following the matching YES/NO edge.

---

## ✨ Features

### Visual Editor
- **Drag-and-drop canvas** powered by React Flow
- **Custom prompt nodes** with editable label + AI prompt
- **YES / NO branching edges** with distinct colors and labeled handles
- **Start node** selection
- **Live inspector panel** for editing the selected node
- **Persistent graph** via `localStorage` (survives reloads)

### Execution Engine
- **Inngest-powered traversal** — each node is a distinct `step.run(...)` for durability
- **LLM decisions** via Groq (`openai/gpt-oss-20b`)
- **Strict YES/NO system prompt** — anything else is treated as an error
- **Dynamic branching** — follows the YES or NO edge from each node
- **Cycle protection** (`MAX_STEPS = 50`)
- **End-to-end execution trace** returned to the client

### Error Handling
- Typed errors: `missing-api-key`, `llm-failed`, `invalid-decision`, `node-not-found`, `max-steps-exceeded`, `unknown`
- Failed nodes get a **red border + clickable "!" badge**
- **Execution log panel** shows the kind and message of every failure
- **Retry from here** — restart execution at any failed node without re-running the whole workflow

### Data Portability
- **Export workflow** → versioned `.json` file
- **Import workflow** → Zod-validated, accepts envelope or bare graph
- **Readable import errors** inline in the toolbar

### Visual Polish
- **Animated edges** along the traversed path (sliding dashed line + glow)
- **Amber glow** on active nodes
- **Dimmed non-traversed edges** during and after a run

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Runtime | [Bun](https://bun.sh) 1.4+ |
| Frontend | React 18/19 + Vite + TypeScript |
| Flow UI | [`reactflow`](https://reactflow.dev) v11 |
| State | [Zustand](https://github.com/pmndrs/zustand) + `persist` middleware |
| Validation | [Zod](https://zod.dev) (client + server) |
| Styling | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) |
| Backend | Node/Express (via `bun --watch`) |
| Workflow Engine | [Inngest](https://www.inngest.com/) SDK v4 |
| LLM | [Groq SDK](https://github.com/groq/groq-typescript) · model `openai/gpt-oss-20b` |
| Dev Server | `inngest/inngest` Docker image |
| Client persistence | `localStorage` |
| Server persistence | In-memory `Map` (no DB) |

---

## 📁 Project Structure

```
React Flow + Inngest/
├── package.json                 # Bun workspace + concurrent dev script
├── README.md
├── .gitignore
│
├── client/                      # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── .env                     # VITE_SERVER_URL
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css            # Tailwind + flow-dash keyframe
│       ├── vite-env.d.ts
│       ├── lib/
│       │   ├── api.ts           # startRun / pollRun / types
│       │   ├── utils.ts         # cn() helper
│       │   └── workflowFile.ts  # export / import / validate
│       ├── schemas/
│       │   └── workflow.ts      # Zod schemas + types
│       ├── store/
│       │   └── workflow.ts      # Zustand store (nodes, edges, run state)
│       ├── components/
│       │   ├── ui/              # shadcn components
│       │   └── flow/
│       │       ├── FlowCanvas.tsx
│       │       ├── PromptNode.tsx
│       │       ├── BranchEdge.tsx
│       │       ├── Inspector.tsx
│       │       ├── Toolbar.tsx
│       │       └── ExecutionLog.tsx
│       └── pages/
│           └── Editor.tsx
│
└── server/                      # Backend (Express + Inngest)
    ├── package.json
    ├── tsconfig.json
    ├── .env                     # GROQ_API_KEY, GROQ_MODEL, etc.
    └── src/
        ├── index.ts             # Express app + Inngest handler
        ├── lib/
        │   ├── groq.ts          # Groq wrapper + typed errors
        │   └── runs.ts          # In-memory run records
        ├── routes/
        │   ├── health.ts        # GET /api/health
        │   └── run.ts           # POST /api/run, GET /api/run/:runId
        ├── schemas/
        │   └── workflow.ts      # Mirrors client Zod schemas
        └── inngest/
            ├── client.ts        # Inngest client instance
            └── functions/
                ├── index.ts     # Function registry
                └── runWorkflow.ts
```

---

## 🏗️ Architecture

### High-level

```
┌──────────────────────┐        ┌──────────────────────┐
│      CLIENT          │        │       SERVER         │
│  React + React Flow  │  HTTP  │   Express + Bun      │
│  Zustand + Zod       │◄──────►│   /api/run           │
│  Tailwind + shadcn   │        │   /api/inngest       │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           │                               │  inngest.send("workflow/run", …)
           │                               ▼
           │                    ┌──────────────────────┐
           │  poll /api/run/:id │   INNGEST DEV        │
           └────────────────────►  (Docker container)  │
                                │   port 8288 / 8289   │
                                └──────────┬───────────┘
                                           │
                                           │  invokes via HTTP
                                           │  POST /api/inngest
                                           ▼
                                ┌──────────────────────┐
                                │   run-workflow fn    │
                                │   (runs in server)   │
                                └──────────┬───────────┘
                                           │
                                           │  step.run("llm-<node>")
                                           ▼
                                ┌──────────────────────┐
                                │     GROQ API         │
                                │  openai/gpt-oss-20b  │
                                │  returns YES or NO   │
                                └──────────────────────┘
```

### Execution flow (per run)

```
1.  User clicks "Run" in the editor
2.  Client POSTs { graph, startNodeId } to POST /api/run
3.  Server validates with Zod, generates runId, stores { status: "queued" }
4.  Server calls inngest.send("workflow/run", { graph, startNodeId, runId })
5.  Inngest Dev Server receives the event and looks up the registered function
6.  Inngest invokes the function via HTTP back to POST /api/inngest
7.  runWorkflow handler:
      • builds nodesById + outgoingBySource maps
      • loops up to MAX_STEPS:
          – calls step.run(`llm-<nodeId>`) → Groq
          – parses YES / NO (anything else throws typed error)
          – finds the matching edge (branch === decision)
          – records a TraceEntry
          – advances to the next node
      • on error: records NodeError, throws NonRetriableError, marks run failed
8.  updateRun(runId, { status, trace, errors }) — writes to in-memory Map
9.  Client polls GET /api/run/:runId every ~700ms
10. Client receives the final record and:
      • highlights traversed nodes (amber glow)
      • animates traversed edges
      • shows the trace in the ExecutionLog panel
      • attaches NodeErrors to failed nodes
11. User can click "!" / "Retry from here" to re-run starting at any failed node
```

---

## 🚀 Setup & Running

This project uses **Bun** for both client and server, and **Docker** for the Inngest Dev Server. It runs cleanly inside **WSL2 (Ubuntu)** on Windows.

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Bun | 1.4+ | Install: `curl -fsSL https://bun.sh/install \| bash` (requires `unzip`) |
| Node.js | 18+ | Only needed if you use `npx` for the Inngest CLI outside Docker |
| Docker Desktop | Any recent | With **WSL2 integration enabled** |
| Groq API key | — | Free tier: https://console.groq.com/keys |

### One-time install

**Install prerequisites inside WSL:**

```bash
sudo apt update && sudo apt install -y unzip
curl -fsSL https://bun.sh/install | bash
exec $SHELL
bun --version   # should print 1.4.x or later
```

**Pull the Inngest Dev Server image:**

```bash
docker pull inngest/inngest:latest
```

> The image is cached — future projects reuse it without re-downloading.

**Clone and install dependencies:**

```bash
cd "/mnt/e/.../React Flow + Inngest"
bun install
```

### Environment variables

**`server/.env`** (create it):

```env
PORT=3001
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=openai/gpt-oss-20b
INNGEST_DEV=1
CLIENT_URL=http://localhost:5173
```

> ⚠️ `INNGEST_DEV=1` is correct **when running the server from WSL and Inngest in Docker with port mapping**. The SDK talks to the Dev Server at `http://localhost:8288` from WSL — that resolves because Docker Desktop maps the container's port to the WSL host.

**`client/.env`** (create it):

```env
VITE_SERVER_URL=http://localhost:3001
```

### Run — recommended workflow

You need **three terminals**, all inside **WSL Ubuntu**.

**Terminal 1 — Express server:**

```bash
cd "/mnt/e/.../React Flow + Inngest"
bun run dev:server
```

Expected: `[server] listening on http://localhost:3001` and `injected env (N) from .env` where N ≥ 5.

**Terminal 2 — Inngest Dev Server (Docker):**

```bash
docker run --rm -p 8288:8288 -p 8289:8289 \
  inngest/inngest \
  inngest dev -u http://host.docker.internal:3001/api/inngest
```

Expected: `apps synced, disabling auto-discovery`.

Open http://localhost:8288 — you should see **Apps → ai-workflow** with **1 function** (`run-workflow`) and a green "Synced" badge.

**Terminal 3 — Vite client:**

```bash
cd "/mnt/e/.../React Flow + Inngest"
bun run dev:client
```

Expected: `VITE vX.X ready` and `Local: http://localhost:5173`.

Open http://localhost:5173 — the editor loads.

### Optional: run all three with one command

If you keep the Inngest container running in a separate terminal, you can run client + server together with:

```bash
bun run dev:app   # add this script if it doesn't exist
```

---

## 🧪 Testing the App

### 1. Build a simple branching workflow

1. Click **+ Add Node** three times to create `n1`, `n2`, `n3`.
2. Edit each in the right-hand inspector:
   - `n1` — label: `Start Node`, prompt: `Is this a support request?`
   - `n2` — label: `Sales Node`, prompt: `Are you interested in a demo?`
   - `n3` — label: `Support Node`, prompt: `Do you need a password reset?`
3. On `n1`, drag from the **green (YES) handle** on the right → drop onto `n2`.
4. On `n1`, drag from the **red (NO) handle** on the left → drop onto `n3`.
5. Click `n1` → **Set as start**.

> **Important:** always drag **from the colored handle** on the source node. Dragging from the node body, or from the target back to the source, will create a backwards edge and the workflow won't traverse.

### 2. Run it

Click **▶ Run**.

- The button becomes **Running…**.
- Traversed nodes glow **amber**.
- The matching edge animates with a dashed flow + glow.
- Non-traversed edges dim.
- The **Execution** panel at the bottom shows the trace:
  ```
  1. n1 "Is this a support request?" YES → n2
  2. n2 "Are you interested in a demo?" (terminal)
  ```

### 3. Test failure & retry

- Set `GROQ_API_KEY` to an invalid value in `server/.env`, restart the server, run.
- The failing node gets a **red border** and a clickable **"!"** badge.
- The log shows the error kind (`llm-failed`) and message.
- Restore the correct key, then click the **"!"** badge or **Retry from here** → execution resumes from that node only.

### 4. Test export / import

- Click **Export** → a `workflow-YYYY-MM-DD.json` downloads.
- Click **Clear** → then **Import** → select the file.
- The graph is restored with the same node IDs, prompts, positions, and start node.
- Try importing an invalid JSON file → the toolbar shows a readable error.

---

## 🧠 Data Model (Zod)

Both client and server share the same shapes:

```ts
WorkflowNode = {
  id: string,
  type: "prompt",
  position: { x: number, y: number },
  data: { label: string, prompt: string }
}

WorkflowEdge = {
  id: string,
  source: string,
  target: string,
  type: "branch",
  sourceHandle: "YES" | "NO",
  data: { branch: "YES" | "NO" }
}

Workflow = {
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  startNodeId: string | null
}
```

An **export file** wraps this:

```json
{
  "kind": "ai-workflow",
  "version": 1,
  "exportedAt": "2026-09-26T10:00:00.000Z",
  "workflow": { "nodes": [...], "edges": [...], "startNodeId": "n1" }
}
```

The importer accepts **either** the envelope **or** a bare workflow object.

---

## 🩺 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `bun: command not found` in WSL | Bun not installed / PATH not reloaded | `curl -fsSL https://bun.sh/install \| bash && exec $SHELL` |
| `unzip is required to install bun` | Missing package | `sudo apt install -y unzip` |
| Inngest dashboard shows **Not Synced** | Container can't reach the server | Ensure `app.listen(port, "0.0.0.0", …)`; ensure Express started before Docker; try `--add-host=host.docker.internal:host-gateway` on `docker run` |
| `getaddrinfo ENOTFOUND host.docker.internal` | `INNGEST_DEV` points to the wrong host | In `server/.env`, use `INNGEST_DEV=1` (not a URL) — the SDK falls back to `localhost:8288`, which works from WSL |
| `injected env (0) from .env` | `.env` missing or wrong location | Create `server/.env` next to `server/package.json` |
| Trace shows `(terminal)` on the first node | Edges are backwards | Delete and re-drag from the **colored source handle** on the start node |
| `run timed out` on the client | Function never completed | Check the Inngest dashboard Runs tab for the error; verify `GROQ_API_KEY` is valid |
| `Cannot read properties of undefined (reading 'length')` in `ExecutionLog` | Old localStorage without new store fields | Bump `persist` version + `migrate`, or clear `workflow-store-v1` in DevTools |
| `Export named 'GroqDecideError' not found` | Bun watch didn't reload | Full restart: `Ctrl+C` → `bun run dev:server` |

---

## 🧭 Design Notes

- **No database.** The server keeps runs in an in-memory `Map`, and the client persists graphs in `localStorage`. This keeps the project self-contained; swap either side for a real store later.
- **Same Zod schemas on both sides.** They're currently duplicated in `client/src/schemas/workflow.ts` and `server/src/schemas/workflow.ts`. Extract to a `packages/shared` workspace if you want single-source-of-truth.
- **Inngest does the orchestration.** Each node is a `step.run`, so failed LLM calls retry individually and the whole run is inspectable in the Inngest dashboard.
- **Errors are structured.** The client renders typed errors, not raw strings, which makes retry and future features (e.g. auto-retry with backoff) trivial.
- **Retry reuses the same endpoint.** Starting a workflow at node X and retrying a failed node X are the same server call — the only difference is which `startNodeId` the client passes.

---

## 🗺️ Possible Next Steps

- **Named workflow saves** — client-side library of graphs
- **Execution history panel** — list past runs and re-open their traces
- **Conditional prompts with template variables** — inject upstream answers into downstream prompts
- **Parallel branches** — allow a node to fan out
- **Auth + multi-user storage** — swap `localStorage` + `Map` for Postgres
- **Auto-retry with exponential backoff** — leverage Inngest's built-in retry policy per step
- **Streaming trace** — replace polling with Inngest Realtime / SSE


---

## 🙏 Credits

Built on top of [React Flow](https://reactflow.dev), [Inngest](https://www.inngest.com/), [Groq](https://groq.com/), [Zustand](https://github.com/pmndrs/zustand), [Zod](https://zod.dev), and [shadcn/ui](https://ui.shadcn.com).