# TTLOCK Dashboard — Deployment & Operations Guide

This document describes deployment options, environment variables configuration, Docker multi-stage build workflows, pre-built container execution via GitHub Container Registry (GHCR), and common troubleshooting checklists for **TTLOCK Dashboard**.

---

## 1. Environment Variables Configuration (`.env`)

Configuration credentials are managed through `backend/.env`.

Copy the template file:
```bash
cp backend/.env.example backend/.env
```

Populate the variables with your TTLOCK Developer credentials:
```env
# Application ID from TTLOCK Developer Portal (https://open.ttlock.com)
TTLOCK_CLIENT_ID="your_client_id"

# Application Secret from TTLOCK Developer Portal
TTLOCK_CLIENT_SECRET="your_client_secret"

# Username / Email of the registered TTLOCK APP account
TTLOCK_USERNAME="your_ttlock_account@domain.com"

# Password of the TTLOCK account in MD5 Hash format (lowercase hex)
TTLOCK_PASSWORD_MD5="your_md5_hashed_password"

# Optional Base URL override (defaults to https://api.sciener.com)
TTLOCK_API_BASE_URL="https://api.sciener.com"

# Internal server port (defaults to 5757 local / 5000 in docker)
PORT=5757
```

---

## 2. Fast Track: Running Pre-Built Container Images (No Source Clone Required)

If you wish to deploy the dashboard directly without compiling or checking out source files, pre-built container images are distributed via **GitHub Container Registry (GHCR)**:
- Backend: [`ghcr.io/helmipradita/ttlock-backend`](https://github.com/helmipradita/ttlock-dashboard/pkgs/container/ttlock-backend)
- Web Nginx: [`ghcr.io/helmipradita/ttlock-web-nginx`](https://github.com/helmipradita/ttlock-dashboard/pkgs/container/ttlock-web-nginx)

Images are published with both `:v1.2.0` (release pinning) and `:latest` tags.

### Option A: Using a Simple `docker-compose.yml` (Recommended)

1. Create a clean directory and create a `docker-compose.yml` file:
   ```yaml
   services:
     backend:
       image: ghcr.io/helmipradita/ttlock-backend:v1.2.0 # or :latest
       environment:
         - TTLOCK_CLIENT_ID=your_client_id
         - TTLOCK_CLIENT_SECRET=your_client_secret
         - TTLOCK_USERNAME=your_ttlock_email@example.com
         - TTLOCK_PASSWORD_MD5=your_md5_password
         - PORT=5000
       expose:
         - "5000"
       restart: unless-stopped

     web-nginx:
       image: ghcr.io/helmipradita/ttlock-web-nginx:v1.2.0 # or :latest
       ports:
         - "5757:5757"
       depends_on:
         - backend
       restart: unless-stopped
   ```

2. Start the services:
   ```bash
   docker compose up -d
   ```
   Docker automatically pulls the latest GHCR images and starts the application at **`http://localhost:5757`**.

---

### Option B: Running Directly with `docker run`

To run without configuration files:

```bash
# 1. Create bridge network
docker network create ttlock-net

# 2. Run Backend Container
docker run -d --name ttlock-backend --network ttlock-net \
  -e TTLOCK_CLIENT_ID="your_client_id" \
  -e TTLOCK_CLIENT_SECRET="your_client_secret" \
  -e TTLOCK_USERNAME="your_ttlock_email" \
  -e TTLOCK_PASSWORD_MD5="your_md5_password" \
  -e PORT="5000" \
  ghcr.io/helmipradita/ttlock-backend:latest

# 3. Run Web Nginx Frontend Container
docker run -d --name ttlock-web --network ttlock-net \
  -p 5757:5757 \
  ghcr.io/helmipradita/ttlock-web-nginx:latest
```

---

## 3. Running from Source Code (Clone Repository)

Best suited for developers building features or modifying components:

### A. Full Application Build
```bash
# 1. Clone repository
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# 2. Create environment file
cp backend/.env.example backend/.env

# 3. Build and launch containers
docker compose up -d --build
```
The dashboard will be accessible at: **`http://localhost:5757`**

> **Technical Build Note:**
> You **DO NOT** need to execute `npm run build` on your local host. The Dockerfiles (`Dockerfile.web` and `Dockerfile.backend`) utilize **Multi-stage Builds** that install dependencies and compile production artifacts directly within Docker.

### B. Selective Service Rebuilds (Efficient during development)
* **Rebuild Frontend only (React / UI changes):**
  ```bash
  docker compose up -d --build web-nginx
  ```
* **Rebuild Backend only (Express / API changes):**
  ```bash
  docker compose up -d --build backend
  ```

### C. Stopping Services
```bash
docker compose down
```

---

## 4. Container Resource Allocation

Configured resource limits defined in `docker-compose.yml`:

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation |
|---|---|---|---|---|
| **backend** | 2.0 Cores | 512 MB | 0.5 Cores | 256 MB |
| **web-nginx** | 1.0 Core | 256 MB | 0.25 Cores | 128 MB |

---

## 5. Troubleshooting Checklist

1. **Authentication Error: Invalid Client / Invalid Account (`-10001`, `-10007`)**:
   - Verify `TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET`, `TTLOCK_USERNAME`, and `TTLOCK_PASSWORD_MD5` inside `backend/.env`. Ensure no leading or trailing whitespace.
2. **Error: Remote unlock not enabled (`-4043`)**:
   - Open the TTLOCK mobile app $\rightarrow$ Select Lockbox $\rightarrow$ Settings $\rightarrow$ Enable *Remote Unlock*.
3. **Port 5757 Conflict**:
   - Remap the host port in `docker-compose.yml`:
     ```yaml
     ports:
       - "5858:5757" # Replace 5858 with your desired host port
     ```
