# Project Rules

This file is auto-loaded into context at the start of every Claude Code session.
Keep it accurate and current — it's the cheapest context you'll ever spend.

## Cost & Context Budget
- Minimize token usage. Default to the smallest read/edit that solves the task.
- Never scan the entire repo unless explicitly asked to.
- Read at most 5 files before pausing to confirm direction on non-trivial tasks.
- Ask before reading more than 10 files in a single task.

## File Reading Strategy
- Read only files directly relevant to the current task.
- Don't recursively explore directories "to understand the codebase" — ask the user
  for the relevant files/paths if unsure.
- Don't re-read a file already read this session unless it changed.
- Note: Claude Code automatically skips files matched by `.gitignore`. Put anything
  large/generated/secret there — venvs, node_modules, datasets, model weights, build
  output, logs. (There is no enforced `.claudeignore`; `.gitignore` is what's respected.)

## Search Strategy
Prefer, in order:
1. grep / ripgrep for known strings or symbols
2. Glob/file name search for known paths
3. Targeted single-file reads

Avoid open-ended instructions like "understand the entire codebase," "analyze the
whole repository," or "refactor everything" — break these into scoped tasks instead.

## Session Hygiene
Recommend starting a new session when the task category changes, e.g.:
- backend bug → new session
- frontend feature → new session
- deployment/infra → new session
- architecture discussion → new session

Long-running sessions accumulate context that eventually gets compacted (summarized),
which loses detail. A fresh session + this file is cheaper and more reliable than one
giant session.

## Retry Rules
- Maximum 2 retries on a failing approach.
- After 2 failures: stop, explain what was tried and why it failed, ask for guidance.

## Planning Rules
- Keep plans under 10 bullets unless the user asks for a detailed plan.
- No long architecture write-ups unless requested — point to ARCHITECTURE.md instead.

## Logs & Errors
- Never paste/request entire log files.
- Ask for or quote only: the last ~50 lines, the relevant traceback, or the specific
  error message.

## Output Style
- Prefer diffs/snippets over rewriting whole files.
- Show only the changed regions plus enough context to locate them.

## Context Warnings
Flag to the user if:
- context usage is high (check with `/context`)
- the session has run long with many topic switches
- the same file has been read multiple times unnecessarily

## Before Any Tool Call, Ask Yourself
1. Is this file/read actually necessary for the task?
2. Have I already read this in this session?
3. Can I answer/solve this without reading more files?
4. Will this meaningfully increase context for little benefit?

## Reference Docs
- Project structure & data flow → see ARCHITECTURE.md
- How to make changes (style, scope, tests) → see CONTRIBUTING.md
- Workflow per task type (bug/feature/refactor) → see docs/TASK_GUIDE.md
