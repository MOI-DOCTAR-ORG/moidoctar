# MoiDoctar FastAPI Backend

Modern, high-performance **FastAPI** backend for the **MoiDoctar** health triage application, integrated with **Supabase (PostgreSQL)**, JWT authentication, and structured triage endpoints.

---

## Architecture Overview

```
backend/
├── app/
│   ├── main.py                  # FastAPI app entry point & CORS configuration
│   ├── core/
│   │   ├── config.py            # Environment settings & config
│   │   ├── security.py          # Password hashing (bcrypt) & JWT helpers
│   │   └── supabase.py          # Supabase client manager
│   ├── schemas/                 # Pydantic v2 request & response schemas
│   │   ├── auth.py              # Login, Signup, OTP, Tokens
│   │   ├── user.py              # Profile, Demographics, Notifications
│   │   ├── medication.py        # Medication tracking schemas
│   │   ├── symptom.py           # Symptom logging schemas
│   │   └── triage.py            # Triage request/response & cache schemas
│   ├── services/
│   │   ├── auth_service.py      # Authentication & user profile operations
│   │   ├── medication_service.py# Medication management
│   │   ├── symptom_service.py   # Symptom recording
│   │   └── triage_service.py    # Structured clinical triage evaluation
│   └── api/
│       ├── deps.py              # Auth dependencies (get_current_user)
│       └── v1/
│           ├── api.py           # Master v1 router
│           └── endpoints/       # Route handlers
├── schema.sql                   # 1-click Supabase PostgreSQL schema migration
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
└── README.md                    # Documentation
```

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+** (Python 3.14 recommended)
- A **Supabase** account & project (free tier available at [supabase.com](https://supabase.com))

### 2. Set Up Virtual Environment

Open a terminal in the `backend/` directory:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate virtual environment (macOS / Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Supabase

1. Open your project on [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of [`schema.sql`](./schema.sql). This creates the `users`, `medications`, `symptoms`, `triage_sessions`, and `notifications` tables.
4. Go to **Project Settings > API** and copy:
   - **Project URL** (`https://[project-id].supabase.co`)
   - **anon / public key** or **service_role key**
5. Copy `.env.example` to `.env` in the `backend/` folder and fill in your values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
SECRET_KEY=your-random-jwt-secret-key-32-chars-long
```

> **Note**: If Supabase credentials are not provided initially, the backend runs in a local in-memory fallback mode so you can test endpoints immediately without crashing!

### 4. Run the Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be live at:
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## API Endpoints Summary

### Authentication (`/api/v1/auth`)
- `POST /manualAuthentication`: Handles email/password sign-in and sign-up
- `POST /google`: Google OAuth token exchange
- `POST /verify`: OTP email verification
- `POST /resendVerification`: Resend verification code
- `POST /logout`: Invalidate session
- `POST /requestPasswordReset`: Send password reset email

### User & Profile (`/api/v1/user`)
- `GET /listData`: Retrieve authenticated user profile, demographics, and preferences
- `PUT /updateProfile`: Update full name, phone number, demographics
- `GET /notifications`: Retrieve user notifications
- `POST /forgotPassword`: Reset password using OTP code
- `DELETE /`: Delete user account

### Medications (`/api/v1/medication`)
- `GET /`: List user medications
- `POST /create`: Add a new medication prescription
- `PUT /stop`: Stop / archive an active medication

### Symptoms (`/api/v1/symptom`)
- `GET /list`: Retrieve logged symptom history
- `POST /`: Record a new symptom entry

### Triage (`/api/v1/triage`)
- `POST /`: One-shot symptom assessment (accepts FormData with symptoms, clinical context, and image)
- `POST /chat`: Conversational triage evaluation for the LIANA chat assistant
- `GET /list` & `GET /history`: Retrieve user triage session history

### Cache Management (`/api/v1/cache`)
- `GET /stats`: Retrieve triage cache statistics
- `POST /clear`: Clear cache
