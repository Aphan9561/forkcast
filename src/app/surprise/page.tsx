import { redirect } from "next/navigation";
import { randomMeal } from "@/lib/mealdb/client";

/**
 * Hits TheMealDB's random.php (cache: "no-store") and forwards to the meal
 * detail page. Rendered as a plain page + redirect so the "Surprise me"
 * button is just a <Link href="/surprise"> — no client JS needed.
 */
export default async function SurprisePage() {
  const meal = await randomMeal();
  redirect(`/meals/${meal.id}`);
}
