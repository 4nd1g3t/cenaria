import PantryClient from "@/components/pantry/PantryList";

export default function DespensaPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <PantryClient />
    </div>
  );
}







/*// app/pantry/page.tsx
import PantryForm from "@/components/pantry/PantryForm";
import PantryList from "@/components/pantry/PantryList";
import { listPantry } from "@/lib/pantry";
import { getIdTokenOrRedirect } from "@/lib/auth-session";

export const metadata = { title: "Despensa | Cenaria" };

async function Items() {
  const idToken = await getIdTokenOrRedirect("/pantry");
  const { items } = await listPantry({ idToken }); 
  return <PantryList items={items} />; 
}

export default async function Page() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Despensa</h1>
      <PantryForm />
      <Items />
    </div>
  );
}

*/