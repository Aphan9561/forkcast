import type { MealPreview } from "@/lib/mealdb/types";
import { MealCard } from "./meal-card";

type Props = { meals: MealPreview[]; emptyMessage?: string };

export function MealGrid({ meals, emptyMessage = "No meals found." }: Props) {
  if (meals.length === 0) {
    return <p className="text-sm text-zinc-500 py-8">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {meals.map((m) => (
        <MealCard key={m.id} meal={m} />
      ))}
    </div>
  );
}
