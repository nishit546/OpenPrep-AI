---
title: '[FEAT]: Automated GitHub Actions CI/CD Pipeline for Docker Container Builds, Vulnerability Scanning & Deployments'
labels: 'enhancement, devops, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As multiple contributors submit PRs for OpenPrep AI, manual validation of Docker images, security vulnerabilities, and deployment health checks slows down release cycles and risks introducing critical CVEs.

This feature establishes an **Automated CI/CD Pipeline using GitHub Actions, Multi-Stage Docker Builds, Trivy Vulnerability Scanning, and Automated Deployment Webhooks**.

---

## Technical Scope & Architecture

### CI/CD Workflow Architecture
1. **GitHub Actions Workflow (`.github/workflows/ci-cd-pipeline.yml`)**:
   - **Job 1: Lint & Code Quality**: Runs ESLint, Prettier check, and SonarQube static analysis.
   - **Job 2: Test Matrix**: Runs unit and integration test suites on Node 18, 20, and 22 with Postgres & Redis service containers.
   - **Job 3: Multi-Stage Docker Build**: Builds optimized, non-root Alpine container images with caching (`docker/build-push-action`).
   - **Job 4: Trivy Security Scan**: Scans images for CRITICAL / HIGH severity CVE vulnerabilities; blocks merge if unpatched vulnerabilities exist.
   - **Job 5: Auto-Deploy Trigger**: Triggers deploy hooks to staging/production on Render / Vercel upon merge to `main`.

2. **Optimized Dockerfiles**:
   - `backend/Dockerfile`: Multi-stage build with `node:20-alpine`, running as unprivileged `node` user.
   - `frontend/Dockerfile`: Vite build output served via lightweight Nginx Alpine container with gzip compression.

---

## Acceptance Criteria
- [ ] GitHub Actions workflow passes cleanly on all PRs and runs in under 4 minutes.
- [ ] Trivy vulnerability scanner accurately flags high-severity base image vulnerabilities.
- [ ] Docker images build with multi-stage layers resulting in minimal bundle sizes ($< 150\text{MB}$).
- [ ] Documentation in `docs/deployment-guide.md` explaining the automated CI/CD pipeline.
