const handler = async (m, { conn, usedPrefix: _p, isOwner }) => {
	const allTags = {
		main: 'Main Menu',
		owner: 'Owner Menu',
	};

	const plugins = Object.values(global.plugins).filter((p) => !p.disabled);
	const help = plugins.map((p) => ({
		help: Array.isArray(p.help) ? p.help : [p.help],
		tags: Array.isArray(p.tags) ? p.tags : [p.tags],
		owner: p.owner || false,
	}));

	const tags = { ...allTags };
	if (!isOwner) delete tags.owner;

	let text = `╭─「 ${global.namebot} 」\n│ Halo @${m.sender.split('@')[0]}\n│`;

	for (const tag of Object.keys(tags)) {
		const items = help
			.filter((p) => p.tags.includes(tag))
			.flatMap((p) => p.help.map((h) => `${_p}${h}${p.owner ? ' 🄾' : ''}`));
		if (!items.length) continue;
		text += `\n├─「 ${tags[tag]} 」\n${items.map((i) => `│ ⭓ ${i}`).join('\n')}`;
	}

	text += '\n╰────────────';

	await conn.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m });
};

handler.help = ['menu', 'help'];
handler.tags = ['main'];
handler.command = ['menu', 'help', '?'];

export default handler;
