import { GenerateFromPlanForm } from "@/components/generate-from-plan-form";
import { ShoppingList } from "@/components/shopping-list";
import { listShopping } from "@/lib/data/shopping";

export default async function ShoppingPage() {
  const items = await listShopping();

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Shopping list</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Pull ingredients from your meal plan, or add items by hand.
      </p>
      <GenerateFromPlanForm />
      <ShoppingList items={items} />
    </div>
  );
}
