# Agent Skills

English | [简体中文](./README.md)

dimple-smile's AI agent skills collection, hosted on [skills.sh](https://skills.sh/dimple-smile/agent-skills).

## Available Skills

### dev-log / dev-log-en

AI debugging collaboration solution. Collects runtime logs via HTTP requests, allowing AI to automatically analyze logs after user operations - no screenshots or console copying needed.

- **dev-log** — Chinese version
- **dev-log-en** — English version

**Supports 14 Languages:** JavaScript, TypeScript, Python, Go, PHP, Ruby, Java, C++, C#, Rust, Swift, Kotlin, Dart, R

**Problem Solved:**

Traditional debugging requires developers to open the console, take screenshots, or copy output to send to AI - inefficient. dev-log collects logs via HTTP service, allowing AI to **read logs directly** without manual user intervention.

**Use Cases:**
- Debug/verify code
- Trace async flows (fetch, Promise, async/await)
- Validate logic (form validation, state updates, conditions)
- View variable values (especially dynamic or user input)

**Features:**
- Auto-start HTTP log server (random port)
- Tunnel support (HTTPS pages / remote access)
- Session isolation (sessionId filtering)
- Multi-language templates
- Sensitive data filtering

**Typical Workflow:**

1. **Describe Problem** - "Help me debug xxx issue"
2. **Auto Logging** - AI adds log collection at key points
3. **Wait for Action** - AI says "Logs added, please operate"
4. **Complete Action** - User says "I've completed the operation"
5. **Auto Analysis** - AI reads logs and analyzes the issue

No screenshots or log copying needed - AI handles debugging autonomously.

### llm-wiki / llm-wiki-en

Turn your LLM into a Wiki maintainer. The LLM incrementally builds and maintains a persistent, interconnected Markdown knowledge base. Knowledge is compiled once and continuously updated, rather than re-derived each time.

- **llm-wiki** — Chinese version
- **llm-wiki-en** — English version

**Inspired by:**
- [Karpathy - LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Incremental knowledge base architecture
- [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) — Knowledge compounding

**5 Operations:**

| Operation | Purpose |
|-----------|---------|
| `init` | Initialize knowledge base directory and templates |
| `ingest` | Ingest new materials, extract knowledge into the Wiki |
| `compound` | Document problem-solving experiences (Bug Track / Knowledge Track) |
| `query` | Answer questions based on Wiki content, archive valuable answers as topic pages |
| `lint` | Health check: contradictions, orphan pages, missing concepts, etc. |

**Use Cases:**
- Academic research, reading notes, competitive analysis
- Engineering practice documentation (bug fixes, best practices)
- Long-term topic research with knowledge accumulation

**Typical Workflow:**

1. **Initialize** - "Help me create a wiki" → AI creates directory structure and templates
2. **Ingest Materials** - User provides articles/papers/links → AI extracts knowledge, creates entity pages, concept pages, source summaries
3. **Compound Experience** - Say "Fixed it" after solving a problem → AI auto-documents as Bug Track or Knowledge Track
4. **Query Knowledge** - "What's the difference between X and Y?" → AI synthesizes from multiple pages, archives valuable answers as topic pages
5. **Health Check** - "Check the wiki" → AI detects contradictions, orphan pages, missing concepts, suggests fixes

## Installation

```bash
npx skills add dimple-smile/agent-skills
```

## Links

- [Skills Directory](https://skills.sh/dimple-smile/agent-skills)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)

## License

ISC
