import { PageHeader } from "@/components/titre-page";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px_14px_12px_8px] bg-sable/60 ${className ?? ""}`} />;
}

export default function AdminLoading() {
  return (
    <>
      <PageHeader overline="Administration" title="Centre de commande" />

      {/* Delivery stats */}
      <section className="mt-5">
        <Skeleton className="h-5 w-20" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px]" />
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-6 flex gap-2">
        <Skeleton className="h-[48px] flex-1" />
        <Skeleton className="h-[48px] flex-1" />
      </section>

      {/* Recent orders */}
      <section className="mt-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-2 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px]" />
          ))}
        </div>
      </section>

      {/* App stats */}
      <section className="mt-8">
        <Skeleton className="h-5 w-24" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px]" />
          ))}
        </div>
      </section>

      {/* Management cards */}
      <section className="mt-6 pb-4">
        <Skeleton className="h-5 w-16" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px]" />
          ))}
        </div>
      </section>
    </>
  );
}
