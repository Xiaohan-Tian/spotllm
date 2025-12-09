<img src="https://github.com/Xiaohan-Tian/spotllm/blob/main/icon.png?raw=true" width="256" height="256" alt="SpotLLM Icon">

# SpotLLM

## Introduction

SpotLLM is a powerful desktop application that brings AI assistance to your fingertips through a Spotlight-style interface. It provides instant access to various AI models (including GPT-4, Claude, and Gemini) through a quick global hotkey, making AI interactions seamless and efficient.

### Key Features

- **Quick Access**: 
  - Launch with a customizable global hotkey (default: Shift+Space)
- **Multiple AI Models Support**:
  - OpenAI GPT-5 family (5.1, Chat Latest, Codex, Mini, Nano) plus GPT-4o variants
  - Anthropic Claude 4.5 (Sonnet, Opus, Haiku) and Claude 3.5 (Sonnet, Opus, Haiku)
  - Google Gemini 3 Pro Preview, 2.5 Flash (regular & Lite), 2.0 Flash (regular & Lite), and 1.5 family (Pro, Flash, Flash 8B)
  - Private OpenAI-compatible servers
- **Customizable Templates**:
  - Create and manage reusable prompt templates
  - Assign shortcuts (e.g., "/translate") and hotkeys to templates
  - Support for variables: {content}, {clipboard}, {date}, {time}
  - JSON response parsing for structured outputs
- **Rich Media Support**:
  - Image input support through clipboard (Ctrl/Cmd + V)
  - Markdown rendering for responses
- **User-Friendly Interface**:
  - Clean, modern UI with dark theme
  - Copy responses with one click

## Installation

### Download the Source Code

```bash
git clone https://github.com/Xiaohan-Tian/spotllm.git
cd spotllm
```

### System Requirements

- **Operating System**: macOS 14 (Sonoma) or later
- **Node.js**: v20.18.0 or later

### Running from Source

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm start
```

### Packaging the Application

To create a distributable package:

```bash
npm run dist
```

This will create two files in the `dist` directory:
- `SpotLLM-1.0.0.dmg`: Installer package
- `SpotLLM-1.0.0-mac.zip`: Portable version

You can install the app by double-clicking the `.dmg` file, dragging the app to the Applications folder, or by running the `.app` file.

### Running on macOS (Security Bypass)

Since the app isn't signed with an Apple Developer certificate, macOS might show a security warning when you try to open it. To bypass this:

1. When you first try to open the app, right-click (or Control-click) on the app icon and select "Open"
2. macOS will show a warning saying it "cannot be opened because the developer cannot be verified"
3. Click "Open" in the warning dialog
4. The app will launch and future launches will work normally without requiring these steps

Note: You only need to do this once. After that, the app will open normally.

### Settings Migration (Optional)

If you're sharing settings between computers, the configuration file is located at:
`~/Library/Application Support/spotllm/config.json`

To transfer settings:
1. Copy this file from your existing installation
2. Place it in the same location on the new computer after installing but before running SpotLLM for the first time

## Usage

### SpotLLM Window Basics

The SpotLLM Window is your primary interface for interacting with AI models. Here's how to use it:

#### Opening the Window
- Press `Shift+Space` (default hotkey, customizable in Settings) or click the icon in the menu bar -> SpotLLM to open the SpotLLM Window
- The window appears in the center of your screen with a text input field

#### Basic Input
- Type your message and press `Enter` to send
- For multi-line input, press `Shift+Enter` to add a new line

#### Working with Images
- Copy an image to your clipboard (from any source)
- Press `Ctrl/Cmd + V` to paste the image
- Click the × button on the preview to remove the image
- When you send your message, the image will be included in your prompt

#### Conversation Features
- Each conversation shows user messages and AI responses in a chat-like interface
- Click the copy button (bottom right) to copy the last response
- Click the + button (bottom right) or press `Ctrl/Cmd + N` to start a new conversation

#### Quick Actions
- Press `Esc` to hide the window
- Press `Ctrl/Cmd + C` or click the copy button on the bottom right to copy the last response (when no text is selected)
- Click outside the window to dismiss it (configurable in Settings)

### Using Templates

Templates provide quick access to predefined prompts. You can:
- Type `/` followed by your template shortcut (e.g., `/translate`)
- Use assigned template hotkeys (if configured)
- Templates support variables like {content}, {clipboard}, {date}, and {time}

Note: The SpotLLM Window preserves your conversation history until you explicitly start a new conversation or close the window.

### Settings Window

The Settings window provides comprehensive configuration options for SpotLLM. You can access it by clicking the menu bar icon and selecting "Settings". The settings are organized into three sections:

#### General Settings
- **Model Selection**: Choose your preferred AI model from the available options: (require restart to take effect)
  - OpenAI models (GPT-5.1, GPT-5.1 Chat Latest, GPT-5.1 Codex, GPT-5 Mini, GPT-5 Nano, GPT-4o, GPT-4o-mini)
  - Google Gemini models (3 Pro Preview, 2.5 Flash, 2.5 Flash Lite, 2.0 Flash, 2.0 Flash Lite, 1.5 Pro, 1.5 Flash, 1.5 Flash 8B)
  - Anthropic Claude models (4.5 Sonnet, 4.5 Opus, 4.5 Haiku, 3.5 Sonnet, 3.5 Opus, 3.5 Haiku)
  - Private OpenAI-compatible server option
- **API Key**: Enter your API key for the selected model (require restart to take effect)
- **Host URL**: (Only visible when using a private server) Specify your server's base URL

#### Behavior Settings
- **Hide on Click Outside**: Choose whether the SpotLLM window should automatically hide when clicking outside
- **Auto Copy**: Enable/disable automatic copying of selected text before opening the SpotLLM window
- **SpotLLM Window Hotkey**: Set your preferred global hotkey combination
  - Click the input field to record a new hotkey
  - Press at least two keys simultaneously
  - Press ESC to cancel recording

#### Templates Settings
- **Template Management**:
  - Use the dropdown menu to select and edit existing templates
  - Click the + button to create a new template
- **Template Configuration**:
  - **Shortcut**: Define the command (e.g., "translate" for "/translate")
  - **Name**: Give your template a descriptive name
  - **Hotkey**: Assign a global hotkey to instantly trigger this template
  - **Response Key**: Specify a key for parsing JSON responses (optional)
  - **Template Content**: Write your template using Markdown format
    - Use variables: {content}, {clipboard}, {date}, {time}
    - Preview Markdown formatting in real-time
- **Template Actions**:
  - Save: Click to save your template changes
  - Delete: Remove the selected template (requires confirmation)

All settings are automatically saved and take effect immediately (except for switching models or updating API keys). Template hotkeys are registered as soon as you save a template, and the main SpotLLM hotkey is updated as soon as you set it.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## Roadmap

The following features and improvements are planned for future releases:

- **GitHub Actions (CI/CD)**: Automated build and testing pipeline; Automated release creation.
- **Enhanced Memory System**: Persistent conversation memory across sessions; Context-aware responses based on chat history.
- **Advanced Image Capabilities**: Support for multiple image inputs in a single prompt.
- **Chat History Management**: Searchable conversation history; Export/import conversation logs.
- **Advanced Clipboard Integration**: Auto-copy selected text before launching; Smart paste detection and formatting; Clipboard history integration.

## License

This project is open-sourced under the MIT License - see the LICENSE file for details.

## Author

Xiaohan "Clement" Tian ([GitHub](https://github.com/Xiaohan-Tian))
