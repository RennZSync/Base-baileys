const handler = async (m) => {
	const start = Date.now();
	await m.reply(`🏓 Pong! ${Date.now() - start}ms`);
};

handler.help = ['ping'];
handler.tags = ['main'];
handler.command = ['ping'];

export default handler;
