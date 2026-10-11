"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, CartIcon, ChatIcon, FridgeIcon, HomeIcon } from "./Icons";
import { Squiggle } from "./Hand";
import { cx } from "@/lib/format";

const ITEMS = [
  { href: "/accueil", label: "Accueil", Icon: HomeIcon },
  { href: "/menu", label: "Menu", Icon: CalendarIcon },
  { href: "/assistant", label: "Tantie", Icon: ChatIcon },
  { href: "/courses", label: "Courses", Icon: CartIcon },
  { href: "/frigo", label: "Frigo", Icon: FridgeIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-3.5 left-1/2 z-40 flex h-[72px] w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 items-center justify-around rounded-[26px_30px_24px_28px] bg-foret px-1.5"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "press flex min-w-[58px] flex-col items-center px-1 pt-2 text-[11px] font-extrabold",
              active ? "pb-0.5 text-or" : "pb-2.5 text-creme/75",
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2.2} />
            {label}
            {active && <Squiggle animated />}
          </Link>
        );
      })}
    </nav>
  );
}
