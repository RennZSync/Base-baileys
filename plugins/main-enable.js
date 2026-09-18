let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin }) => {
    // Validate context
    if (!m.chat || !m.sender) {
        return console.error('[enable] Invalid message context')
    }

    // Initialize DB structures
    if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = {}
    }
    if (!global.db.data.users[m.sender]) {
        global.db.data.users[m.sender] = {}
    }
    if (!global.db.data.settings[conn.user.jid]) {
        global.db.data.settings[conn.user.jid] = {}
    }

    const isEnable = /^(true|enable|(turn)?on|1)$/i.test(command)
    const chat = global.db.data.chats[m.chat]
    const user = global.db.data.users[m.sender]
    const settings = global.db.data.settings[conn.user.jid]

    let type = (args[0] || '').toLowerCase().trim()
    let isAll = false
    let isUser = false

    if (!type) {
        return m.reply(
            `*Daftar opsi yang bisa diatur:*

*Untuk User:*
- autolevelup

*Untuk Admin Grup:*
- welcome
- antidelete
${isOwner ? `
*Untuk Owner Bot:*
- autoread
- public
- anticall
` : ''}

*Contoh penggunaan:*
- ${usedPrefix}enable welcome
- ${usedPrefix}disable antilink`.trim()
        )
    }

    switch (type) {
        case 'welcome':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.welcome = isEnable
            break

        case 'antidelete':
        case 'delete':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.delete = isEnable
            break

        case 'autoread':
            isAll = true
            if (!isOwner) return global.dfail('owner', m, conn)
            settings.autoread = isEnable
            break

        case 'public':
            isAll = true
            if (!isOwner) return global.dfail('owner', m, conn)
            settings.public = isEnable
            break

        case 'anticall':
            isAll = true
            if (!isOwner) return global.dfail('owner', m, conn)
            settings.anticall = isEnable
            break


        default:
            return m.reply(`❌ Fitur *${type}* tidak dikenali. Gunakan ${usedPrefix}${command} tanpa argumen untuk melihat daftar fitur.`)
    }

    m.reply(
        `✅ *${type}* berhasil di *${isEnable ? 'aktifkan' : 'nonaktifkan'}* ${
            isAll ? 'untuk bot' : isUser ? 'untuk user' : 'untuk chat ini'
        }`
    )
}

handler.all = true
handler.help = ['enable', 'disable']
handler.tags = ['main']
handler.command = /^((en|dis)able|(true|false)|(turn)?(on|off)|[01])$/i

export default handler