import syntaxerror from 'syntax-error';
import * as baileys from '@rennzsync/baileys';
import util from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);

// Cek owner manual, karena plugin customPrefix di beberapa framework
// jalan sebelum permission check normal (handler.owner bisa gak ke-enforce).
function isOwnerNumber(m, conn) {
	if (m.fromMe) return true;
	if (typeof conn?.isOwner === 'function' && conn.isOwner(m.sender)) return true;

	const raw = [
		...(Array.isArray(global.owner) ? global.owner : []),
		...(Array.isArray(global.DATA?.owner) ? global.DATA.owner : []),
	];
	const ownerNumbers = raw
		.map((o) => (Array.isArray(o) ? o[0] : o))
		.map((n) => String(n).replace(/\D/g, ''));

	const sender = String(m.sender || '').split('@')[0];
	return ownerNumbers.includes(sender);
}

// Fallback reply biar jalan di conn-style maupun sock-style
async function safeReply(conn, m, text) {
	if (typeof conn.reply === 'function') return conn.reply(m.chat, text, m);
	return conn.sendMessage(m.chat, { text }, { quoted: m });
}

function inspectOutput(value) {
	if (value instanceof Error) return value.stack || value.message;
	if (Buffer.isBuffer(value)) return `<Buffer ${value.length} bytes>`;
	if (typeof value === 'string') return value;
	return util.inspect(value, { depth: null, showHidden: false, colors: false, maxArrayLength: null, maxStringLength: null });
}

let handler = async (m, _2) => {
	const { usedPrefix, noPrefix, groupMetadata, participants, isOwner } = _2;

	// alias biar script eval bisa pake nama apapun sesuai kebiasaan project
	const conn = _2.conn || _2.sock;
	const sock = conn;
	const client = conn;
	const bot = conn;

	if (!(isOwner || isOwnerNumber(m, conn))) {
		return safeReply(conn, m, '❎ Command ini cuma buat owner.');
	}

	let _return;
	let _syntax = '';
	const isReturn = /^=/.test(usedPrefix);
	const _text = (isReturn ? 'return ' : '') + noPrefix;
	const oldExp = m.exp * 1;

	try {
		const f = { exports: {} };
		const exec = new (async () => {}).constructor(
			'print',
			'm',
			'require',
			'conn',
			'sock',
			'client',
			'bot',
			'baileys',
			'groupMetadata',
			'participants',
			'jid',
			'db',
			'plugins',
			'store',
			'module',
			'exports',
			'argument',
			_text
		);

		_return = await exec.call(
			conn,
			(...args) => {
				console.log(...args);
				const out = args.length === 1 ? inspectOutput(args[0]) : util.format(...args);
				return safeReply(conn, m, out);
			},
			m,
			require,
			conn,
			sock,
			client,
			bot,
			baileys,
			groupMetadata,
			participants || groupMetadata?.participants,
			m.chat,
			global.db,
			global.plugins,
			global.store,
			f,
			f.exports,
			[conn, _2]
		);
	} catch (e) {
		const err = syntaxerror(_text, 'Execution Function', {
			allowReturnOutsideFunction: true,
			allowAwaitOutsideFunction: true,
			sourceType: 'module',
		});
		if (err) _syntax = '```' + err + '```\n\n';
		_return = e;
	} finally {
		const output = _syntax + String(inspectOutput(_return) ?? 'undefined');
		await safeReply(conn, m, output);
		m.exp = oldExp;
	}
};

handler.help = ['>', '=>'];
handler.tags = ['owner'];
handler.customPrefix = /^=?> /;
handler.command = /(?:)/i;
handler.owner = true;

export default handler;
