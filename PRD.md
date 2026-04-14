# PRD — CodeMetrics (nombre tentativo)

**Medir el ROI real de la IA en un equipo de desarrollo: ¿cuánto gasto en Claude y cuánto produce cada programador?**

---

## 1. Problema

Los equipos que usan Claude Code (u otras IAs) para programar no tienen forma de responder preguntas básicas:

- ¿Cuánto estoy gastando en IA por programador, por mes?
- ¿Ese gasto se traduce en más productividad o en código de peor calidad?
- ¿Quién usa la IA de forma eficiente y quién la desperdicia?
- ¿La calidad del proyecto mejora o empeora a medida que aumenta el uso de IA?

Hoy esto se mide "a ojo". No hay métricas objetivas que crucen **costo de IA** con **productividad** y **calidad del código**.

---

## 2. Propuesta

Una herramienta que se conecta a un proyecto de GitHub y mide, por cada commit:

- **Tokens de Claude usados** (input, output, caché)
- **Costo en USD** del uso de IA
- **Cambios del commit** (líneas, archivos, autor)
- **Quality score** del diff (analizado por Claude sobre el código)
- **Calidad global del proyecto** (recorrido completo del repo)

Todo agregado en un **dashboard por ingeniero y por equipo**.

---

## 3. Usuarios objetivo

- **Tech leads / CTOs**: necesitan justificar el gasto en IA y entender su impacto.
- **Engineering managers**: quieren ver quién necesita onboarding en IA y quién es referente.
- **Los propios developers**: auto-feedback sobre su eficiencia.

---

## 4. Métricas clave (el corazón del producto)

### Por commit
| Métrica | Descripción |
|---|---|
| Tokens totales | Input + output + caché |
| Costo USD | Tokens × pricing del modelo |
| Líneas +/- | Impacto del cambio |
| Quality score | 1-10, evaluado por Claude sobre el diff |
| Tokens / línea | Eficiencia del uso de IA |

### Por ingeniero (agregado mensual)
- Gasto total en IA
- Commits realizados
- Quality score promedio
- **Ratio eficiencia**: líneas productivas / $ gastado
- Comparativa con el equipo

### Por proyecto (global)
- Quality score del repo (mantenibilidad, complejidad, deuda técnica)
- Evolución de quality en el tiempo
- Costo total IA del equipo por mes

---

## 5. Arquitectura técnica

**4 componentes:**

### 5.1 Installer CLI
```
npx codemetrics init
```
Instala el hook de git en el repo y configura el endpoint del backend.

### 5.2 Git post-commit hook (agente local)
- Al hacer commit, lee los logs de sesiones de Claude Code (`~/.claude/projects/<repo>/*.jsonl`)
- Suma tokens usados desde el commit anterior
- Captura diff stats, SHA, autor
- Envía evento al backend

### 5.3 Backend (FastAPI + Postgres/SQLite)
- Recibe eventos de commits
- Worker asíncrono: manda el diff a Claude API → quality score
- Análisis periódico del repo completo para quality global
- Calcula costos según pricing oficial

### 5.4 Dashboard (Next.js + shadcn/ui + Recharts)
- Vista por ingeniero
- Vista por equipo
- Historial de commits con filtros
- Gráficos de tendencia (costo vs quality vs productividad)

---

## 6. Por qué es viable técnicamente

Claude Code ya guarda **localmente** todos los datos que necesitamos:

```
~/.claude/projects/<path>/<sessionId>.jsonl
```

Cada evento contiene:
- `timestamp` — para correlacionar con el commit
- `cwd` — para saber en qué repo se usó
- `gitBranch` — contexto adicional
- `usage` — `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`

No necesitamos instrumentar Claude Code ni pedir permisos especiales. Todo está en disco.

---

## 7. Por qué NO es un plugin/skill de Claude Code

- Un **skill** se invoca dentro de una conversación: no sirve para telemetría pasiva.
- Un **plugin de Claude Code** funcionaría, pero nos ata a Claude Code. Si mañana el equipo usa Cursor o Copilot, el producto muere.
- Un **git hook** es universal: funciona con cualquier herramienta de IA mientras podamos leer su telemetría local.

---

## 8. MVP — alcance para hackathon

**Fase 1 (demo-ready):**
1. Parser de JSONLs de Claude Code → tokens por ventana de tiempo
2. Git hook que captura commits y los asocia a sesiones
3. Backend con endpoint `POST /commits` + quality analysis con Claude API
4. Dashboard con tabla de commits + agregados por usuario

**Fuera de scope (v2):**
- Integración directa con GitHub (PRs, reviews, CI)
- Soporte para Cursor, Copilot, etc.
- Alertas automáticas ("este commit tiene quality < 5")
- Gamificación / rankings públicos del equipo

---

## 9. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|---|---|
| Correlación tokens ↔ commit es imperfecta si el dev trabaja en paralelo | Usar ventana temporal + matching por `cwd`. Aceptar ruido en v1. |
| Privacidad: estamos leyendo todas las sesiones del dev | Opt-in explícito. Solo se envían agregados, no contenido de mensajes. |
| Quality score con IA puede ser inconsistente | Usar rúbrica fija (complejidad, claridad, tests, seguridad) y mismo modelo siempre. |
| Costo del propio análisis de quality (Claude revisando diffs) | Limitar análisis a diffs > N líneas. Cachear resultados. |

---

## 10. Por qué este producto, por qué ahora

En 2026 todos los equipos están gastando en IA sin medir el retorno. El que primero traiga visibilidad sobre **"$ en IA vs. output real"** va a ser la herramienta por defecto de cualquier CTO que quiera justificar el budget.

No existe nada equivalente hoy que cruce **telemetría de IA + git + análisis de calidad** en una sola vista.
