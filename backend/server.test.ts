import request from 'supertest';
import { expect } from 'chai';
import { createApp } from './app';
import { MemoryStore } from './store';

const newApp = () => createApp(new MemoryStore());
const sample = { studentName: 'Alice', status: 'Present', date: '2026-08-29T10:00:00.000Z' };

describe('Attendance API', () => {
  it('returns health status OK', async () => {
    const res = await request(newApp()).get('/health');
    expect(res.status).to.equal(200);
    expect(res.text).to.equal('OK');
  });

  it('creates an attendance record', async () => {
    const res = await request(newApp()).post('/api/attendance').send(sample);
    expect(res.status).to.equal(201);
    expect(res.body.message).to.equal('Attendance marked successfully');
    expect(res.body.record.studentName).to.equal('Alice');
    expect(res.body.record.status).to.equal('Present');
  });

  it('rejects invalid status and missing name', async () => {
    const app = newApp();
    const bad = await request(app).post('/api/attendance').send({ studentName: 'Bob', status: 'Sleeping' });
    expect(bad.status).to.equal(400);
    const noName = await request(app).post('/api/attendance').send({ status: 'Present' });
    expect(noName.status).to.equal(400);
  });

  it('lists records newest first and filters them', async () => {
    const app = newApp();
    await request(app).post('/api/attendance').send({ ...sample, date: '2026-08-01T00:00:00.000Z' });
    await request(app).post('/api/attendance').send({ studentName: 'Bob', status: 'Late', date: '2026-08-29T00:00:00.000Z' });

    const all = await request(app).get('/api/attendance');
    expect(all.body).to.have.length(2);
    expect(all.body[0].studentName).to.equal('Bob');

    const late = await request(app).get('/api/attendance?status=Late');
    expect(late.body).to.have.length(1);

    const alice = await request(app).get('/api/attendance?studentName=alice');
    expect(alice.body).to.have.length(1);

    const badFilter = await request(app).get('/api/attendance?status=Nope');
    expect(badFilter.status).to.equal(400);
  });

  it('updates and deletes a record', async () => {
    const app = newApp();
    const created = await request(app).post('/api/attendance').send(sample);
    const id = created.body.record._id;

    const updated = await request(app).put(`/api/attendance/${id}`).send({ status: 'Absent' });
    expect(updated.status).to.equal(200);
    expect(updated.body.record.status).to.equal('Absent');

    const deleted = await request(app).delete(`/api/attendance/${id}`);
    expect(deleted.status).to.equal(200);

    const again = await request(app).delete(`/api/attendance/${id}`);
    expect(again.status).to.equal(404);
  });

  it('returns summary counts', async () => {
    const app = newApp();
    await request(app).post('/api/attendance').send(sample);
    await request(app).post('/api/attendance').send({ studentName: 'Bob', status: 'Absent' });
    const res = await request(app).get('/api/attendance/summary');
    expect(res.body).to.deep.equal({ Present: 1, Absent: 1, Late: 0, total: 2 });
  });
});
