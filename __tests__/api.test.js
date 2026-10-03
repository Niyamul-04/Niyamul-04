process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server');

describe('social MVP API', () => {
  test('creates user, post, like, comment and returns feed', async () => {
    const u1 = await request(app).post('/api/users').send({ username: 'user_one' });
    expect(u1.status).toBe(201);

    const u2 = await request(app).post('/api/users').send({ username: 'user_two' });
    expect(u2.status).toBe(201);

    const post = await request(app).post('/api/posts').send({ userId: u1.body.id, content: 'Hello social world' });
    expect(post.status).toBe(201);

    const like = await request(app).post(`/api/posts/${post.body.id}/likes`).send({ userId: u2.body.id });
    expect(like.status).toBe(200);
    expect(like.body.likeCount).toBe(1);

    const comment = await request(app)
      .post(`/api/posts/${post.body.id}/comments`)
      .send({ userId: u2.body.id, content: 'Nice post!' });
    expect(comment.status).toBe(201);

    const feed = await request(app).get('/api/feed');
    expect(feed.status).toBe(200);
    expect(feed.body).toHaveLength(1);
    expect(feed.body[0].like_count).toBe(1);
    expect(feed.body[0].comment_count).toBe(1);
    expect(feed.body[0].comments[0].content).toBe('Nice post!');
  });

  test('rejects invalid username', async () => {
    const bad = await request(app).post('/api/users').send({ username: 'ab' });
    expect(bad.status).toBe(400);
  });
});
