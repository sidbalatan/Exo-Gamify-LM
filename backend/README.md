# ExoQuest FastAPI workspace API

JWTs are validated with **Clerk JWKS**. Use the Bearer token from the Clerk session JWT or configure a Clerk **JWT template** for backend access.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit CLERK_JWKS_URL + CLERK_ISSUER from the Clerk Dashboard
uvicorn app.main:app --reload --host 0.0.0.0 --port 8787
```

Open interactive docs at http://localhost:8787/docs

### Personal workspace persistence

Once `DATABASE_URL` points at a Postgres that has consumed `database/workspace_ddl.sql`, `GET /v1/workspace/me` upserts into `profiles` (Clerk JWT email/name hydrated when present), and `/v1/workspace/targets` persists partitioned rows per clerk `sub`.

Set **`WORKSPACE_BLOB_ROOT`** in `.env` to a writable directory (e.g. `./data/blob`). The API creates per-user paths under it for `POST /v1/workspace/assets/upload`, and streams downloads from `GET /v1/workspace/assets/{id}/download`.

The Next.js app proxies authenticated calls via `/api/workspace/*` (`WORKSPACE_API_URL`/`NEXT_PUBLIC_API_URL`) using the Clerk session JWT as `Authorization: Bearer …`.
