# SpotLLM Agent Instructions

## Project Overview
Electron desktop app for AI model interactions (GPT, Claude, Gemini). Uses factory pattern for LLM abstraction with spotlight-style UI.

## Essential Commands
- `npm start` - Run Electron app
- `npm test` - Run Jest tests (coverage enabled by default)
- `npm run dist` - Build DMG and ZIP distributables

## Architecture
- **Entry points**: `main.js` (main process), `preload.js` (IPC bridge)
- **LLM Factory**: `LLM.create(apiKey, model, hostUrl)` instantiates:
  - `GPTLLM` for GPT/private models
  - `GeminiLLM` for Gemini models
  - `ClaudeLLM` for Claude models
- **Model mappings**: `res/model.json` maps user-friendly names to API model names
- **Settings storage**: `~/Library/Application Support/spotllm/config.json` via electron-store
- **Windows**: `windows/spotlight.*` (AI chat), `windows/settings.*` (configuration)

## Testing
- Test pattern: `__tests__/**/*.js` or `**/*.(spec|test).js`
- LLM tests mock electron modules extensively
- Known issue: Gemini LLM test is commented out in `__tests__/llm.test.js:119-123`
- LLM constructor loads model mappings from `res/model.json` on first instantiation

## Model Identification
LLM factory matches models by checking if model name contains (order matters):
- "gpt" or "private" → GPTLLM (private checked first, so private servers use GPTLLM)
- "gemini" → GeminiLLM
- "claude" → ClaudeLLM

## Template Variables
Templates support these placeholders (applied via `LLM.applyTemplate()`):
- `{content}` - User input after template shortcut
- `{clipboard}` - System clipboard content
- `{date}` - YYYY-MM-DD format
- `{time}` - HH:MM:SS format
