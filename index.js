console.log('🍃 Starting RennZ Bot...');

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = readline.createInterface(process.stdin, process.stdout);

let worker = null;
let running = false;

function start(file) {
	if (running) return;
	running = true;
	const full = join(__dirname, file);

	if (worker) {
		worker.removeAllListeners('exit');
		worker.terminate();
	}
	worker = new Worker(full);

	worker.on('message', (msg) => {
		if (msg === 'restart') setTimeout(restart, 3000);
	});

	worker.on('error', (err) => {
		console.error('❌ Worker error:', err);
	});

	worker.on('exit', (code) => {
		running = false;
		if (code !== 0) {
			console.log('❗ Worker keluar dengan code', code, '— restart dalam 60 detik...');
			setTimeout(() => start(file), 60000);
		}
	});

	if (!rl.listenerCount('line')) {
		rl.on('line', (line) => {
			const cmd = line.trim().toLowerCase();
			if (!cmd) return;
			if (cmd === 'exit') {
				worker?.terminate();
				process.exit(0);
			}
			if (cmd === 'restart') restart();
		});
	}
}

function restart() {
	if (worker) {
		try {
			worker.removeAllListeners('exit');
			worker.terminate();
		} catch {}
	}
	running = false;
	start('main.js');
}

start('main.js');
