/**
 * Test d'intégration complet — planif-repas
 * Scénario Aminata : inscription → foyer → membres → recettes → menu →
 * courses → achats → stock → cuisson → retour → alertes → sécurité
 */

import { randomBytes } from "node:crypto";

const BASE = "http://localhost:3000";
let pass = 0,
  fail = 0,
  total = 0;
let cookies = {};

// ─── Helpers ──────────────────────────────────────────────────────

function assert(label, expected, actual) {
  total++;
  if (String(expected) === String(actual)) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${label} (attendu=${expected}, reçu=${actual})`);
  }
}

function assertOk(label, value) {
  total++;
  if (value && value !== "null" && value !== "undefined") {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${label} (vide ou null)`);
  }
}

function assertGt(label, value, min) {
  total++;
  if (Number(value) > min) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label} (${value})`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${label} (${value} <= ${min})`);
  }
}

function title(section) {
  console.log(`\n\x1b[33m── ${section} ──\x1b[0m`);
}

function storeCookies(resp) {
  const setCookie = resp.headers.getSetCookie?.() || [];
  for (const sc of setCookie) {
    const [pair] = sc.split(";");
    const [name, ...rest] = pair.split("=");
    cookies[name.trim()] = rest.join("=").trim();
  }
}

function cookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { Cookie: cookieHeader() },
    redirect: "manual",
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(`${BASE}${path}`, opts);
  storeCookies(resp);
  return resp;
}

async function apiJson(method, path, body) {
  const resp = await api(method, path, body);
  const text = await resp.text();
  try {
    return { status: resp.status, data: JSON.parse(text) };
  } catch {
    return { status: resp.status, data: text.slice(0, 200) };
  }
}

async function apiForm(path, formData) {
  const body = new URLSearchParams(formData).toString();
  const resp = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body,
    redirect: "manual",
  });
  storeCookies(resp);
  return resp;
}

// ─── Données de test ─────────────────────────────────────────────

const TS = Date.now();
const EMAIL = `test-${TS}@planifrepas.test`;
// Tiré au hasard à chaque lancement : aucun mot de passe écrit en dur
const PASSWORD = `Mdp-${randomBytes(9).toString("base64url")}`;

function nextMonday() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Supprime le compte de test (et son foyer) : la base ne garde aucune trace du lancement. */
async function nettoyer() {
  try {
    const resp = await apiJson("DELETE", "/api/account", { password: PASSWORD });
    console.log(
      `  Nettoyage : compte de test ${resp.status === 200 ? "supprimé" : `non supprimé (${resp.status})`}`,
    );
  } catch {
    console.log("  Nettoyage : compte de test non supprimé (serveur injoignable)");
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[33m═══════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[33m  TEST D'INTÉGRATION COMPLET — PLANIF-REPAS\x1b[0m");
  console.log("\x1b[33m═══════════════════════════════════════════════\x1b[0m");

  // ═══ 1. INSCRIPTION ════════════════════════════════════════════
  title("1. INSCRIPTION");

  const reg = await apiJson("POST", "/api/register", {
    fullName: "Aminata Test",
    email: EMAIL,
    password: PASSWORD,
    consentHealth: true,
    consentLocation: false,
  });
  assert("Inscription: status 201", 201, reg.status);
  assert("Inscription: email correct", EMAIL, reg.data?.user?.email);
  assertOk("Inscription: userId retourné", reg.data?.user?.id);

  // Doublon
  const dup = await apiJson("POST", "/api/register", {
    fullName: "Doublon",
    email: EMAIL,
    password: PASSWORD,
    consentHealth: true,
    consentLocation: false,
  });
  assert("Inscription doublon: 409", 409, dup.status);

  // Mot de passe trop court
  const badPwd = await apiJson("POST", "/api/register", {
    fullName: "Mauvais",
    email: `bad-${TS}@test.com`,
    password: "123",
    consentHealth: true,
    consentLocation: false,
  });
  assert("Inscription mdp court: 400", 400, badPwd.status);

  // ═══ 2. CONNEXION ═════════════════════════════════════════════
  title("2. CONNEXION");

  // CSRF
  const csrf = await apiJson("GET", "/api/auth/csrf");
  const csrfToken = csrf.data?.csrfToken;
  assertOk("Connexion: CSRF token obtenu", csrfToken);

  // Login via Auth.js
  const loginResp = await apiForm("/api/auth/callback/credentials", {
    email: EMAIL,
    password: PASSWORD,
    csrfToken: csrfToken || "",
    redirect: "false",
    callbackUrl: BASE,
    json: "true",
  });
  // Auth.js redirige (302) vers la page d'accueil après succès
  const loginStatus = loginResp.status;
  total++;
  if (loginStatus === 200 || loginStatus === 302) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m Connexion: status ${loginStatus}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m Connexion: status ${loginStatus} (attendu 200 ou 302)`);
  }

  // Suivre la redirection pour obtenir le cookie de session
  if (loginStatus === 302) {
    const location = loginResp.headers.get("location");
    if (location) {
      const followUrl = location.startsWith("http") ? location : `${BASE}${location}`;
      const follow = await fetch(followUrl, {
        headers: { Cookie: cookieHeader() },
        redirect: "manual",
      });
      storeCookies(follow);
    }
  }

  // Vérifier la session
  const session = await apiJson("GET", "/api/auth/session");
  assert("Session: email correct", EMAIL, session.data?.user?.email);

  // ═══ 3. FOYER ═══════════════════════════════════════════════════
  title("3. CRÉATION DU FOYER");

  // Pas de foyer au départ
  const hhBefore = await apiJson("GET", "/api/household");
  total++;
  if (!hhBefore.data?.household || hhBefore.data.household === null) {
    pass++;
    console.log("  \x1b[32m✓\x1b[0m Foyer: null au départ");
  } else {
    fail++;
    console.log("  \x1b[31m✗\x1b[0m Foyer: devrait être null au départ");
  }

  // Créer le foyer
  const hhCreate = await apiJson("PUT", "/api/household", {
    name: "Famille Aminata Test",
    weeklyBudgetFcfa: 75000,
    cuisinesPreferred: ["ivoirienne", "libanaise"],
    shoppingDay: 6,
  });
  assert("Foyer: status 200 ou 201", true, [200, 201].includes(hhCreate.status));
  const hhId = hhCreate.data?.household?.id;
  assertOk("Foyer: id retourné", hhId);
  assert("Foyer: nom correct", "Famille Aminata Test", hhCreate.data?.household?.name);
  assert("Foyer: budget 75000 FCFA", 75000, hhCreate.data?.household?.weeklyBudgetFcfa);

  // Modifier le foyer
  const hhUpdate = await apiJson("PUT", "/api/household", {
    name: "Famille Aminata Test",
    weeklyBudgetFcfa: 80000,
    cuisinesPreferred: ["ivoirienne", "libanaise", "française"],
    shoppingDay: 6,
  });
  assert("Foyer: budget mis à jour à 80000", 80000, hhUpdate.data?.household?.weeklyBudgetFcfa);

  // ═══ 4. MEMBRES ═════════════════════════════════════════════════
  title("4. MEMBRES DU FOYER");

  // Enfant allergique à l'arachide (scénario Aminata)
  const m1 = await apiJson("POST", "/api/household/members", {
    label: "Enfant 1",
    birthDate: "2020-03-15",
    ageGroup: null,
    allergies: ["arachide"],
    autresAllergies: [],
    regimes: [],
  });
  assert("Membre Enfant 1: status 201", 201, m1.status);
  assertOk("Membre Enfant 1: id", m1.data?.member?.id);

  // Maman sans restriction
  const m2 = await apiJson("POST", "/api/household/members", {
    label: "Maman",
    birthDate: null,
    ageGroup: "adult",
    allergies: [],
    autresAllergies: [],
    regimes: [],
  });
  assertOk("Membre Maman: id", m2.data?.member?.id);

  // Papa sans restriction
  const m3 = await apiJson("POST", "/api/household/members", {
    label: "Papa",
    birthDate: null,
    ageGroup: "adult",
    allergies: [],
    autresAllergies: [],
    regimes: [],
  });
  assertOk("Membre Papa: id", m3.data?.member?.id);

  // Bébé
  const m4 = await apiJson("POST", "/api/household/members", {
    label: "Bébé",
    birthDate: null,
    ageGroup: "baby",
    allergies: [],
    autresAllergies: [],
    regimes: [],
  });
  assertOk("Membre Bébé: id", m4.data?.member?.id);

  // Membre invalide (ni date ni tranche)
  const mBad = await apiJson("POST", "/api/household/members", {
    label: "Inconnu",
    birthDate: null,
    ageGroup: null,
    allergies: [],
    autresAllergies: [],
    regimes: [],
  });
  assert("Membre invalide (pas de date/tranche): 400", 400, mBad.status);

  // Vérifier le nombre de membres via les réponses POST (pas de GET /members)
  const membresCreesOk = [m1, m2, m3, m4].filter((m) => m.status === 201).length;
  assert("Membres: 4 créés avec succès", 4, membresCreesOk);

  // ═══ 5. RECETTES ═══════════════════════════════════════════════
  title("5. RECETTES");

  const recipes = await apiJson("GET", "/api/recipes");
  const recipeList = Array.isArray(recipes.data)
    ? recipes.data
    : Array.isArray(recipes.data?.recipes)
      ? recipes.data.recipes
      : [];
  assertGt("Recettes: catalogue non vide", recipeList.length, 0);
  console.log(`     → ${recipeList.length} recettes dans le catalogue`);

  // ═══ 6. INGRÉDIENTS ═══════════════════════════════════════════
  title("6. INGRÉDIENTS");

  const ings = await apiJson("GET", "/api/ingredients");
  const ingList = Array.isArray(ings.data)
    ? ings.data
    : Array.isArray(ings.data?.ingredients)
      ? ings.data.ingredients
      : [];
  assertGt("Ingrédients: catalogue non vide", ingList.length, 0);
  console.log(`     → ${ingList.length} ingrédients`);

  // Trouver un ingrédient avec son unité pour les achats
  let firstIngId = null,
    firstUnitId = null;
  let secondIngId = null,
    secondUnitId = null;
  for (const ing of ingList) {
    const units = ing.units || ing.marketUnits || [];
    if (units.length > 0) {
      if (!firstIngId) {
        firstIngId = ing.id;
        firstUnitId = units[0].id || units[0].unitId;
      } else if (!secondIngId) {
        secondIngId = ing.id;
        secondUnitId = units[0].id || units[0].unitId;
        break;
      }
    }
  }

  // ═══ 7. MAGASINS ══════════════════════════════════════════════
  title("7. MAGASINS");

  const stores = await apiJson("GET", "/api/stores?lat=5.3364&lng=-4.0267");
  const storeList = Array.isArray(stores.data)
    ? stores.data
    : Array.isArray(stores.data?.stores)
      ? stores.data.stores
      : [];
  assertGt("Magasins: catalogue non vide", storeList.length, 0);
  console.log(`     → ${storeList.length} magasins`);

  // ═══ 8. MENU DE LA SEMAINE ════════════════════════════════════
  title("8. MENU DE LA SEMAINE");

  const weekStart = nextMonday();
  console.log(`     Semaine du ${weekStart}`);

  const menu = await apiJson("POST", "/api/meal-plans/generate", { weekStart });
  if (menu.status !== 200 && menu.status !== 201) {
    console.log(`     ⚠ Réponse menu: ${menu.status}`, JSON.stringify(menu.data).slice(0, 300));
  }
  assert("Menu: status 201 ou 200", true, [200, 201].includes(menu.status));
  const menuId = menu.data?.plan?.id;
  assertOk("Menu: id retourné", menuId);
  assert("Menu: statut draft", "draft", menu.data?.plan?.status);

  const meals = menu.data?.plan?.meals || [];
  assertGt("Menu: repas planifiés", meals.length, 0);
  console.log(`     → ${meals.length} repas dans le menu`);

  // Vérifier l'absence d'allergènes (arachide) — règle §3.2
  // On vérifie que les recettes du menu ne contiennent pas d'arachide
  let arachideFound = false;
  for (const meal of meals) {
    const recipe = meal.recipe;
    if (
      recipe?.allergens?.includes("arachide") ||
      recipe?.ingredients?.some((i) => i.ingredient?.allergens?.includes("arachide"))
    ) {
      arachideFound = true;
      break;
    }
  }
  total++;
  if (!arachideFound) {
    pass++;
    console.log("  \x1b[32m✓\x1b[0m Allergènes: aucun plat avec arachide (enfant allergique)");
  } else {
    fail++;
    console.log("  \x1b[31m✗\x1b[0m VIOLATION §3.2 : un plat contient de l'arachide !");
  }

  // ═══ 9. ACTIVATION DU MENU ════════════════════════════════════
  title("9. ACTIVATION DU MENU");

  if (menuId) {
    const activate = await apiJson("POST", `/api/meal-plans/${menuId}/activate`, {});
    assert("Activation: statut active", "active", activate.data?.plan?.status);

    const listId = activate.data?.list?.id;
    assertOk("Activation: liste de courses créée", listId);

    // ═══ 10. MENU ACTIF ═════════════════════════════════════════
    title("10. MENU ACTIF");

    const current = await apiJson("GET", "/api/meal-plans/current");
    assert("Menu actif: correspond au menu créé", menuId, current.data?.plan?.id);

    const activeMeals = current.data?.plan?.meals || [];
    const firstMealId = activeMeals[0]?.id;
    const secondMealId = activeMeals.length > 1 ? activeMeals[1].id : null;

    // ═══ 11. LISTE DE COURSES ═══════════════════════════════════
    title("11. LISTE DE COURSES");

    if (listId) {
      const shoppingList = await apiJson("GET", `/api/shopping-lists/${listId}`);
      const items = shoppingList.data?.items || shoppingList.data?.list?.items || [];
      assertGt("Liste de courses: articles présents", items.length, 0);
      console.log(`     → ${items.length} articles`);

      // Partage WhatsApp
      const share = await apiJson("GET", `/api/shopping-lists/${listId}/share`);
      const shareText = share.data?.text || share.data?.message || "";
      assertOk("Partage WhatsApp: texte généré", shareText);
      console.log(`     → Aperçu: "${shareText.slice(0, 80)}..."`);

      // Où acheter
      const where = await apiJson("GET", `/api/shopping-lists/${listId}/where-to-buy`);
      assert("Où acheter: status 200", 200, where.status);

      // Récupérer les ingrédients de la liste pour les achats
      if (!firstIngId && items.length > 0) {
        firstIngId = items[0].ingredientId;
        firstUnitId = items[0].unitId;
        if (items.length > 1) {
          secondIngId = items[1].ingredientId;
          secondUnitId = items[1].unitId;
        }
      }
    } else {
      total += 3;
      fail += 3;
      console.log("  \x1b[31m✗\x1b[0m Liste de courses: pas de liste");
    }

    // ═══ 12. ACHATS (STOCK) ════════════════════════════════════
    title("12. STOCK — ACHATS");

    if (firstIngId && firstUnitId) {
      const purchaseItems = [
        { ingredientId: firstIngId, unitId: firstUnitId, quantity: 3, location: "fridge" },
      ];
      if (secondIngId && secondUnitId) {
        purchaseItems.push({
          ingredientId: secondIngId,
          unitId: secondUnitId,
          quantity: 2,
          location: "pantry",
        });
      }

      const achat = await apiJson("POST", "/api/stock/purchases", { items: purchaseItems });
      assert("Achats: status 201", 201, achat.status);

      // Vérifier le stock
      const stock = await apiJson("GET", "/api/stock");
      const stockItems = Array.isArray(stock.data) ? stock.data : [];
      assertGt("Stock: articles en stock", stockItems.length, 0);
      console.log(`     → ${stockItems.length} articles en stock`);

      const firstStockId = stockItems[0]?.id;

      // ═══ 13. CORRECTION ═════════════════════════════════════
      title("13. STOCK — CORRECTION");

      if (firstStockId) {
        const correction = await apiJson("PATCH", `/api/stock/${firstStockId}`, { quantity: 5 });
        assert("Correction: status 200", 200, correction.status);
        assert("Correction: quantité = 5", 5, correction.data?.nouvelleQuantite);

        // ═══ 14. JET ═══════════════════════════════════════════
        title("14. STOCK — JET");

        const thrown = await apiJson("POST", `/api/stock/${firstStockId}/thrown`, { quantity: 1 });
        assert("Jet: status 200 ou 201", true, [200, 201].includes(thrown.status));
        assert("Jet: quantité = 4 après jet de 1", 4, thrown.data?.quantiteRestante);
      } else {
        title("13. STOCK — CORRECTION");
        total++;
        fail++;
        console.log("  \x1b[31m✗\x1b[0m Correction: pas de stock");
        title("14. STOCK — JET");
        total++;
        fail++;
        console.log("  \x1b[31m✗\x1b[0m Jet: pas de stock");
      }
    } else {
      total += 4;
      fail += 4;
      console.log("  \x1b[31m✗\x1b[0m Achats: pas d'ingrédient/unité disponible");
    }

    // ═══ 15. ALERTES DE PÉREMPTION ════════════════════════════
    title("15. ALERTES DE PÉREMPTION");

    const alertes = await apiJson("GET", "/api/stock/alertes");
    assert("Alertes péremption: status 200", 200, alertes.status);

    // ═══ 16. SUGGESTIONS VIDER LE FRIGO ═══════════════════════
    title("16. SUGGESTIONS VIDER LE FRIGO");

    const suggestions = await apiJson("GET", "/api/stock/suggestions");
    assert("Suggestions: status 200", 200, suggestions.status);
    const sugList = Array.isArray(suggestions.data) ? suggestions.data : [];
    console.log(`     → ${sugList.length} suggestion(s)`);

    // ═══ 17. CUISSON ═════════════════════════════════════════
    title("17. MARQUER UN REPAS CUISINÉ");

    if (firstMealId) {
      const cook = await apiJson("POST", `/api/planned-meals/${firstMealId}/cooked`, {});
      assert("Cuisson: status 200", 200, cook.status);
      assertOk("Cuisson: recette retournée", cook.data?.recipeName);

      // ═══ 18. RETOUR APRÈS REPAS ═════════════════════════════
      title("18. RETOUR APRÈS REPAS");

      const fb1 = await apiJson("POST", `/api/planned-meals/${firstMealId}/feedback`, {
        liked: 3,
        leftovers: false,
        comment: "Excellent !",
      });
      assert("Retour: status 200", 200, fb1.status);
      assertOk("Retour: nom de recette", fb1.data?.recipeName);
      assert("Retour: note 3", 3, fb1.data?.liked);
      assert("Retour: pas de restes", false, fb1.data?.leftovers);
      console.log(`     → Recette: "${fb1.data?.recipeName}"`);

      // Deuxième cuisson + retour pour tenter l'apprentissage
      if (secondMealId) {
        const cook2 = await apiJson("POST", `/api/planned-meals/${secondMealId}/cooked`, {});
        if (cook2.data?.status === "cooked") {
          const fb2 = await apiJson("POST", `/api/planned-meals/${secondMealId}/feedback`, {
            liked: 1,
            leftovers: true,
            comment: "Pas bon",
          });
          assert("Retour 2: status 200", 200, fb2.status);
          assert("Retour 2: note 1", 1, fb2.data?.liked);
          assert("Retour 2: restes = true", true, fb2.data?.leftovers);
        }
      }
    } else {
      title("18. RETOUR APRÈS REPAS");
      total += 4;
      fail += 4;
      console.log("  \x1b[31m✗\x1b[0m Cuisson/Retour: pas de repas disponible");
    }
  } else {
    // Pas de menu → sauter sections 9-18
    for (const s of [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) {
      title(`${s}. (SAUTÉ — pas de menu)`);
      total += 2;
      fail += 2;
    }
  }

  // ═══ 19. SÉCURITÉ — ACCÈS SANS SESSION ═════════════════════
  title("19. SÉCURITÉ — ACCÈS SANS SESSION");

  // Requêtes sans cookie de session
  async function noAuthGet(path) {
    const resp = await fetch(`${BASE}${path}`, { redirect: "manual" });
    return resp.status;
  }
  async function noAuthPost(path) {
    const resp = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      redirect: "manual",
    });
    return resp.status;
  }

  assert("Sécurité: GET /api/household sans session → 401", 401, await noAuthGet("/api/household"));
  assert("Sécurité: GET /api/stock sans session → 401", 401, await noAuthGet("/api/stock"));
  assert(
    "Sécurité: POST /api/stock/purchases sans session → 401",
    401,
    await noAuthPost("/api/stock/purchases"),
  );
  assert(
    "Sécurité: GET /api/meal-plans/current sans session → 401",
    401,
    await noAuthGet("/api/meal-plans/current"),
  );
  assert("Sécurité: GET /api/recipes sans session → 401", 401, await noAuthGet("/api/recipes"));

  // ═══ 20. VALIDATION — DONNÉES INVALIDES ═════════════════════
  title("20. VALIDATION — DONNÉES INVALIDES");

  // Budget hors limites
  const badBudget = await apiJson("PUT", "/api/household", {
    name: "X",
    weeklyBudgetFcfa: 100,
    cuisinesPreferred: [],
    shoppingDay: null,
  });
  assert("Validation: budget < 5000 → 400", 400, badBudget.status);

  // Menu un mardi
  const badMenu = await apiJson("POST", "/api/meal-plans/generate", {
    weekStart: "2026-11-03",
  });
  assert("Validation: menu un mardi → 400", 400, badMenu.status);

  // Champ en trop (strictObject)
  const badExtra = await apiJson("PUT", "/api/household", {
    name: "Test",
    weeklyBudgetFcfa: 25000,
    cuisinesPreferred: [],
    shoppingDay: null,
    householdId: "hack",
  });
  assert("Validation: champ en trop (householdId) → 400", 400, badExtra.status);

  // Feedback invalide
  const badFeedback = await apiJson("POST", "/api/planned-meals/fake-id/feedback", {
    liked: 5,
    leftovers: "oui",
  });
  assert("Validation: feedback invalide → 400", 400, badFeedback.status);

  await nettoyer();

  // ═══ RÉSUMÉ ════════════════════════════════════════════════════
  console.log("\n\x1b[33m═══════════════════════════════════════════════\x1b[0m");
  console.log(`  RÉSULTAT : \x1b[32m${pass} réussis\x1b[0m / ${total} tests`);
  if (fail > 0) {
    console.log(`  \x1b[31m${fail} ÉCHEC(S)\x1b[0m`);
  } else {
    console.log("  \x1b[32mTOUS LES TESTS PASSENT !\x1b[0m");
  }
  console.log("\x1b[33m═══════════════════════════════════════════════\x1b[0m\n");

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("ERREUR FATALE:", err);
  await nettoyer();
  process.exit(2);
});
