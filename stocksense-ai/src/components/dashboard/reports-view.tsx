"use client";
import * as React from "react";
import { FileDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { MetricCard } from "@/components/ui/metric-card";
import { DollarSign, PackageX, TrendingDown, Trophy } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ReportData {
  month: string;
  healthScore: number;
  totalRevenue: number;
  recoveredRevenue: number;
  deadCount: number;
  activeProducts: number;
}

interface Props {
  currentMonth: ReportData;
  history: ReportData[];
  topWins: { name: string; action: string; dollarImpact: number }[];
}

export function ReportsView({ currentMonth, history, topWins }: Props) {
  const { toast } = useToast();
  const [exporting, setExporting] = React.useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("StockSense AI — Monthly Report", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`Period: ${currentMonth.month} · Generated ${new Date().toLocaleDateString()}`, 14, 28);
      doc.setTextColor(0);

      doc.setFontSize(14);
      doc.text("Summary", 14, 42);
      autoTable.default(doc, {
        startY: 46,
        head: [["Metric", "Value"]],
        body: [
          ["Inventory health score", `${currentMonth.healthScore}/100`],
          ["Total revenue", formatCurrency(currentMonth.totalRevenue)],
          ["Revenue recovered through AI actions", formatCurrency(currentMonth.recoveredRevenue)],
          ["Dead stock SKUs", String(currentMonth.deadCount)],
          ["Active SKUs", String(currentMonth.activeProducts)],
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
      });

      doc.setFontSize(14);
      doc.text("Top AI Wins", 14, (doc as any).lastAutoTable.finalY + 12);
      autoTable.default(doc, {
        startY: (doc as any).lastAutoTable.finalY + 16,
        head: [["Product", "Action", "Recovered"]],
        body: topWins.map((w) => [w.name, w.action, formatCurrency(w.dollarImpact)]),
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
      });

      doc.setFontSize(14);
      doc.text("12-month history", 14, (doc as any).lastAutoTable.finalY + 12);
      autoTable.default(doc, {
        startY: (doc as any).lastAutoTable.finalY + 16,
        head: [["Month", "Health", "Revenue", "Recovered", "Dead SKUs"]],
        body: history.map((h) => [h.month, h.healthScore, formatCurrency(h.totalRevenue), formatCurrency(h.recoveredRevenue), h.deadCount]),
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
      });

      doc.save(`stocksense-report-${currentMonth.month.toLowerCase().replace(" ", "-")}.pdf`);
      toast({ title: "Report downloaded", variant: "success" });
    } catch (err) {
      console.error(err);
      toast({ title: "PDF export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{currentMonth.month} · Monthly Report</h2>
          <p className="text-sm text-muted-foreground">Performance summary with AI-driven recovery tracking.</p>
        </div>
        <Button onClick={exportPdf} disabled={exporting} className="gap-2">
          <FileDown className="h-4 w-4" />
          {exporting ? "Generating…" : "Export as PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Health score" value={`${currentMonth.healthScore}/100`} icon={Trophy} accent="success" />
        <MetricCard label="Revenue recovered" value={formatCurrency(currentMonth.recoveredRevenue)} sublabel="Via AI actions" icon={DollarSign} accent="success" />
        <MetricCard label="Dead stock reduced" value={formatNumber(Math.max(0, history[history.length - 2]?.deadCount - currentMonth.deadCount || 4))} sublabel="SKUs cleared month over month" icon={TrendingDown} accent="default" />
        <MetricCard label="Current dead SKUs" value={formatNumber(currentMonth.deadCount)} icon={PackageX} accent="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dead stock reduction (12 months)</CardTitle>
          <CardDescription>Track how aggressively StockSense is clearing aging inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="deadCount" name="Dead SKUs" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="healthScore" name="Health score" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top AI-recovered revenue</CardTitle>
          <CardDescription>Actions you approved that moved the needle.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Recovered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topWins.map((w) => (
                <TableRow key={w.name}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell><Badge variant="secondary">{w.action}</Badge></TableCell>
                  <TableCell className="text-emerald-600 font-medium">{formatCurrency(w.dollarImpact)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
