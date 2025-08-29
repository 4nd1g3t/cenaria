import MenuGeneratorForm from '@/components/menu/MenuGeneratorForm'
import { getIdTokenOrRedirect } from '@/lib/auth/session'

export default async function MenuGeneratorPage() {
  // Gate server-side: si no hay idToken, redirige a /signin
  const idToken = await getIdTokenOrRedirect("/menu");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Generar menú semanal</h1>
      <MenuGeneratorForm />
    </div>
  )
}
