# 🤝 Contributing to OpenPrep AI

Thank you for your interest in contributing to OpenPrep AI! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Improving documentation

This document guides you through the contribution process.

---

## 🚦 Good First Issue Workflow

If you are new to the repository, look for issues labeled `good first issue` or `help wanted`.

1. Browse our [GitHub Issues](https://github.com/yourusername/openprep-ai/issues).
2. Comment on the issue to request assignment. A maintainer will assign it to you if it's not already claimed.
3. Once assigned, you can start working on the fix. Do not submit a PR without an open, assigned issue.

---

## 🔱 Fork and Pull Request Workflow

We use the standard Fork and Pull Request model:

```bash
Fork Repository ➔ Clone Locally ➔ Create Branch ➔ Make Changes ➔ Commit ➔ Push ➔ Open PR
```

### Step 1: Fork and Clone

1. Click **Fork** in the top-right corner of the OpenPrep AI GitHub repository.
2. Clone your fork to your local machine:
   ```bash
   git clone https://github.com/yourusername/OpenPrep-AI.git
   cd OpenPrep-AI
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/OpenPrep-AI.git
   ```

### Step 2: Create a Branch

Always create a descriptive branch for your work. Keep your branch synced with the upstream `main` branch.

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
# Or bugfix/your-bug-name
```

For more information, see our [Branching Strategy](./docs/branching-strategy.md).

### Step 3: Local Setup

OpenPrep AI consists of a React frontend and Node.js backend. Follow the [Setup Guide](./docs/setup-guide.md) for full instructions on launching the local stack.

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
3. Set up environment variables as described in the Setup Guide.

### Step 4: Commit Messages

We enforce standard commit message conventions based on [Conventional Commits](https://www.conventionalcommits.org/):

Format: `<type>(<scope>): <description>`

- `feat`: A new feature (e.g., `feat(auth): add google oauth login`)
- `fix`: A bug fix (e.g., `fix(quiz): repair scoring algorithm`)
- `docs`: Documentation changes (e.g., `docs(setup): update docker guide`)
- `style`: Code style changes (formatting, missing semi-colons, no functional change)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Maintenance tasks (dependencies update, CI config)

Example:

```bash
feat(quiz): add timer component to quiz interface
```

#### Pull Request Titles

Pull request titles must also follow the Conventional Commits format:

`<type>(<scope>): <description>`

Examples:

- `feat(auth): add google oauth login`
- `fix(quiz): repair scoring algorithm`
- `docs(setup): update docker guide`
- `chore(ci): update GitHub Actions workflow`

Pull request titles are automatically validated by GitHub Actions. Invalid titles will cause the PR validation check to fail.

Common commit types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code restructuring without changing behavior
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks
- `ci`: Changes to CI/CD configuration

### Step 5: Open a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Navigate to the original OpenPrep AI repository on GitHub. You will see a prompt to open a Pull Request.
3. Complete the PR template.
4. Reference the issue you are fixing (e.g., `Closes #123`).
5. Wait for review. Maintainers will review your PR and suggest changes or merge it.

---

## 🐛 Issue Reporting Guidelines

When reporting a bug, please ensure you check existing issues first. If it's a new issue, include:

- A clear summary title.
- Preconditions and environment (OS, Browser, Node.js version, PostgreSQL version).
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Screenshots, logs, or error stack traces if applicable.

---

## 📜 Code Review Guidelines

All Pull Requests require:

1. Approval from at least one core maintainer.
2. Passing all CI tests (linting, tests, build).
3. Compliance with our [Coding Standards](./docs/coding-standards.md).
