import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

type MarketingShellProps = {
  children: React.ReactNode;
  showSectionLinks?: boolean;
};

export function MarketingShell({ children, showSectionLinks = false }: MarketingShellProps) {
  return (
    <main className="marketing-bg relative min-h-screen text-slate-900">
      <div className="marketing-orb marketing-orb-a" />
      <div className="marketing-orb marketing-orb-b" />
      <div className="marketing-orb marketing-orb-c" />
      <MarketingNav showSectionLinks={showSectionLinks} />
      {children}
      <MarketingFooter />
    </main>
  );
}

