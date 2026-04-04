import Link from 'next/link';
import { Shield, FileText, Brain, CheckCircle2, ArrowRight, Zap, Eye } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-slate-500/5" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              AI-Powered Contract Analysis
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Understand your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                contracts
              </span>
              {' '}in minutes
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              ClauseGuard analyzes contracts using AI to flag risky clauses,
              missing protections, and unfair terms — all explained in plain English.
              Built for freelancers and small businesses.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
              >
                Analyze a Contract
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all border border-slate-700"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-lg mx-auto">
            Three simple steps to understand any contract.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-sm text-emerald-500 font-medium mb-2">Step 1</div>
              <h3 className="text-xl font-semibold text-white mb-3">Upload</h3>
              <p className="text-slate-400">
                Drag and drop your PDF or DOCX contract. We extract the text securely server-side.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Brain className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-sm text-emerald-500 font-medium mb-2">Step 2</div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Analysis</h3>
              <p className="text-slate-400">
                Our AI reads every clause, scores risks, and identifies missing protections.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Eye className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-sm text-emerald-500 font-medium mb-2">Step 3</div>
              <h3 className="text-xl font-semibold text-white mb-3">Review</h3>
              <p className="text-slate-400">
                Get a clear dashboard with risk scores, plain-English explanations, and suggested alternatives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Check */}
      <section className="py-24 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            What We Analyze
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-lg mx-auto">
            Our AI checks for all the clauses that matter.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Indemnification',
              'Liability Caps',
              'IP Ownership',
              'Termination',
              'Non-Compete',
              'Payment Terms',
              'Confidentiality',
              'Governing Law',
              'Dispute Resolution',
              'Auto-Renewal',
              'Force Majeure',
              'Data Privacy',
              'Scope of Work',
              'Warranties',
              'Assignment',
              'Insurance',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Shield className="h-12 w-12 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Never sign a bad contract again
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join freelancers and small businesses who review their contracts with AI before signing.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-400">ClauseGuard</span>
          </div>
          <p className="text-xs text-slate-600">
            AI-powered analysis is not a substitute for legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
