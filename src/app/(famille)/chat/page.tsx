"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HandNote, Tape } from "@/components/main-levee";
import { ChevronLeft, SendIcon } from "@/components/icones";
import { UmiHead } from "@/components/umi";
import { UrgencyButton } from "@/components/bouton-urgence";
import { cx } from "@/lib/format";
import type { AgentProposal, ChatMessage } from "@/lib/types";

const SUGGESTIONS = ["Vider le frigo", "Moins cher", "Une idée pour dimanche"];

const SUGGESTION_STYLE = [
  "bg-rose text-puce -rotate-2 rounded-[12px_16px_14px_10px]",
  "bg-lagon rotate-[1.5deg] rounded-[16px_12px_10px_14px]",
  "bg-or -rotate-1 rounded-[14px_10px_16px_12px]",
];

let idCounter = 100;
const newId = () => `m${idCounter++}`;

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m0", from: "agent", kind: "text", text: "Bonsoir ! Je suis Umi, ton assistante cuisine. Dis-moi ce qui se passe 🍲" },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
    setDraft("");
    setErreur(null);

    setMessages((prev) => [...prev, { id: newId(), from: "user", kind: "text", text: clean }]);
    setTyping(true);

    const agentMsgId = newId();
    let agentTextStarted = false;

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          conversationId,
        }),
      });

      if (!res.body) throw new Error("Pas de flux de réponse.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event:\s*(.+)/m);
          const dataMatch = part.match(/^data:\s*(.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === "text") {
            const delta = payload.delta as string;
            if (!agentTextStarted) {
              agentTextStarted = true;
              setMessages((prev) => [
                ...prev,
                { id: agentMsgId, from: "agent", kind: "text", text: delta },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId && m.kind === "text"
                    ? { ...m, text: m.text + delta }
                    : m,
                ),
              );
            }
          } else if (eventType === "done") {
            setConversationId(payload.conversationId as string);
          } else if (eventType === "proposals") {
            const propositions = payload.propositions as Array<{
              id: string;
              type: string;
              title: string;
              label: string;
              summary: string;
            }>;
            if (propositions?.length > 0) {
              for (const p of propositions) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: newId(),
                    from: "agent",
                    kind: "proposal",
                    proposal: {
                      id: p.id,
                      type: p.type,
                      title: p.title,
                      label: p.label,
                      summary: p.summary,
                      status: "pending",
                    },
                  },
                ]);
              }
            }
          } else if (eventType === "error") {
            throw new Error((payload.message as string) ?? "Erreur inconnue.");
          }
        }
      }

      if (!agentTextStarted) {
        setMessages((prev) => [
          ...prev,
          { id: agentMsgId, from: "agent", kind: "text", text: "Je n'ai pas pu formuler de réponse. Réessaie." },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      setErreur(msg);
      if (!agentTextStarted) {
        setMessages((prev) => [
          ...prev,
          { id: agentMsgId, from: "agent", kind: "text", text: "Désolée, je n'ai pas pu répondre. Réessaie dans un instant." },
        ]);
      }
    } finally {
      setTyping(false);
    }
  }

  async function answerProposal(proposalId: string, status: "accepted" | "rejected") {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "proposal" && m.proposal.id === proposalId
          ? { ...m, proposal: { ...m.proposal, status } }
          : m,
      ),
    );

    setTyping(true);
    const action = status === "accepted" ? "accept" : "reject";

    try {
      const res = await fetch(`/api/chat/proposals/${proposalId}/${action}`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Erreur ${res.status}`);
      }

      const data = await res.json();
      const replyText =
        status === "accepted"
          ? data.resultat
            ? "C'est fait ! La modification a été appliquée."
            : "C'est noté, c'est validé !"
          : "D'accord, je ne touche à rien. Dis-moi ce que tu veux changer.";

      setMessages((prev) => [
        ...prev,
        { id: newId(), from: "agent", kind: "text", text: replyText },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === "proposal" && m.proposal.id === proposalId
            ? { ...m, proposal: { ...m.proposal, status: "pending" } }
            : m,
        ),
      );
      setErreur(msg);
    } finally {
      setTyping(false);
    }
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
          <UmiHead size={40} className="animate-float" />
        </span>
        <div className="flex-1">
          <h1 className="retro text-2xl leading-[1.2]">Umi</h1>
          <p className="font-hand text-lg font-bold leading-tight text-carmin">
            ton assistante cuisine
          </p>
        </div>
        <UrgencyButton variant="square" />
      </header>

      <div className="flex flex-col gap-2.5 pt-3.5" aria-live="polite">
        <HandNote className="self-center text-[17px] text-cacao" tilt={0}>
          Conversation
        </HandNote>

        {erreur && (
          <p className="self-center rounded-lg bg-carmin/10 px-3 py-1.5 text-center text-[13px] font-bold text-carmin">
            {erreur}
          </p>
        )}

        {messages.map((m) =>
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
            >
              {m.text}
            </p>
          ),
        )}
        {typing && (
          <div
            aria-label="Umi écrit"
            className="flex items-center gap-1 self-start px-1 font-hand text-lg font-bold text-carmin"
          >
            <UmiHead size={26} mood="reflechit" />
            Umi réfléchit
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

      <div className="fixed bottom-[98px] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-creme from-80% to-transparent px-3 pt-3">
        <div className="mb-2.5 flex flex-wrap gap-2 px-1">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={typing}
              className={cx(
                "press h-[38px] px-3 text-[13px] font-extrabold",
                SUGGESTION_STYLE[i % SUGGESTION_STYLE.length],
                typing && "opacity-50",
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
            disabled={typing}
            className="h-[54px] min-w-0 flex-1 rounded-[16px_20px_18px_14px] border-2 border-foret bg-white px-4 text-[15px] font-semibold placeholder:text-cacao/60 disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={typing}
            className="press blob flex h-[54px] w-[54px] shrink-0 items-center justify-center bg-sirop text-puce disabled:opacity-60"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
}

function ProposalCard({
  proposal,
  onAnswer,
}: {
  proposal: AgentProposal;
  onAnswer: (id: string, status: "accepted" | "rejected") => void;
}) {
  return (
    <div className="paper-shadow relative mt-2 w-[296px] max-w-full -rotate-1 animate-slide-up self-start rounded-md bg-white px-3.5 pb-3 pt-3.5">
      <Tape color="bg-lagon" className="-top-3 left-[110px] rotate-3" />
      <div>
        <p className="font-hand text-lg font-bold leading-none text-carmin">{proposal.label}</p>
        <p className="mt-0.5 font-display text-lg font-semibold leading-tight">
          {proposal.title}
        </p>
        <p className="mt-0.5 text-[13px] font-bold text-cacao">{proposal.summary}</p>
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
