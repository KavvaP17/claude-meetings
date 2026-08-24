const { execFileSync } = require('child_process');
const fs = require('fs');

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
  execFileSync('claude', args, { stdio: 'inherit' });
}

function nextIssues(milestone) {
  const output = execFileSync('gh', [
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
