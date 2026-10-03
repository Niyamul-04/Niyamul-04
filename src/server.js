const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

app.use('/api', apiLimiter);

function cleanText(input, maxLength) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value || value.length > maxLength) return null;
  return value;
}

app.post('/api/users', (req, res) => {
  const username = cleanText(req.body?.username, 24);
  if (!username || !usernamePattern.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-24 chars: letters, numbers, underscore.' });
  }

  const existing = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(username);
  if (existing) return res.json(existing);

  const info = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(user);
});

app.get('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id.' });

  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS posts,
      (SELECT COUNT(*) FROM likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = ?) AS likes_received,
      (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id WHERE p.user_id = ?) AS comments_received
  `).get(userId, userId, userId);

  return res.json({ ...user, stats: counts });
});

app.post('/api/posts', (req, res) => {
  const userId = Number(req.body?.userId);
  const content = cleanText(req.body?.content, 500);

  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id.' });
  if (!content) return res.status(400).json({ error: 'Post content is required (1-500 chars).' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const info = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)').run(userId, content);
  const post = db.prepare(`
    SELECT p.id, p.content, p.created_at, u.id AS user_id, u.username,
      0 AS like_count,
      0 AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(info.lastInsertRowid);

  return res.status(201).json(post);
});

app.post('/api/posts/:id/likes', (req, res) => {
  const postId = Number(req.params.id);
  const userId = Number(req.body?.userId);

  if (!Number.isInteger(postId) || postId <= 0) return res.status(400).json({ error: 'Invalid post id.' });
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id.' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
  const likes = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(postId);

  return res.json({ postId, likeCount: likes.count });
});

app.post('/api/posts/:id/comments', (req, res) => {
  const postId = Number(req.params.id);
  const userId = Number(req.body?.userId);
  const content = cleanText(req.body?.content, 300);

  if (!Number.isInteger(postId) || postId <= 0) return res.status(400).json({ error: 'Invalid post id.' });
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id.' });
  if (!content) return res.status(400).json({ error: 'Comment content is required (1-300 chars).' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const info = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(postId, userId, content);
  const comment = db.prepare(
    'SELECT id, post_id, user_id, content, created_at FROM comments WHERE id = ?'
  ).get(info.lastInsertRowid);

  return res.status(201).json({ ...comment, username: user.username });
});

app.get('/api/feed', (_req, res) => {
  const posts = db.prepare(`
    SELECT
      p.id,
      p.content,
      p.created_at,
      u.id AS user_id,
      u.username,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.id DESC
    LIMIT 100
  `).all();

  const commentsByPost = db.prepare(`
    SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id IN (SELECT id FROM posts ORDER BY id DESC LIMIT 100)
    ORDER BY c.id DESC
  `).all();

  const commentMap = commentsByPost.reduce((acc, comment) => {
    if (!acc[comment.post_id]) acc[comment.post_id] = [];
    acc[comment.post_id].push(comment);
    return acc;
  }, {});

  const feed = posts.map((post) => ({ ...post, comments: commentMap[post.id] || [] }));
  res.json(feed);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

module.exports = app;
