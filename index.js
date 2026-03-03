#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import { spawnSync } from 'child_process';

// ─── ANSI Colors ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
};

const colorize = (text, color) => `${color}${text}${C.reset}`;
const isTTY = process.stdout.isTTY;
const col = (text, color) => isTTY ? colorize(text, color) : text;

// ─── Git helpers ─────────────────────────────────────────────────────────────
function getConflictedFiles() {
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  if (result.status !== 0 && result.stderr) {
    const err = result.stderr.trim();
    if (err.includes('not a git repository')) {
      console.error('Error: not inside a git repository.');
      process.exit(2);
    }
  }
  const files = (result.stdout || '').trim().split('\n').filter(Boolean);
  return files;
}

function getRepoRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return (result.stdout || '').trim();
}

// ─── Conflict parsing ────────────────────────────────────────────────────────
/**
 * Parse conflict blocks from file content.
 * Returns array of { line, ours, oursLabel, theirs, theirsLabel }
 */
function parseConflicts(content) {
  const lines = content.split('\n');
  const conflicts = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('<<<<<<< ')) {
      const oursLabel = line.slice(8).trim();
      const conflictStartLine = i + 1; // 1-based
      const oursLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('=======')) {
        oursLines.push(lines[i]);
        i++;
      }
      i++; // skip =======
      const theirsLines = [];
      let theirsLabel = '';
      while (i < lines.length && !lines[i].startsWith('>>>>>>> ')) {
        theirsLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        theirsLabel = lines[i].slice(8).trim();
      }
      conflicts.push({
        line: conflictStartLine,
        ours: oursLines,
        oursLabel,
        theirs: theirsLines,
        theirsLabel,
      });
    }
    i++;
  }
  return conflicts;
}

function loadFile(filePath) {
  const root = getRepoRoot();
  const abs = resolve(root, filePath);
  if (!existsSync(abs)) {
    console.error(`File not found: ${filePath}`);
    process.exit(2);
  }
  return readFileSync(abs, 'utf8');
}

// ─── Display helpers ─────────────────────────────────────────────────────────
function divider(len = 44) {
  return col('─'.repeat(len), C.dim);
}

function printConflictBlock(conflict, index, total) {
  const { line, ours, oursLabel, theirs, theirsLabel } = conflict;

  console.log(
    `\n${col(`Conflict ${index + 1}`, C.bold)} at line ${col(String(line), C.bold)}:`
  );
  console.log(divider(44));

  // Ours header
  console.log(col(`  <<<<<<< ${oursLabel} (ours — ${ours.length} line${ours.length !== 1 ? 's' : ''})`, C.red));
  const oursPreview = ours.slice(0, 2);
  for (const l of oursPreview) {
    console.log(col(`    ${l}`, C.cyan));
  }
  if (ours.length > 2) console.log(col(`    ... (${ours.length - 2} more)`, C.dim));

  // Separator
  console.log(col('  =======', C.red));

  // Theirs header
  console.log(col(`  >>>>>>> ${theirsLabel} (theirs — ${theirs.length} line${theirs.length !== 1 ? 's' : ''})`, C.red));
  const theirsPreview = theirs.slice(0, 2);
  for (const l of theirsPreview) {
    console.log(col(`    ${l}`, C.yellow));
  }
  if (theirs.length > 2) console.log(col(`    ... (${theirs.length - 2} more)`, C.dim));
}

function printFileConflicts(filePath, conflicts, showBlocks = false) {
  const label = `${col(filePath, C.bold)} ${col(`— ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''}`, C.dim)}`;
  console.log(label);
  if (showBlocks) {
    console.log(divider(44));
    conflicts.forEach((c, i) => printConflictBlock(c, i, conflicts.length));
    console.log();
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────
function cmdList(files, allConflicts) {
  if (files.length === 0) {
    console.log(col('No merge conflicts found.', C.green));
    process.exit(0);
  }

  console.log(col(`${files.length} file${files.length !== 1 ? 's' : ''} with merge conflicts:\n`, C.bold));
  for (const f of files) {
    const conflicts = allConflicts[f] || [];
    const count = conflicts.length;
    const marker = col('✖', C.red);
    console.log(`  ${marker} ${col(f, C.bold)} ${col(`(${count} conflict${count !== 1 ? 's' : ''})`, C.dim)}`);
  }

  const total = Object.values(allConflicts).reduce((s, c) => s + c.length, 0);
  console.log(`\n${col(`Total: ${total} conflict${total !== 1 ? 's' : ''} across ${files.length} file${files.length !== 1 ? 's' : ''}`, C.bold)}`);
  process.exit(1);
}

function cmdShow(files, allConflicts) {
  if (files.length === 0) {
    console.log(col('No merge conflicts found.', C.green));
    process.exit(0);
  }

  for (const f of files) {
    const conflicts = allConflicts[f] || [];
    console.log(`\n${col('FILE:', C.bold)} ${col(f, C.cyan)}`);
    console.log(divider(44));
    printFileConflicts(f, conflicts, true);
  }

  process.exit(1);
}

function cmdCount(files, allConflicts) {
  const total = Object.values(allConflicts).reduce((s, c) => s + c.length, 0);
  console.log(total);
  process.exit(files.length > 0 ? 1 : 0);
}

function cmdSummary(files, allConflicts) {
  if (files.length === 0) {
    console.log(col('No merge conflicts found.', C.green));
    process.exit(0);
  }

  const colW = [40, 10, 10, 10];
  const header = [
    'File'.padEnd(colW[0]),
    'Conflicts'.padEnd(colW[1]),
    'Ours'.padEnd(colW[2]),
    'Theirs'.padEnd(colW[3]),
  ].join(' ');
  console.log(col(header, C.bold));
  console.log(divider(colW.reduce((s, w) => s + w + 1, 0)));

  for (const f of files) {
    const conflicts = allConflicts[f] || [];
    const oursLines = conflicts.reduce((s, c) => s + c.ours.length, 0);
    const theirsLines = conflicts.reduce((s, c) => s + c.theirs.length, 0);
    const row = [
      f.length > colW[0] - 1 ? '...' + f.slice(-(colW[0] - 4)) : f.padEnd(colW[0]),
      String(conflicts.length).padEnd(colW[1]),
      String(oursLines).padEnd(colW[2]),
      String(theirsLines).padEnd(colW[3]),
    ].join(' ');
    console.log(row);
  }

  const totalConflicts = Object.values(allConflicts).reduce((s, c) => s + c.length, 0);
  const totalOurs = Object.values(allConflicts).reduce((s, c) => s + c.reduce((a, x) => a + x.ours.length, 0), 0);
  const totalTheirs = Object.values(allConflicts).reduce((s, c) => s + c.reduce((a, x) => a + x.theirs.length, 0), 0);
  console.log(divider(colW.reduce((s, w) => s + w + 1, 0)));
  const totRow = [
    'TOTAL'.padEnd(colW[0]),
    String(totalConflicts).padEnd(colW[1]),
    String(totalOurs).padEnd(colW[2]),
    String(totalTheirs).padEnd(colW[3]),
  ].join(' ');
  console.log(col(totRow, C.bold));
  process.exit(1);
}

function cmdFile(filePath, allConflicts) {
  const root = getRepoRoot();
  const rel = relative(root, resolve(filePath));
  const conflicts = allConflicts[rel] || parseConflicts(loadFile(rel));

  if (conflicts.length === 0) {
    console.log(col(`No conflicts in: ${filePath}`, C.green));
    process.exit(0);
  }

  console.log(`\n${col('FILE:', C.bold)} ${col(rel, C.cyan)}`);
  console.log(divider(44));
  printFileConflicts(rel, conflicts, true);
  process.exit(1);
}

function cmdJson(files, allConflicts) {
  const output = {
    conflicted: files.length > 0,
    fileCount: files.length,
    totalConflicts: Object.values(allConflicts).reduce((s, c) => s + c.length, 0),
    files: files.map(f => {
      const conflicts = allConflicts[f] || [];
      return {
        path: f,
        conflictCount: conflicts.length,
        conflicts: conflicts.map(c => ({
          line: c.line,
          oursLabel: c.oursLabel,
          oursLines: c.ours.length,
          theirsLabel: c.theirsLabel,
          theirsLines: c.theirs.length,
        })),
      };
    }),
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(files.length > 0 ? 1 : 0);
}

function cmdOpen(files) {
  if (files.length === 0) {
    console.log(col('No merge conflicts found.', C.green));
    process.exit(0);
  }
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  const root = getRepoRoot();
  const absPaths = files.map(f => resolve(root, f));
  console.log(`Opening ${files.length} file${files.length !== 1 ? 's' : ''} in ${col(editor, C.bold)}...`);
  spawnSync(editor, absPaths, { stdio: 'inherit' });
  process.exit(1);
}

function cmdStats(files, allConflicts) {
  if (files.length === 0) {
    console.log(col('No merge conflicts found.', C.green));
    process.exit(0);
  }

  console.log(col('\nConflict Statistics\n', C.bold));

  for (const f of files) {
    const conflicts = allConflicts[f] || [];
    const oursLines = conflicts.reduce((s, c) => s + c.ours.length, 0);
    const theirsLines = conflicts.reduce((s, c) => s + c.theirs.length, 0);
    const total = oursLines + theirsLines;
    const oursRatio = total > 0 ? ((oursLines / total) * 100).toFixed(1) : '0.0';
    const theirsRatio = total > 0 ? ((theirsLines / total) * 100).toFixed(1) : '0.0';

    console.log(`${col(f, C.bold)}`);
    console.log(`  Conflicts : ${col(String(conflicts.length), C.red)}`);
    console.log(`  Ours lines: ${col(String(oursLines), C.cyan)} (${oursRatio}%)`);
    console.log(`  Their lines: ${col(String(theirsLines), C.yellow)} (${theirsRatio}%)`);
    console.log();
  }

  process.exit(1);
}

// ─── Progress tracking ───────────────────────────────────────────────────────
/**
 * Counts resolved vs unresolved conflicts across all originally-conflicted files.
 * A file is "originally conflicted" if it appears in git's unmerged list OR still has markers.
 */
function printProgress(files, allConflicts) {
  const total = Object.values(allConflicts).reduce((s, c) => s + c.length, 0);
  // This runs after we've already loaded conflicts, files with 0 = resolved
  const originallyConflicted = files;
  const resolved = originallyConflicted.filter(f => (allConflicts[f] || []).length === 0).length;
  const remaining = originallyConflicted.length - resolved;

  if (originallyConflicted.length > 0) {
    const resolvedConflicts = originallyConflicted.reduce((s, f) => {
      // If file was in git's unmerged list but now has 0 conflicts, count as resolved
      return s;
    }, 0);
    console.log(col(`\nProgress: ${resolved} of ${originallyConflicted.length} files resolved`, C.dim));
  }
}

// ─── Help ────────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
${col('git-conflict-finder', C.bold)} ${col('(gcf)', C.dim)} — Find and navigate git merge conflicts

${col('USAGE', C.bold)}
  gcf [options]

${col('OPTIONS', C.bold)}
  ${col('(none)', C.cyan)}          List all conflicted files (exit 1 if conflicts found)
  ${col('--show', C.cyan)}          Show each conflict with colored ours/theirs context
  ${col('--count', C.cyan)}         Print total number of conflicts (just the number)
  ${col('--summary', C.cyan)}       Table: file, conflict count, ours/theirs line counts
  ${col('--file <path>', C.cyan)}   Show conflicts in a specific file only
  ${col('--format json', C.cyan)}   Machine-readable JSON output (CI integration)
  ${col('--open', C.cyan)}          Open all conflicted files in $EDITOR
  ${col('--stats', C.cyan)}         Per-file stats: count, ours vs theirs ratio
  ${col('--help', C.cyan)}          Show this help

${col('EXIT CODES', C.bold)}
  0   No conflicts found (clean)
  1   Conflicts found
  2   Error (not a git repo, file not found)

${col('EXAMPLES', C.bold)}
  gcf                        # List conflicted files
  gcf --show                 # Show all conflicts with context
  gcf --file src/app.js      # Show conflicts in one file
  gcf --format json          # JSON output for CI
  gcf --count                # Just print the count
  gcf --stats                # Ours vs theirs ratio per file
  gcf --open                 # Open all in $EDITOR

${col('COLORS', C.bold)}
  ${col('Cyan', C.cyan)} = ours section  ${col('Yellow', C.yellow)} = theirs section  ${col('Red', C.red)} = conflict markers
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const showFlag    = args.includes('--show');
  const countFlag   = args.includes('--count');
  const summaryFlag = args.includes('--summary');
  const openFlag    = args.includes('--open');
  const statsFlag   = args.includes('--stats');
  const jsonFlag    = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json';
  const fileIdx     = args.indexOf('--file');
  const fileArg     = fileIdx !== -1 ? args[fileIdx + 1] : null;

  const files = getConflictedFiles();
  const root  = getRepoRoot();

  // Build conflict map
  const allConflicts = {};
  for (const f of files) {
    try {
      const content = loadFile(f);
      allConflicts[f] = parseConflicts(content);
    } catch {
      allConflicts[f] = [];
    }
  }

  if (fileArg) {
    cmdFile(fileArg, allConflicts);
  } else if (showFlag) {
    cmdShow(files, allConflicts);
  } else if (countFlag) {
    cmdCount(files, allConflicts);
  } else if (summaryFlag) {
    cmdSummary(files, allConflicts);
  } else if (jsonFlag) {
    cmdJson(files, allConflicts);
  } else if (openFlag) {
    cmdOpen(files);
  } else if (statsFlag) {
    cmdStats(files, allConflicts);
  } else {
    // Default: list
    cmdList(files, allConflicts);
  }
}

main();
