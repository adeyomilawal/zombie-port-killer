# Security Policy

## Supported Versions

We take security seriously and actively maintain the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in zkill, please report it responsibly:

### 🔐 How to Report

**Email:** lawaladeyomio@gmail.com

**Subject:** `[SECURITY] Brief description of the vulnerability`

**Include in your report:**

1. **Description** - Clear explanation of the vulnerability
2. **Impact** - What could an attacker achieve?
3. **Steps to Reproduce** - Detailed steps to reproduce the issue
4. **Affected Versions** - Which versions are vulnerable?
5. **Suggested Fix** - If you have ideas (optional)
6. **Your Contact Info** - So we can follow up

### 📧 Example Report

```
Subject: [SECURITY] Command injection in port validation

Description:
The port validation function is vulnerable to command injection when
processing user input through the --port flag.

Impact:
An attacker could execute arbitrary system commands by crafting a
malicious port number input.

Steps to Reproduce:
1. Run: zkill "3000; rm -rf /"
2. The command after semicolon gets executed

Affected Versions:
All versions up to and including 1.0.0

Suggested Fix:
Add strict integer validation before passing to system commands.

Contact:
John Doe (john@example.com)
```

---

## Response Timeline

We are committed to addressing security issues promptly:

| Timeframe           | Action                                  |
| ------------------- | --------------------------------------- |
| **Within 24 hours** | Acknowledge receipt of your report      |
| **Within 7 days**   | Provide initial assessment and timeline |
| **Within 30 days**  | Release security patch (if confirmed)   |

---

## What to Expect

### 1. Acknowledgment (24 hours)

We'll confirm we received your report and assign a tracking number.

### 2. Investigation (1-7 days)

We'll:

- Verify the vulnerability
- Assess severity and impact
- Develop a fix
- Test the fix thoroughly

### 3. Disclosure (After patch)

We'll:

- Release a security patch
- Publish a security advisory
- Credit you (if desired)
- Notify affected users

---

## Security Best Practices for Users

### Safe Usage

✅ **Do:**

- Keep zkill updated to the latest version
- Review process details before killing
- Use `--force` flag carefully
- Check auto-kill configuration regularly

❌ **Don't:**

- Run zkill with `sudo` unless necessary
- Kill system processes without understanding impact
- Disable confirmation prompts in production
- Share your configuration with untrusted users

### Permission Management

```bash
# Good: Run as normal user for dev processes
zkill 3000

# Good: Use sudo only when needed
sudo zkill 80

# Bad: Running everything as root
sudo su
zkill 3000  # Unnecessary elevated permissions
```

---

## Known Security Considerations

### 1. Elevated Privileges

**Risk:** Running zkill with `sudo` gives it power to kill any process.

**Mitigation:**

- Only use `sudo` when necessary
- Review process details before confirming
- System process warnings are shown

### 2. Configuration File Security

**Location:** `~/.zkill/config.json`

**Risk:** Configuration file could be read by other users.

**Mitigation:**

- File has user-only permissions (0600)
- No sensitive data stored in config
- No credentials or tokens

### 3. Process Information Disclosure

**Risk:** `zkill scan` shows process information.

**Mitigation:**

- Only shows processes owned by current user (unless sudo)
- No sensitive data in output
- Process details already available via `ps` command

### 4. Auto-Kill Feature

**Risk:** Automatic process termination could kill unintended processes.

**Mitigation:**

- Confirmation required by default
- Clear warnings shown
- Can be disabled anytime
- Only kills processes from tracked projects

---

## Security Audit History

We regularly review the codebase for security issues. As the project grows, we plan to have external security audits performed.

---

## Dependencies Security

We regularly audit our dependencies:

### Current Dependencies

- `commander` - CLI framework (low risk)
- `inquirer` - Interactive prompts (low risk)
- `chalk` - Terminal colors (low risk)
- `ora` - Spinners (low risk)

### Automated Scanning

We use GitHub Dependabot to automatically check for security issues in dependencies and apply patches promptly.

---

## Vulnerability Disclosure Policy

### Coordinated Disclosure

We follow coordinated disclosure:

1. **Private Report** - You report the issue privately
2. **Acknowledgment** - We confirm receipt
3. **Fix Development** - We develop and test a fix
4. **Patch Release** - We release a security update
5. **Public Disclosure** - We publish advisory after users have time to update

### Public Disclosure Timeline

- **After patch release:** Minimum 7 days for users to update
- **Maximum:** 90 days from initial report
- **Emergency:** Immediate disclosure for critical exploits

---

## Hall of Fame 🏆

We thank the following security researchers:

| Date | Researcher | Vulnerability | Severity |
| ---- | ---------- | ------------- | -------- |
| TBD  | TBD        | TBD           | TBD      |

_Your name could be here! Report vulnerabilities responsibly._

---

## Security Contact

**Primary Contact:** lawaladeyomio@gmail.com

**GitHub Security Advisories:** [View advisories](https://github.com/adeyomilawal/zombie-port-killer/security/advisories)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CVE Database](https://cve.mitre.org/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

## Questions?

Have a security question (but not a vulnerability)? Feel free to:

- Open a [GitHub Discussion](https://github.com/adeyomilawal/zombie-port-killer/discussions)
- Reach out via email

---

**Important:** If you find a security issue, please email us directly rather than opening a public GitHub issue. This gives us time to fix it before it becomes public.

Thanks for helping keep zkill safe! 🔒
