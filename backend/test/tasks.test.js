const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let Task;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.NODE_ENV = 'test';
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

  await mongoose.connect(process.env.MONGO_URI);
  app = require('../src/app');
  Task = require('../src/models/task');
});

beforeEach(async () => {
  await Task.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('GET /health returns process health', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'connected');
});

test('GET /ready returns ready when MongoDB is connected', async () => {
  const res = await request(app).get('/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ready');
});

test('GET /api/tasks returns an empty list', async () => {
  const res = await request(app).get('/api/tasks');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.data, []);
});

test('POST /api/tasks rejects a missing title', async () => {
  const res = await request(app).post('/api/tasks').send({ description: 'no title' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/tasks rejects an invalid priority', async () => {
  const res = await request(app).post('/api/tasks').send({ title: 'Task', priority: 'urgent' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /priority/i);
});

test('POST /api/tasks creates a task', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Write tests', description: 'Cover CRUD', priority: 'high' });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.title, 'Write tests');
  assert.equal(res.body.data.status, 'todo');
  assert.equal(res.body.data.priority, 'high');
});

test('GET /api/tasks returns created tasks and supports status filter', async () => {
  await Task.create({ title: 'Todo item', status: 'todo' });
  await Task.create({ title: 'Done item', status: 'done' });

  const all = await request(app).get('/api/tasks');
  assert.equal(all.body.count, 2);

  const filtered = await request(app).get('/api/tasks').query({ status: 'done' });
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.count, 1);
  assert.equal(filtered.body.data[0].title, 'Done item');
});

test('GET /api/tasks rejects an invalid status filter', async () => {
  const res = await request(app).get('/api/tasks').query({ status: 'blocked' });
  assert.equal(res.status, 400);
});

test('PUT /api/tasks/:id rejects a malformed id', async () => {
  const res = await request(app).put('/api/tasks/not-an-id').send({ status: 'done' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid task ID');
});

test('PUT /api/tasks/:id returns 404 for a missing task', async () => {
  const missingId = new mongoose.Types.ObjectId().toString();
  const res = await request(app).put(`/api/tasks/${missingId}`).send({ status: 'done' });
  assert.equal(res.status, 404);
});

test('PUT /api/tasks/:id updates status and ignores unknown fields', async () => {
  const created = await Task.create({ title: 'Move me' });
  const res = await request(app)
    .put(`/api/tasks/${created._id}`)
    .send({ status: 'in-progress', extra: 'nope' });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'in-progress');
  assert.equal(res.body.data.extra, undefined);
});

test('PUT /api/tasks/:id rejects an empty title', async () => {
  const created = await Task.create({ title: 'Keep title' });
  const res = await request(app).put(`/api/tasks/${created._id}`).send({ title: '   ' });
  assert.equal(res.status, 400);
});

test('DELETE /api/tasks/:id removes a task', async () => {
  const created = await Task.create({ title: 'Delete me' });
  const res = await request(app).delete(`/api/tasks/${created._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await Task.countDocuments(), 0);
});

test('unknown routes return 404', async () => {
  const res = await request(app).get('/api/missing');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('malformed JSON returns 400', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .set('Content-Type', 'application/json')
    .send('{');
  assert.equal(res.status, 400);
});
