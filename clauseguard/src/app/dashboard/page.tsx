'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/file-upload';
import { AnalysisResults } from '@/components/analysis-results';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<any>(null);
  const [contractId, setContractId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/auth');
    return null;
  }

  const handleAnalysisComplete = (id: string, result: any) => {
    setContractId(id);
    setAnalysis(result);
    setFileName('Uploaded Contract');
  };

  const handleReset = () => {
    setAnalysis(null);
    setContractId('');
    setFileName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!analysis ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-emerald-500" />
              <h1 className="text-3xl font-bold text-white">
                Analyze a Contract
              </h1>
            </div>
            <p className="text-slate-400 max-w-lg mx-auto">
              Upload a PDF or DOCX contract and our AI will analyze it for risks,
              unfair clauses, and missing protections — all explained in plain English.
            </p>
          </div>
          <FileUpload onAnalysisComplete={handleAnalysisComplete} />
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Analyze Another Contract
            </Button>
          </div>
          <AnalysisResults
            analysis={analysis}
            fileName={fileName}
            contractId={contractId}
          />
        </div>
      )}
    </div>
  );
}
