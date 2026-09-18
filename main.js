import './config.js';

import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = process.platform !== 'win32') {
	return rmPrefix ? (/file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL) : pathToFileURL(pathURL).toString();
};
global.__dirname = function dirname(pathURL) {
	return path.dirname(global.__filename(pathURL, true));
};
global.__require = function require(dir = import.meta.url) {
	return createRequire(dir);
};

import fs from 'fs';
import { format } from 'util';
import { parentPort } from 'worker_threads';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import chalk from 'chalk';
import pino from 'pino';
import Database from 'better-sqlite3';

import useSQLiteAuthState from './lib/useSQLite.js';
import { Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@rennzsync/baileys';

protoType();
serialize();

const __dirname = global.__dirname(import.meta.url);

global.db = {
	sqlite: null,
	data: null,
};

global.loadDatabase = function () {
	if (!global.db.sqlite) {
		const dbFile = path.resolve('./data/database.db');
		fs.mkdirSync(path.dirname(dbFile), { recursive: true });

		global.db.sqlite = new Database(dbFile);
		global.db.sqlite.pragma('journal_mode = WAL');
		global.db.sqlite.pragma('synchronous = NORMAL');

		global.db.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS database (
        id INTEGER PRIMARY KEY,
        data TEXT
      )
    `);
	}

	if (global.db.data !== null) return;

	global.db.data = {
		users: {},
		chats: {},
		stats: {},
		settings: {},
	};

	const row = global.db.sqlite.prepare('SELECT data FROM database WHERE id = 1').get();

	if (row?.data) {
		try {
			Object.assign(global.db.data, JSON.parse(row.data));
		} catch {
			console.error('[DB] JSON rusak, reset database');
		}
	} else {
		global.db.sqlite.prepare('INSERT OR IGNORE INTO database (id, data) VALUES (1, ?)').run(JSON.stringify(global.db.data));
	}
};
loadDatabase();

for (const dir of ['./tmp', './sessions', './data']) {
	fs.mkdirSync(path.resolve(dir), { recursive: true });
}

const { state, saveCreds } = await useSQLiteAuthState('sessions');
const { version } = await fetchLatestBaileysVersion();

const connectionOptions = {
	auth: {
		creds: state.creds,
		keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'fatal', stream: 'store' })),
	},
	version,
	logger: pino({ level: 'silent' }),
	browser: Browsers.ubuntu('Chrome'),
	generateHighQualityLinkPreview: true,
	syncFullHistory: false,
	shouldSyncHistoryMessage: () => false,
	markOnlineOnConnect: true,
	connectTimeoutMs: 60_000,
	keepAliveIntervalMs: 30_000,
	retryRequestDelayMs: 250,
	maxMsgRetryCount: 5,
	cachedGroupMetadata: (jid) => conn.chats[jid],
};

global.conn = makeWASocket(connectionOptions);

if (!conn.authState.creds.registered && global.loginMethod !== 'qr') {
	console.log(chalk.bgWhite(chalk.blue('Generating pairing code...')));
	setTimeout(async () => {
		try {
			const rawCustom = String(global.customPairingCode || '').trim().toUpperCase();
			const useCustom = /^[A-Z0-9]{8}$/.test(rawCustom);
			if (rawCustom && !useCustom) {
				console.log(chalk.yellow(`Custom pairing code '${rawCustom}' diabaikan (harus 8 karakter alfanumerik) — pakai random.`));
			}
			let code = useCustom
				? await conn.requestPairingCode(String(global.pairingNumber).replace(/[^0-9]/g, ''), rawCustom)
				: await conn.requestPairingCode(String(global.pairingNumber).replace(/[^0-9]/g, ''));
			code = code?.match(/.{1,4}/g)?.join('-') || code;
			console.log(chalk.black(chalk.bgGreen('Pairing Code: ')), chalk.black(chalk.white(code)));
		} catch (e) {
			console.log(e);
		}
	}, 3000);
}

setInterval(() => {
	if (global.db.data) {
		global.db.sqlite.prepare('UPDATE database SET data = ? WHERE id = 1').run(JSON.stringify(global.db.data));
	}
}, 5000);

async function connectionUpdate(update) {
	const { connection, lastDisconnect, qr, isOnline } = update;

	if (connection === 'connecting') console.log(chalk.yellow('⚡ Menyambungkan...'));
	if (qr) console.log(chalk.cyan('Scan QR di atas pake WhatsApp lo.'));
	if (connection === 'open') console.log(chalk.green(`✅ Tersambung sebagai ${conn.user?.id?.split(':')[0]}`));

	if (isOnline === true) console.log(chalk.green('Status Aktif'));
	else if (isOnline === false) console.log(chalk.red('Status Mati'));

	const output = lastDisconnect?.error?.output;
	if (output?.payload) {
		if (output.statusCode === 401) {
			if (conn.authState.creds.registered) {
				console.log(chalk.red('Session logged out. Hapus folder ./sessions lalu login ulang.'));
				fs.rmSync('./sessions', { recursive: true, force: true });
				parentPort?.postMessage('restart');
			} else {
				console.log(chalk.yellow('Pairing code kadaluarsa/belum dipakai. Coba lagi dalam 5 menit...'));
				setTimeout(() => parentPort?.postMessage('restart'), 300000);
			}
			return;
		} else if (output.statusCode === 403) {
			console.log(chalk.red('Akun WhatsApp diban :('));
			process.exit(0);
		} else {
			console.log(chalk.red(output.payload.message || 'Koneksi terputus, restart...'));
		}
		await global.reloadHandler(true);
	}

	if (!global.db.data) await global.loadDatabase();
}

let isInit = true;
let handler = await import('./handler.js');

global.reloadHandler = async function (restartConn) {
	try {
		const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
		if (Object.keys(Handler || {}).length) handler = Handler;
	} catch (e) {
		console.error(e);
	}

	if (restartConn) {
		try {
			global.conn.ws.close();
		} catch {}
		conn.ev.removeAllListeners();
		global.conn = makeWASocket(connectionOptions);
		isInit = true;
	}

	if (!isInit) {
		conn.ev.off('messages.upsert', conn.handler);
		conn.ev.off('connection.update', conn.connectionUpdate);
		conn.ev.off('creds.update', conn.credsUpdate);
	}

	conn.handler = handler.handler.bind(global.conn);
	conn.connectionUpdate = connectionUpdate.bind(global.conn);
	conn.credsUpdate = saveCreds.bind(global.conn);

	conn.ev.on('messages.upsert', conn.handler);
	conn.ev.on('connection.update', conn.connectionUpdate);
	conn.ev.on('creds.update', conn.credsUpdate);

	isInit = false;
	return true;
};

const pluginFolder = join(__dirname, 'plugins');
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};

async function filesInit() {
	for (let filename of fs.readdirSync(pluginFolder).filter(pluginFilter)) {
		try {
			let file = global.__filename(join(pluginFolder, filename));
			const module = await import(file);
			global.plugins[filename] = module.default || module;
		} catch (e) {
			console.error(chalk.red(`❌ Gagal load plugin ${filename}:`), e);
			delete global.plugins[filename];
		}
	}
}
await filesInit();
console.log(chalk.blue(`✓ ${Object.keys(global.plugins).length} plugin ke-load.`));

global.reload = async (_ev, filename) => {
	if (!pluginFilter(filename)) return;
	let dir = global.__filename(join(pluginFolder, filename), true);
	if (filename in global.plugins) {
		if (fs.existsSync(dir)) console.log(chalk.blue(`♻️ Reload plugin '${filename}'`));
		else {
			console.log(chalk.yellow(`🗑️ Plugin dihapus '${filename}'`));
			return delete global.plugins[filename];
		}
	} else console.log(chalk.blue(`✨ Plugin baru '${filename}'`));

	try {
		const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
		global.plugins[filename] = module.default || module;
	} catch (e) {
		console.error(chalk.red(`Gagal reload plugin '${filename}':`), format(e));
	} finally {
		global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
	}
};
fs.watch(pluginFolder, global.reload);

await global.reloadHandler();

process.on('uncaughtException', (err) => console.error(chalk.red('[UNCAUGHT]'), err));
process.on('unhandledRejection', (err) => console.error(chalk.red('[UNHANDLED]'), err));
