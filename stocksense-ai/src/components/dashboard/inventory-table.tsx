"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpDown, Download, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/ui/status-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import type { ProductStatus, ProductWithIntel } from "@/lib/types";
import { cn, formatCurrency, formatPct } from "@/lib/utils";

type SortKey = "name" | "unitsInStock" | "daysSinceLastSale" | "sellingPrice" | "marginPct" | "inventoryValue";

export function InventoryTable({ rows, categories }: { rows: ProductWithIntel[]; categories: string[] }) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<ProductStatus | "ALL">("ALL");
  const [category, setCategory] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "inventoryValue", dir: "desc" });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    let r = rows;
    if (status !== "ALL") r = r.filter((p) => p.status === status);
    if (category !== "ALL") r = r.filter((p) => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      const av = a[sort.key] as number | string;
      const bv = b[sort.key] as number | string;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, status, category, search, sort]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const changeSort = (key: SortKey) => {
    if (sort.key === key) setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    else setSort({ key, dir: "desc" });
  };

  const exportCsv = () => {
    const headers = ["Name", "SKU", "Category", "Status", "Units", "Days idle", "Cost", "Price", "Margin %", "Inventory value"];
    const lines = [headers.join(",")];
    filtered.forEach((p) => {
      lines.push(
        [
          `"${p.name.replace(/"/g, '""')}"`,
          p.sku,
          p.category,
          p.status,
          p.unitsInStock,
          p.daysSinceLastSale,
          p.costPrice,
          p.sellingPrice,
          p.marginPct.toFixed(1),
          p.inventoryValue.toFixed(2),
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `${filtered.length} rows exported.`, variant: "success" });
  };

  const bulkAction = (action: string) => {
    if (selected.size === 0) return toast({ title: "No products selected", variant: "destructive" });
    toast({
      title: `${action} queued for ${selected.size} products`,
      description: "We'll apply the action and notify you when done.",
      variant: "success",
    });
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus | "ALL")}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DEAD">Dead only</SelectItem>
            <SelectItem value="SLOW">Slow only</SelectItem>
            <SelectItem value="HEALTHY">Healthy only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {selected.size > 0 ? (
          <Select onValueChange={bulkAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={`Bulk action (${selected.size})`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Apply 20% discount">Apply 20% discount</SelectItem>
              <SelectItem value="Mark for liquidation">Mark for liquidation</SelectItem>
              <SelectItem value="Pause reordering">Pause reordering</SelectItem>
              <SelectItem value="Run AI re-analysis">Re-run AI analysis</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Product" active={sort.key === "name"} dir={sort.dir} onClick={() => changeSort("name")} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Units" active={sort.key === "unitsInStock"} dir={sort.dir} onClick={() => changeSort("unitsInStock")} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Days idle" active={sort.key === "daysSinceLastSale"} dir={sort.dir} onClick={() => changeSort("daysSinceLastSale")} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Price" active={sort.key === "sellingPrice"} dir={sort.dir} onClick={() => changeSort("sellingPrice")} />
                </TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>
                  <SortBtn label="Margin" active={sort.key === "marginPct"} dir={sort.dir} onClick={() => changeSort("marginPct")} />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-14">
                    No products match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id} className={cn(selected.has(p.id) && "bg-muted/40")}>
                  <TableCell>
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                        <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.sku} · <Badge variant="outline" className="font-normal text-[10px] ml-0.5">{p.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{p.unitsInStock}</TableCell>
                  <TableCell className={cn(p.status === "DEAD" && "text-red-600 font-medium", p.status === "SLOW" && "text-amber-600 font-medium")}>
                    {p.daysSinceLastSale}d
                  </TableCell>
                  <TableCell>{formatCurrency(p.sellingPrice, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(p.costPrice, { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{formatPct(p.marginPct, 0)}</TableCell>
                  <TableCell><StatusPill status={p.status} /></TableCell>
                  <TableCell>
                    {p.recommendation ? (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href="/dashboard/actions">
                          <Sparkles className="h-3 w-3" /> AI Action
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} products.
      </p>
    </div>
  );
}

function SortBtn({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
      {label}
      <ArrowUpDown className={cn("h-3 w-3", active ? "opacity-100" : "opacity-30")} />
    </button>
  );
}
