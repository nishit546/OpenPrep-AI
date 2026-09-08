# 🚀 OpenPrep AI

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-yellow)](./CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](./CODE_OF_CONDUCT.md)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://hacktoberfest.com/)

**OpenPrep AI** is an advanced AI-powered exam preparation platform designed to help students optimize their study habits, analyze previous exam papers, identify knowledge gaps, and study smarter.

[Explore Architecture](./docs/architecture.md) • [Getting Started](./docs/setup-guide.md) • [Contribution Guidelines](./CONTRIBUTING.md) • [API Documentation](./docs/api-reference.md) • [Socket.IO Events](./docs/socket-events.md)
</div>

---

## 🎯 Problem Statement

Most students waste critical preparation hours trying to figure out:

- What chapters hold the highest exam weightage?
- Which questions are repeatedly asked?
- How to schedule daily study topics effectively?
- Where their weak points lie?

**OpenPrep AI** resolves these frustrations by utilizing advanced LLMs (Gemini API) and data-driven learning strategies (spaced repetition, adaptive planning) to structure their preparation path automatically.

---

## ✨ Features

- **📄 PDF & Notes Analysis**: Extract core themes, chapter summaries, and revision points from academic uploads.
- **📊 PYQ Intelligence**: Parse Previous Year Question Papers (PYQs) to map chapter weightage, extract repeated questions, and detect trends.
- **🧠 AI Quiz Generator**: Dynamically generate MCQ assessments based on custom uploaded notes or specific syllabus topics.
- **📅 Smart Study Planner**: Input your exam date, syllabus scope, and study hours to generate a customized, calendarized study schedule.
- **🎯 Weakness Detection**: Tracks performance across quiz attempts to dynamically highlight weak subjects and adapt study goals.
- **📚 Spaced Repetition Flashcards**: Memorize complex concepts using flashcards backed by the SuperMemo SM-2 adaptation algorithm.
- **💻 Live Collaborative Coding Interview Room**: Real-time pair-programming space with Monaco editor, multi-cursor presence, instant code execution sandbox, chat, and WebRTC video. [Read Guide](./docs/collaborative-interview.md)

---

## 🛠️ Tech Stack

| Component          | Technologies Used                                      |
| ------------------ | ------------------------------------------------------ |
| **Frontend**       | React, Vite, Tailwind CSS, Redux Toolkit, React Router |
| **Backend**        | Node.js, Express.js, JWT Authentication                |
| **Database**       | PostgreSQL, Sequelize ORM                              |
| **AI Integration** | Gemini API (`gemini-1.5-flash`)                        |
| **DevOps & CI**    | Docker, Docker Compose, GitHub Actions                 |

---

## 🏛️ System Architecture

OpenPrep AI is structured as a multi-tier system separating client presentation, server business logic, persistent data storage, and external AI processing.

```mermaid
graph TD
    User["👤 Student / Client Browser"] <-->|"HTTP / REST API / JWT"| ReactUI["📱 React UI (Vite + Redux)"]
    
    subgraph Frontend["Client Layer (Frontend)"]
        ReactUI -->|"Axios Client"| APIClient["API Service Layer"]
    end
    
    APIClient <-->|"JSON Payloads & Bearer Auth"| ExpressBackend["⚙️ Express.js Server"]
    
    subgraph Backend["Server Layer (Backend)"]
        ExpressBackend -->|"Auth Middleware"| Middleware["JWT Protection"]
        Middleware -->|"Route Request"| Controller["Express Controllers"]
        Controller -->|"ORM Abstraction"| Sequelize["Sequelize ORM"]
        Controller -->|"AI Generation"| GeminiService["Gemini AI Service"]
    end
    
    subgraph Storage["Data & AI Layer"]
        Sequelize <-->|"SQL Queries"| PostgresDB[("🐘 PostgreSQL Database")]
        GeminiService <-->|"NLP Analysis & Summaries"| GoogleGemini["✨ Google Gemini API (gemini-1.5-flash)"]
    end
```

For detailed architectural decision records (ADRs) and sequence diagrams, review the [System Architecture Documentation](./docs/architecture.md).

---

## 📂 Project Structure

The repository is organized into separate frontend, backend, documentation, and development-support directories.

```text
OpenPrep-AI/
├── .github/                 # GitHub Actions, issue templates, and repository automation
├── backend/                 # Node.js + Express backend
│   ├── config/              # Application and database configuration
│   ├── controllers/         # Request and business logic controllers
│   ├── jobs/                # Background and scheduled jobs
│   ├── middleware/          # Authentication, validation, and request middleware
│   ├── migrations/          # Database migration files
│   ├── models/              # Sequelize database models
│   ├── routes/              # API route definitions
│   ├── scripts/             # Backend utility and maintenance scripts
│   ├── services/            # External service and AI integrations
│   ├── sockets/              # Socket.IO event handling
│   ├── tests/                # Backend test suites
│   └── utils/                # Shared backend utilities
├── frontend/                # React + Vite frontend application
│   ├── e2e/                  # End-to-end tests
│   ├── public/               # Static public assets
│   └── src/                  # Frontend source code
├── docs/                     # Project and technical documentation
│   └── adr/                  # Architecture Decision Records
├── issues/                   # Issue-related project resources
├── pr/                       # Pull request-related resources
├── scripts/                  # Repository-level development and automation scripts
├── docker-compose.yml        # Local Docker service configuration
├── package.json              # Root project scripts and dependencies
├── pnpm-workspace.yaml       # pnpm workspace configuration
├── CONTRIBUTING.md           # Contribution guidelines
├── CODE_OF_CONDUCT.md        # Community guidelines
├── SECURITY.md               # Security policy
├── ROADMAP.md                # Project roadmap
├── CHANGELOG.md              # Project change history
└── README.md                 # Project overview and setup instructions
```
---

## 📋 Prerequisites

Before setting up OpenPrep AI, make sure you have the following installed:

- **Node.js** 18 or later
- **npm** 9 or later
- **PostgreSQL** 14 or later (if running the database locally)
- **Git**
- **Docker & Docker Compose** (optional, only required for Docker-based setup)

You will also need a **Gemini API key** for the AI features.

---

## 🚦 Getting Started

For a step-by-step setup guide with environment variable details, review the [Setup Guide](./docs/setup-guide.md).

### Quick Launch with Docker

If Docker and Docker Compose are installed, you can start the required services with:

```bash
docker-compose up --build
```

The React frontend will be available at `http://localhost:5173` and the Express API at `http://localhost:5000`.

### Manual Local Launch

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nishit546/OpenPrep-AI.git
   cd OpenPrep-AI
   ```
2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   # Copy the environment template to create your own configuration
   cp .env.example .env  # Or "copy .env.example .env" on Windows CMD
   # Open the new .env file and set your own DB_URI, JWT_SECRET, etc.
   npm run dev
   ```
3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### 🗄️ Database Migrations with Sequelize CLI

We use Sequelize CLI for managing database schema changes.

- **Run all pending migrations**:
  ```bash
  npx sequelize-cli db:migrate
  ```

- **Revert the last migration**:
  ```bash
  npx sequelize-cli db:migrate:undo
  ```

- **Revert all migrations**:
  ```bash
  npx sequelize-cli db:migrate:undo:all
  ```

- **Seed the database with demo users**:
  ```bash
  npx sequelize-cli db:seed:all
  ```

---

## 🛠️ Troubleshooting

If you encounter problems while setting up or running OpenPrep AI locally, check the common issues and solutions below.

### 1. `SequelizeConnectionRefusedError` / `SequelizeConnectionError: connect ECONNREFUSED`
This error occurs when the Node.js backend cannot connect to your PostgreSQL database instance.

* **Ensure PostgreSQL is running**:
  * **Windows (PowerShell as Administrator):**
    ```powershell
    Get-Service postgresql*
    Start-Service postgresql-x64-18  # Replace with your actual service version if different
    ```
  * **Linux/macOS:**
    ```bash
    sudo systemctl status postgresql
    sudo systemctl start postgresql
    ```
* **Verify database existence**:
  Make sure you created the `openprep` database. You can create it with:
  ```bash
  psql -U postgres -c "CREATE DATABASE openprep;"
  ```
* **Check `.env` Connection String**:
  Open `backend/.env` and verify that `DATABASE_URL` matches your local database credentials:
  ```env
  DATABASE_URL=postgres://your_username:your_password@localhost:5432/openprep
  ```

---

### 2. React Vite Port `5173` (or Backend Port `5000`) Already in Use
This happens when another local server or background process is already listening on ports `5173` (frontend) or `5000` (backend).

* **Quickly kill the port**:
  Use `npx kill-port` to automatically terminate any processes occupying the dev ports:
  ```bash
  npx kill-port 5173 5000
  ```
* **Manually find and kill the process**:
  * **Windows (PowerShell):**
    ```powershell
    # Find process ID (PID) using the port
    Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess
    # Kill the process
    Stop-Process -Id <PID> -Force
    ```
  * **Linux/macOS (Terminal):**
    ```bash
    # Find PID using the port
    lsof -i :5173
    # Kill the process
    kill -9 <PID>
    ```

---

### 3. Missing `.env` / Environment Variable Issues on Startup
The backend will immediately crash or exit if required variables (like `JWT_SECRET`) are missing or incorrectly configured.

* **Verify `.env` exists**:
  Check that you copied `.env.example` to `.env` in the `backend/` directory:
  ```bash
  # Linux/macOS
  cp backend/.env.example backend/.env
  # Windows PowerShell
  Copy-Item backend/.env.example backend/.env
  ```
* **Set Required Variables**:
  Make sure `JWT_SECRET` is set to a long, random string in `backend/.env`.

---

### 4. Dependencies fail to install / npm Cache Errors
This occurs due to outdated Node.js versions, corrupted npm cache, or package conflicts.

* **Clear npm cache & reinstall**:
  ```bash
  npm cache clean --force
  npm install
  ```
* **Verify Node.js version**:
  Ensure you are using Node v18.x or v20.x:
  ```bash
  node --version
  ```

---

### 5. Docker: `port is already allocated` or Volume Mount Issues on Windows
This occurs when local services (like a native PostgreSQL database) are using port `5432`, or due to file sharing path permissions in Docker Desktop.

* **Stop native local services**:
  * Stop local PostgreSQL so the Docker PostgreSQL container can bind to port `5432`:
    ```powershell
    # Windows PowerShell
    Stop-Service postgresql*
    ```
    ```bash
    # Linux/macOS
    sudo systemctl stop postgresql
    ```
* **Line ending errors in Docker (`\r: command not found`)**:
  If shell scripts fail inside the container, configure git to preserve LF line endings and re-clone/re-normalize:
  ```bash
  git config --global core.autocrlf input
  git add --renormalize .
  git checkout-index --force --all
  ```
* **WSL2 Setup and Mounting Details**:
  For comprehensive WSL2 configurations, volume mounting, and file system speed enhancements on Windows, see the [Windows Setup & Docker Troubleshooting Guide](./docs/setup-guide.md#windows-setup-via-wsl2-recommended).

---

### 7. Windows & Docker specific issues (Line endings & WSL2)

If you are running Docker on Windows and encounter execution errors (like `\r: command not found` in shell scripts) or hot-reloading volume mounting issues, please refer to the dedicated [Windows Setup & Docker Troubleshooting Guide](./docs/setup-guide.md#windows-setup-via-wsl2-recommended) in our documentation.

---

### Still having problems?

If none of the solutions above resolve the issue, open a GitHub issue with:

1. The error message.
2. The command that produced the error.
3. Your Node.js version.
4. Your operating system.
5. Relevant Docker or backend logs.
6. Steps to reproduce the problem.

Providing this information will help maintainers and contributors investigate the problem more efficiently.

---

## 🗺️ Roadmap

- **v1.0**: Core authentication, AI study planners, quiz generators, and analytics dashboards.
- **v1.5**: Spaced repetition engine, PYQ PDF parser, and attempt history trends.
- **v2.0**: Weakness-adapted scheduling, community note pools, and OCR processing.
- **v3.0**: Live study battles, AI chat mentors, and React Native mobile client.

For the comprehensive technical roadmap, review [docs/project-roadmap.md](./docs/project-roadmap.md).

---

## 📚 Documentation

Useful project documentation:

- [Setup Guide](./docs/setup-guide.md) — Detailed local setup and environment configuration
- [Architecture](./docs/architecture.md) — Overview of the project architecture
- [API Reference](./docs/api-reference.md) — Backend API documentation
- [Socket.IO Events](./docs/socket-events.md) — Real-time event documentation
- [Project Roadmap](./docs/project-roadmap.md) — Planned and upcoming features
- [Contributing Guide](./CONTRIBUTING.md) — How to contribute to the project
- [Code of Conduct](./CODE_OF_CONDUCT.md) — Community guidelines
- [Security Policy](./SECURITY.md) — Security and vulnerability reporting

---

## 🤝 Contributing

We welcome contributions of all levels! Please check the [Contributing Guide](./CONTRIBUTING.md) to understand how to fork the project, set up formatting rules, and make your first Pull Request.

Please also adhere to the community standards in our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for more details.

---

## ❤️ Support

If you love this project, show your support:

- ⭐ **Star** our repository on GitHub.
- 🍴 **Fork** it to start contributing.
- 📢 **Share** it with your classmates and peers!

_Built with ❤️ for students worldwide._
