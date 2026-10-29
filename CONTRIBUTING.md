# Contributing to TTLOCK Dashboard

Thank you for your interest in contributing to **TTLOCK Dashboard**! We welcome community contributions, bug reports, feature proposals, and documentation enhancements.

---

## 🧭 Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to **helmipraditaa@gmail.com**.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v22.x LTS (compatible with native test runner)
- **Docker & Docker Compose**: v2.x+
- **Git**

### 2. Fork and Clone
```bash
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard
```

### 3. Environment Configuration
Copy the template configuration in the `backend/` folder:
```bash
cp backend/.env.example backend/.env
```
Fill in valid sandbox or development TTLOCK credentials (`TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET`, `TTLOCK_USERNAME`, `TTLOCK_PASSWORD_MD5`).

---

## 🌿 Git Branching & Workflow

We follow standard trunk-based branching with `dev` as the integration branch:

1. **`dev` is the Single Source of Truth**: All feature and bugfix branches must branch from `dev`.
2. **Branch Naming Conventions**:
   - Features: `feat/<short-description>` (e.g., `feat/battery-alert-webhook`)
   - Bugfixes: `fix/<short-description>` (e.g., `fix/rssi-stale-calc`)
   - Documentation: `docs/<short-description>`
   - Refactoring: `refactor/<short-description>`
3. **Target Pull Requests to `dev`**: Always target pull requests to the `dev` branch. Releases will be promoted from `dev` to `main`.

---

## 🧪 Testing & Code Quality

Before opening a pull request, ensure all tests and linters pass cleanly:

### Backend
```bash
cd backend
npm install
npm test        # Runs native Node.js 22 test suite
npm run build   # Type-checks and compiles TypeScript
```

### Frontend (Web)
```bash
cd web
npm install
npm test        # Runs native format and utility test suite
npm run lint    # Runs oxlint static analysis
npm run build   # Runs TypeScript typecheck & Vite production build
```

---

## 📝 Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

- Optional bullet point detail 1
- Optional bullet point detail 2
```

Common types:
- `feat`: New user-facing feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `refactor`: Code restructuring without behavioral changes
- `chore`: Tooling, lockfile, or repository maintenance

---

## 🚀 Submitting a Pull Request

1. Push your changes to your feature branch on your fork:
   ```bash
   git push origin feat/your-feature
   ```
2. Open a Pull Request against the `dev` branch on GitHub.
3. Fill out the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Maintainers will review your contribution, suggest adjustments if necessary, and merge once continuous integration checks succeed.
