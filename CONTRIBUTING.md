# Contributing to Zombie Port Killer

First off, thank you for considering contributing to zkill! 🎉

It's people like you that make zkill such a great tool for developers worldwide.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Development Setup](#development-setup)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Commit Message Guidelines](#commit-message-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

**In short:**

- Be respectful and inclusive
- Be patient with new contributors
- Focus on what's best for the community
- Show empathy towards others

---

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check existing issues to avoid duplicates.

**How to submit a good bug report:**

1. Use a clear and descriptive title
2. Describe the exact steps to reproduce the problem
3. Provide specific examples
4. Describe the behavior you observed and what you expected
5. Include screenshots if relevant
6. Mention your OS, Node.js version, and zkill version

**Use the bug report template:**

```markdown
**Environment:**

- OS: [e.g., macOS 14.0]
- Node.js version: [e.g., 20.10.0]
- zkill version: [e.g., 1.0.0]

**Description:**
A clear description of what the bug is.

**Steps to Reproduce:**

1. Run `zkill 3000`
2. See error

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

**Screenshots:**
If applicable, add screenshots.
```

### Suggesting Features 💡

Feature suggestions are welcome! Before submitting:

1. Check if the feature is already planned in the roadmap
2. Check existing feature requests
3. Consider if it fits the project's goals

**Use the feature request template:**

```markdown
**Problem Statement:**
What problem does this feature solve?

**Proposed Solution:**
How should this feature work?

**Alternatives Considered:**
What other solutions did you consider?

**Additional Context:**
Any other relevant information.
```

### Code Contributions 💻

We love pull requests! Here's how to contribute code:

1. **Find an issue to work on** or create one
2. **Comment on the issue** to let us know you're working on it
3. **Fork the repository** and create a branch
4. **Make your changes** following our coding standards
5. **Write tests** for your changes
6. **Submit a pull request**

---

## Development Setup

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Git

### Initial Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/zombie-port-killer.git
cd zombie-port-killer

# 3. Add upstream remote
git remote add upstream https://github.com/adeyomilawal/zombie-port-killer.git

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Link for local testing
npm link

# 7. Test the CLI
zkill --version
```

### Project Structure

```
zombie-port-killer/
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   ├── types.ts              # TypeScript types
│   ├── commands/             # Command implementations
│   │   ├── kill.command.ts
│   │   ├── scan.command.ts
│   │   └── auto.command.ts
│   ├── services/             # Core services
│   │   ├── process.service.ts
│   │   ├── storage.service.ts
│   │   └── project.service.ts
│   └── platform/             # Platform-specific adapters
│       ├── macos.adapter.ts
│       ├── linux.adapter.ts
│       └── windows.adapter.ts
├── dist/                     # Compiled output
├── docs/                     # Documentation
└── package.json
```

### Development Workflow

```bash
# Build during development
npm run build

# Run in development mode
npm run dev

# Run specific command
npm run dev -- 3000
npm run dev -- scan

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Check types
npx tsc --noEmit
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows our coding standards
- [ ] Tests are written and passing
- [ ] Documentation is updated if needed
- [ ] Commit messages follow our guidelines
- [ ] Branch is up to date with main

### Submitting

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**

   - Write clean, readable code
   - Add tests for new features
   - Update documentation

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add multiple port kill support"
   ```

4. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use a clear title
   - Fill out the PR template
   - Link related issues
   - Request review

### PR Review Process

- Maintainers will review your PR within 3-5 days
- Address any requested changes
- Once approved, a maintainer will merge your PR
- Your contribution will be credited in the changelog

---

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` type - use proper types
- Export interfaces for public APIs
- Document complex functions with JSDoc

**Example:**

```typescript
/**
 * Find process using a specific port
 * @param port - Port number (1-65535)
 * @returns ProcessInfo or null if port is not in use
 */
async findByPort(port: number): Promise<ProcessInfo | null> {
  this.validatePort(port);
  return await this.adapter.findProcessByPort(port);
}
```

### Code Style

- **Indentation:** 2 spaces
- **Line length:** Max 80 characters (soft limit)
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants

### File Organization

- One class per file
- Group related functionality
- Keep files under 300 lines
- Use barrel exports (`index.ts`)

### Error Handling

```typescript
// Good: Specific error handling
try {
  await killProcess(pid);
} catch (error) {
  if (error.code === "EACCES") {
    throw new Error("Permission denied. Try: sudo zkill 3000");
  }
  throw error;
}

// Bad: Generic error handling
try {
  await killProcess(pid);
} catch (error) {
  console.log("Error");
}
```

---

## Testing Guidelines

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Tests must pass on all platforms

### Test Structure

```typescript
describe("ProcessService", () => {
  describe("findByPort", () => {
    it("should find process on active port", async () => {
      // Arrange
      const service = new ProcessService();
      const port = 3000;

      // Act
      const result = await service.findByPort(port);

      // Assert
      expect(result).toBeDefined();
      expect(result?.port).toBe(port);
    });

    it("should return null for unused port", async () => {
      const service = new ProcessService();
      const result = await service.findByPort(9999);
      expect(result).toBeNull();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- process.service.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples

```bash
# Feature
git commit -m "feat(kill): add multiple port kill support"

# Bug fix
git commit -m "fix(windows): resolve permission error on system processes"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api): change port validation logic

BREAKING CHANGE: Port validation now throws error instead of returning false"
```

---

## Platform-Specific Development

### Testing on Multiple Platforms

If you're developing platform-specific features:

1. **Test locally** on your platform
2. **Document** which platforms you've tested on
3. **Request testing** from maintainers on other platforms

### Platform Adapters

When modifying platform adapters:

- Maintain consistent API across all platforms
- Handle platform-specific edge cases
- Add platform-specific tests

---

## Documentation

### When to Update Documentation

- Adding new features → Update README
- Changing CLI commands → Update README and docs
- Fixing bugs → Update CHANGELOG
- API changes → Update code comments

### Documentation Standards

- Use clear, simple language
- Provide examples
- Keep it up to date
- Use proper Markdown formatting

---

## Questions?

- 💬 Open a [Discussion](https://github.com/adeyomilawal/zombie-port-killer/discussions)
- 📧 Email: lawaladeyomio@gmail.com
- 🐛 [GitHub Issues](https://github.com/adeyomilawal/zombie-port-killer/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Recognition

All contributors will be:

- Listed in the project's README
- Credited in release notes
- Forever appreciated by the community! ❤️

Thank you for contributing to zkill! 🎉
