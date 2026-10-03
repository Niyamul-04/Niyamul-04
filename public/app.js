const api = {
  async createUser(username) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create user');
    return res.json();
  },
  async createPost(userId, content) {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create post');
    return res.json();
  },
  async like(postId, userId) {
    const res = await fetch(`/api/posts/${postId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to like post');
    return res.json();
  },
  async comment(postId, userId, content) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to comment');
    return res.json();
  },
  async feed() {
    const res = await fetch('/api/feed');
    if (!res.ok) throw new Error('Failed to fetch feed');
    return res.json();
  }
};

const state = {
  currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null')
};

const usernameInput = document.querySelector('#username');
const loginBtn = document.querySelector('#loginBtn');
const currentUserText = document.querySelector('#currentUser');
const postContent = document.querySelector('#postContent');
const postBtn = document.querySelector('#postBtn');
const refreshBtn = document.querySelector('#refreshBtn');
const feedEl = document.querySelector('#feed');
const postTemplate = document.querySelector('#postTemplate');

function showUser() {
  if (!state.currentUser) {
    currentUserText.textContent = 'No user selected';
    return;
  }
  currentUserText.textContent = `Logged in as @${state.currentUser.username}`;
}

async function refreshFeed() {
  const posts = await api.feed();
  feedEl.innerHTML = '';

  if (!posts.length) {
    feedEl.textContent = 'No posts yet. Create the first post!';
    return;
  }

  for (const post of posts) {
    const node = postTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.meta').textContent = `@${post.username} • ${new Date(post.created_at).toLocaleString()}`;
    node.querySelector('.content').textContent = post.content;

    const actions = node.querySelector('.actions');
    const likeBtn = document.createElement('button');
    likeBtn.textContent = `Like (${post.like_count})`;
    likeBtn.addEventListener('click', async () => {
      if (!state.currentUser) return alert('Create/select a user first.');
      await api.like(post.id, state.currentUser.id);
      await refreshFeed();
    });
    actions.appendChild(likeBtn);

    const comments = node.querySelector('.comments');
    for (const comment of post.comments) {
      const c = document.createElement('div');
      c.className = 'comment';
      c.textContent = `@${comment.username}: ${comment.content}`;
      comments.appendChild(c);
    }

    node.querySelector('.commentBtn').addEventListener('click', async () => {
      if (!state.currentUser) return alert('Create/select a user first.');
      const input = node.querySelector('.commentInput');
      const text = input.value.trim();
      if (!text) return;
      await api.comment(post.id, state.currentUser.id, text);
      await refreshFeed();
    });

    feedEl.appendChild(node);
  }
}

loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  try {
    state.currentUser = await api.createUser(username);
    localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
    showUser();
  } catch (err) {
    alert(err.message);
  }
});

postBtn.addEventListener('click', async () => {
  if (!state.currentUser) return alert('Create/select a user first.');
  const content = postContent.value.trim();
  if (!content) return;

  try {
    await api.createPost(state.currentUser.id, content);
    postContent.value = '';
    await refreshFeed();
  } catch (err) {
    alert(err.message);
  }
});

refreshBtn.addEventListener('click', refreshFeed);
showUser();
refreshFeed();
