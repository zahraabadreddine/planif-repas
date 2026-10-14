import Link from "next/link";
import { ArrowRight, CalendarIcon, CartIcon, FridgeIcon, UserIcon } from "@/components/icones";
import { HandNote, Tape } from "@/components/main-levee";
import { Aubergine } from "@/components/illustrations/aliments";
import { UmiHead } from "@/components/umi";
import { SauceBowl } from "@/components/illustrations/assiette";
import { UrgencyButton } from "@/components/bouton-urgence";
import { fcfa } from "@/lib/format";
import { getRecipe, household, shoppingList, stock, weekPlan } from "@/lib/donnees-simulees";
import { auth } from "@/lib/auth/config";
import { exigerSession } from "@/lib/auth/garde";

export default async function HomePage() {
  // Sans foyer décrit, on invite le parent à le faire (EF-03). La garde de session est dans le layout.
  const session = await exigerSession().catch(() => null);
  const sansFoyer = !session?.householdId;
  // Le nom vient du compte connecté (enregistré à l'inscription) : on garde le premier mot.
  const prenom = (await auth())?.user?.name?.trim().split(/\s+/)[0];
  // Date du jour à Abidjan, quel que soit le pays du serveur : « mercredi 14 octobre ».
  const aujourdhui = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Abidjan",
  }).format(new Date());

  const today = weekPlan.find((d) => d.date === household.today)!;
  const dinner = getRecipe(today.meals.find((m) => m.slot === "dinner")!.recipeId)!;
  const urgent = stock.find((s) => s.icon === "aubergine");
  const mealsCount = weekPlan.reduce((n, d) => n + d.meals.length, 0);
  const itemsCount = shoppingList.reduce((n, b) => n + b.items.length, 0);
  const left = household.weeklyBudgetFcfa - household.spentFcfa;
  const budgetPct = Math.round((household.spentFcfa / household.weeklyBudgetFcfa) * 100);

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <HandNote className="text-[21px] text-carmin" tilt={-2}>
            {aujourdhui}
          </HandNote>
          <h1 className="retro mt-1 text-[26px] leading-[1.3]">
            On mange quoi ce soir
            {prenom ? (
              <>
                ,
                <br />
                {prenom}&nbsp;?
              </>
            ) : (
              <>&nbsp;?</>
            )}
          </h1>
        </div>
        <Link
          href="/foyer"
          aria-label="Mon foyer"
          className="press flex h-12 w-12 shrink-0 rotate-6 items-center justify-center rounded-full border-[2.5px] border-foret bg-rose"
        >
          <UserIcon size={26} />
        </Link>
      </header>

      {sansFoyer && (
        <Link
          href="/foyer"
          className="press paper-shadow relative mt-5 flex items-center gap-3 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-or p-4 text-foret"
        >
          <UmiHead size={44} />
          <span className="flex-1">
            <span className="block font-display text-lg font-semibold leading-tight">
              Décris ton foyer
            </span>
            <span className="text-sm font-bold">pour recevoir ton premier menu de la semaine</span>
          </span>
          <ArrowRight size={22} strokeWidth={2.8} />
        </Link>
      )}

      {/* Repas de ce soir */}
      <section className="wonky-lg relative mt-5 h-[188px] animate-pop bg-palme p-5 text-creme">
        <Tape className="-top-[11px] left-[26px] -rotate-[5deg]" />
        <SauceBowl size={156} className="absolute -right-1.5 top-[18px] animate-float" />
        <HandNote className="relative text-2xl text-or">ce soir&nbsp;→</HandNote>
        <h2 className="relative mt-1.5 max-w-[180px] font-display text-[27px] font-semibold leading-[1.02]">
          {dinner.name}
        </h2>
        <p className="relative mt-2 text-sm font-bold opacity-90">
          {dinner.minutes} min · pour {dinner.servings} · {fcfa(dinner.costFcfa, false)} F
        </p>
        <div className="relative mt-3.5 flex gap-2">
          <Link
            href={`/recettes/${dinner.id}`}
            className="press wonky flex h-11 items-center bg-or px-4 text-sm font-extrabold text-foret"
          >
            Voir la recette
          </Link>
          <Link
            href="/chat"
            className="flex h-11 items-center px-2 text-sm font-extrabold underline decoration-wavy underline-offset-[5px]"
          >
            changer
          </Link>
        </div>
      </section>

      {/* Post-it : un produit à utiliser vite */}
      {urgent && (
        <Link
          href="/stock"
          className="press paper-shadow relative mt-[18px] flex -rotate-[1.4deg] items-center gap-3 rounded-[3px_3px_10px_3px] bg-or px-3.5 py-3"
        >
          <Tape
            color="bg-creme"
            className="-top-[9px] left-1/2 h-4 w-[46px] -translate-x-1/2 rotate-3"
          />
          <Aubergine size={46} className="shrink-0 animate-float" />
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold leading-snug">
              {urgent.quantity} {urgent.name.toLowerCase()} s&apos;ennuient au fond du frigo
            </span>
            <span className="block font-hand text-xl font-bold leading-tight text-carmin">
              à cuisiner avant jeudi&nbsp;!
            </span>
          </span>
        </Link>
      )}

      {/* Raccourcis en colonnes décalées (pas une grille parfaite) */}
      <div className="mt-[18px] flex gap-2.5">
        <div className="flex flex-1 flex-col gap-2.5">
          <Link
            href="/menu"
            className="press flex h-[120px] flex-col justify-between rounded-[22px_28px_20px_24px] bg-sirop p-3.5 text-puce"
          >
            <CalendarIcon size={30} />
            <span>
              <span className="block font-display text-lg font-semibold leading-tight">
                La semaine
              </span>
              <span className="font-hand text-lg font-bold">{mealsCount} repas prévus</span>
            </span>
          </Link>
          <Link
            href="/stock"
            className="press flex h-20 items-center gap-2.5 rounded-[20px_18px_26px_20px] bg-rose px-3.5 text-puce"
          >
            <FridgeIcon size={28} />
            <span className="font-display text-[17px] font-semibold leading-tight">
              Vider le frigo
            </span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          <Link
            href="/courses"
            className="press flex h-20 items-center gap-2.5 rounded-[24px_20px_20px_26px] bg-lagon px-3.5"
          >
            <CartIcon size={28} />
            <span>
              <span className="block font-display text-[17px] font-semibold leading-tight">
                Les courses
              </span>
              <span className="font-hand text-[17px] font-bold">{itemsCount} articles</span>
            </span>
          </Link>
          <Link
            href="/chat"
            className="press flex h-[120px] flex-col justify-between rounded-[26px_22px_28px_20px] bg-foret p-3.5 text-or"
          >
            <UmiHead size={36} />
            <span>
              <span className="block font-display text-lg font-semibold leading-tight">
                Demande à Umi
              </span>
              <span className="font-hand text-[17px] font-bold text-creme">elle a une idée</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Budget, en simple ligne */}
      <section className="mt-4 w-[220px]" aria-label="Budget de la semaine">
        <div className="flex items-baseline justify-between text-[13px] font-extrabold">
          <span>
            {fcfa(household.spentFcfa, false)} F sur {fcfa(household.weeklyBudgetFcfa, false)}
          </span>
          <span className="font-hand text-lg text-palme">reste {fcfa(left, false)}</span>
        </div>
        <div
          className="mt-1 h-2.5 overflow-hidden rounded-[6px_10px_8px_6px] bg-sable"
          role="progressbar"
          aria-valuenow={budgetPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full animate-grow rounded-[6px_10px_8px_6px] bg-palme"
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </section>

      <UrgencyButton />
    </>
  );
}
