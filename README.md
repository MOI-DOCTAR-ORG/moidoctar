# MoiDoctar

## Built with Africa Is Building (AIB Ship)

| AIB product | How MoiDoctar uses it |
|---|---|
| **Cencori** | AI gateway and LLM infrastructure. Every AI symptom-assessment and support-chat request is routed through Cencori, so we get request logs, security filtering and cost tracking. If the gateway is unreachable, the backend falls back to calling Gemini directly so triage never goes down. |
| **Sabilytics** | Website analytics. Tracks real visitors to the live app and how people and AI crawlers discover it. |
| **Byteship** | Storage and CDN delivery for profile photos. Avatars are uploaded server-side through the Byteship API (`backend/app/services/byteship_storage.py`), with automatic fallback to Cloudinary / inline so uploads never fail. |
| **Pxxl** | Hosts the frontend and the FastAPI backend (`pxxl.toml`). Live at https://moidoctar8.pxxlspace.cv |

Configuration lives in environment variables: see `backend/.env.example` (`CENCORI_API_KEY`, ...) (`CENCORI_API_KEY`, `BYTESHIP_API_KEY`, ...). Sabilytics works out of the box; its site ID and domain are defaults in `src/lib/analytics.ts`.
