const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('🚀 [GBS SYSTEM] Launching Enterprise Ecosystem Services...');
console.log(`📁 Backend Directory: ${backendDir}`);
console.log(`📁 Frontend Directory: ${frontendDir}`);

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Spawn Backend
const backendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

// Spawn Frontend
const frontendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (err) => {
  console.error('❌ [BACKEND ERROR]', err);
});

frontendProcess.on('error', (err) => {
  console.error('❌ [FRONTEND ERROR]', err);
});

const shutdown = () => {
  console.log('\n🛑 [GBS SYSTEM] Gracefully shutting down services...');
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
