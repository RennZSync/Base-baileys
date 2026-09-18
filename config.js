import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Nomor buat pairing code login
global.pairingNumber = '6285378997479';

// Custom pairing code (opsional). Harus 8 karakter alfanumerik, contoh: 'RENZBOT1'.
// Kosongin ('') kalau mau pairing code random dari WhatsApp (default).
global.customPairingCode = '';

// Owner bot: [nomor, nama, isDeveloper]
global.owner = [['6285378997479', 'RennZz', true]];

global.namebot = 'RennZ Bot';
global.author = 'RennZz-Dev';

global.wait = 'Loading...';
global.eror = 'Terjadi Kesalahan...';

// Prefix command (RegExp / string / array)
global.prefix = /^[./!#]/;

// Hot reload config.js kalau di-edit pas bot jalan
let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
	unwatchFile(file);
	console.log(chalk.redBright("Update 'config.js'"));
	import(`${file}?update=${Date.now()}`);
});
