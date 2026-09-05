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
