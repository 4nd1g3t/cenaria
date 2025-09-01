import { cookies } from 'next/headers'
import MenuView from '@/components/menu/MenuView'
import { getMenu } from '@/lib/menu'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[]>>
}

export default async function Page({ params, searchParams }: PageProps) {
  // ✅ params es async
  const { id } = await params

  // ⚠️ Asegúrate que getMenu envíe Authorization: Bearer <ID_TOKEN> (ver nota abajo)
  const menu = await getMenu(id)

  // ✅ cookies es async en tu setup
  const cookieStore = await cookies()
  const raw = cookieStore.get('menu_sim')?.value

  let simulation: any = null
  if (raw) {
    try { simulation = JSON.parse(decodeURIComponent(raw)) } catch {}
    // ✅ borra el flash cookie con firma de 3 args
    cookieStore.set('menu_sim', '', { path: `/menu/${id}`, maxAge: 0 })
  }

  return <MenuView menu={menu} simulation={simulation} />
}
