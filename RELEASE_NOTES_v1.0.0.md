# v1.0.0 - Initial Launch 🚀

## 🎉 Initial Release

The first public release of Zombie Port Killer (zkill) - the cross-platform CLI tool for killing zombie processes blocking your ports.

**Stop Googling "how to kill port process" every day. Just run `zkill 3000`.**

## Installation

```bash
npm install -g zombie-port-killer
```

## Core Features

- **Kill Command** - Kill process on specific port with `zkill <port>`
- **Scan Command** - List all active ports with `zkill scan`
- **List Command** - Show port-to-project mappings with `zkill list`
- **Info Command** - Display system and project information with `zkill info`
- **Auto-Kill Command** - Manage auto-kill on project switch with `zkill auto`

## Platform Support

- ✅ **macOS** - Full support using `lsof` and `ps` commands
- ✅ **Linux** - Full support using `ss`/`netstat` and `ps` commands
- ✅ **Windows** - Full support using `netstat` and `tasklist`/`taskkill` commands

## Smart Features

- **Project Awareness** - Automatically detects and remembers which ports belong to which projects
- **Project Detection** - Supports Node.js, Python, Ruby, Go, Rust, PHP, Java projects
- **Safe Mode** - Confirmation prompts before killing processes
- **Critical Process Detection** - Warns before killing system processes
- **Auto-Kill on Project Switch** - Optional feature to automatically clean up zombie processes

## User Experience

- **Interactive Prompts** - User-friendly confirmation dialogs
- **Color-Coded Output** - Clear, readable terminal output with colors
- **Loading Spinners** - Visual feedback during operations
- **Comprehensive Error Messages** - Clear guidance when things go wrong
- **Help System** - Built-in help with `--help` flag

## Performance

- Fast and lightweight
- Uses your system's built-in commands - no extra dependencies
- Typically detects ports in under 100ms

## Quick Start

```bash
# Kill process on port 3000
zkill 3000

# Kill without confirmation
zkill 3000 --force

# List all active ports
zkill scan

# Show system info
zkill info
```

## What's Next?

See our [roadmap](https://github.com/adeyomilawal/zombie-port-killer#roadmap) for upcoming features in v1.1 and beyond.

## Links

- 📦 [npm package](https://www.npmjs.com/package/zombie-port-killer)
- 📖 [Documentation](https://github.com/adeyomilawal/zombie-port-killer#readme)
- 🐛 [Report issues](https://github.com/adeyomilawal/zombie-port-killer/issues)

---

Made with ❤️ by [Adeyomi Lawal](https://github.com/adeyomilawal)
