# XQuest FastAPI workspace API

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
