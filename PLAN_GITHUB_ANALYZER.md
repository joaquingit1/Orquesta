# Plan: GitHub URL → Análisis Real

Objetivo: que el usuario pegue la URL de un repo público de GitHub y Orquesta analice de verdad (commits, PRs, contributors, calidad de código) usando Claude, streameando por el SSE existente.

---

## Estado actual (punto de partida)

- **Backend** (`backend/main.py`, `backend/reviews.py`): FastAPI con SSE funcionando, pero todo hardcoded. Sin Anthropic SDK, sin GitHub client.
- **Datos**: `backend/data/engineers.json` → 5 ingenieros ficticios con PRs y KPIs inventados.
- **Frontend** (`frontend/src/app/page.tsx`): máquina de estados con 3 pantallas. Los `types.ts` ya tienen las interfaces (`PR`, `Engineer`, `KPIs`) listas para datos reales.
- **Dependencias backend actuales**: solo `fastapi==0.115.0`, `uvicorn==0.30.6`.

---

## Decisiones tomadas (antes de empezar confirmar estas)

1. **Fuente de datos**: GitHub REST API (vía `PyGithub`) — más rápido que clonar. Si hace falta leer archivos puntuales, usar `contents` endpoint.
2. **Token GitHub**: variable de entorno `GITHUB_TOKEN` en el backend (pedirle al amigo que cree un PAT con scope `public_repo`).
3. **LLM**: Claude `claude-opus-4-6` con prompt caching para diffs grandes. Variable `ANTHROPIC_API_KEY`.
4. **Granularidad**: multi-contributor (reemplaza los 5 engineers mockeados por los top N contributors reales del repo).
5. **Límites**: analizar últimos 90 días, top 5 contributors por commits, máximo 20 PRs cerrados, máximo 50 archivos por contributor (para controlar costos y tiempo).

---

## Fases de implementación

### FASE 1 — Setup de dependencias e infraestructura (15 min)

**Archivos a tocar:**

- `backend/requirements.txt` → agregar:
  ```
  PyGithub==2.4.0
  anthropic==0.39.0
  python-dotenv==1.0.1
  pydantic==2.9.2
  ```
- `backend/.env.example` (crear) con:
  ```
  GITHUB_TOKEN=ghp_xxx
  ANTHROPIC_API_KEY=sk-ant-xxx
  ```
- `backend/main.py` → cargar `dotenv` al inicio.
- `.gitignore` → confirmar que `.env` está ignorado.

**Comando**: `cd backend && pip install -r requirements.txt`.

---

### FASE 2 — Módulo GitHub (`backend/github_analyzer.py`) (60 min)

Crear módulo nuevo con estas funciones puras:

- `parse_github_url(url: str) -> tuple[owner, repo]` — valida que sea `https://github.com/owner/repo` y rechaza el resto.
- `fetch_repo_metadata(gh, owner, repo)` → devuelve dict con `name, description, stars, language, created_at, default_branch`.
- `fetch_top_contributors(gh, owner, repo, limit=5)` → lista de `{login, avatar_url, commits_count, additions, deletions}` filtrados por últimos 90 días.
- `fetch_contributor_prs(gh, owner, repo, login, limit=10)` → PRs mergeados/cerrados del autor con `number, title, description, additions, deletions, files_changed, merged_at, review_comments, diff_snippet` (primeros 2000 chars del diff).
- `fetch_contributor_commits(gh, owner, repo, login, since, limit=30)` → commits con SHA, mensaje, stats, archivos.
- `compute_code_metrics(commits, prs)` → calcula métricas objetivas: avg commit size, PR merge rate, test file ratio (regex `test_*|*_test|*.spec.*|*.test.*`), churn, frecuencia.

**Cache**: memoria simple (`functools.lru_cache` o dict por `owner/repo`) para no repegar la API en el mismo request.

**Manejo de errores**: 404 repo privado/inexistente, 403 rate limit, timeout 30s.

---

### FASE 3 — Módulo Claude (`backend/llm_reviewer.py`) (90 min)

Reemplaza `reviews.py` con llamadas reales.

Funciones clave (todas `async` con `anthropic.AsyncAnthropic`):

- `stream_thinking(contributor, prs, commits, metrics)` — Claude lee diffs reales y genera el razonamiento inicial. Usa **prompt caching** en el bloque de código (los diffs) porque se reusan entre fases.
- `stream_advocate(contributor, context)` — argumenta fortalezas con evidencia citada (PR #, líneas).
- `stream_challenger(contributor, context)` — contra-argumenta debilidades con evidencia.
- `stream_rebuttal(contributor, advocate_text, challenger_text)` — síntesis.
- `stream_verdict(contributor, full_context)` — score 0-10 estructurado + tagline + métricas de ahorro (latencia, costo).

**Prompt structure** (sistema prompt compartido):
```
Sos un revisor técnico adversarial. Analizás contributors de GitHub con evidencia REAL.
Nunca inventes PRs, líneas o métricas. Si no hay evidencia, decilo.
Citá siempre PR# y archivo:línea cuando argumentes.
```

**Prompt caching**: meter los diffs y metadata del contributor como `cache_control: {"type": "ephemeral"}` en el bloque de contexto → las 4 fases reusan el mismo cache.

**Yield pattern**: generator que emite `{"type": "thinking"|"advocate"|..., "content": chunk}` para que el endpoint SSE lo pase directo.

---

### FASE 4 — Nuevo endpoint de análisis (`backend/main.py`) (45 min)

Agregar:

- `POST /api/analyze` body `{"github_url": "..."}`:
  1. Valida URL.
  2. Fetchea metadata + top contributors.
  3. Devuelve `{"analysis_id": uuid, "contributors": [...]}` (pantalla 1 dinámica).
  4. Guarda el análisis en memoria (`analyses: dict[uuid, AnalysisState]`).

- `GET /api/analyze/{analysis_id}/stream` (SSE):
  1. Itera contributors.
  2. Para cada uno: fetch PRs+commits+metrics → stream las 4 fases del LLM → emitir eventos con el mismo formato que hoy (`thinking`, `advocate`, `challenger`, `verdict`).
  3. Al final emite `ranking_ready`.

- `GET /api/analyze/{analysis_id}/ranking` → top N con scores agregados.

**Mantener** los endpoints viejos (`/api/team`, `/api/review/...`) como modo demo con datos mockeados → toggle en frontend.

---

### FASE 5 — Frontend (60 min)

**Archivos a tocar:**

- `frontend/src/app/page.tsx`:
  - Nueva pantalla inicial (paso 0): input de URL + botón "Analizar" + toggle "modo demo".
  - Llama `POST /api/analyze`, guarda `analysis_id`, pasa a TeamOverview con contributors reales.
  - En "Run Review Cycle", conecta al SSE `/api/analyze/{id}/stream` en vez del endpoint demo.

- `frontend/src/lib/api.ts`:
  - Agregar `analyzeRepo(url: string)` y `streamAnalysis(analysisId: string, handlers)`.

- `frontend/src/components/TeamOverview.tsx`:
  - Que acepte `contributors` como prop en vez de leer endpoint fijo.

- `frontend/src/types.ts`:
  - Agregar `AnalysisMeta { id, repo, contributors }` (el resto ya sirve).

- **Nuevo componente** `frontend/src/components/RepoInput.tsx`:
  - Input URL, validación regex, estado loading ("Analizando repo..."), error handling.

---

### FASE 6 — Pulido y límites (30 min)

- **Rate limiting GitHub**: si falla con 403, mostrar mensaje claro al usuario.
- **Costo Claude**: log de tokens por análisis en backend.
- **Timeout**: cancelar análisis si tarda más de 5 min.
- **UX**: progress bar en frontend durante fetch inicial (suele tardar 10-30s en repos grandes).
- **Repos muy grandes**: si >1000 commits en 90 días, samplear.

---

## Archivos nuevos a crear

1. `backend/github_analyzer.py`
2. `backend/llm_reviewer.py`
3. `backend/.env.example`
4. `frontend/src/components/RepoInput.tsx`

## Archivos a modificar

1. `backend/main.py` — nuevos endpoints, dotenv, estado de análisis.
2. `backend/requirements.txt` — dependencias nuevas.
3. `backend/reviews.py` — deprecar o dejar como fallback demo.
4. `frontend/src/app/page.tsx` — paso 0 + toggle.
5. `frontend/src/lib/api.ts` — funciones nuevas.
6. `frontend/src/components/TeamOverview.tsx` — props dinámicas.

---

## Variables de entorno necesarias (el amigo las debe configurar)

**Backend `.env`:**
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx       # PAT con scope public_repo
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx   # desde console.anthropic.com
```

**Frontend `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Orden de ejecución cuando empecemos

1. Hacer pull del push del amigo.
2. `git status` + leer qué cambió.
3. FASE 1 (setup) — verificar que `pip install` corra limpio.
4. FASE 2 (GitHub) — testear con curl un repo real antes de seguir.
5. FASE 3 (Claude) — probar una fase aislada con un contributor real.
6. FASE 4 (endpoints) — conectar fases 2+3, probar SSE con `curl -N`.
7. FASE 5 (frontend) — input + stream.
8. FASE 6 (pulido) — solo si FASE 5 funciona end-to-end.

**Tiempo total estimado: 5-6 horas de trabajo enfocado.**

---

## Criterio de éxito

Pegar `https://github.com/anthropics/anthropic-sdk-python` en el input → aparecen los top 5 contributors reales → click "Run Review Cycle" → Claude lee diffs reales y argumenta con PR#s citables → ranking final con scores basados en evidencia verificable.

Si podés hacer click en una cita y te lleva al PR real en GitHub, el análisis es REAL. Si no, es demo.
