from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="DevAssemble API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def root() -> str:
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DevAssemble API</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #ecf8f8 0%, #d5eceb 100%);
            color: #123f3f;
            min-height: 100vh;
            display: grid;
            place-items: center;
          }
          .card {
            width: min(680px, calc(100vw - 32px));
            background: white;
            border: 1px solid rgba(18, 63, 63, 0.12);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 20px 40px rgba(18, 63, 63, 0.12);
          }
          h1 { margin-top: 0; }
          code {
            background: #eff7f7;
            padding: 2px 8px;
            border-radius: 999px;
          }
          a {
            color: #0f6968;
            text-decoration: none;
            font-weight: 700;
          }
          ul {
            line-height: 1.8;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <h1>DevAssemble API is running</h1>
          <p>The backend is healthy. Your React app runs separately on the Vite dev server.</p>
          <ul>
            <li>Frontend UI: <code>http://localhost:5173</code></li>
            <li>API docs: <a href="/docs">/docs</a></li>
            <li>Health check: <a href="/health">/health</a></li>
          </ul>
        </section>
      </body>
    </html>
    """


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard")
def get_dashboard() -> dict:
    return {
        "feed": [
            {
                "id": "feed-1",
                "project": "Realtime Pair Studio",
                "update": "Live code replay shipped. Looking for backend reviewer.",
                "time": "2h ago",
                "tags": ["React", "Node.js", "WebSocket"],
            }
        ],
        "appeals": [
            {
                "id": "appeal-1",
                "title": "Need help now: auth edge-case triage",
                "urgency": "High",
                "deadline": "Today, 8:30 PM",
            }
        ],
    }


@app.get("/api/profile")
def get_profile() -> dict:
    return {
        "name": "Kopal Kaushiki",
        "role": "Fullstack Developer",
        "availability": "Open to collaborate",
        "skills": ["React", "Node.js", "Supabase", "FastAPI"],
    }


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> dict:
    return {
        "id": project_id,
        "title": "DevAssemble Collaboration Engine",
        "repository": "https://github.com/kopalkaushiki/Skill-Issue",
        "milestones": [
            {"title": "Core auth + onboarding", "progress": 90},
            {"title": "Collaboration posts + matching", "progress": 55},
        ],
    }
