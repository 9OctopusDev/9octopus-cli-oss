# 9Octopus CLI - The AI Coding Agent for Your Terminal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**9Octopus CLI** is a powerful, open-source AI coding agent that lives in your terminal. It empowers developers to interact with Large Language Models (LLMs) directly from the command line, enabling seamless coding assistance, file manipulation, and system automation.

Whether you want to use our backend service or connect directly to your favorite LLM provider (OpenAI, Anthropic) with your own API keys, 9Octopus gives you the flexibility and power you need.

## 🚀 Key Features

- **🤖 AI Agent in Your Terminal**: Chat with advanced LLMs without leaving your workflow.
- **🔌 Direct LLM Connection (BYOK)**: Connect directly to OpenAI or Anthropic using your own API keys. No middleman required.
- **🛠️ Tool Integration**: The agent can read files, write code, run shell commands, and search your codebase.
- **🧠 Custom System Prompts**: Tailor the agent's personality and capabilities with a `9octopus.system.md` file.
- **🔒 Privacy First**: In Direct Mode, your data goes straight to the LLM provider.
- **⚡ LangGraph Powered**: Built on the robust LangGraph framework for reliable agentic workflows.

## 📦 Installation

```bash
npm install --global @9octopus/octopus-cli
```

## 🛠️ Usage

### 1. Configuration

Before you start, you can configure your preferred model and provider.

**Direct Mode (Recommended for Developers)**
To use 9Octopus with your own API keys, simply set the environment variables:

```bash
export 9OCTOPUS_SERVICE=false
export OPENAI_API_KEY=your_openai_key
# OR
export ANTHROPIC_API_KEY=your_anthropic_key
export GOOGLE_API_KEY=your_google_api_key
export GROK_API_KEY=your_grok_api_key
```

### 2. Basic Commands

Start the interactive chat session:

```bash
octopus-cli
```

### 3. In-Chat Commands

Once inside the CLI, you can use slash commands to control the agent:

- `/models`: List and manage available models.
- `/clear`: Clear the conversation history.
- `/help`: Show available commands.
- `/exit`: Exit the CLI.

### 4. Custom System Prompt

Want to customize how 9Octopus behaves? Create a `9octopus.system.md` file in your project root. The agent will read this file and use it as its system prompt.

```markdown
# 9octopus.system.md

You are a senior React developer. Always prefer functional components and hooks.
```

## 🏗️ Architecture

9Octopus is built with a modular architecture:

- **Core**: Handles API communication, session management, and tool execution.
- **UI**: Built with [Ink](https://github.com/vadimdemedes/ink) for a rich terminal user interface.
- **Agent**: Powered by [LangGraph](https://langchain-ai.github.io/langgraph/) to manage conversation state and tool usage.

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by the 9Octopus Team
</p>
