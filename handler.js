import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

export async function handler(chatUpdate) {
	if (!chatUpdate) return;
	this.pushMessage(chatUpdate.messages).catch(console.error);

	let m = chatUpdate.messages[chatUpdate.messages.length - 1];
	if (!m) return;
	if (global.db.data == null) await global.loadDatabase();

	try {
		m = smsg(this, m) || m;
		if (!m) return;
		if (Math.floor(Date.now() / 1000) - m.messageTimestamp > 20) return;

		m.exp = 0;

		if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return;
		await (await import(`./lib/database.js?v=${Date.now()}`)).default(m, this);

		if (typeof m.text !== 'string') m.text = '';
		if (m.isBaileys) return;

		const isROwner = global.owner.map(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
		const isOwner = isROwner || m.fromMe;

		if (!global.db.data.settings[this.user.jid]?.public && !isOwner && !m.fromMe) return;

		const groupMetadata = (m.isGroup ? (this.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch(() => null)) : {}) || {};
		const participants = (m.isGroup ? groupMetadata.participants : []) || [];
		const user = (m.isGroup ? participants.find((u) => this.getJid(u.id) === m.sender) : {}) || {};
		const bot = (m.isGroup ? participants.find((u) => this.getJid(u.id) === this.user.jid) : {}) || {};
		const isAdmin = user?.admin === 'admin' || user?.admin === 'superadmin' || false;
		const isBotAdmin = bot?.admin || false;

		const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');

		for (let name in global.plugins) {
			let plugin = global.plugins[name];
			if (!plugin || plugin.disabled) continue;
			const __filename = path.join(___dirname, name);

			if (typeof plugin !== 'function') continue;

			const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
			let _prefix = plugin.customPrefix || this.prefix || global.prefix;
			let match = (
				_prefix instanceof RegExp
					? [[_prefix.exec(m.text), _prefix]]
					: Array.isArray(_prefix)
						? _prefix.map((p) => {
								let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
								return [re.exec(m.text), re];
							})
						: typeof _prefix === 'string'
							? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
							: [[[], new RegExp()]]
			).find((p) => p[1]);

			let usedPrefix;
			if ((usedPrefix = (match[0] || '')[0])) {
				let noPrefix = m.text.replace(usedPrefix, '');
				let [command, ...args] = noPrefix.trim().split(/\s+/).filter(Boolean);
				args = args || [];
				let text = noPrefix.trim().split(/\s+/).slice(1).join(' ');
				command = (command || '').toLowerCase();

				const isAccept =
					plugin.command instanceof RegExp
						? plugin.command.test(command)
						: Array.isArray(plugin.command)
							? plugin.command.some((cmd) => (cmd instanceof RegExp ? cmd.test(command) : cmd === command))
							: typeof plugin.command === 'string'
								? plugin.command === command
								: false;

				if (!isAccept) continue;
				m.plugin = name;

				if (plugin.owner && !isOwner) {
					await m.reply('🚫 Command ini khusus owner.');
					continue;
				}
				if (plugin.group && !m.isGroup) {
					await m.reply('🚫 Command ini cuma bisa dipake di grup.');
					continue;
				}
				if (plugin.admin && !isAdmin) {
					await m.reply('🚫 Command ini khusus admin grup.');
					continue;
				}
				if (plugin.botAdmin && !isBotAdmin) {
					await m.reply('🚫 Bot harus jadi admin dulu buat command ini.');
					continue;
				}
				if (plugin.private && m.isGroup) {
					await m.reply('🚫 Command ini cuma bisa dipake di chat pribadi.');
					continue;
				}

				m.isCommand = true;
				m.exp += plugin.exp ? parseInt(plugin.exp) : 5;

				const extra = {
					match,
					usedPrefix,
					noPrefix,
					args,
					command,
					text,
					conn: this,
					participants,
					groupMetadata,
					user,
					bot,
					isOwner,
					isROwner,
					isAdmin,
					isBotAdmin,
					chatUpdate,
					__dirname: ___dirname,
					__filename,
				};

				try {
					await plugin.call(this, m, extra);
				} catch (e) {
					m.error = e;
					console.error(e);
					m.reply(`❌ Error di plugin *${name}*:\n${format(e).slice(0, 500)}`);
				}
				break;
			}
		}
	} catch (e) {
		console.error(e);
	} finally {
		let user, stats = global.db.data.stats;

		if (m?.sender && (user = global.db.data.users[m.sender])) {
			user.exp += Number(m.exp || 0);
		}
		if (m?.plugin) {
			const now = Date.now();
			stats[m.plugin] = { total: 0, success: 0, last: 0, lastSuccess: 0, ...stats[m.plugin] };
			stats[m.plugin].total++;
			stats[m.plugin].last = now;
			if (!m.error) {
				stats[m.plugin].success++;
				stats[m.plugin].lastSuccess = now;
			}
		}

		try {
			await (await import('./lib/print.js')).default(m, this);
		} catch (e) {
			console.error(e);
		}
		if (global.db.data.settings[this.user.jid]?.autoread) await this.readMessages([m.key]);
	}
}

export async function participantsUpdate() {}
export async function groupsUpdate() {}
export async function deleteUpdate() {}
