'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  History,
} from 'lucide-react';

interface ContractSummary {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: number;
  overallRiskScore: number | null;
  contractType: string | null;
  status: string;
}

function getRiskBadge(score: number | null) {
  if (score === null) return { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Pending', icon: Clock };
  if (score <= 25) return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Low Risk', icon: CheckCircle2 };
  if (score <= 50) return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Moderate', icon: AlertCircle };
  if (score <= 75) return { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High Risk', icon: AlertTriangle };
  return { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critical', icon: XCircle };
}

export default function HistoryPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    if (authStatus === 'authenticated') {
      fetchContracts();
    }
  }, [authStatus, router]);

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-500" />
            Contract History
          </h1>
          <p className="text-slate-400 mt-1">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
        <Link href="/dashboard">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Analyze New Contract
          </Button>
        </Link>
      </div>

      {contracts.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No contracts yet</h3>
          <p className="text-slate-400 mb-6">Upload your first contract to get started.</p>
          <Link href="/dashboard">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Upload Contract
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            const risk = getRiskBadge(contract.overallRiskScore);
            const RiskIcon = risk.icon;
            return (
              <Link key={contract.id} href={`/contract/${contract.id}`}>
                <Card className="bg-slate-900/50 border-slate-800 p-5 hover:border-slate-600 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{contract.fileName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {contract.contractType && (
                          <span className="text-xs text-slate-500">{contract.contractType}</span>
                        )}
                        <span className="text-xs text-slate-600">
                          {contract.uploadedAt
                            ? new Date(contract.uploadedAt * 1000).toLocaleDateString()
                            : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {contract.overallRiskScore !== null && (
                        <span className="text-2xl font-bold text-white">
                          {contract.overallRiskScore}
                        </span>
                      )}
                      <span className={`text-xs border rounded-full px-3 py-1 flex items-center gap-1 ${risk.color}`}>
                        <RiskIcon className="h-3 w-3" />
                        {risk.label}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
