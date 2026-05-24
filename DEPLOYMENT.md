# Coolify Deployment Guide

Deploy the IT Support Portal on your Coolify server at `http://187.127.134.246:8000/`

---

## Pre-Deployment Checklist

- [ ] VPS has Docker + Docker Compose installed
- [ ] Coolify is installed and accessible
- [ ] Domain/subdomain pointed to your VPS (optional but recommended for SSL)
- [ ] OpenAI API key (optional — AI has fallback responses)
- [ ] SMTP credentials (for email notifications)

---

## Option A: Deploy via Coolify UI (Recommended)

### Step 1: Push to Git Repository
```bash
cd "d:/New Project"
git init
git add .
git commit -m "Initial commit: IT Support Portal"
git remote add origin https://github.com/YOUR_USERNAME/it-support-portal.git
git push -u origin main
```

### Step 2: Create Application in Coolify
1. Open Coolify at `http://187.127.134.246:8000/`
2. Go to **Projects** → **+ New Project** → Name it "IT Support Portal"
3. Click **+ New Resource** → **Docker Compose**
4. Connect your Git repository OR choose **"Raw Docker Compose"**

### Step 3: Configure Docker Compose
- Paste contents of `docker-compose.yml` (or link to your repo)
- Set **Base Directory** to `/` (project root)
- Set **Docker Compose File** to `docker-compose.yml`

### Step 4: Set Environment Variables
In Coolify UI under **Environment Variables**, add all variables from `.env.example`:

```env
# Database
POSTGRES_DB=itsupport
POSTGRES_USER=itsupport
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
DATABASE_URL=postgresql://itsupport:<PASSWORD>@postgres:5432/itsupport

# Redis
REDIS_URL=redis://redis:6379

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=<GENERATE_STRONG_SECRET>
JWT_REFRESH_SECRET=<GENERATE_STRONG_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="IT Support <your@gmail.com>"

# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Step 5: Deploy
- Click **Deploy** — Coolify will build and start all 5 services
- Monitor build logs in the **Deployments** tab
- Wait for all services to be healthy (~3-5 minutes first build)

---

## Option B: SSH Direct Deploy

```bash
# SSH into your VPS
ssh root@187.127.134.246

# Clone repo
git clone https://github.com/YOUR_USERNAME/it-support-portal.git /opt/itsupport
cd /opt/itsupport

# Copy and edit .env
cp .env.example .env
nano .env   # Fill in all values

# Build and start
docker compose build --no-cache
docker compose up -d

# Check logs
docker compose logs -f

# Run database migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

---

## Post-Deployment

### Run Database Migrations
```bash
# Via Coolify Terminal (click on backend service → Terminal)
npx prisma migrate deploy

# Seed demo data (first time only)
npx ts-node prisma/seed.ts
```

### Demo Accounts (all password: Admin@123)
| Role | Email |
|------|-------|
| Super Admin | superadmin@company.com |
| Admin | admin@company.com |
| Engineer | engineer@company.com |
| User | user@company.com |

### SSL with Coolify
1. In Coolify → Your App → **Domains**
2. Add your domain (e.g., `support.yourdomain.com`)
3. Toggle **HTTPS** → Coolify auto-provisions Let's Encrypt cert
4. Update `FRONTEND_URL` and `CORS_ORIGINS` env vars to your HTTPS domain
5. Redeploy

---

## Service URLs (default)

| Service | URL |
|---------|-----|
| Frontend | http://your-domain.com |
| Backend API | http://your-domain.com/api |
| Socket.IO | http://your-domain.com/socket.io |
| Uploads | http://your-domain.com/uploads |
| Direct Backend | http://your-vps:5000 |

---

## Monitoring & Maintenance

```bash
# View all service logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Update and redeploy
git pull
docker compose build backend frontend
docker compose up -d --no-deps backend frontend

# Database backup
docker compose exec postgres pg_dump -U itsupport itsupport > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20240101.sql | docker compose exec -T postgres psql -U itsupport itsupport
```

---

## Troubleshooting

**Backend fails to start:**
```bash
docker compose logs backend
# Usually a missing env var or DB connection issue
```

**Prisma migration errors:**
```bash
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma migrate reset  # WARNING: deletes data
```

**Frontend can't reach backend:**
- Check `NEXT_PUBLIC_API_URL` in frontend env
- Verify nginx.conf is routing `/api` to backend correctly
- Check CORS_ORIGINS matches frontend URL exactly

**Socket.IO connection issues:**
- Ensure nginx has WebSocket upgrade headers (already configured)
- Check firewall allows port 80/443
