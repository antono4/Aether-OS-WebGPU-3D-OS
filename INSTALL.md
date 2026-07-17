# Aether OS - Installation Guide

## Prerequisites

Before installing Aether OS, ensure you have the following:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Git | 2.0+ | For version control |
| Modern Browser | Chrome 94+ / Firefox 94+ / Safari 15+ | WebGPU support required |

### Optional Dependencies

| Software | Purpose | Required |
|----------|---------|----------|
| Rust | Desktop app (Tauri) | No |
| Docker | Containerized development | No |
| Ollama | Local LLM inference | No |
| SQLite | Desktop database | Via Tauri |

---

## Installation Methods

### Method 1: Web Browser (Recommended)

```bash
# Clone the repository
git clone https://github.com/antono4/Aether-OS.git
cd Aether-OS/spatial-canvas

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Method 2: Desktop App (Tauri)

#### Prerequisites
```bash
# Install Rust (Linux/macOS)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows: Download from https://rustup.rs

# Verify installation
rustc --version
cargo --version
```

#### Build Desktop App
```bash
# Navigate to project
cd Aether-OS/spatial-canvas

# Install dependencies
npm install

# Build Tauri app
npm run tauri:build

# Run the built app
npm run tauri
```

### Method 3: Docker

```bash
# Build image
docker build -t aether-os .

# Run container
docker run -p 5173:80 aether-os

# Open http://localhost:5173
```

Or use docker-compose:

```bash
docker-compose up -d
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Keys (optional - AI features will work without these)
CLAUDE_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key

# Ollama (optional - for local LLM)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3

# Storage
STORAGE_TYPE=indexeddb  # or 'sqlite' for desktop

# Features
ENABLE_ANALYTICS=false
ENABLE_TELEMETRY=false

# Collaboration (optional)
COLLAB_WS_URL=wss://your-collab-server.com
```

### AI Configuration

#### Option 1: Claude API
1. Get API key from [ Anthropic Console](https://console.anthropic.com/)
2. Add to `.env`: `CLAUDE_API_KEY=sk-...`
3. Restart the app

#### Option 2: OpenAI API
1. Get API key from [OpenAI](https://platform.openai.com/)
2. Add to `.env`: `OPENAI_API_KEY=sk-...`
3. Restart the app

#### Option 3: Local Ollama
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama3`
3. Start Ollama: `ollama serve`
4. No API key needed!

---

## Development Setup

### IDE Setup

#### VS Code (Recommended)
Install extensions:
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- GitLens

Recommended settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

#### WebStorm
- Enable TypeScript
- Enable ESLint
- Configure Prettier as formatter

### Git Hooks

We use Husky for Git hooks:

```bash
# Install Husky (if not installed)
npx husky install

# Hooks will run:
# - pre-commit: lint + format
# - commit-msg: validate commit message
```

---

## Troubleshooting

### WebGPU Not Supported

If you see "WebGPU not available":

1. **Chrome**: Enable WebGPU at `chrome://flags/#enable-unsafe-webgpu`
2. **Firefox**: WebGPU not yet supported, use Chrome/Edge
3. **Safari**: Enable Develop > Experimental Features > WebGPU

### Build Errors

```bash
# Clear cache
rm -rf node_modules
npm cache clean --force
npm install
```

### TypeScript Errors

```bash
# Regenerate types
rm -rf tsconfig.tsbuildinfo
npm run build
```

### Ollama Connection Issues

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull model if needed
ollama pull llama3
```

---

## Production Build

### Web App

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Output in dist/ directory
```

Deploy the `dist/` folder to any static hosting:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

### Docker Production

```bash
# Production build
docker build -t aether-os:prod .

# Run with environment file
docker run -p 443:443 --env-file .env aether-os:prod
```

### Tauri App

```bash
# Build for your platform
npm run tauri:build

# Output in src-tauri/target/release/
```

---

## Verification

After installation, verify:

1. **App Loads**: Open browser to `http://localhost:5173`
2. **3D Canvas**: Should see dark background with floating nodes
3. **Command Bar**: Press Ctrl+K or click bottom bar
4. **Create Node**: Type "Hello" and press Enter
5. **AI Works**: Type "Tell me a joke" (if API key configured)

---

## Next Steps

- Read the [Quick Start Guide](docs/QUICKSTART.md)
- Explore the [API Documentation](docs/API.md)
- Check out [Architecture Overview](docs/ARCHITECTURE.md)
- Join our [Discord](https://discord.gg/aether-os) for help

---

## Support

- **Issues**: [GitHub Issues](https://github.com/antono4/Aether-OS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/antono4/Aether-OS/discussions)
- **Documentation**: [docs/](docs/)
