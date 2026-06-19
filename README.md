<div align="center">

# git-conflict-finder

**See every merge conflict at a glance — file, line, ours vs theirs, with CI-ready JSON output**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?labelColor=0B0A09)](package.json)

</div>

## Install

```bash
npx github:NickCirv/git-conflict-finder
```

Both `git-conflict-finder` and the short alias `gcf` work once installed globally:

```bash
npm install -g github:NickCirv/git-conflict-finder
```

## Usage

```bash
# Run inside any git repo that has unresolved merge conflicts
gcf                        # List all conflicted files (exit 1 if found)
gcf --show                 # Show each conflict with colored ours/theirs context
gcf --format json          # Machine-readable JSON for CI integration
```

| Flag | Description |
|------|-------------|
| *(none)* | List all conflicted files |
| `--show` | Show each conflict with colored ours/theirs context |
| `--count` | Print total number of conflicts (just the number) |
| `--summary` | Table: file, conflict count, ours/theirs line counts |
| `--file <path>` | Show conflicts in a specific file only |
| `--format json` | Machine-readable JSON output |
| `--open` | Open all conflicted files in `$EDITOR` |
| `--stats` | Per-file: conflict count + ours vs theirs ratio |

## What it does

Reads `git diff --name-only --diff-filter=U` to find unmerged files, then parses the conflict markers in each file to give you line numbers, ours/theirs previews, and side-by-side line counts. Exit code `1` on conflicts and `0` on clean makes it a natural fit for CI gates (`npx github:NickCirv/git-conflict-finder --format json`). No config, no network, no dependencies — runs anywhere Node 18+ is available.

---
<sub>Zero dependencies · Node ≥18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
