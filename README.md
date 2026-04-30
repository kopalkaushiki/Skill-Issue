# skillIssue.app
A website that helps developers collaborate with other developers on projects
Updated by Daita Saathika(25/3/2026)

run backend:  
cd devass/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

run frontend: 
cd frontend
npm install   
npm run dev

