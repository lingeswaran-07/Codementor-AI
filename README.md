<<<<<<< HEAD
# CodeMentor AI

Paste a GitHub link, ask questions about the code, get streamed answers with file + line citations.
Accounts, indexed repositories and **chat history are stored in MongoDB Atlas**.

**Stack:** React (Vite) · Node.js · Express · MongoDB Atlas · Gemini API · JWT · SSE · GitHub Actions

## Features
- Sign up / log in with email + password (bcrypt-hashed, JWT sessions). Optional "Continue with GitHub".
- Paste any public GitHub repo link -> files are chunked, embedded with Gemini, and stored in MongoDB.
- Ask questions -> relevant chunks are retrieved (cosine similarity) -> Gemini streams the answer over SSE with sources.
- Every question and answer is saved per user per repository and reloaded next time you log in.

## Setup

### 1. MongoDB Atlas (database)
1. Create a free account at https://www.mongodb.com/atlas and create a free **M0** cluster.
2. **Database Access** -> *Add New Database User* -> choose a username + password (avoid `@ : / ?` in the password, or URL-encode it).
3. **Network Access** -> *Add IP Address* -> *Allow access from anywhere* (`0.0.0.0/0`) for development.
4. **Clusters** -> *Connect* -> *Drivers* -> copy the connection string.
5. Paste it into `server/.env` as `MONGO_URI`, replacing `<db_user>` and `<db_password>`, and add the database name before the `?`:
   `mongodb+srv://myuser:mypass@cluster0.abcde.mongodb.net/codementor?retryWrites=true&w=majority`

You do **not** need to create collections by hand: Mongoose creates `users`, `repos`, `chunks` and `chats` automatically.

### 2. Gemini API key
1. Open https://aistudio.google.com/apikey and click **Create API key**.
2. Paste it into `server/.env` as `GEMINI_API_KEY`.

### 3. Run
```bash
cd server
cp .env.example .env        # then fill MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:5000

cd ../client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```
Open http://localhost:5173, sign up, paste a repo link (e.g. `https://github.com/lingeswaran-07/Foody`) and start asking.

## Collections
| Collection | Stores |
|---|---|
| users | name, email, bcrypt password hash (or GitHub id) |
| repos | repo name, indexing status, file/chunk counts (per user) |
| chunks | file path, line range, text, embedding vector |
| chats | per user + repo: all questions, answers and sources |

## API
| Method | Route | Description |
|---|---|---|
| POST | /auth/signup, /auth/login | `{name?, email, password}` -> `{token, user}` |
| GET | /auth/me | current user |
| GET/POST | /api/repos | list / add repo (`{url}`) |
| DELETE | /api/repos/:id | remove repo, chunks and chat |
| GET | /api/chat/:repoId/history | saved messages |
| POST | /api/chat/:repoId | `{question}` -> SSE (`sources`, `token`, `done`, `error`) |
| DELETE | /api/chat/:repoId/history | clear history |

## Troubleshooting
- **MongoDB connection failed** -> wrong password, missing `/codementor` db name, or your IP is not allowed in Atlas Network Access.
- **Model not found / 404 from Gemini** -> change `GEMINI_MODEL` / `EMBED_MODEL` in `.env` to a currently available model.
- **GitHub rate limit or private repo** -> set `GITHUB_TOKEN` in `server/.env`.
- Vector search runs in Node (fine for small/medium repos). For big scale use Atlas Vector Search.
=======
# Codementor-AI
>>>>>>> a995d8ec5eeeb964ec1b6990444ab15c47c0d682
