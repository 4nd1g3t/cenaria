// app/(menu)/menu/[id]/page.tsx
import PreparePanel  from '@/components/menu/MenuForm';
import { API_URL } from '@/lib/constants';
import { getIdTokenOrRedirect } from "@/lib/auth-session";

type PageProps = {
  params: Promise<{ id: string }>; // 👈 Next 15: params como Promise
};

export default async function MenuPage({ params }: PageProps) {
  const { id } = await params; 
  const idToken = await getIdTokenOrRedirect();
  return (
    <main className="p-6">
      {/* ...tu header + vista del menú... */}
      <PreparePanel
        menuId={id}
        idToken={idToken}
        apiUrl={API_URL}
        onAfterConfirm={() => {
        }}
      />
    </main>
  );
}
