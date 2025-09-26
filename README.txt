
# Urban Heat AI — Full Stack (Node.js + Python ML)

## What this is
- Frontend: your Leaflet map, calling our backend.
- Backend: Node.js/Express with SQLite for history.
- AI: Python Flask microservice with a tiny regression model to estimate UHI.

## Prereqs (install once)
- Node.js 18+ (comes with npm)
- Python 3.10+
- No database server needed (SQLite is embedded).

## Setup
1) Clone/extract this folder.
2) Install backend deps:
   ```bash
   npm install
   ```
3) Start the ML service in a separate terminal:
   ```bash
   cd ml_service
   pip install -r requirements.txt
   python app.py
   ```
   ML runs at http://127.0.0.1:5001

4) Start the backend (another terminal in project root):
   ```bash
   npm start
   ```
   Backend runs at http://localhost:3000 and serves the frontend.

5) Open http://localhost:3000 in your browser.

## Endpoints
- POST /api/analyze   { "query": "City, Country" }
- GET  /api/history   returns last 20 searches

## Environment variables (optional)
- ML_URL=http://127.0.0.1:5001/predict
- PORT=3000

