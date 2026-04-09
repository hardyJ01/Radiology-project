# 🩻 RadiologyAI — AI-Powered X-Ray Report Generator

> **AI tool that takes chest X-ray images and automatically generates structured radiology reports using GIT-CXR — a 2025 SOTA model fine-tuned on MIMIC-CXR-JPG.**

⚠️ **Medical Disclaimer:** This tool provides AI-assisted preliminary analysis only. It is NOT a substitute for professional medical diagnosis. Always consult a licensed radiologist for clinical decisions.

---

## 📋 Table of Contents

- [What This Project Does](#-what-this-project-does)
- [Tech Stack](#-tech-stack)
- [Team & Work Division](#-team--work-division)
- [Repository Structure](#-repository-structure)
- [Quick Start — Get Running in 15 Minutes](#-quick-start--get-running-in-15-minutes)
- [Environment Variables](#-environment-variables)
- [AI Model — GIT-CXR](#-ai-model--git-cxr)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Git Workflow](#-git-workflow)
- [Sprint Plan](#-sprint-plan)
- [Features Checklist](#-features-checklist)

---

## 🎯 What This Project Does

A user uploads a chest X-ray image → our AI model (GIT-CXR, fine-tuned on 227,827 real radiology cases) reads the image → generates a structured report with Findings + Impression sections — just like a radiologist would write.

```
User uploads X-ray
       ↓
Frontend (React) validates & previews image
       ↓
Backend (FastAPI) receives & stores to S3
       ↓
Celery worker preprocesses image (resize 384×384, CLAHE)
       ↓
GIT-CXR model generates radiology report text
       ↓
CheXBert extracts disease labels + confidence scores
       ↓
PDF report generated → stored in S3
       ↓
User downloads report
```

**Detects:** Pneumonia · Pleural Effusion · Cardiomegaly · Atelectasis · Consolidation · Edema · Fractures · Tuberculosis · Nodules/Masses · Normal

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Vite + TailwindCSS | Fast UI, great DX |
| **State** | Zustand + React Query | Global auth state + API caching |
| **Backend** | Python 3.11 + FastAPI | High-performance async API |
| **AI Model** | GIT-CXR (2025 SOTA) | Best BLEU/ROUGE/F1 on MIMIC-CXR |
| **Fine-Tuning** | LoRA via HuggingFace PEFT | Efficient, ~100M params |
| **Training Data** | MIMIC-CXR-JPG (PhysioNet) | 227,827 real chest X-rays + reports |
| **Model Serving** | PyTorch + INT8 Quantization | Fast CPU/GPU inference |
| **Database** | PostgreSQL 15 + SQLAlchemy | Structured data storage |
| **File Storage** | AWS S3 | X-ray image + PDF storage |
| **Auth** | JWT + bcrypt | Secure token-based sessions |
| **PDF** | ReportLab | Downloadable diagnostic reports |
| **Task Queue** | Celery + Redis | Async AI processing |
| **Hosting** | AWS EC2 (backend) + Vercel (frontend) | Production deployment |

---

## 👥 Team & Work Division

> **Read this section carefully — this tells you exactly what YOU are responsible for.**

### Roles Overview

| Role | Person | Primary Repos |
|---|---|---|
| 🔵 Full-Stack Lead | _(Lead)_ | backend + infra |
| 🟢 Frontend Developer | _(assign)_ | frontend |
| 🟠 AI / ML Engineer | _(assign)_ | backend → `app/ai/` |
| ⚫ DevOps / Infra | _(assign, can be shared)_ | infra |
| 🟣 QA / PM | _(assign, can be shared)_ | all repos |

---

### 🔵 Full-Stack Lead — Responsibilities

**You own the backend core and overall architecture.**

- [ ] Set up GitHub org, repos, branch protection, CI/CD
- [ ] Write `app/core/` — database session, config, security (JWT)
- [ ] Write all **auth endpoints** (`/auth/register`, `/login`, `/refresh`, `/verify-email`, `/reset-password`)
- [ ] Write **user endpoints** (`/users/me` — GET, PATCH, DELETE)
- [ ] Write `app/models/` — SQLAlchemy models for `User`, `Report`, `Finding`
- [ ] Write Alembic migrations — create all tables
- [ ] Integrate `GITCXRService` into the report upload endpoint
- [ ] Write `app/services/StorageService` — S3 upload/download/signed URLs
- [ ] Set up Docker Compose for local dev (PostgreSQL + Redis)
- [ ] Set up GitHub Actions CI pipeline
- [ ] Code review all PRs before merge to `develop`

**Key files you own:**
```
app/main.py
app/core/config.py
app/core/database.py
app/core/security.py
app/api/routes/auth.py
app/api/routes/users.py
app/models/user.py
app/models/report.py
app/models/finding.py
app/services/storage_service.py
alembic/
```

---

### 🟢 Frontend Developer — Responsibilities

**You own everything the user sees.**

- [ ] Set up React project structure (pages, components, hooks, store, api)
- [ ] Configure TailwindCSS + shadcn/ui
- [ ] Build **Landing page** (`/`) — hero, features, CTA
- [ ] Build **Auth screens** — `/register` and `/login` with form validation (React Hook Form + Zod)
- [ ] Build **Upload screen** (`/upload`) — drag-and-drop X-ray upload, image preview
- [ ] Build **Report viewer** (`/report/:id`) — findings list, confidence bars, PDF download button
- [ ] Build **Dashboard** (`/dashboard`) — report history, filter by date/finding
- [ ] Build **Profile page** (`/profile`) — user settings
- [ ] Set up Zustand auth store (store JWT, isLoggedIn, user object)
- [ ] Set up React Query for all API calls + polling for report status
- [ ] Set up Axios instance with JWT interceptor (auto-attach token to every request)
- [ ] Handle loading states, error states, empty states on every screen

**Key files you own:**
```
src/pages/
src/components/ui/
src/components/xray/         ← UploadZone, ReportCard, FindingBadge, ConfidenceBar
src/components/layout/       ← Navbar, Footer, ProtectedRoute
src/hooks/                   ← useAuth, useReport, useUpload
src/store/authStore.js
src/api/                     ← authApi.js, reportApi.js, uploadApi.js
```

**API endpoints you will call:**

| What | Method + URL |
|---|---|
| Register | `POST /api/v1/auth/register` |
| Login | `POST /api/v1/auth/login` |
| Upload X-ray | `POST /api/v1/reports/upload` |
| Poll status | `GET /api/v1/reports/:id/status` |
| Get report | `GET /api/v1/reports/:id` |
| List reports | `GET /api/v1/reports` |
| Download PDF | `GET /api/v1/reports/:id/pdf` |
| My profile | `GET /api/v1/users/me` |

---

### 🟠 AI / ML Engineer — Responsibilities

**You own everything inside `app/ai/` and the model pipeline.**

- [ ] Apply for and download **MIMIC-CXR-JPG dataset** from PhysioNet (requires CITI training — start this early, takes a few days)
- [ ] Write data preprocessing pipeline (`app/ai/preprocess.py`) — resize to 384×384, CLAHE, MIMIC-CXR-JPG normalization
- [ ] Write LoRA fine-tuning script (`app/ai/finetune_lora.py`) on MIMIC-CXR-JPG
- [ ] Evaluate model — BLEU-1/4, ROUGE-L, METEOR, CheXBert F1
- [ ] Write `app/ai/inference.py` — load quantized model, run forward pass, parse Findings + Impression
- [ ] Write `GITCXRService` (`app/services/gitcxr_service.py`) — the interface the backend calls
- [ ] Write `app/tasks/process_xray_task.py` — Celery async task that calls GITCXRService
- [ ] Upload fine-tuned LoRA adapter weights to team S3 bucket
- [ ] Write model health endpoint logic (`/admin/model-health`)
- [ ] Document model card: training config, eval metrics, known limitations

**Key files you own:**
```
app/ai/
  ├── preprocess.py          ← image preprocessing pipeline
  ├── finetune_lora.py       ← LoRA fine-tuning script
  ├── inference.py           ← model forward pass + output parsing
  ├── weights/               ← local model weights (gitignored)
  └── model_card.md          ← training details + eval results

app/services/gitcxr_service.py
app/tasks/process_xray_task.py
app/tasks/generate_pdf_task.py
```

**Model config you are working with:**
```
Base model:      microsoft/git-large (HuggingFace)
Fine-tune:       LoRA  r=16, alpha=32, target: q_proj + v_proj
Dataset:         MIMIC-CXR-JPG — 70% train / 15% val / 15% test
Optimizer:       AdamW  lr=2e-4, weight_decay=0.01
Epochs:          3–5 with cosine LR schedule
Batch:           16 (grad accum ×4 = effective 64)
Export:          INT8 quantization via bitsandbytes
```

---

### ⚫ DevOps / Infra — Responsibilities

_(Can be shared between lead and another member)_

- [ ] Maintain `docker-compose.yml` for local dev
- [ ] Set up AWS: EC2 instance, S3 buckets, IAM roles
- [ ] Write `Dockerfile` for FastAPI backend
- [ ] Set up GitHub Actions CI (lint + tests on every PR)
- [ ] Set up CD: auto-deploy to EC2 on merge to `main`
- [ ] Set up Vercel for frontend auto-deploy
- [ ] Configure environment secrets in GitHub Actions
- [ ] Set up S3 lifecycle policies (auto-delete after 90 days)
- [ ] Set up UptimeRobot to monitor `/health` endpoint

---

### 🟣 QA / PM — Responsibilities

_(Can be shared)_

- [ ] Write test cases for each API endpoint (`tests/`)
- [ ] Test upload flow end-to-end with real X-ray images
- [ ] Verify report accuracy against known MIMIC-CXR findings
- [ ] Manage sprint board (GitHub Projects or Jira)
- [ ] Update SRS document as requirements change
- [ ] Review and approve UI before demos

---

## 📁 Repository Structure

We have **3 repositories** under the `radiology-ai-team` GitHub org:

```
radiology-ai-team/
  ├── radiology-ai-backend/       ← Python FastAPI + GIT-CXR AI
  ├── radiology-ai-frontend/      ← React 18 + Vite
  └── radiology-ai-infra/         ← Docker, env templates, CI configs
```

### Backend folder structure
```
radiology-ai-backend/
  app/
    api/routes/        ← auth.py, reports.py, users.py, admin.py
    core/              ← config.py, database.py, security.py
    models/            ← user.py, report.py, finding.py
    schemas/           ← Pydantic request/response models
    services/          ← gitcxr_service.py, storage_service.py, report_service.py
    tasks/             ← process_xray_task.py, generate_pdf_task.py
    ai/                ← preprocess.py, inference.py, finetune_lora.py, weights/
    utils/             ← dicom_converter.py, logger.py
    main.py
  alembic/             ← DB migrations
  tests/
  requirements.txt
  .env.example
  Dockerfile
```

### Frontend folder structure
```
radiology-ai-frontend/
  src/
    pages/             ← Landing, Login, Register, Dashboard, Upload, Report, Profile
    components/
      ui/              ← Button, Input, Card, Modal, Spinner, Badge
      xray/            ← UploadZone, ReportCard, FindingBadge, ConfidenceBar
      layout/          ← Navbar, Footer, ProtectedRoute
    hooks/             ← useAuth, useReport, useUpload, useToast
    store/             ← authStore.js (Zustand)
    api/               ← authApi.js, reportApi.js, uploadApi.js (Axios)
    utils/
  public/
```

---

## 🚀 Quick Start — Get Running in 15 Minutes

### Prerequisites
Make sure you have installed:
- Python 3.11
- Node.js 20+
- Docker Desktop (running)
- Git

### 1. Clone all repos
```bash
mkdir radiology-ai && cd radiology-ai
git clone git@github.com:radiology-ai-team/radiology-ai-backend.git
git clone git@github.com:radiology-ai-team/radiology-ai-frontend.git
git clone git@github.com:radiology-ai-team/radiology-ai-infra.git

cd radiology-ai-backend && git checkout develop
```

### 2. Start Database + Redis
```bash
cd ../radiology-ai-infra
docker compose up -d

# Verify running
docker compose ps
```

### 3. Set up Backend
```bash
cd ../radiology-ai-backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate        # Mac/Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# → Ask lead for the real values to fill in

# Run database migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
# API docs at: http://localhost:8000/docs
```

### 4. Set up Frontend
```bash
cd ../radiology-ai-frontend

# Install dependencies
npm install

# Set up environment
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env.local
echo "VITE_APP_NAME=RadiologyAI" >> .env.local

# Start dev server
npm run dev
# Opens at: http://localhost:5173
```

### 5. Verify everything works
- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in values (lead shares these via 1Password):

```env
# Database
DATABASE_URL=postgresql://raduser:radpass@localhost:5432/radiology_ai

# Redis (for Celery task queue)
REDIS_URL=redis://localhost:6379/0

# AWS (for S3 image storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=radiology-ai-xrays
AWS_REGION=ap-south-1

# Auth
JWT_SECRET_KEY=your_64char_random_string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
ENVIRONMENT=development

# AI Model
MODEL_WEIGHTS_PATH=./app/ai/weights/gitcxr_lora_finetuned
HF_MODEL_ID=microsoft/git-large
```

> ⚠️ **Never commit the `.env` file.** It is in `.gitignore`. Share secrets only via 1Password or Bitwarden.

---

## 🤖 AI Model — GIT-CXR

We use **GIT-CXR** — a 2025 state-of-the-art end-to-end Transformer model for chest X-ray report generation. It achieves the best BLEU, ROUGE, and CheXBert F1 scores on the MIMIC-CXR benchmark.

### Download base model (first time only)
```bash
# Make sure venv is active and huggingface_hub is installed
pip install -U "huggingface_hub[cli]"

# Login to HuggingFace
python -c "from huggingface_hub import login; login()"
# Paste your token from: https://huggingface.co/settings/tokens

# Download base model weights (~700MB)
python -c "
from transformers import AutoProcessor, AutoModelForCausalLM
proc = AutoProcessor.from_pretrained('microsoft/git-large')
proc.save_pretrained('./app/ai/weights/git_base')
model = AutoModelForCausalLM.from_pretrained('microsoft/git-large')
model.save_pretrained('./app/ai/weights/git_base')
print('Done!')
"
```

### Download fine-tuned LoRA adapter (from team S3)
```bash
# After AI engineer uploads the fine-tuned weights:
aws s3 cp s3://radiology-ai-models/gitcxr_lora_v1/ \
  ./app/ai/weights/gitcxr_lora_finetuned/ --recursive
```

### Test inference
```bash
python -c "
from transformers import AutoProcessor, AutoModelForCausalLM
from peft import PeftModel
from PIL import Image
import torch

base = AutoModelForCausalLM.from_pretrained('./app/ai/weights/git_base')
model = PeftModel.from_pretrained(base, './app/ai/weights/gitcxr_lora_finetuned')
model = model.merge_and_unload()
model.eval()
proc = AutoProcessor.from_pretrained('./app/ai/weights/gitcxr_lora_finetuned')

img = Image.open('./tests/sample_xray.jpg').convert('RGB')
inputs = proc(images=img, return_tensors='pt')
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=256, num_beams=4)
print(proc.batch_decode(out, skip_special_tokens=True)[0])
"
```

---

## 📡 API Endpoints

Base URL: `http://localhost:8000/api/v1`

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login → get JWT tokens | No |
| POST | `/auth/logout` | Invalidate refresh token | Yes |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/verify-email` | Verify email with OTP | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users/me` | Get my profile | Yes |
| PATCH | `/users/me` | Update name / password | Yes |
| DELETE | `/users/me` | Delete my account | Yes |

### Reports
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/reports/upload` | Upload X-ray → start AI analysis | Yes |
| GET | `/reports` | List my reports | Yes |
| GET | `/reports/:id` | Get full report + findings | Yes |
| GET | `/reports/:id/status` | Poll processing status | Yes |
| GET | `/reports/:id/pdf` | Get signed PDF download URL | Yes |
| DELETE | `/reports/:id` | Delete a report | Yes |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/stats` | System stats | Admin |
| GET | `/admin/users` | All users list | Admin |
| GET | `/admin/reports` | All reports | Admin |
| GET | `/admin/model-health` | GIT-CXR model status | Admin |

---

## 🗄 Database Schema

### users
```sql
id             UUID PRIMARY KEY
name           VARCHAR(100)
email          VARCHAR(255) UNIQUE
password_hash  VARCHAR
is_verified    BOOLEAN
role           ENUM('user', 'admin')
created_at     TIMESTAMP
```

### reports
```sql
id                 UUID PRIMARY KEY
user_id            UUID → users.id
image_url          TEXT  (S3 URL)
pdf_url            TEXT  (S3 URL)
status             ENUM('pending', 'processing', 'completed', 'failed')
ai_summary         TEXT  (GIT-CXR generated text)
processing_time_ms INTEGER
created_at         TIMESTAMP
```

### findings
```sql
id               UUID PRIMARY KEY
report_id        UUID → reports.id
disease_name     VARCHAR  (e.g., Pneumonia)
confidence_score FLOAT    (0.0 – 1.0)
severity         ENUM('low', 'moderate', 'high', 'normal')
bounding_box     JSONB    (optional)
```

```

### Daily workflow
```bash
# 1. Always start from latest develop
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Work and commit often
git add .
git commit -m "feat: describe what you did"

# 4. Push and open PR → target: develop
git push origin feature/your-feature-name
# Go to GitHub → open Pull Request

# 5. After PR is merged, clean up
git checkout develop && git pull
git branch -d feature/your-feature-name
```

---

## ✅ Features Checklist

| ID | Feature | Status | Owner |
|---|---|---|---|
| F-01 | User Registration & Login (JWT) | 🔲 Not started | Lead |
| F-02 | X-Ray Image Upload (JPEG/PNG/DICOM) | 🔲 Not started | Lead + Frontend |
| F-03 | AI Disease Detection (GIT-CXR) | 🔲 Not started | AI/ML |
| F-04 | Structured Diagnostic Report | 🔲 Not started | Lead + AI/ML |
| F-05 | PDF Report Download | 🔲 Not started | Lead |
| F-06 | Report History Dashboard | 🔲 Not started | Frontend |
| F-07 | Confidence Score Visualization | 🔲 Not started | Frontend |
| F-08 | Notifications (email / in-app) | 🔲 Not started | Lead + Frontend |
| F-09 | User Profile Management | 🔲 Not started | Frontend |
| F-10 | Admin Dashboard | 🔲 Not started | Lead + Frontend |

Update status as: 🔲 Not started → 🔄 In progress → ✅ Done

---

## 🔗 Important Links

| Resource | URL |
|---|---|
| API Docs (local) | http://localhost:8000/docs |
| Frontend (local) | http://localhost:5173 |
| HuggingFace Model | https://huggingface.co/microsoft/git-large |
| MIMIC-CXR-JPG Dataset | https://physionet.org/content/mimic-cxr-jpg |
| SRS Document | `RadiologyAI_SRS.docx` (in team drive) |
| Project Board | _(add your GitHub Projects / Jira link here)_ |
| 1Password Vault | _(add vault link here)_ |

---

> 
> *Last updated: April 2026 — RadiologyAI Engineering Team*
