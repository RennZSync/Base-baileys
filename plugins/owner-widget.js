import { A2UI } from '@rennzsync/baileys'

const handler = async (m, {
  conn,
  usedPrefix,
  command
}) => {
  const ui = new A2UI()
  const title = ui.text('Halo!', { variant: 'h1' })
  const label = ui.text('Klik saya')
  const btn = ui.button(label, { action: { name: 'noop' } })
  ui.root([ui.card(ui.column([title, btn]))])

  await conn.sendA2UI(m.chat, {
    a2ui: ui,
    bodyText: 'Widget',
    footer: 'A2UI',
    quoted: m
  })

  const list = new A2UI().listCard({
    title: 'Menu',
    items: [
      { title: 'Nasi Goreng', price: 'Rp15.000' },
      { title: 'Es Teh', price: 'Rp5.000' }
    ]
  })
  await conn.sendA2UI(m.chat, { a2ui: list, bodyText: 'Pesan menu', quoted: m })

  m.react('✅')
}

handler.help = ['widget']
handler.tags = ['owner']
handler.command = /^widget$/i
handler.owner = true

export default handler
