'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RiskGauge } from '@/components/risk-gauge';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  FileDown,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ContractSection {
  title: string;
  original_text: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  plain_english_explanation: string;
  suggested_alternative_language: string;
}

interface MissingProtection {
  clause_name: string;
  importance: 'recommended' | 'important' | 'critical';
  explanation: string;
  suggested_language: string;
}

interface AnalysisData {
  overall_risk_score: number;
  contract_type: string;
  summary: string;
  sections: ContractSection[];
  missing_protections: MissingProtection[];
}

interface AnalysisResultsProps {
  analysis: AnalysisData;
  fileName: string;
  contractId: string;
}

const riskColors = {
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const importanceColors = {
  recommended: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  important: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  critical: { badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const RiskIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'low': return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'medium': return <AlertCircle className="h-5 w-5 text-amber-400" />;
    case 'high': return <AlertTriangle className="h-5 w-5 text-orange-400" />;
    case 'critical': return <XCircle className="h-5 w-5 text-red-400" />;
    default: return <Info className="h-5 w-5 text-slate-400" />;
  }
};

export function AnalysisResults({ analysis, fileName, contractId }: AnalysisResultsProps) {
  const [selectedSection, setSelectedSection] = useState<number>(0);

  const criticalCount = analysis.sections.filter(s => s.risk_level === 'critical').length;
  const highCount = analysis.sections.filter(s => s.risk_level === 'high').length;
  const mediumCount = analysis.sections.filter(s => s.risk_level === 'medium').length;
  const lowCount = analysis.sections.filter(s => s.risk_level === 'low').length;

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129);
    doc.text('ClauseGuard Analysis Report', 20, y);
    y += 15;

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`File: ${fileName}`, 20, y);
    y += 7;
    doc.text(`Contract Type: ${analysis.contract_type}`, 20, y);
    y += 7;
    doc.text(`Risk Score: ${analysis.overall_risk_score}/100`, 20, y);
    y += 7;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const summaryLines = doc.splitTextToSize(analysis.summary, 170);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 6 + 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Sections Analysis', 20, y);
    y += 10;

    for (const section of analysis.sections) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${section.title} [${section.risk_level.toUpperCase()}]`, 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(80);
      const expLines = doc.splitTextToSize(section.plain_english_explanation, 170);
      doc.text(expLines, 20, y);
      y += expLines.length * 5 + 8;
    }

    if (analysis.missing_protections.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Missing Protections', 20, y);
      y += 10;
      for (const mp of analysis.missing_protections) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${mp.clause_name} [${mp.importance.toUpperCase()}]`, 20, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(80);
        const mpLines = doc.splitTextToSize(mp.explanation, 170);
        doc.text(mpLines, 20, y);
        y += mpLines.length * 5 + 8;
      }
    }

    doc.save(`clauseguard-report-${contractId.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 p-6 flex items-center gap-4">
          <RiskGauge score={analysis.overall_risk_score} size={100} />
        </Card>
        <Card className="bg-slate-900/50 border-slate-800 p-6">
          <p className="text-sm text-slate-400 mb-1">Contract Type</p>
          <p className="text-lg font-semibold text-white">{analysis.contract_type}</p>
          <p className="text-xs text-slate-500 mt-2">{fileName}</p>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800 p-6">
          <p className="text-sm text-slate-400 mb-2">Issues Found</p>
          <div className="space-y-1.5">
            {criticalCount > 0 && <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-400" /><span className="text-sm text-red-400">{criticalCount} Critical</span></div>}
            {highCount > 0 && <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-400" /><span className="text-sm text-orange-400">{highCount} High</span></div>}
            {mediumCount > 0 && <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-400" /><span className="text-sm text-amber-400">{mediumCount} Medium</span></div>}
            {lowCount > 0 && <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-sm text-emerald-400">{lowCount} Low</span></div>}
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Missing Protections</p>
            <p className="text-2xl font-bold text-white">{analysis.missing_protections.length}</p>
          </div>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800 mt-3">
            <FileDown className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
            <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
          </div>
        </div>
      </Card>

      {/* Main Analysis */}
      <Tabs defaultValue="sections" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="sections" className="data-[state=active]:bg-slate-700">
            Clause Analysis ({analysis.sections.length})
          </TabsTrigger>
          <TabsTrigger value="missing" className="data-[state=active]:bg-slate-700">
            <ShieldAlert className="h-4 w-4 mr-1" />
            Missing Protections ({analysis.missing_protections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Section List */}
            <ScrollArea className="lg:col-span-1 h-[600px]">
              <div className="space-y-2 pr-4">
                {analysis.sections.map((section, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSection(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSection === idx
                        ? `${riskColors[section.risk_level].bg} ${riskColors[section.risk_level].border}`
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RiskIcon level={section.risk_level} />
                      <span className="text-sm font-medium text-white flex-1 truncate">{section.title}</span>
                      <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${selectedSection === idx ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="mt-1">
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${riskColors[section.risk_level].badge}`}>
                        {section.risk_level}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Right: Detail Panel */}
            <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 p-6 h-[600px] overflow-y-auto">
              {analysis.sections[selectedSection] && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <RiskIcon level={analysis.sections[selectedSection].risk_level} />
                    <h3 className="text-lg font-semibold text-white">
                      {analysis.sections[selectedSection].title}
                    </h3>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${riskColors[analysis.sections[selectedSection].risk_level].badge}`}>
                      {analysis.sections[selectedSection].risk_level}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Original Contract Text</h4>
                    <div className={`p-4 rounded-lg border ${riskColors[analysis.sections[selectedSection].risk_level].bg} ${riskColors[analysis.sections[selectedSection].risk_level].border}`}>
                      <p className="text-sm text-slate-300 leading-relaxed italic">
                        &quot;{analysis.sections[selectedSection].original_text}&quot;
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">What This Means (Plain English)</h4>
                    <p className="text-slate-200 leading-relaxed">
                      {analysis.sections[selectedSection].plain_english_explanation}
                    </p>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Suggested Alternative Language</h4>
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-sm text-emerald-300 leading-relaxed">
                        {analysis.sections[selectedSection].suggested_alternative_language}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="missing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.missing_protections.map((mp, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-slate-800 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    mp.importance === 'critical' ? 'text-red-400' : mp.importance === 'important' ? 'text-amber-400' : 'text-blue-400'
                  }`} />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-medium">{mp.clause_name}</h4>
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${importanceColors[mp.importance].badge}`}>
                        {mp.importance}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{mp.explanation}</p>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs text-slate-400 mb-1">Suggested clause:</p>
                      <p className="text-sm text-emerald-300">{mp.suggested_language}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {analysis.missing_protections.length === 0 && (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center col-span-2">
                <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-white font-medium">No missing protections detected!</p>
                <p className="text-sm text-slate-400 mt-1">This contract covers all the key clauses.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
