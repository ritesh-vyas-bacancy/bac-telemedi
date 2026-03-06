import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer id="contact" className="mt-16 border-t border-cyan-100 bg-white/86">
      <div className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr]">
        <section>
          <p className="text-xs font-semibold tracking-[0.15em] text-cyan-700">BAC TELEMEDICINE</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Enterprise Telehealth Operations Platform</h2>
          <p className="mt-2 text-sm text-slate-600">
            Designed for modern hospital networks with role-based workflows for patient care, provider execution, and
            admin governance.
          </p>
        </section>

        <section>
          <p className="text-xs font-semibold tracking-[0.15em] text-cyan-700">CMS PAGES</p>
          <div className="mt-2 grid gap-1 text-sm">
            <Link href="/about" className="text-slate-700 transition hover:text-cyan-700">
              About
            </Link>
            <Link href="/terms" className="text-slate-700 transition hover:text-cyan-700">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-slate-700 transition hover:text-cyan-700">
              Privacy Policy
            </Link>
            <Link href="/#faq" className="text-slate-700 transition hover:text-cyan-700">
              FAQs
            </Link>
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold tracking-[0.15em] text-cyan-700">ADDRESS AND CONTACT</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>BAC Telemedicine Pvt. Ltd.</p>
            <p>7th Floor, Healthcare Digital Tower</p>
            <p>SG Highway, Ahmedabad, Gujarat 380015, India</p>
            <p className="pt-1">Email: support@bac-telemedi.demo</p>
            <p>Phone: +91 79 4000 7788</p>
          </div>
        </section>
      </div>
      <div className="border-t border-cyan-100 bg-white/70 py-3 text-center text-xs text-slate-600">
        Copyright {new Date().getFullYear()} BAC Telemedicine. All rights reserved.
      </div>
    </footer>
  );
}

