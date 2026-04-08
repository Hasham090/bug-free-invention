'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { AnalysisResults } from '@/components/analysis-results';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ContractDetailPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}`);
      if (!res.ok) {
        throw new Error('Contract not found');
      }
      const data = await res.json();
      setContract(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    if (authStatus === 'authenticated' && contractId) {
      fetchContract();
    }
  }, [authStatus, contractId, router, fetchContract]);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !contract?.analysisResult) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Analysis not available'}</p>
        <Link href="/history">
          <Button variant="outline" className="border-slate-600 text-slate-300">
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/history">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </Link>
      </div>
      <AnalysisResults
        analysis={contract.analysisResult}
        fileName={contract.fileName}
        contractId={contract.id}
      />
    </div>
  );
}
