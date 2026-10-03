# Social Media MVP Application

A full-stack social media MVP built with **Node.js**, **Express**, **SQLite**, and a lightweight frontend.

## Features

- User create/login by username
- Create text posts
- Like posts
- Comment on posts
- Feed view with latest posts and comments
- Basic input validation

## Tech Stack

- Backend: Node.js + Express
- Database: SQLite (`better-sqlite3`)
- Frontend: HTML/CSS/Vanilla JS
- Testing: Jest + Supertest

## Project Structure

- `/src/server.js` - API and app setup
- `/src/db.js` - database schema and connection
- `/public` - frontend UI
- `/__tests__/api.test.js` - API tests

## Run Locally

```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Run Tests

```bash
npm test
```

## API Endpoints

- `POST /api/users` - create/get user by username
- `GET /api/users/:id` - user profile + stats
- `POST /api/posts` - create post
- `POST /api/posts/:id/likes` - like post
- `POST /api/posts/:id/comments` - add comment
- `GET /api/feed` - fetch feed
- `GET /health` - health check

## Notes

This is an MVP foundation. Next upgrades can include JWT auth, media upload, follow system, notifications, and real-time chat.
