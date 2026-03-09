# Production Deployment Guide

Deploy NutriMurt to an Ubuntu server (Digital Ocean droplet) with Docker.

## Prerequisites

- Ubuntu server with Docker + Docker Compose installed
- Non-root user with SSH key login (e.g. `caio`)
- DNS A record for `nutrimurt.com.br` pointing to the server IP
- Repository cloned on the server (`git clone`)

## Step 1 -- Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 2 -- Create root `.env` with secrets

```bash
cd ~/osf
nano .env
```

Contents (fill in your real values):

```env
DB_PASSWORD=<generate_a_strong_password>
MAILGUN_API_KEY=<your_mailgun_api_key>
MAILGUN_DOMAIN=mg.nutrimurt.com.br
MAILGUN_FROM=NutriMurt <noreply@mg.nutrimurt.com.br>
```

## Step 3 -- Create `nutrimurt.Web/.env.production`

This file is gitignored (`.env.*` rule), so it must be created manually on the server.
Vite reads it automatically during `npm run build`.

```bash
cd ~/osf
cat > nutrimurt.Web/.env.production << 'EOF'
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsubnV0cmltdXJ0LmNvbS5iciQ
VITE_API_BASE_URL=
VITE_PY_BASE_URL=/py
EOF
```

## Step 4 -- Pull latest code

```bash
cd ~/osf
git pull
```

## Step 5 -- Build the React frontend

Uses a disposable Docker container (no Node.js install required).
The `.env.production` file from Step 3 must exist before this step.

```bash
docker run --rm -v ./nutrimurt.Web:/app -w /app node:20-alpine sh -c "npm ci && npm run build"
```

This produces `nutrimurt.Web/dist/` which nginx serves as the SPA.

## Step 6 -- Obtain initial SSL certificate

Before starting the full stack, get the Let's Encrypt certificate using certbot standalone mode:

```bash
# Create docker compose volumes/networks without starting services
docker compose -f docker-compose.yml -f docker-compose.prod.yml create

# Find the certbot volume name (will be like osf_certbot_certs)
docker volume ls | grep certbot

# Get the initial certificate (replace YOUR_EMAIL and the volume name prefix)
docker run --rm -p 80:80 \
  -v osf_certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d nutrimurt.com.br \
  --email YOUR_EMAIL --agree-tos --no-eff-email
```

## Step 7 -- Start the full stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Database migrations are applied automatically on API startup via `Database.Migrate()` in `Program.cs`.

## Step 8 -- Verify

```bash
# Check all containers are running
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50

# Test HTTPS
curl -I https://nutrimurt.com.br
```

## Redeployment (after code changes)

```bash
cd ~/osf
git pull
docker run --rm -v ./nutrimurt.Web:/app -w /app node:20-alpine sh -c "npm ci && npm run build"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Useful commands

```bash
# View logs for a specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f pyservice
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f gateway

# Restart a single service
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api

# Stop everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Stop everything and remove volumes (WARNING: deletes database data)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v

# Access the database directly
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  psql -U nutrimurt -d nutrimurtdb

# Force SSL certificate renewal
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec gateway nginx -s reload
```
