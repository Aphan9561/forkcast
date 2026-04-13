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

  const toBuy = items.filter((i) => !i.checked).length;
  const checked = items.length - toBuy;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Shopping list</h1>
      <p className="text-sm text-zinc-500 mb-6">
        {items.length === 0
          ? "Pull ingredients from your meal plan, or add items by hand."
          : `${toBuy} to buy${checked > 0 ? ` · ${checked} checked off` : ""}`}
      </p>
      <GenerateFromPlanForm initialFrom={from} initialTo={to} />
      <ShoppingList items={items} />
    </div>
  );
}
