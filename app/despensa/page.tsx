import { getServerPantry } from "@/lib/pantry.server";

export const runtime = "nodejs";

export default async function Page() {
  const client = getServerPantry();
  const { data } = await client.list({ limit: 20 });

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Despensa</h1>
      <ul className="space-y-2">
        {data.items.map((it) => (
          <li key={it.id} className="border rounded p-3">
            <div className="font-medium">{it.name}</div>
            <div className="text-sm opacity-70">
              {it.quantity} {it.unit} • {it.category}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
