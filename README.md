# git-conflict-finder

> Find, show, and track git merge conflicts. Zero dependencies.

```
$ gcf

2 files with merge conflicts:

  ✖ src/app.js        (3 conflicts)
  ✖ src/utils/auth.js (1 conflict)

Total: 4 conflicts across 2 files
```

## Install

```bash
# Run without installing
npx git-conflict-finder

# Install globally
npm install -g git-conflict-finder
```

Both `git-conflict-finder` and `gcf` are available as bin aliases.

## Quick Start

```bash
# Inside any git repo mid-merge:
gcf                        # List all conflicted files (exit 1 if found)
gcf --show                 # Show each conflict with colored ours/theirs context
gcf --count                # Print just the total number
gcf --summary              # Table with per-file line counts
gcf --file src/app.js      # Show conflicts in one file only
gcf --format json          # Machine-readable JSON (CI integration)
gcf --open                 # Open all conflicted files in $EDITOR
gcf --stats                # Ours vs theirs ratio per file
```

## Options

| Flag | Description |
|------|-------------|
| *(none)* | List all conflicted files |
| `--show` | Show each conflict with colored ours/theirs context |
| `--count` | Print total number of conflicts (just the number) |
| `--summary` | Table: file, conflict count, ours/theirs line counts |
| `--file <path>` | Show conflicts in a specific file only |
| `--format json` | Machine-readable JSON output for CI integration |
| `--open` | Open all conflicted files in `$EDITOR` |
| `--stats` | Per-file: conflict count + ours vs theirs ratio |
| `--help` | Show help |

## Display Format

```
FILE: src/app.js
────────────────────────────────────────────

Conflict 1 at line 42:
────────────────────────────────────────────
  <<<<<<< HEAD (ours — 5 lines)
    const token = req.headers.authorization
    const user = await verifyToken(token)
    ...
  =======
  >>>>>>> feature/auth (theirs — 8 lines)
    const { token } = req.cookies
    const user = await validateSession(token)
    ...
```

Colors: **cyan** = ours, **yellow** = theirs, **red** = conflict markers.

## JSON Output

```bash
gcf --format json
```

```json
{
  "conflicted": true,
  "fileCount": 2,
  "totalConflicts": 4,
  "files": [
    {
      "path": "src/app.js",
      "conflictCount": 3,
      "conflicts": [
        {
          "line": 42,
          "oursLabel": "HEAD",
          "oursLines": 5,
          "theirsLabel": "feature/auth",
          "theirsLines": 8
        }
      ]
    }
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No conflicts (clean) |
| `1` | Conflicts found |
| `2` | Error (not a git repo, file not found) |

Exit code `1` on conflict makes it easy to hook into CI:

```yaml
# GitHub Actions example
- name: Check for unresolved conflicts
  run: npx git-conflict-finder --format json
```

## Why?

`git status` tells you there's a conflict. `git diff` dumps everything at once. `git-conflict-finder` gives you a focused, structured view:

- Which files have conflicts
- How many in each file
- Ours vs theirs at a glance, with line numbers
- Machine-readable output for scripting

No dependencies. No config. Works anywhere Node 18+ is available.

---

Built with Node.js · Zero dependencies · MIT License
