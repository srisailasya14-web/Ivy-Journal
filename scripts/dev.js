import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const children = [
  ['server', ['server/index.js']],
  ['client', [path.join('node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0']]
].map(([name, args]) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: ['inherit', 'pipe', 'pipe'] });
  child.stdout.on('data', data => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`));
  child.on('exit', code => { if (code && !process.exitCode) process.exitCode = code; });
  return child;
});

const stop = () => children.forEach(child => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
