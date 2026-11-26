# WedSnap Cloud Deployment Guide (Zero-Docker Production Architecture)

This guide walks through deploying the complete WedSnap platform to production cloud infrastructure without Docker or Docker Compose, adhering to managed cloud services for minimal maintenance.

---

## Architecture Overview

| Component | Cloud Platform | Purpose |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Globally distributed React SPA with instant caching & SSL |
| **Backend** | [Render](https://render.com) (Web Service) | Managed Python FastAPI backend with WebSockets |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL) | Managed PostgreSQL with `pgvector` for face embeddings |
| **Storage** | [Supabase Storage](https://supabase.com/storage) | Private buckets for original HD photos and WebP thumbnails |

---

## Step 1: Set Up Supabase (Database & Storage)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard.
3. Open `supabase/schema.sql` from this repository and run the entire script. This:
   - Enables `vector`, `uuid-ossp`, and `pgcrypto` extensions.
   - Creates the `weddings`, `devices`, `photos`, `face_index`, `face_search_sessions`, and `download_logs` tables.
   - Sets up optimized compound indexes and Row Level Security policies.
4. Go to **Storage** > **Create new bucket**:
   - Bucket 1: `wedding-photos-original` (Private, for high-res original photos)
   - Bucket 2: `wedding-photos-thumbnails` (Public, for responsive gallery previews)
   - Bucket 3: `wedding-temp-selfies` (Private, for in-memory selfie processing)
5. Retrieve your project credentials from **Project Settings** > **API**:
   - `Project URL` (e.g. `https://xyzcompany.supabase.co`)
   - `service_role secret key` (used only by the backend, never frontend)
   - `Connection String (URI)` from **Project Settings** > **Database** (e.g. `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres`)

---

## Step 2: Deploy Backend to Render

Render provides native Python runtime execution with automatic SSL and WebSocket support without requiring any Docker containers.

1. Create an account at [render.com](https://render.com) and click **New +** > **Web Service**.
2. Connect your Git repository (or push the `wedsnap` repository to GitHub/GitLab).
3. Configure the service:
   - **Name:** `wedsnap-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** section, configure:
   ```env
   ENVIRONMENT=production
   PYTHON_VERSION=3.11.9
   SECRET_KEY=your-random-32-char-secret-key-here
   DATABASE_URL=postgresql://postgres:your-db-password@db.your-ref.supabase.co:5432/postgres
   SUPABASE_URL=https://your-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   FRONTEND_BASE_URL=https://your-frontend-app.vercel.app
   ```
5. Click **Deploy Web Service**.
6. When deployment finishes, test the health check:
   `https://wedsnap-backend.onrender.com/api/health`

---

## Step 3: Deploy Frontend to Vercel

1. Create an account at [vercel.com](https://vercel.com) and click **Add New** > **Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add the Environment Variable:
   ```env
   VITE_API_BASE_URL=https://wedsnap-backend.onrender.com
   ```
5. Click **Deploy**.
6. Vercel will build and assign a production URL (e.g. `https://wedsnap.vercel.app`).
7. Update `FRONTEND_BASE_URL` in your Render backend settings to match your new Vercel domain.

---

## Step 4: Verification Checklist

- [x] Access `https://wedsnap.vercel.app/sophia-alexander` on your smartphone.
- [x] Test live WebSocket connection indicator in the gallery.
- [x] Download the 5x7 printable table card directly from the site.
- [x] Pair an Android smartphone or DSLR connector with the cloud backend URL.
- [x] Upload a test photograph from the camera; verify it appears in the gallery in under 2 seconds without page refresh!
