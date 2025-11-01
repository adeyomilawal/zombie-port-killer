# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-01

### 🎉 Initial Release

The first public release of Zombie Port Killer (zkill) - the cross-platform CLI tool for killing zombie processes blocking your ports.

### Added

#### Core Features

- **Kill Command** - Kill process on specific port with `zkill <port>`
- **Scan Command** - List all active ports with `zkill scan`
- **List Command** - Show port-to-project mappings with `zkill list`
- **Info Command** - Display system and project information with `zkill info`
- **Auto-Kill Command** - Manage auto-kill on project switch with `zkill auto`

#### Platform Support

- ✅ **macOS** - Full support using `lsof` and `ps` commands
- ✅ **Linux** - Full support using `ss`/`netstat` and `ps` commands
- ✅ **Windows** - Full support using `netstat` and `tasklist`/`taskkill` commands

#### Smart Features

- **Project Awareness** - Automatically detects and remembers which ports belong to which projects
- **Project Detection** - Supports Node.js, Python, Ruby, Go, Rust, PHP, Java projects
- **Safe Mode** - Confirmation prompts before killing processes
- **Critical Process Detection** - Warns before killing system processes
- **Auto-Kill on Project Switch** - Optional feature to automatically clean up zombie processes

#### User Experience

- **Interactive Prompts** - User-friendly confirmation dialogs
- **Color-Coded Output** - Clear, readable terminal output with colors
- **Loading Spinners** - Visual feedback during operations
- **Comprehensive Error Messages** - Clear guidance when things go wrong
- **Help System** - Built-in help with `--help` flag

#### Configuration

- **Persistent Storage** - Configuration stored in `~/.zkill/config.json`
- **Port Mappings** - Automatic tracking of port-to-project associations
- **Auto-Kill Settings** - Toggle auto-kill globally or per-port
- **Confirmation Settings** - Disable confirmation prompts if desired

### Technical Details

- Built with TypeScript for type safety
- Cross-platform adapter pattern for OS-specific implementations
- Zero external system dependencies (uses built-in OS commands)
- Fast performance (<100ms port detection)
- Small footprint (<50MB memory usage)

### Known Limitations

- Multiple port kill not yet supported (coming in v1.1)
- No GUI interface (CLI only in v1.0)
- No remote server support (local only)

---

## [1.1.0] - 2025-11-01

### 🎉 Epic 2: Port Scanning Filters Complete!

This release adds powerful filtering capabilities to the scan command, making it easier than ever to find exactly the ports you're looking for.

### Added

#### Scan Filtering Features

- **Port Range Filter** - Filter ports by range: `zkill scan --range 3000-9000`

  - Focus on specific port ranges (e.g., development ports 3000-8000)
  - Perfect for microservices developers managing multiple ports

- **Process Name Filter** - Filter by process name: `zkill scan --process node`

  - Find all processes of a specific type (node, python, ruby, etc.)
  - Case-insensitive partial matching

- **System Process Filter** - Hide system processes: `zkill scan --no-system`

  - Clean output showing only development servers
  - Hides databases, web servers, and system services

- **Combined Filters** - Use multiple filters together

  - Combine range, process name, and system filters
  - Example: `zkill scan --range 3000-9000 --process node --no-system`
  - Visual indicator shows all active filters

- **Active Filter Display** - Shows which filters are currently applied
  - Clear feedback about what's being filtered
  - Better user experience and transparency

### Improved

- Enhanced scan output with filter indicators
- Better error messages for invalid filter inputs
- Improved documentation with filter examples

### Technical Details

- Zero breaking changes - fully backward compatible
- Performance: Filter overhead <10ms
- All existing functionality preserved

---

## [Unreleased]

### Planned for v1.2

- Kill multiple ports in one command: `zkill 3000 8000 5432`
- Kill by process name: `zkill --name node`
- JSON output mode: `zkill scan --json`
- Homebrew distribution (macOS)
- APT/YUM distribution (Linux)
- Chocolatey distribution (Windows)

### Planned for v1.3

- VSCode extension
- Shell completions (bash, zsh, fish)
- Docker container integration
- Improved Windows performance

---

## Release Notes

### v1.0.0 - "Initial Launch" 🚀

This is the first public release of zkill! After extensive development and testing, we're ready to help developers worldwide stop wasting time on port conflicts.

**What makes zkill special?**

- Works identically on Mac, Linux, and Windows
- One command instead of Googling every time
- Learns your projects and automates cleanup
- Fast, safe, and developer-friendly

**Installation:**

```bash
npm install -g zombie-port-killer
```

**Quick Start:**

```bash
zkill 3000        # Kill process on port 3000
zkill scan        # List all active ports
zkill auto enable # Enable auto-kill
```

**Feedback & Support:**

- 🐛 Report bugs: [GitHub Issues](https://github.com/adeyomilawal/zombie-port-killer/issues)
- 💡 Request features: [GitHub Discussions](https://github.com/adeyomilawal/zombie-port-killer/discussions)
- 📧 Email: lawaladeyomio@gmail.com

**Thank you** for trying zkill! We'd love to hear your feedback.

---

[1.1.0]: https://github.com/adeyomilawal/zombie-port-killer/releases/tag/v1.1.0
[1.0.0]: https://github.com/adeyomilawal/zombie-port-killer/releases/tag/v1.0.0
