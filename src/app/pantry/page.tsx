import { PantryList } from "@/components/pantry-list";
import { listPantry } from "@/lib/data/pantry";

export default async function PantryPage() {
  const items = await listPantry();

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-display font-semibold tracking-tight mb-1">Pantry</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Track what you already have at home.
      </p>
      <PantryList items={items} />
    </div>
  );
}
