# 🧟 Zombie Port Killer (zkill)

**Kill zombie processes blocking your ports - instantly.**

Stop Googling "how to kill port process" every single day. `zkill` does it in one command, across all platforms.

```bash
# That's it. Problem solved.
zkill 3000
```

---

## Why zkill?

Every developer faces this:

```
Error: Port 3000 is already in use
```

Then you:

1. Google "kill port process macos" (for the 100th time)
2. Copy-paste `lsof -ti :3000 | xargs kill -9`
3. Hope it works
4. Repeat tomorrow

**With zkill:**

```bash
zkill 3000
```

Done. Across Mac, Linux, and Windows.

---

## Features

✅ **Cross-platform** - Works on macOS, Linux, and Windows
✅ **One command** - `zkill 3000` and you're done
✅ **Smart detection** - Shows what process is using the port
✅ **Project awareness** - Remembers which ports belong to which projects
✅ **Auto-kill** - Automatically clean up when switching projects
✅ **Safe** - Confirms before killing, warns about system processes
✅ **Fast** - Pure TypeScript, no external dependencies needed

---

## Installation

### npm (Recommended)

```bash
npm install -g zombie-port-killer
```

### Yarn

```bash
yarn global add zombie-port-killer
```

### pnpm

```bash
pnpm add -g zombie-port-killer
```

### Verify Installation

```bash
zkill --version
```

---

## Quick Start

### Kill a process on a specific port

```bash
zkill 3000
```

**Output:**

```
✔ Port 3000 is in use

Process Details:
  Process:  node
  PID:      12345
  Command:  /usr/local/bin/node server.js
  User:     developer

? Are you sure you want to kill process 12345? (y/N) y

✔ Process 12345 terminated successfully

Port 3000 is now available.
```

### Kill without confirmation

```bash
zkill 3000 --force
# or
zkill 3000 -f
```

### List all active ports

```bash
zkill scan
```

**Output:**

```
📊 Active Ports (3 found):

Port 3000 - node (my-react-app)
     PID: 12345
     Command: /usr/local/bin/node server.js
     User: developer

Port 8000 - python3
     PID: 12346
     Command: python3 manage.py runserver
     User: developer

Port 5432 - postgres
     PID: 234
     Command: /usr/lib/postgresql/14/bin/postgres
     User: postgres
```

### Show port-to-project mappings

```bash
zkill list
```

**Output:**

```
📋 Port Mappings (3 configured):

Port 3000 → my-nextjs-app
     /Users/dev/projects/my-nextjs-app
     Last used: 2 hours ago

Port 8000 → api-server
     /Users/dev/projects/api-server
     Last used: 1 day ago

Port 5432 → postgres
     System service
     Last used: 3 days ago
```

---

## Advanced Features

### Auto-Kill on Project Switch

Enable auto-kill to automatically terminate processes from previous projects:

```bash
# Enable auto-kill
zkill auto enable
```

**What happens:**

- When you `cd` into a new project
- `zkill` detects ports from previous projects
- Asks if you want to kill them
- Cleans up automatically

**Shell Integration** (optional):

Add to `~/.bashrc` or `~/.zshrc`:

```bash
function cd() {
  builtin cd "$@"
  zkill auto check
}
```

Add to `~/.config/fish/config.fish`:

```fish
function cd
  builtin cd $argv
  zkill auto check
end
```

Add to PowerShell `$PROFILE`:

```powershell
function cd {
  Set-Location $args
  zkill auto check
}
```

**Disable auto-kill:**

```bash
zkill auto disable
```

**Check auto-kill status:**

```bash
zkill auto status
```

### System Information

```bash
zkill info
```

**Output:**

```
⚙️  System Information:

Platform:    macOS
Config file: /Users/dev/.zkill/config.json
Auto-kill:   Enabled

📁 Current Project:

Name:        my-nextjs-app
Type:        Next.js
Path:        /Users/dev/projects/my-nextjs-app
Common ports: 3000, 3001

📋 Port Mappings: 3 configured
```

---

## Platform-Specific Notes

### macOS

Uses `lsof` and `ps` commands (built-in).

```bash
zkill 3000
```

Works out of the box.

### Linux

Uses `ss` (preferred) or `netstat` (fallback) and `ps` commands.

```bash
zkill 3000
```

If you get permission errors for certain processes:

```bash
sudo zkill 3000
```

### Windows

Uses `netstat` and `tasklist`/`taskkill` commands (built-in).

```bash
zkill 3000
```

Works in PowerShell, CMD, and Git Bash.

For system processes, run as Administrator:

```powershell
# Right-click PowerShell → Run as Administrator
zkill 3000
```

---

## Commands Reference

### Main Commands

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `zkill <port>`       | Kill process on specific port   |
| `zkill scan`         | List all active ports           |
| `zkill list`         | Show port-to-project mappings   |
| `zkill info`         | Show system and project info    |
| `zkill auto enable`  | Enable auto-kill                |
| `zkill auto disable` | Disable auto-kill               |
| `zkill auto check`   | Check and kill zombie processes |
| `zkill auto status`  | Show auto-kill status           |

### Options

| Option          | Description               |
| --------------- | ------------------------- |
| `-f, --force`   | Kill without confirmation |
| `-h, --help`    | Show help                 |
| `-V, --version` | Show version              |

---

## Use Cases

### Web Development

```bash
# Next.js dev server stuck
zkill 3000

# React + API backend
zkill 3000  # React
zkill 8000  # API

# Multiple microservices
zkill scan  # See all ports
zkill 3000 3001 8000 8080  # Kill multiple (coming soon)
```

### Database Development

```bash
# PostgreSQL port conflict
zkill 5432

# MongoDB
zkill 27017

# Redis
zkill 6379

# MySQL
zkill 3306
```

### API Development

```bash
# Express/Fastify/NestJS
zkill 3000

# Django/Flask
zkill 8000

# Rails
zkill 3000

# Go services
zkill 8080
```

### Project Switching

```bash
cd ~/project1
npm run dev  # Uses port 3000

# Switch projects
cd ~/project2
zkill 3000  # Clean up old project
npm run dev  # Start new project
```

---

## Configuration

Configuration is stored in `~/.zkill/config.json`.

**Default configuration:**

```json
{
  "portMappings": [],
  "autoKillEnabled": false,
  "confirmKill": true,
  "version": "1.0.0"
}
```

**Manually edit** (advanced):

```bash
# macOS/Linux
nano ~/.zkill/config.json

# Windows
notepad %USERPROFILE%\.zkill\config.json
```

**Reset configuration:**

```bash
rm -rf ~/.zkill
```

---

## Troubleshooting

### "Port not in use" but I know it is

Some processes hide from standard detection. Try:

```bash
# macOS/Linux
sudo zkill 3000

# Windows (as Administrator)
zkill 3000
```

### Permission denied

For system processes, you need elevated privileges:

```bash
# macOS/Linux
sudo zkill <port>

# Windows
# Run PowerShell as Administrator
zkill <port>
```

### Command not found: zkill

Make sure global npm bin is in your PATH:

```bash
npm config get prefix
```

Add the bin directory to your PATH:

```bash
# macOS/Linux
export PATH="$PATH:$(npm config get prefix)/bin"

# Windows
# Add to System Environment Variables
```

### Auto-kill not working

Make sure you've added the shell integration:

```bash
# Check if integration is in your shell config
cat ~/.bashrc | grep zkill

# If not, add it:
zkill auto enable
```

---

## Comparison

### Before zkill

```bash
# macOS
lsof -ti :3000 | xargs kill -9

# Linux
sudo ss -lptn 'sport = :3000' | grep -oP '(?<=pid=)\d+' | xargs sudo kill -9

# Windows
FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :3000') DO TaskKill /PID %P /F
```

### With zkill

```bash
zkill 3000
```

---

## FAQ

**Q: Is it safe?**
A: Yes. `zkill` asks for confirmation and warns about system processes.

**Q: Does it work on Windows?**
A: Yes! Works on macOS, Linux, and Windows.

**Q: Can I kill multiple ports at once?**
A: Coming soon in v1.1.

**Q: Will this kill my database?**
A: Only if you explicitly confirm. `zkill` warns about critical processes.

**Q: Does it require admin/sudo?**
A: Only for system processes. Regular development servers don't need it.

**Q: Can I use it in CI/CD?**
A: Yes! Use `--force` flag to skip confirmation:

```bash
zkill 3000 --force
```

**Q: Does it collect telemetry?**
A: No. Zero telemetry. Everything runs locally.

---

## Roadmap

### v1.1 (Next Release)

- [ ] Kill multiple ports: `zkill 3000 8000 5432`
- [ ] Kill by process name: `zkill --name node`
- [ ] Kill port range: `zkill --range 3000-3010`

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon).

### Development Setup

```bash
# Clone the repo
git clone https://github.com/adeyomilawal/zombie-port-killer.git
cd zombie-port-killer

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link

# Test
zkill 3000
```

### Running Tests

```bash
npm test
```

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Support

- 🐛 **Bug reports:** [GitHub Issues](https://github.com/adeyomilawal/zombie-port-killer/issues)
- 💡 **Feature requests:** [GitHub Discussions](https://github.com/adeyomilawal/zombie-port-killer/discussions)
- 📧 **Email:** support@example.com
- 💬 **Discord:** [Join our community](https://discord.gg/zkill)

---

## Acknowledgments

Built with:

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [Ora](https://github.com/sindresorhus/ora) - Spinners

Inspired by the hundreds of Stack Overflow answers about killing port processes.

---

## Author

Made with ❤️ by [Adeyomi Lawal](https://github.com/adeyomilawal)

If zkill saves you time, [consider sponsoring](https://github.com/sponsors/adeyomilawal) ☕

---

<p align="center">
  <strong>Stop Googling. Start killing (ports).</strong>
</p>

<p align="center">
  <a href="https://github.com/adeyomilawal/zombie-port-killer">⭐ Star on GitHub</a>
</p>
