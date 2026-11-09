/**
 * Parcours Aminata (scénario de référence, CLAUDE.md §1).
 *
 * Pré-requis : la base a été remplie par `npx prisma db seed`.
 * Le mot de passe du compte aminata@umami.test est dans la variable SEEDDEMOPASSWORD.
 */
import { test, expect } from "@playwright/test";

const EMAIL = "aminata@umami.test";
const PASSWORD = process.env.SEEDDEMOPASSWORD ?? "";

test.describe("Scénario Aminata", () => {
  test.beforeEach(async ({ page }) => {
    // Connexion au compte Aminata
    await page.goto("/connexion");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Attendre la redirection vers l'accueil
    await expect(page).toHaveURL(/\/accueil/, { timeout: 10_000 });
  });

  test("l'accueil affiche le foyer d'Aminata", async ({ page }) => {
    // Le foyer d'Aminata doit être visible
    await expect(page.getByRole("heading", { name: /Aminata/ })).toBeVisible();
  });

  test("le bouton urgence est visible sur l'accueil", async ({ page }) => {
    const bouton = page.getByRole("link", { name: /pas le temps/i });
    await expect(bouton).toBeVisible();
  });

  test("mode urgence : suggestions sans arachide, choix et WhatsApp", async ({ page }) => {
    // Aller sur la page urgence
    await page.goto("/urgence");
    await expect(page.getByText("Pas le temps")).toBeVisible({ timeout: 10_000 });

    // Sélectionner 20 minutes
    const bouton20 = page.getByRole("radio", { name: "20 minutes" });
    await bouton20.click();
    await expect(bouton20).toHaveAttribute("aria-checked", "true");

    // Vérifier que les restrictions sont affichées (sans arachide)
    await expect(page.getByText(/sans arachide/i)).toBeVisible();

    // Des options de recettes doivent apparaître (au moins une)
    const options = page.getByRole("button", { name: /min$/ });
    const count = await options.count();
    // Il peut y avoir 0 options si le catalogue seed n'a pas de recettes rapides avec le stock
    // Dans ce cas, on vérifie le message d'absence
    if (count === 0) {
      await expect(page.getByText(/aucune recette/i)).toBeVisible();
      return;
    }

    // Vérifier qu'aucune option ne contient « arachide » (règle 2 : allergènes filtrés par le code)
    const pageText = await page.locator("section").last().textContent();
    expect(pageText?.toLowerCase()).not.toContain("arachide");

    // Cliquer sur la première option
    await options.first().click();

    // Le bouton de confirmation doit apparaître (« On part sur … »)
    const confirmer = page.getByRole("button", { name: /on part sur/i });
    await expect(confirmer).toBeVisible();

    // Confirmer le choix
    await confirmer.click();

    // Après confirmation : le lien WhatsApp doit apparaître
    const whatsapp = page.getByRole("link", { name: /whatsapp/i });
    await expect(whatsapp).toBeVisible({ timeout: 10_000 });

    // Le lien WhatsApp pointe vers wa.me
    const href = await whatsapp.getAttribute("href");
    expect(href).toContain("wa.me");
    expect(href).toContain("Mode%20urgence");

    // Le message de confirmation affiche le nom de la recette décalée
    await expect(page.getByText(/décalé à demain/i)).toBeVisible();
  });

  test("le compteur de personnes fonctionne", async ({ page }) => {
    await page.goto("/urgence");
    await expect(page.getByText("Pas le temps")).toBeVisible({ timeout: 10_000 });

    // Le foyer d'Aminata a 4 membres, le compteur doit démarrer à 4
    const compteur = page.getByRole("region", { name: /polite/i }).or(page.locator("[aria-live='polite']"));
    await expect(compteur.getByText("4")).toBeVisible();

    // Augmenter d'une personne
    await page.getByRole("button", { name: /une personne de plus/i }).click();
    await expect(compteur.getByText("5")).toBeVisible();

    // Diminuer de deux personnes
    await page.getByRole("button", { name: /une personne de moins/i }).click();
    await page.getByRole("button", { name: /une personne de moins/i }).click();
    await expect(compteur.getByText("3")).toBeVisible();
  });
});
