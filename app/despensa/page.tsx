// app/despensa/page.tsx
import PantryForm from "@/components/pantry/PantryForm";
import PantryList from "@/components/pantry/PantryList";
import { listPantry } from "@/lib/pantry";
import { getIdTokenOrRedirect } from "@/lib/auth";

export const metadata = { title: "Despensa | Cenaria" };

async function Items() {
  const idToken = await getIdTokenOrRedirect();
  const { items } = await listPantry({ idToken }); // ⬅️ desestructura
  return <PantryList items={items} />;                          // ⬅️ pasa el array
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
