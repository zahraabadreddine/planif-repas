"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HandNote, Tape } from "@/components/main-levee";
import { ChevronLeft, SendIcon } from "@/components/icones";
import { PotMascot } from "@/components/illustrations/personnages";
import { Plate } from "@/components/illustrations/assiette";
import { UrgencyButton } from "@/components/bouton-urgence";
import { cx } from "@/lib/format";
import { chatSuggestions, getRecipe, initialChat } from "@/lib/donnees-simulees";
import type { AgentProposal, ChatMessage } from "@/lib/types";

// Réponses simulées tant que le backend (POST /api/chat/messages, flux SSE) n'est pas branché.
const FAKE_REPLIES: Record<string, string> = {
  "Vider le frigo":
    "Avec ton poisson, tes aubergines et ton gombo, tu peux faire une sauce claire ou un riz sauté. Je te montre ?",
  "Moins cher":
    "Si on remplace le kédjénou par un riz sauce tomate, tu gardes environ 2 000 F cette semaine.",
  "Une idée pour dimanche":
    "Dimanche, poulet braisé & attiéké en famille, c'est déjà prévu. On le garde ?",
};
const DEFAULT_REPLY = "D'accord, je regarde ton menu et ton frigo et je reviens vers toi.";

const SUGGESTION_STYLE = [
  "bg-rose text-puce -rotate-2 rounded-[12px_16px_14px_10px]",
  "bg-lagon rotate-[1.5deg] rounded-[16px_12px_10px_14px]",
  "bg-or -rotate-1 rounded-[14px_10px_16px_12px]",
];

let idCounter = 100;
const newId = () => `m${idCounter++}`;

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  /** Affiche la réponse de Tantie lettre par lettre, comme un flux */
  function streamAgentReply(text: string) {
    setTyping(true);
    const id = newId();
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id, from: "agent", kind: "text", text: "" }]);
      let i = 0;
      const timer = setInterval(() => {
        i += 2;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id && m.kind === "text" ? { ...m, text: text.slice(0, i) } : m,
          ),
        );
        if (i >= text.length) clearInterval(timer);
      }, 18);
    }, 900);
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { id: newId(), from: "user", kind: "text", text: clean }]);
    setDraft("");
    streamAgentReply(FAKE_REPLIES[clean] ?? DEFAULT_REPLY);
  }

  function answerProposal(proposalId: string, status: AgentProposal["status"]) {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "proposal" && m.proposal.id === proposalId
          ? { ...m, proposal: { ...m.proposal, status } }
          : m,
      ),
    );
    streamAgentReply(
      status === "accepted"
        ? "C'est noté. J'envoie la recette à ta fille sur WhatsApp ?"
        : "D'accord, je ne touche à rien. Dis-moi ce que tu veux changer : un plat sans riz, moins cher, plus rapide ?",
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 -mx-5 -mt-6 flex items-center gap-3 border-b-2 border-dashed border-biscuit bg-creme px-5 pb-3.5 pt-5">
        <Link
          href="/accueil"
          aria-label="Retour"
          className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <ChevronLeft size={22} strokeWidth={2.8} />
        </Link>
        <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-mangue">
          <PotMascot size={46} className="animate-float" />
        </span>
        <div className="flex-1">
          <h1 className="retro text-2xl leading-[1.2]">Tantie</h1>
          <p className="font-hand text-lg font-bold leading-tight text-carmin">
            connaît ton frigo par cœur
          </p>
        </div>
        <UrgencyButton variant="square" />
      </header>

      <div className="flex flex-col gap-2.5 pt-3.5" aria-live="polite">
        <HandNote className="self-center text-[17px] text-cacao" tilt={0}>
          mardi, 18 h 04
        </HandNote>
        {messages.map((m, i) =>
          m.kind === "proposal" ? (
            <ProposalCard key={m.id} proposal={m.proposal} onAnswer={answerProposal} />
          ) : (
            <p
              key={m.id}
              className={cx(
                "max-w-[280px] animate-slide-up px-3.5 py-2.5 text-[15px] leading-snug",
                m.from === "user"
                  ? "self-end rounded-[22px_18px_4px_22px] bg-palme font-bold text-creme"
                  : "self-start rounded-[18px_22px_22px_4px] bg-sable font-semibold",
              )}
              style={{ animationDelay: i < initialChat.length ? `${i * 150}ms` : undefined }}
            >
              {m.text}
            </p>
          ),
        )}
        {typing && (
          <div
            aria-label="Tantie écrit"
            className="flex items-center gap-1 self-start px-1 font-hand text-lg font-bold text-carmin"
          >
            Tantie réfléchit
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="h-1.5 w-1.5 animate-dot rounded-full bg-carmin"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} className="h-8" />
      </div>

      {/* Zone de saisie, au-dessus de la barre de navigation */}
      <div className="fixed bottom-[98px] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-creme from-80% to-transparent px-3 pt-3">
        <div className="mb-2.5 flex flex-wrap gap-2 px-1">
          {chatSuggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className={cx(
                "press h-[38px] px-3 text-[13px] font-extrabold",
                SUGGESTION_STYLE[i % SUGGESTION_STYLE.length],
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Écris ton message
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Dis-moi ce qui se passe…"
            autoComplete="off"
            className="h-[54px] min-w-0 flex-1 rounded-[16px_20px_18px_14px] border-2 border-foret bg-white px-4 text-[15px] font-semibold placeholder:text-cacao/60"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            className="press blob flex h-[54px] w-[54px] shrink-0 items-center justify-center bg-sirop text-puce"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
}

/** La proposition de Tantie, présentée comme une fiche recette scotchée */
function ProposalCard({
  proposal,
  onAnswer,
}: {
  proposal: AgentProposal;
  onAnswer: (id: string, status: AgentProposal["status"]) => void;
}) {
  const recipe = getRecipe(proposal.recipeId);
  return (
    <div className="paper-shadow relative mt-2 w-[296px] max-w-full -rotate-1 animate-slide-up self-start rounded-md bg-white px-3.5 pb-3 pt-3.5">
      <Tape color="bg-lagon" className="-top-3 left-[110px] rotate-3" />
      <div className="flex items-center gap-3">
        {recipe && <Plate colors={recipe.colors} size={62} className="shrink-0 animate-float" />}
        <div>
          <p className="font-hand text-lg font-bold leading-none text-carmin">{proposal.label}</p>
          <p className="mt-0.5 font-display text-lg font-semibold leading-tight">
            {proposal.title}
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-cacao">{proposal.summary}</p>
        </div>
      </div>
      {proposal.status === "pending" ? (
        <div className="mt-3 flex gap-2 border-t-2 border-dashed border-sable pt-2.5">
          <button
            type="button"
            onClick={() => onAnswer(proposal.id, "accepted")}
            className="press h-11 flex-[1.3] rounded-[12px_16px_14px_12px] bg-foret text-[15px] font-extrabold text-or"
          >
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => onAnswer(proposal.id, "rejected")}
            className="h-11 flex-1 text-sm font-extrabold text-carmin underline decoration-wavy underline-offset-4"
          >
            Modifier
          </button>
        </div>
      ) : (
        <div className="h-9">
          <span
            className={cx(
              "absolute bottom-2.5 right-3 -rotate-[10deg] animate-pop rounded-[50%_46%_52%_48%] border-[2.5px] px-2.5 font-hand text-[22px] font-bold",
              proposal.status === "accepted"
                ? "border-palme text-palme"
                : "border-carmin text-carmin",
            )}
          >
            {proposal.status === "accepted" ? "validé" : "à revoir"}
          </span>
        </div>
      )}
    </div>
  );
}
