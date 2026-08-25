const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// On Windows, npm's global `claude` shim is a .cmd wrapper, which Node refuses to
// spawn directly (EINVAL) and which requires shell:true to run — but shell:true on
// Windows joins argv with plain spaces and doesn't quote them for cmd.exe, so a
// multi-word prompt gets split into separate args. Resolving straight to the real
// claude.exe (next to node.exe, since it's installed into the same npm prefix)
// sidesteps the shell entirely and preserves argv exactly.
function resolveClaudeBin() {
  if (process.platform !== 'win32') return 'claude';
  return path.join(
    path.dirname(process.execPath),
    'node_modules',
    '@anthropic-ai',
    'claude-code',
    'bin',
    'claude.exe',
  );
}

const claudeBin = resolveClaudeBin();

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));

// Сбрасываем счётчик итераций
fs.writeFileSync('.claude/ralph.iterations.json', JSON.stringify({ count: 0, phaseIndex: 0 }));

const phase = config.phases
  ? config.phases[0]
  : { milestone: config.milestone, branch: config.branch };

if (!phase) {
  console.log('🎉 Нечего запускать: config.phases пуст.');
  process.exit(0);
}

// Запускаем первую итерацию
const prompt = config.prompt
  .replace('{milestone}', phase.milestone)
  .replace('{branch}', phase.branch);
console.log(`🚀 Запускаем Ralph для milestone: ${phase.milestone}`);

execFileSync(claudeBin, ['-p', prompt, '--max-turns', String(config.maxTurns)], {
  stdio: 'inherit',
});
