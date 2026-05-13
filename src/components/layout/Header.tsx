interface HeaderProps {
  subtitle: string;
  title: string;
}

export function Header({ subtitle, title }: HeaderProps) {
  return (
    <header className="top-header" aria-label="Recursum Imprint header">
      <div>
        <p className="system-label">RECURSUM.AI</p>
        <h1>{title}</h1>
      </div>
      <div className="header-signal">
        <span />
        {subtitle}
      </div>
    </header>
  );
}
