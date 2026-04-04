# Contributing to TrustLock

Thank you for your interest in contributing to TrustLock. This project is built for the Stellar ecosystem and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and test coverage.

Please read this guide fully before opening a pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Good First Issues](#good-first-issues)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) Code of Conduct. By participating, you agree to uphold a respectful and inclusive environment for everyone. Harassment, discrimination, or hostile behaviour of any kind will not be tolerated.

---

## How to Contribute

There are several ways to contribute:

- Fix a bug — check the [Issues]() tab for open bugs
- Implement a roadmap feature — see the Roadmap section in the README
- Improve documentation — typos, clarity, missing examples
- Write or improve tests — especially for edge cases
- Review open pull requests

If you are unsure where to start, look for issues labelled `good first issue` or `help wanted`.

---

## Development Setup

### Prerequisites

Make sure you have the following installed:

- **Rust 1.70+** — [https://rustup.rs](https://rustup.rs)
- **WASM target** — `rustup target add wasm32-unknown-unknown`
- **Node.js 18+** — [https://nodejs.org](https://nodejs.org)
- **Stellar CLI** — `cargo install --locked stellar-cli`
- **Freighter Wallet** (for manual testing) — [https://www.freighter.app](https://www.freighter.app)

### Fork and Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/trustlock.git
cd trustlock
```

### Smart Contract

```bash
cd contract

# Check it compiles
cargo check

# Run all tests
cargo test
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Set VITE_CONTRACT_ID in .env to a deployed testnet contract ID

# Start dev server
npm run dev
```

---

## Project Structure

```
trustlock/
├── contract/          # Rust smart contract (Soroban)
│   ├── Cargo.toml
│   └── src/lib.rs
├── frontend/          # React + TypeScript UI
│   └── src/
│       ├── contract.ts
│       └── components/
├── docs/              # Project documentation
├── CONTRIBUTING.md    # This file
├── LICENSE
└── README.md
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for a full breakdown of every file and its purpose.

---

## Branching Strategy

We use a simple feature-branch workflow:

| Branch | Purpose |
| --- | --- |
| `main` | Stable, production-ready code |
| `feat/your-feature` | New features |
| `fix/issue-description` | Bug fixes |
| `docs/what-you-changed` | Documentation only |
| `test/what-you-tested` | Test additions or improvements |

Always branch off `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

Common types:

| Type | When to use |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or updating tests |
| `refactor` | Code change that is not a fix or feature |
| `chore` | Build process, tooling, dependencies |

Examples:

```bash
git commit -m "feat: add arbitrator dispute resolution to contract"
git commit -m "fix: prevent double escrow creation for same buyer"
git commit -m "docs: add Freighter integration guide to DEPLOYMENT.md"
git commit -m "test: add edge case for zero-amount escrow creation"
```

---

## Pull Request Process

1. Ensure your branch is up to date with `main` before opening a PR
2. Make sure all tests pass: `cargo test` (contract) and `npm test` (frontend)
3. Keep PRs focused — one feature or fix per PR
4. Fill out the PR template completely
5. Link the relevant issue in your PR description using `Closes #issue-number`
6. Request a review from a maintainer

PRs that break existing tests, lack a description, or bundle unrelated changes will be asked to revise before merging.

---

## Reporting Bugs

Before opening a bug report, please search existing issues to avoid duplicates.

When filing a bug, include:

- A clear title describing the problem
- Steps to reproduce the issue
- Expected behaviour vs actual behaviour
- Your environment (OS, Rust version, Node version, browser if frontend)
- Any relevant error messages or logs

Open a bug report here: [Issues]()

---

## Suggesting Features

Feature requests are welcome. Open an issue with the label `enhancement` and describe:

- The problem you are trying to solve
- Your proposed solution
- Any alternatives you considered
- Whether you are willing to implement it yourself

Large features should be discussed in an issue before any code is written.

---

## Good First Issues

If you are new to the project or to Soroban development, look for issues tagged:

- `good first issue` — small, well-scoped tasks
- `help wanted` — tasks where maintainer input is available
- `documentation` — no Rust or Soroban knowledge required

Browse them here: [Good First Issues]()

---

Thank you for contributing to TrustLock. Every contribution, no matter how small, helps build safer commerce for everyone.
