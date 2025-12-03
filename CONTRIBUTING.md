# Contributing to 9Octopus CLI

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to 9Octopus CLI. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## 🛠️ Development Setup

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/9octopus-cli-oss.git
    cd 9octopus-cli-oss
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Run the project in development mode**:
    ```bash
    npm run dev
    ```
    This will start the TypeScript compiler in watch mode. You can then run the CLI using:
    ```bash
    ./dist/cli.js
    ```

## 🧪 Running Tests

We use `ava` for testing. To run the test suite:

```bash
npm test
```

Please ensure all tests pass before submitting a Pull Request.

## 📂 Project Structure

- `src/core`: Core logic (API, Session, Tools).
- `src/ui`: Ink-based UI components.
- `src/hooks`: Custom React hooks.
- `src/test`: Unit tests.

## 🚀 Submitting a Pull Request

1.  Create a new branch for your feature or fix: `git checkout -b feature/amazing-feature`.
2.  Commit your changes: `git commit -m 'Add some amazing feature'`.
3.  Push to the branch: `git push origin feature/amazing-feature`.
4.  Open a Pull Request on GitHub.

## 📝 Style Guide

- We use **Prettier** for code formatting.
- We use **XO** for linting.
- Please write clear, concise commit messages.

## 🐛 Reporting Bugs

If you find a bug, please open an issue on GitHub with:

- A clear title.
- Steps to reproduce.
- Expected vs. actual behavior.
- Your environment details (OS, Node version).

Thank you for contributing!
