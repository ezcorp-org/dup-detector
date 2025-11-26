# Duplicate File Detector

A fast, efficient, cross-platform desktop application for detecting and removing duplicate files. Built with Tauri (Rust backend) and Svelte (frontend).

## Features

- **Fast Scanning**: Parallel directory scanning and MD5 hashing using Rayon
- **Smart Detection**: Size-based pre-filtering to minimize unnecessary hashing
- **Safe Deletion**: Move files to system trash/recycle bin by default
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Responsive UI**: Real-time progress updates, never blocks the UI
- **Flexible Filtering**: Filter by file size, extensions, and symlink handling

## Prerequisites

### All Platforms
- [Node.js](https://nodejs.org/) v18 or later
- [Rust](https://www.rust-lang.org/tools/install) 1.70 or later
- npm (comes with Node.js)

### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
    libxdo-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl \
    appmenu-gtk-module libappindicator-gtk3 librsvg
```

### macOS
- Xcode Command Line Tools: `xcode-select --install`

### Windows
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2 (comes pre-installed on Windows 10/11)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd dup-detector

# Install dependencies
npm install
```

## Development

```bash
# Start development server with hot reload
npm run tauri dev

# Type check frontend
npm run check

# Run frontend unit tests
npm run test:unit

# Run frontend unit tests with coverage
npm run test:unit:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test
```

## Building

```bash
# Build for production
npm run tauri build
```

Production binaries will be in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` and `.app` bundle
- **Linux**: `.deb`, `.rpm`, and `.AppImage`

## Project Structure

```
dup-detector/
├── src/                          # Svelte frontend
│   ├── lib/
│   │   ├── api/                  # Tauri API wrappers
│   │   ├── components/           # Svelte components
│   │   ├── stores/               # Svelte stores
│   │   └── types/                # TypeScript types
│   ├── App.svelte                # Root component
│   ├── app.css                   # Global styles
│   └── main.ts                   # Entry point
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands.rs           # Tauri command handlers
│   │   ├── duplicates/           # Duplicate detection logic
│   │   ├── error.rs              # Error types
│   │   ├── hasher/               # MD5 hashing module
│   │   ├── lib.rs                # Library root
│   │   ├── main.rs               # Entry point
│   │   ├── scanner/              # Directory scanning
│   │   ├── state.rs              # App state management
│   │   └── types.rs              # Shared data types
│   ├── benches/                  # Performance benchmarks
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── tests/                        # E2E tests
├── package.json                  # Node.js dependencies
└── README.md
```

## Architecture

### Backend (Rust)

The Rust backend is organized into focused modules:

- **scanner**: Recursive directory traversal with filtering
- **hasher**: Buffered MD5 hashing with parallel processing
- **duplicates**: Hash-based grouping and result calculation
- **commands**: Tauri command handlers exposed to frontend
- **state**: Thread-safe application state management

### Frontend (Svelte)

The Svelte frontend follows a component-based architecture:

- **stores**: Centralized state management with Svelte stores
- **api**: Type-safe wrappers around Tauri invoke/events
- **components**: Reusable UI components

### Communication

- Frontend invokes Rust commands via Tauri's IPC
- Backend emits events for real-time progress updates
- All data is serialized as JSON with camelCase naming

## Algorithm

1. **Scan**: Recursively walk selected directories
2. **Filter**: Apply size/extension filters during scan
3. **Group by Size**: Files with unique sizes can't be duplicates
4. **Hash**: Parallel MD5 hashing only for size-matched files
5. **Group by Hash**: Files with identical hashes are duplicates
6. **Sort**: Order groups by wasted space (descending)

## Testing

### Unit Tests (Rust)
```bash
cd src-tauri
cargo test
```

### Unit Tests (Frontend)
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### Benchmarks
```bash
cd src-tauri
cargo bench
```

## License

MIT
