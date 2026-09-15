# Student_Attendance

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