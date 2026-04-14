# CodeMetrics

> Medí el ROI real de la IA en tu equipo de desarrollo: cuánto gastás en Claude y cuánto te devuelve en productividad y calidad.

Ver `PRD.md` para el pitch completo.

---

## Arquitectura

```
hackaton2/
├── agent/      # Python CLI + git post-commit hook (lee ~/.claude/projects/)
├── backend/    # FastAPI + SQLite + análisis de calidad con Claude API
└── frontend/   # Next.js + Tailwind — dashboard grado CTO
```

El flujo end-to-end:

1. El dev instala el hook en su repo → `codemetrics init`
2. Cada `git commit` dispara el hook, que lee tokens de Claude Code desde el último commit y los envía al backend
3. El backend persiste el commit y pide a Claude una review de calidad sobre el diff
4. El dashboard muestra KPIs, historial, y ranking de eficiencia IA por ingeniero

---

## Quickstart

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # editá .env y poné tu ANTHROPIC_API_KEY
python seed.py                 # opcional — carga data de demo
uvicorn main:app --reload      # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

### 3. Agente (en cada repo que querés medir)

```bash
cd agent && pip install -e .
cd /ruta/a/tu/repo
codemetrics init --backend http://localhost:8000 --email vos@empresa.com
```

Listo. Hacé un commit y va a aparecer en el dashboard.

---

## API keys

Solo necesitás **una**: `ANTHROPIC_API_KEY` en `backend/.env`. La usa el backend para correr el análisis de calidad sobre cada diff.

---

## Stack

- **Agent**: Python 3.9+ puro (sin deps externas, usa urllib)
- **Backend**: FastAPI + SQLModel + SQLite + Anthropic SDK
- **Frontend**: Next.js 14 (App Router) + Tailwind + Recharts + lucide-react

## Endpoints clave

- `POST /commits` — ingestion del agente
- `GET /overview` — KPIs + serie diaria de 30d
- `GET /engineers` — ranking por AI spend
- `GET /engineers/:id` — detalle + historial
- `GET /commits` / `GET /commits/:id` — lista + detalle con diff y review
