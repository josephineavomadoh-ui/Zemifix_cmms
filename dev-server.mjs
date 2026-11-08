import { spawn } from 'child_process';

const args = process.argv.slice(2);
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--host') {
    // Vite --host 0.0.0.0 or Next -H 0.0.0.0
    const nextVal = args[i + 1];
    if (nextVal && !nextVal.startsWith('-')) {
      filteredArgs.push('-H', nextVal);
      i++;
    } else {
      filteredArgs.push('-H', '0.0.0.0');
    }
  } else if (arg.startsWith('--host=')) {
    const val = arg.split('=')[1] || '0.0.0.0';
    filteredArgs.push('-H', val);
  } else if (arg === '--port') {
    const portVal = args[i + 1] || '3000';
    filteredArgs.push('-p', portVal);
    i++;
  } else if (arg.startsWith('--port=')) {
    const portVal = arg.split('=')[1] || '3000';
    filteredArgs.push('-p', portVal);
  } else {
    filteredArgs.push(arg);
  }
}

// Default to -p 3000 and -H 0.0.0.0 if not specified
if (!filteredArgs.includes('-p')) {
  filteredArgs.push('-p', '3000');
}
if (!filteredArgs.includes('-H')) {
  filteredArgs.push('-H', '0.0.0.0');
}

const nextBin = './node_modules/.bin/next';
const child = spawn(nextBin, ['dev', ...filteredArgs], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  process.exit(code || (signal ? 1 : 0));
});
