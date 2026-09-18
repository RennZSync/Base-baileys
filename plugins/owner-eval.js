import util from 'util';

const handler = async (m, { conn, text }) => {
	if (!text) return m.reply('Kasih code-nya, contoh: .eval 1+1');

	try {
		let result = await eval(`(async () => { ${text.includes('return') ? text : `return ${text}`} })()`);
		if (typeof result !== 'string') result = util.inspect(result);
		await m.reply(result || 'undefined');
	} catch (e) {
		await m.reply(`Error: ${e.message}`);
	}
};

handler.help = ['eval'];
handler.tags = ['owner'];
handler.command = ['eval', '>'];
handler.owner = true;

export default handler;
