"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";
import { HandNote } from "@/components/main-levee";
import { TruckIcon, PackageIcon, PinIcon, CheckIcon, BoltIcon } from "@/components/icones";
import { fcfa, cx } from "@/lib/format";

const CarteLeaflet = dynamic(() => import("@/components/carte-leaflet"), { ssr: false });

type Produit = {
  ingredientId: string;
  ingredientName: string;
  unitId: string;
  quantity: number;
  unitLabel: string;
  priceFcfa: number;
  correspondBesoin: boolean;
};

type Point = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  deliveryFeeFcfa: number;
  produits: Produit[];
  nbCorrespondances: number;
};

type Props = {
  points: Point[];
  householdId: string;
};

type Mode = "carte" | "liste";
type ChoixLivraison = "delivery" | "pickup";

const CENTRE_ABIDJAN: [number, number] = [5.345, -4.025];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DeliveryClient({ points }: Props) {
  const [mode, setMode] = useState<Mode>("carte");
  const [pointSelectionne, setPointSelectionne] = useState<string | null>(null);
  const [choixLivraison, setChoixLivraison] = useState<ChoixLivraison>("delivery");
  const [panierParPoint, setPanierParPoint] = useState<Record<string, Set<string>>>({});
  const [positionUtilisateur, setPositionUtilisateur] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPositionUtilisateur({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  }, []);

  const pointsTries = useMemo(() => {
    if (!positionUtilisateur) return points;
    return [...points].sort(
      (a, b) =>
        distanceKm(positionUtilisateur.lat, positionUtilisateur.lng, a.lat, a.lng) -
        distanceKm(positionUtilisateur.lat, positionUtilisateur.lng, b.lat, b.lng),
    );
  }, [points, positionUtilisateur]);

  const marqueurs = useMemo(
    () =>
      points.map((p) => ({
        id: p.id,
        position: [p.lat, p.lng] as [number, number],
        label: p.name,
        detail: p.nbCorrespondances > 0
          ? `${p.nbCorrespondances} produit${p.nbCorrespondances > 1 ? "s" : ""} pour ta semaine`
          : p.address,
      })),
    [points],
  );

  const pointActif = useMemo(
    () => points.find((p) => p.id === pointSelectionne) ?? null,
    [points, pointSelectionne],
  );

  const togglePanier = useCallback((pointId: string, ingredientId: string) => {
    setPanierParPoint((prev) => {
      const set = new Set(prev[pointId] ?? []);
      if (set.has(ingredientId)) set.delete(ingredientId);
      else set.add(ingredientId);
      return { ...prev, [pointId]: set };
    });
  }, []);

  const [isPending, startTransition] = useTransition();
  const [commandeOk, setCommandeOk] = useState<string | null>(null);
  const [erreurCommande, setErreurCommande] = useState<string | null>(null);

  const panierActif = pointSelectionne ? panierParPoint[pointSelectionne] ?? new Set() : new Set<string>();

  const commander = useCallback(async () => {
    if (!pointActif || panierActif.size === 0) return;
    setErreurCommande(null);
    const items = pointActif.produits
      .filter((p) => panierActif.has(p.ingredientId))
      .map((p) => ({
        ingredientId: p.ingredientId,
        unitId: p.unitId,
        quantity: p.quantity,
      }));

    try {
      const res = await fetch("/api/delivery/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryPointId: pointActif.id,
          type: choixLivraison,
          items,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Erreur lors de la commande");
      }
      const data = await res.json();
      setCommandeOk(data.id);
      setPanierParPoint((prev) => {
        const next = { ...prev };
        delete next[pointActif.id];
        return next;
      });
    } catch (e) {
      setErreurCommande(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [pointActif, panierActif, choixLivraison]);

  const totalPanier = useMemo(() => {
    if (!pointActif) return 0;
    let total = 0;
    for (const p of pointActif.produits) {
      if (panierActif.has(p.ingredientId)) total += p.priceFcfa * p.quantity;
    }
    if (choixLivraison === "delivery") total += pointActif.deliveryFeeFcfa;
    return total;
  }, [pointActif, panierActif, choixLivraison]);

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 flex min-h-dvh flex-col bg-creme pb-[190px]">
      {/* En-tête */}
      <div className="px-5 pt-6">
        <PageHeader overline="Umami Delivery" title="Acheter local" overlineClassName="text-palme" />
        <p className="mt-1 text-sm text-canard">
          Produits frais disponibles près de chez toi, livrés ou à récupérer.
        </p>
        <Link
          href="/delivery/commandes"
          className="mt-3 inline-flex items-center gap-2 rounded-[12px_16px_14px_10px] bg-sirop/10 px-4 py-2.5 text-sm font-extrabold text-sirop transition-colors active:bg-sirop/20"
        >
          <PackageIcon size={16} />
          Suivre mes commandes
          <span className="ml-auto text-xs text-sirop/60">→</span>
        </Link>
      </div>

      {/* Toggle carte / liste */}
      <div className="mt-4 flex gap-2 px-5">
        <button
          onClick={() => setMode("carte")}
          className={cx(
            "press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[14px_18px_16px_12px] text-sm font-extrabold transition-colors",
            mode === "carte" ? "bg-palme text-creme" : "bg-sable text-puce",
          )}
        >
          <PinIcon size={18} /> Carte
        </button>
        <button
          onClick={() => setMode("liste")}
          className={cx(
            "press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[14px_18px_16px_12px] text-sm font-extrabold transition-colors",
            mode === "liste" ? "bg-palme text-creme" : "bg-sable text-puce",
          )}
        >
          <PackageIcon size={18} /> Liste
        </button>
      </div>

      {/* Carte */}
      {mode === "carte" && (
        <div className="mt-4 px-5">
          <CarteLeaflet
            centre={CENTRE_ABIDJAN}
            zoom={12}
            marqueurs={marqueurs}
            onSelectMarqueur={setPointSelectionne}
            className="h-[280px] border-2 border-sable"
          />
          {points.length === 0 && (
            <div className="paper-shadow mt-4 bg-[#FFFDF7] px-[18px] py-5 text-center">
              <p className="font-hand text-[23px] font-bold leading-tight text-puce">
                Aucun point de stock pour le moment
              </p>
              <p className="mt-1 text-sm text-cacao">
                Quand Umami aura des produits près de chez toi, ils apparaîtront ici !
              </p>
            </div>
          )}
        </div>
      )}

      {/* Liste des points */}
      {mode === "liste" && (
        <div className="mt-4 flex flex-col gap-3 px-5">
          {positionUtilisateur && (
            <div className="flex items-center gap-1.5 text-xs text-palme">
              <BoltIcon size={12} />
              <span className="font-bold">Trié par proximité</span>
            </div>
          )}
          {pointsTries.length === 0 ? (
            <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
              <p className="font-hand text-[23px] font-bold leading-tight text-puce">
                Aucun point de stock disponible pour le moment
              </p>
            </div>
          ) : (
            pointsTries.map((p, idx) => {
              const dist = positionUtilisateur
                ? distanceKm(positionUtilisateur.lat, positionUtilisateur.lng, p.lat, p.lng)
                : null;
              return (
                <button
                  key={p.id}
                  onClick={() => setPointSelectionne(p.id)}
                  className={cx(
                    "paper-shadow w-full px-4 py-3.5 text-left transition-colors",
                    pointSelectionne === p.id ? "bg-palme/10 ring-2 ring-palme" : "bg-[#FFFDF7]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {idx === 0 && positionUtilisateur && (
                          <HandNote tilt={3} className="shrink-0 text-xs text-sirop">
                            le + proche !
                          </HandNote>
                        )}
                        <p className="truncate font-display text-[15px] font-bold text-foret">{p.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-canard">{p.address}</p>
                    </div>
                    {p.nbCorrespondances > 0 && (
                      <HandNote tilt={-3} className="shrink-0 text-sm text-palme">
                        {p.nbCorrespondances} match{p.nbCorrespondances > 1 ? "s" : ""}
                      </HandNote>
                    )}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-cacao">
                    <span>{p.produits.length} produit{p.produits.length > 1 ? "s" : ""}</span>
                    <span>Livraison : {fcfa(p.deliveryFeeFcfa)}</span>
                    {dist !== null && (
                      <span className="font-bold text-canard">
                        ~{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Détail d'un point sélectionné */}
      {pointActif && (
        <div className="mt-5 px-5">
          <div className="paper-shadow bg-[#FFFDF7] px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-foret">{pointActif.name}</h2>
                <p className="text-xs text-canard">{pointActif.address}</p>
                {pointActif.phone && (
                  <p className="mt-0.5 text-xs text-cacao">Tél : {pointActif.phone}</p>
                )}
              </div>
              <button
                onClick={() => setPointSelectionne(null)}
                className="text-xs font-bold text-carmin underline"
              >
                Fermer
              </button>
            </div>

            {/* Choix livraison / retrait */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setChoixLivraison("delivery")}
                className={cx(
                  "press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[14px_18px_16px_12px] text-sm font-bold transition-colors",
                  choixLivraison === "delivery" ? "bg-sirop text-creme" : "bg-sable text-puce",
                )}
              >
                <TruckIcon size={16} /> Livraison
              </button>
              <button
                onClick={() => setChoixLivraison("pickup")}
                className={cx(
                  "press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[14px_18px_16px_12px] text-sm font-bold transition-colors",
                  choixLivraison === "pickup" ? "bg-sirop text-creme" : "bg-sable text-puce",
                )}
              >
                <PackageIcon size={16} /> Retrait
              </button>
            </div>

            {choixLivraison === "delivery" && (
              <p className="mt-2 text-center font-hand text-sm text-cacao">
                Frais de livraison : {fcfa(pointActif.deliveryFeeFcfa)}
              </p>
            )}

            {/* Produits disponibles */}
            <h3 className="mt-4 font-display text-sm font-bold text-puce">Produits disponibles</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {pointActif.produits.length === 0 ? (
                <p className="text-sm text-cacao">Aucun produit en stock pour le moment.</p>
              ) : (
                pointActif.produits
                  .sort((a, b) => (b.correspondBesoin ? 1 : 0) - (a.correspondBesoin ? 1 : 0))
                  .map((produit) => (
                    <button
                      key={produit.ingredientId}
                      onClick={() => togglePanier(pointActif.id, produit.ingredientId)}
                      className={cx(
                        "flex w-full items-center gap-2.5 rounded-[10px_14px_12px_8px] px-3 py-2 text-left transition-colors",
                        panierActif.has(produit.ingredientId)
                          ? "bg-palme/15 ring-1 ring-palme/40"
                          : "bg-sable/40",
                        produit.correspondBesoin && !panierActif.has(produit.ingredientId)
                          ? "ring-1 ring-mangue/50"
                          : "",
                      )}
                    >
                      <div
                        className={cx(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          panierActif.has(produit.ingredientId)
                            ? "border-palme bg-palme text-creme"
                            : "border-cacao/30 bg-transparent",
                        )}
                      >
                        {panierActif.has(produit.ingredientId) && <CheckIcon size={12} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="truncate text-sm font-bold text-foret">
                            {produit.ingredientName}
                          </span>
                          <span className="shrink-0 text-xs font-bold text-cacao">
                            {fcfa(produit.priceFcfa)}/{produit.unitLabel}
                          </span>
                        </div>
                        <span className="text-xs text-canard">
                          Stock : {produit.quantity} {produit.unitLabel}
                        </span>
                      </div>
                      {produit.correspondBesoin && (
                        <HandNote tilt={-4} className="shrink-0 text-xs text-mangue">
                          besoin !
                        </HandNote>
                      )}
                    </button>
                  ))
              )}
            </div>

            {/* Récapitulatif et commande */}
            {panierActif.size > 0 && (
              <div className="mt-4 rounded-[14px_18px_16px_12px] bg-or/30 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm font-bold text-foret">
                    {panierActif.size} article{panierActif.size > 1 ? "s" : ""}
                  </span>
                  <span className="font-display text-lg font-bold text-puce">{fcfa(totalPanier)}</span>
                </div>
                {choixLivraison === "delivery" && (
                  <p className="mt-0.5 text-xs text-cacao">
                    Dont {fcfa(pointActif.deliveryFeeFcfa)} de livraison
                  </p>
                )}
                <button
                  onClick={() => startTransition(() => { commander(); })}
                  disabled={isPending}
                  className={cx(
                    "press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px_18px_16px_12px] text-sm font-extrabold text-creme",
                    isPending ? "bg-cacao/50" : "bg-foret",
                  )}
                >
                  <TruckIcon size={18} />
                  {isPending
                    ? "Envoi en cours…"
                    : choixLivraison === "delivery"
                      ? "Commander et être livré"
                      : "Réserver pour retrait"}
                </button>
                {erreurCommande && (
                  <p className="mt-2 text-center text-xs font-bold text-carmin">{erreurCommande}</p>
                )}
              </div>
            )}

            {commandeOk && (
              <div className="mt-4 rounded-[14px_18px_16px_12px] bg-palme/20 px-4 py-3 text-center">
                <p className="font-hand text-lg text-foret">Commande envoyée !</p>
                <p className="mt-1 text-xs text-canard">
                  Tu recevras une confirmation bientôt.
                </p>
                <Link
                  href="/delivery/commandes"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-palme underline"
                >
                  Suivre ma commande →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
