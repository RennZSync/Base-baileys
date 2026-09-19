const handler = async (m, {
  conn,
  usedPrefix,
  command
}) => {
  await conn.richMenu(m.chat, {
    header: {
      title: 'Main Menu'
    },
    body: {
      title: 'Pilih menu',
      buttons: ['Profile', 'Settings', 'Help'],
      toast: 'membuka...'
    },
    footer: {
      text: 'Join',
      url: 't.me/example'
    }
  })
  m.react('✅')
}

handler.help = ['richmenu']
handler.tags = ['owner']
handler.command = /^richmenu$/i
handler.owner = true

export default handler
