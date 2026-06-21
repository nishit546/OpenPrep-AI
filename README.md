# 🚀 OpenPrep AI

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-yellow)](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/CODE_OF_CONDUCT.md)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://hacktoberfest.com/)

**OpenPrep AI** is an advanced AI-powered exam preparation platform designed to help students optimize their study habits, analyze previous exam papers, identify knowledge gaps, and study smarter.

[Explore Architecture](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/docs/architecture.md) • [Getting Started](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/docs/setup-guide.md) • [Contribution Guidelines](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/CONTRIBUTING.md) • [API Documentation](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/docs/api-reference.md)

</div>

---

## 🎯 Problem Statement

Most students waste critical preparation hours trying to figure out:
* What chapters hold the highest exam weightage?
* Which questions are repeatedly asked?
* How to schedule daily study topics effectively?
* Where their weak points lie?

**OpenPrep AI** resolves these frustrations by utilizing advanced LLMs (Gemini API) and data-driven learning strategies (spaced repetition, adaptive planning) to structure their preparation path automatically.

---

## ✨ Features

* **📄 PDF & Notes Analysis**: Extract core themes, chapter summaries, and revision points from academic uploads.
* **📊 PYQ Intelligence**: Parse Previous Year Question Papers (PYQs) to map chapter weightage, extract repeated questions, and detect trends.
* **🧠 AI Quiz Generator**: Dynamically generate MCQ assessments based on custom uploaded notes or specific syllabus topics.
* **📅 Smart Study Planner**: Input your exam date, syllabus scope, and study hours to generate a customized, calendarized study schedule.
* **🎯 Weakness Detection**: Tracks performance across quiz attempts to dynamically highlight weak subjects and adapt study goals.
* **📚 Spaced Repetition Flashcards**: Memorize complex concepts using flashcards backed by the SuperMemo SM-2 adaptation algorithm.

---

## 🛠️ Tech Stack

| Component | Technologies Used |
| --- | --- |
| **Frontend** | React, Vite, Tailwind CSS, Redux Toolkit, React Router |
| **Backend** | Node.js, Express.js, JWT Authentication |
| **Database** | MongoDB, Mongoose ORM |
| **AI Integration** | Gemini API (`gemini-1.5-flash`) |
| **DevOps & CI** | Docker, Docker Compose, GitHub Actions |

---

## 📂 Project Structure

```bash
OpenPrep-AI/
├── .github/             # GitHub actions, templates & labelers
├── backend/             # Node.js + Express backend
│   ├── config/          # MongoDB configuration
│   ├── controllers/     # MVC controller logic
│   ├── middleware/      # Auth, upload, and validation middleware
│   ├── models/          # Mongoose database schemas
│   ├── routes/          # Express API route declarations
│   └── services/        # Gemini API integration service
├── docs/                # Comprehensive system documentation
└── frontend/            # React + Vite + Tailwind CSS frontend
    ├── public/          # Static files and assets
    └── src/
        ├── components/  # Reusable UI components
        ├── context/     # Global contexts (Theme, etc.)
        ├── services/    # Axios API client integrations
        └── store/       # Redux Toolkit global state store
```

---

## 🚦 Getting Started

For a step-by-step setup guide with environment variable details, review the [Setup Guide](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/docs/setup-guide.md).

### Quick Launch with Docker
If you have Docker installed, you can spin up the frontend, backend, and MongoDB instances with a single command:
```bash
docker-compose up --build
```
The React frontend will be available at `http://localhost:5173` and the Express API at `http://localhost:5000`.

### Manual Local Launch

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/OpenPrep-AI.git
   cd OpenPrep-AI
   ```
2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   # Create a .env file based on .env.example
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
* **v1.0**: Core authentication, AI study planners, quiz generators, and analytics dashboards.
* **v1.5**: Spaced repetition engine, PYQ PDF parser, and attempt history trends.
* **v2.0**: Weakness-adapted scheduling, community note pools, and OCR processing.
* **v3.0**: Live study battles, AI chat mentors, and React Native mobile client.

For the comprehensive technical roadmap, review [docs/project-roadmap.md](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/docs/project-roadmap.md).

---

## 🤝 Contributing

We welcome contributions of all levels! Please check the [Contributing Guide](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/CONTRIBUTING.md) to understand how to fork the project, set up formatting rules, and make your first Pull Request.

Please also adhere to the community standards in our [Code of Conduct](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/CODE_OF_CONDUCT.md).

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/LICENSE) for more details.

---

## ❤️ Support

If you love this project, show your support:
* ⭐ **Star** our repository on GitHub.
* 🍴 **Fork** it to start contributing.
* 📢 **Share** it with your classmates and peers!

*Built with ❤️ for students worldwide.*
