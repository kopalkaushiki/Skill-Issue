# DevAssemble Python Backend (FastAPI)

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /api/dashboard`
- `GET /api/profile`
- `GET /api/projects/{project_id}`
