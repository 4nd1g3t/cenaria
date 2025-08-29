import { notFound } from 'next/navigation'
import ReplaceRecipeForm from '@/components/menu/ReplaceRecipeForm';
import { API_URL } from '@/lib/config/constants'
import MenuView from '@/components/menu/MenuView'
import { getIdTokenOrRedirect } from '@/lib/auth/session'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[]>>
}

export default async function MenuDetailPage({ params }: PageProps) {
  const { id } = await params;
  const idToken = await getIdTokenOrRedirect(`/menu/${id}`);

  const res = await fetch(`${API_URL}/v1/menu/${id}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });

  if (res.status === 404) notFound()
  if (!res.ok) throw new Error('No se pudo cargar el menú')

  const menu = await res.json(); // WeeklyMenu completo
  const version: number | undefined = menu?.version ?? menu?.menu?.version; // por si tu handler envía envuelto

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menú #{id}</h1>
          {typeof version === 'number' && (
            <p className="text-sm text-gray-500">Versión actual: {version}</p>
          )}
        </div>
      </header>
        <MenuView menu={menu} />
      <section>
        <h2 className="text-lg font-semibold mb-2">Reemplazar receta de un día</h2>
        <ReplaceRecipeForm menuId={id} currentVersion={version} />
      </section>
    </div>
  );
}