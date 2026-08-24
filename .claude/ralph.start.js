const { execFileSync } = require('child_process');
const fs = require('fs');

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

execFileSync('claude', ['-p', prompt, '--max-turns', String(config.maxTurns)], {
  stdio: 'inherit',
});
