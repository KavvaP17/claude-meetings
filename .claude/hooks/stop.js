const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// See ralph.start.js for why this avoids shell:true on Windows.
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

// On Windows, `gh` on PATH (as seen by a plain child_process spawn) resolves to a
// bash shim that execs the real gh.exe — Windows CreateProcess can't run a
// shebang script directly and execFileSync throws ENOENT before this hook ever
// logs anything, so the failure looks like the Stop hook silently not firing.
function resolveGhBin() {
  if (process.platform !== 'win32') return 'gh';
  const candidates = [
    'C:/Program Files/GitHub CLI/gh.exe',
    'C:/Program Files (x86)/GitHub CLI/gh.exe',
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? 'gh';
}

const ghBin = resolveGhBin();

const config = JSON.parse(fs.readFileSync('.claude/ralph.config.json', 'utf8'));

if (!config.active) process.exit(0);

const counterFile = '.claude/ralph.iterations.json';
let counter = { count: 0, phaseIndex: 0 };
if (fs.existsSync(counterFile)) {
  counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
}

const phase = config.phases
  ? config.phases[counter.phaseIndex]
  : { milestone: config.milestone, branch: config.branch };

if (!phase) {
  console.log('🎉 Все фазы завершены.');
  process.exit(0);
}

if (counter.count >= config.maxIterations) {
  console.log(`⛔ Лимит итераций (${config.maxIterations}) достигнут.`);
  fs.writeFileSync(counterFile, JSON.stringify({ count: 0, phaseIndex: counter.phaseIndex }));
  process.exit(0);
}

function runClaude(prompt, { model, maxTurns } = {}) {
  const args = ['-p', prompt, '--max-turns', String(maxTurns ?? config.maxTurns)];
  if (model) args.push('--model', model);
  execFileSync(claudeBin, args, { stdio: 'inherit' });
}

function nextIssues(milestone) {
  const output = execFileSync(ghBin, [
    'issue',
    'list',
    '--milestone',
    milestone,
    '--state',
    'open',
    '--json',
    'number,title',
  ]).toString();
  return JSON.parse(output);
}

const issues = nextIssues(phase.milestone);

if (issues.length > 0) {
  counter.count++;
  fs.writeFileSync(counterFile, JSON.stringify(counter));

  const next = issues[0];
  console.log(
    `🔄 Фаза ${counter.phaseIndex + 1} — Итерация ${counter.count}/${config.maxIterations} — Issue #${next.number}: ${next.title}`,
  );
  console.log(`📋 Осталось: ${issues.length}`);

  const prompt = config.prompt
    .replace('{milestone}', phase.milestone)
    .replace('{branch}', phase.branch);

  runClaude(prompt);
} else {
  console.log(`✅ Фаза ${counter.phaseIndex + 1} завершена. Создаём PR...`);
  runClaude(`Создай PR из ветки ${phase.branch} в master с названием 'feat: ${phase.milestone}'.`, {
    model: 'claude-opus-5',
    maxTurns: 10,
  });

  console.log('🔍 Ревью Opus 5...');
  runClaude(
    'Найди последний открытый PR и проведи детальное code review. Проверь архитектуру, безопасность, производительность и соответствие PRD. Оставь комментарии в PR через gh cli.',
    { model: 'claude-opus-5' },
  );

  counter.phaseIndex++;
  counter.count = 0;
  fs.writeFileSync(counterFile, JSON.stringify(counter));

  const nextPhase = config.phases ? config.phases[counter.phaseIndex] : null;
  if (!nextPhase) {
    console.log('🎉 Все фазы завершены!');
    process.exit(0);
  }

  console.log(`➡️ Фаза ${counter.phaseIndex + 1}: ${nextPhase.milestone}`);
  const prompt = config.prompt
    .replace('{milestone}', nextPhase.milestone)
    .replace('{branch}', nextPhase.branch);

  runClaude(prompt);
}
