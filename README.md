# SniperThink Backend

## Overview

This repository contains the backend for the SniperThink distributed file processing system. The backend accepts PDF and text uploads, stores metadata in PostgreSQL, queues processing jobs in BullMQ, and uses background workers to extract word counts, paragraph counts, and top keywords.

The system is designed for fast upload response: users receive a `jobId` immediately, and processing continues asynchronously in a separate worker service.

## Architecture

- `server.ts` - Express API server
- `controllers/` - request handlers for upload, job status, job result, and interest submissions
- `routes/` - route definitions for API endpoints
- `services/queueService.ts` - BullMQ queue producer for file processing jobs
- `workers/fileWorker.ts` - standalone worker that processes queued jobs
- `config/db.ts` - Prisma client singleton for PostgreSQL
- `config/redis.ts` - Redis connection for BullMQ
- `prisma/schema.prisma` - database schema for PostgreSQL
- `uploads/` - local disk storage for uploaded files
- `types/index.ts` - shared TypeScript interfaces and enums
- `docker-compose.yml` - Docker compose configuration for PostgreSQL, Redis, server, and worker
- `Dockerfile` - container build definition for the backend
- `docker-entrypoint.sh` - container startup script that waits for Postgres and applies Prisma migrations

## What this backend does

1. Accepts file uploads (`PDF` or `TXT`, max 10MB).
2. Saves files to `uploads/` and metadata to PostgreSQL.
3. Creates a job record as `PENDING`.
4. Pushes a BullMQ job into the `file-processing` queue.
5. Background worker picks up the job, reads the file, extracts text, and computes:
   - total word count
   - paragraph count
   - top keywords
6. Stores results in the database and updates job status to `COMPLETED`.
7. Exposes endpoints to check status and retrieve results.

## Prerequisites

- Node.js 18+
- npm
- Docker Engine + Docker Compose
- Local PostgreSQL and Redis are optional if you use Docker

## Local Development Setup

These commands assume you are inside the `backend` folder.

```bash
cd e:/assignments/SniperThink/backend
npm install
cp .env.example .env
# If using local Postgres + Redis, update .env values accordingly
npm run prisma:generate
npm run prisma:migrate
npm run build
npm run dev
```

### Running the worker locally

```bash
npm run dev:worker
```

## Docker Setup

The repo is already dockerized with a service-based setup for all required components.

### Start the full stack

```bash
docker-compose up --build -d
```

### Stop the stack

```bash
docker-compose down
```

### What Docker starts

- `postgres` on port `5432`
- `redis` on port `6379`
- `server` on port `5000`
- `worker` processing jobs in the background

### Notes

- The backend container uses `DATABASE_URL` and `REDIS_URL` pointed at Docker service names.
- `docker-entrypoint.sh` waits for Postgres and applies migrations before starting the server.
- Uploaded files are mounted from the host `./uploads` into the container.

## Environment Variables

Use `.env.example` as a template.

```env
DATABASE_URL=postgresql://user:password@postgres:5432/sniperthink
REDIS_URL=redis://redis:6379
PORT=5000
MAX_FILE_SIZE_MB=10
```

## API Endpoints

### `POST /api/upload`

Uploads a file and starts background processing.

- Content type: `multipart/form-data`
- Fields:
  - `name` - user name
  - `email` - user email
  - `file` - PDF or TXT file

Example:

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "name=Alice" \
  -F "email=alice@example.com" \
  -F "file=@./sample.pdf"
```

Response:

```json
{
  "message": "File uploaded successfully",
  "jobId": 1
}
```

### `GET /api/jobs/:jobId/status`

Check the current status of a job.

Example:

```bash
curl http://localhost:5000/api/jobs/1/status
```

Response:

```json
{
  "jobId": "1",
  "status": "PROCESSING",
  "progress": 40
}
```

### `GET /api/jobs/:jobId/result`

Retrieve the final processing result once complete.

Example:

```bash
curl http://localhost:5000/api/jobs/1/result
```

Response when complete:

```json
{
  "jobId": "1",
  "wordCount": 1200,
  "paragraphCount": 15,
  "topKeywords": ["system", "data", "process"]
}
```

If the job is not complete yet, the endpoint returns a message explaining the status.

### `POST /api/interest`

Submit an interest form payload.

Request body JSON:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "selectedStep": "Step 1"
}
```

Example:

```bash
curl -X POST http://localhost:5000/api/interest \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","selectedStep":"Step 1"}'
```

Response:

```json
{ "message": "Interest registered successfully" }
```

## Database Schema Summary

The database schema contains:

- `User` - stores users and their email
- `File` - stores uploaded file metadata and relation to user
- `Job` - tracks processing state, progress, and any retries
- `Result` - stores final analytics for completed jobs

## How retries work

The queue uses BullMQ job options with retries. If a worker fails while processing a file, BullMQ will retry the job up to 3 times with exponential backoff.

## How the worker works

The worker reads the uploaded file from disk, extracts text using `pdf-parse` for PDFs or direct file read for TXT, then computes:

- word count
- paragraph count
- top keywords (filtered by stopwords)

It updates the job status as it progresses and saves the final result in the database.

## Helpful commands

Local:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
npm run dev
npm run dev:worker
```

Docker:

```bash
docker-compose up --build -d
docker-compose logs -f server
docker-compose logs -f worker
docker-compose down
```

## What to inspect first

- `server.ts` - entry point and API mounting
- `routes/` - endpoint definitions
- `controllers/` - request handling logic
- `services/queueService.ts` - queue producer
- `workers/fileWorker.ts` - background processor
- `prisma/schema.prisma` - data model
- `config/db.ts` / `config/redis.ts` - infrastructure config

---

This README is designed for someone joining the project with zero context. It covers how the system works, how to run it locally, and how to run the full Docker stack.