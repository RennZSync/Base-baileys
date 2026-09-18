# RennZ Base Bot

Base WhatsApp bot pake `@rennzsync/baileys`, dengan struktur plugin & handler ala ChiiMD.

## Setup

```bash
npm install
```

Butuh `ffmpeg` terinstall di sistem kalau mau pakai `lib/converter.js` (convert audio/video).

## Konfigurasi

Edit `config.js`:
- `owner` — array `[nomor, nama, isDeveloper]`
- `pairingNumber` — nomor buat pairing code (kalau mau login pake pairing, bukan QR)
- `prefix` — default `/^[./!#]/`

## Jalanin

```bash
npm start
```

`index.js` adalah launcher (worker thread + auto-restart kalau crash). Bot beneran jalan di `main.js`.

Default login pake QR (scan langsung dari terminal). Kalau mau pairing code, set `global.loginMethod = 'pairing'` di `config.js`.

## Struktur

```
.
├── config.js         # owner, prefix, nama bot
├── index.js          # launcher (worker + auto-restart)
├── main.js           # koneksi baileys, load plugin, database sqlite
├── handler.js         # dispatch command ke plugin
├── lib/
│   ├── simple.js      # serialize pesan (m.reply, m.text, m.sender, dst) — dari ChiiMD
│   ├── database.js    # skema default user/chat/settings (trimmed, tanpa RPG)
│   ├── store.js       # in-memory store (chats, getName, decodeJid, dst)
│   ├── print.js       # log pesan masuk ke console
│   ├── converter.js   # convert audio/video (butuh ffmpeg)
│   └── useSQLite.js   # auth state pake better-sqlite3
├── plugins/
│   ├── main-ping.js
│   ├── main-menu.js
│   └── owner-eval.js
├── sessions/          # auth session (auto-generated)
└── data/              # database.db (auto-generated)
```

## Nambah Command

Bikin file baru di `plugins/`, penamaan `kategori-nama.js` (contoh: `tools-sticker.js`).

```js
const handler = async (m, { conn, args, text }) => {
	await m.reply('Halo!');
};

handler.help = ['hello'];   // muncul di .menu
handler.tags = ['main'];    // kategori di menu
handler.command = ['hello']; // trigger command (bisa string/array/RegExp)

export default handler;
```

Opsi tambahan di plugin:
- `owner: true` — cuma owner
- `group: true` — cuma di grup
- `private: true` — cuma di chat pribadi
- `admin: true` — cuma admin grup
- `botAdmin: true` — bot harus admin dulu
- `customPrefix` — override prefix global buat plugin ini

Plugin baru langsung ke-load otomatis (hot reload, gak perlu restart) — `main.js` watch folder `plugins/`.

## Ngakses data user/chat

```js
global.db.data.users[m.sender]   // data user pengirim
global.db.data.chats[m.chat]     // data chat/grup
global.db.data.settings[conn.user.jid] // settings bot
```

Auto ke-save ke `data/database.db` tiap 5 detik.
