import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { AttendanceInput, AttendanceStatus, AttendanceStore, ListFilter, MemoryStore, STATUSES } from './store';

type Validated<T> = { value: T } | { error: string };

const parseDate = (raw: unknown): Date | null => {
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
};

function validateBody(body: Record<string, unknown>, partial: boolean): Validated<Partial<AttendanceInput>> {
  const out: Partial<AttendanceInput> = {};

  if (body.studentName !== undefined || !partial) {
    if (typeof body.studentName !== 'string' || !body.studentName.trim()) {
      return { error: 'studentName is required and must be a non-empty string' };
    }
    out.studentName = body.studentName.trim();
  }
  if (body.status !== undefined || !partial) {
    if (!STATUSES.includes(body.status as AttendanceStatus)) {
      return { error: `status must be one of: ${STATUSES.join(', ')}` };
    }
    out.status = body.status as AttendanceStatus;
  }
  if (body.date !== undefined && body.date !== null && body.date !== '') {
    const date = parseDate(body.date);
    if (!date) return { error: 'date must be a valid date' };
    out.date = date;
  }
  return { value: out };
}

export function createApp(store: AttendanceStore = new MemoryStore()) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../src')));

  app.get('/favicon.ico', (_req, res) => res.status(204).end());
  app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.status(204).end());
  app.get('/health', (_req, res) => res.status(200).send('OK'));

  // Create
  app.post('/api/attendance', async (req, res, next) => {
    const parsed = validateBody(req.body ?? {}, false);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const record = await store.create(parsed.value as AttendanceInput);
      res.status(201).json({ message: 'Attendance marked successfully', record });
    } catch (err) { next(err); }
  });

  // List, optional filters: ?studentName=&status=&from=&to=
  app.get('/api/attendance', async (req, res, next) => {
    const filter: ListFilter = {};
    const { studentName, status, from, to } = req.query;
    if (typeof studentName === 'string' && studentName) filter.studentName = studentName;
    if (typeof status === 'string' && status) {
      if (!STATUSES.includes(status as AttendanceStatus)) {
        return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
      }
      filter.status = status as AttendanceStatus;
    }
    for (const [key, raw] of [['from', from], ['to', to]] as const) {
      if (typeof raw === 'string' && raw) {
        const d = parseDate(raw);
        if (!d) return res.status(400).json({ error: `${key} must be a valid date` });
        filter[key] = d;
      }
    }
    try {
      res.json(await store.list(filter));
    } catch (err) { next(err); }
  });

  // Summary counts per status
  app.get('/api/attendance/summary', async (_req, res, next) => {
    try {
      const summary: Record<string, number> = { Present: 0, Absent: 0, Late: 0, total: 0 };
      for (const r of await store.list()) {
        summary[r.status]++;
        summary.total++;
      }
      res.json(summary);
    } catch (err) { next(err); }
  });

  // Update
  app.put('/api/attendance/:id', async (req, res, next) => {
    const parsed = validateBody(req.body ?? {}, true);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const record = await store.update(req.params.id, parsed.value);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json({ message: 'Attendance updated successfully', record });
    } catch (err) { next(err); }
  });

  // Delete
  app.delete('/api/attendance/:id', async (req, res, next) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) return res.status(404).json({ error: 'Record not found' });
      res.json({ message: 'Attendance deleted successfully' });
    } catch (err) { next(err); }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  });

  return app;
}
