type Props = {
  overline: string;
  title: string;
  right?: React.ReactNode;
  overlineClassName?: string;
};

export function PageHeader({ overline, title, right, overlineClassName = "text-cacao" }: Props) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-sm font-bold ${overlineClassName}`}>{overline}</p>
        <h1 className="retro mt-0.5 text-[28px] leading-[1.3]">{title}</h1>
      </div>
      {right}
    </header>
  );
}
