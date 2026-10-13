import { PageHeader } from "@/components/titre-page";

/** Accueil de l'administration. Les écrans de gestion arrivent avec EF-21. */
export default function AdminPage() {
  return (
    <>
      <PageHeader overline="Administration" title="Kitch'N-Flow" />
      <p className="mt-6 font-semibold text-cacao">
        La gestion des recettes, ingrédients, prix et magasins arrive bientôt.
      </p>
    </>
  );
}
