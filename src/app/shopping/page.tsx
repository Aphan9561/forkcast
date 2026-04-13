import { GenerateFromPlanForm } from "@/components/generate-from-plan-form";
import { ShoppingList } from "@/components/shopping-list";
import { listShopping } from "@/lib/data/shopping";

type SearchParams = { from?: string; to?: string };

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [items, { from, to }] = await Promise.all([
    listShopping(),
    searchParams,
  ]);

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Shopping list</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Pull ingredients from your meal plan, or add items by hand.
      </p>
      <GenerateFromPlanForm initialFrom={from} initialTo={to} />
      <ShoppingList items={items} />
    </div>
  );
}
