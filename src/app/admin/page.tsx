import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/titre-page";

const cartes = [
  { href: "/admin/recettes", label: "Recettes", icone: "🍜" },
  { href: "/admin/ingredients", label: "Ingrédients", icone: "🥕" },
  { href: "/admin/prix", label: "Prix", icone: "💰" },
  { href: "/admin/magasins", label: "Magasins", icone: "🏪" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icone: "👥" },
];

export default async function AdminPage() {
  const [
    utilisateurs,
    foyers,
    recettes,
    recettesValidees,
    ingredients,
    prix,
    magasins,
    menus,
    conversations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.household.count(),
    prisma.recipe.count({ where: { householdId: null } }),
    prisma.recipe.count({ where: { validated: true, householdId: null } }),
    prisma.ingredient.count(),
    prisma.price.count(),
    prisma.store.count(),
    prisma.mealPlan.count(),
    prisma.conversation.count(),
  ]);

  const stats = [
    { label: "Utilisateurs", valeur: utilisateurs },
    { label: "Foyers", valeur: foyers },
    { label: "Recettes", valeur: recettes },
    { label: "Validées", valeur: recettesValidees },
    { label: "Ingrédients", valeur: ingredients },
    { label: "Prix", valeur: prix },
    { label: "Magasins", valeur: magasins },
    { label: "Menus", valeur: menus },
    { label: "Conversations", valeur: conversations },
  ];

  return (
    <>
      <PageHeader overline="Administration" title="Tableau de bord" />

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-cacao">Statistiques</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
            >
              <p className="text-sm font-bold text-cacao">{s.label}</p>
              <p className="font-display text-2xl font-bold text-foret">{s.valeur}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-cacao">Gestion</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cartes.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="press flex flex-col items-center gap-2 rounded-[18px_22px_20px_16px] border-[2.5px] border-foret bg-creme px-4 py-5 font-display text-base font-semibold text-foret shadow-[0_4px_0_#411102] transition-transform"
            >
              <span className="text-3xl">{c.icone}</span>
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
