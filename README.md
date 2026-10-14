# Student_Attendance

Node.js + Express.js (TypeScript) backend with a MongoDB store (falls back to in-memory if MongoDB is unavailable).

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/api/attendance` | Mark attendance `{ studentName, status, date? }` |
| GET | `/api/attendance` | List records; filters: `studentName`, `status`, `from`, `to` |
| GET | `/api/attendance/summary` | Counts of Present / Absent / Late |
| PUT | `/api/attendance/:id` | Update a record |
| DELETE | `/api/attendance/:id` | Delete a record |

`status` must be `Present`, `Absent` or `Late`.

## Structure

- `backend/server.ts` – entry point (MongoDB connection, listen)
- `backend/app.ts` – Express app, routes, validation, error handling
- `backend/store.ts` – storage (MongoDB / in-memory)
- `backend/server.test.ts` – API tests

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

## Test

```bash
npm test
```

## Docker

```bash
docker build -t attendance:latest .
docker stop attendance-con || true
docker rm attendance-con || true
docker run -d --name attendance-con -p 3100:3000 attendance:latest
```

To stop and remove the container:

```bash
docker stop attendance-con
docker rm attendance-con
```