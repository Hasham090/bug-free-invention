"use client";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export function HealthGauge({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const data = [
    { name: "score", value: score, color },
    { name: "rest", value: 100 - score, color: "hsl(var(--muted))" },
  ];

  return (
    <div className="relative h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="75%"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={95}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
        <div className="text-5xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {score >= 75 ? "Healthy" : score >= 50 ? "Needs attention" : "Critical"}
        </div>
      </div>
    </div>
  );
}
