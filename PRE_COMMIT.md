# Pre-commit Hooks with Nix Development

This project uses pre-commit hooks that work seamlessly with `nix develop` to ensure code quality before commits.

## Setup

### Prerequisites

- Nix with flakes enabled
- Git

### Initial Setup

1. **Enter the development environment:**

   ```bash
   nix develop
   ```

   The shell hook will automatically:

   - Install pre-commit hooks
   - Install npm dependencies (if needed)

2. **Manual installation (if needed):**
   ```bash
   nix develop --command pre-commit install
   nix develop --command pre-commit install --hook-type commit-msg
   ```

## Available Hooks

### Basic File Checks

- ✅ **Trailing whitespace removal** - Auto-fixes whitespace issues
- ✅ **End-of-file fixer** - Ensures files end with newline
- ✅ **YAML validation** - Checks YAML syntax
- ✅ **JSON validation** - Checks JSON syntax
- ✅ **Merge conflict detection** - Prevents commits with conflict markers
- ✅ **Large file check** - Blocks files >1MB
- ✅ **Case conflict check** - Prevents case-insensitive filename conflicts
- ✅ **Executable shebang validation** - Ensures scripts have proper shebangs

### Code Quality

- 🔧 **ESLint** - Lints TypeScript/JavaScript files with auto-fix
- 🔨 **Build check** - Runs `npm run build` to ensure TypeScript compilation
- 🎨 **Prettier** - Formats code (optional, can be enabled)

## Usage

### Automatic Execution

Pre-commit hooks run automatically when you commit:

```bash
git add .
git commit -m "your commit message"
```

### Manual Testing

Run all hooks on all files:

```bash
nix develop --command pre-commit run --all-files
```

Run specific hooks:

```bash
nix develop --command pre-commit run trailing-whitespace
nix develop --command pre-commit run eslint
```

### Skip Hooks (Not Recommended)

If you need to skip hooks temporarily:

```bash
git commit --no-verify -m "skip hooks for this commit"
```

## Hook Configuration

The configuration is in `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      # ... more hooks

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.50.0
    hooks:
      - id: eslint
        files: \.(ts|js|tsx|jsx)$
        args: [--fix] # Auto-fix issues
```

## Common Issues

### ESLint Errors

The hooks will fail if ESLint finds errors. Fix them with:

```bash
nix develop --command npm run lint:fix
```

### Build Failures

If TypeScript compilation fails, fix the type errors before committing.

### Hook Updates

Update hook versions:

```bash
nix develop --command pre-commit autoupdate
```

## Development Workflow

1. **Make changes** to your code
2. **Stage files** you want to commit
3. **Commit** - hooks run automatically
4. **If hooks fail**:
   - Fix the reported issues
   - Stage the fixes
   - Commit again

The hooks will auto-fix many issues (whitespace, formatting, simple ESLint issues) and fail for others that need manual attention.

## Customization

To add custom hooks or modify existing ones:

1. Edit `.pre-commit-config.yaml`
2. Test changes: `nix develop --command pre-commit run --all-files`
3. Commit the configuration changes

The setup is designed to work seamlessly with the Nix development environment, ensuring all team members have consistent tooling.
