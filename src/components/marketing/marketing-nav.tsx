import Link from "next/link";
import Image from "next/image";

type MarketingNavProps = {
  showSectionLinks?: boolean;
};

export function MarketingNav({ showSectionLinks = false }: MarketingNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-200 bg-white">
            <Image src="/brand/logo-mark.svg" alt="BAC Telemedicine" width={32} height={32} />
          </span>
          <span>
            <span className="block text-[11px] font-semibold tracking-[0.17em] text-cyan-700">BAC TELEMEDICINE</span>
            <span className="block text-sm font-semibold text-slate-900">Enterprise Virtual Care</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5">
          {showSectionLinks ? (
            <>
              <Link href="/#platform" className="marketing-nav-link">
                Platform
              </Link>
              <Link href="/#journey" className="marketing-nav-link">
                How It Works
              </Link>
              <Link href="/#cms" className="marketing-nav-link">
                CMS Blocks
              </Link>
              <Link href="/#faq" className="marketing-nav-link">
                FAQs
              </Link>
            </>
          ) : null}
          <Link href="/about" className="marketing-nav-link">
            About
          </Link>
          <Link href="/terms" className="marketing-nav-link">
            Terms
          </Link>
          <Link href="/privacy" className="marketing-nav-link">
            Privacy
          </Link>
          <Link href="/auth/sign-in?next=/workspace" className="marketing-nav-link">
            Login
          </Link>
          <Link
            href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-100"
          >
            Patient Signup
          </Link>
          <Link
            href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(8,145,178,0.95)]"
          >
            Provider Signup
          </Link>
        </nav>
      </div>
    </header>
  );
}

