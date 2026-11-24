import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Influencer } from "@/types";

const COLORS = [
  "hsl(40, 70%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(150, 50%, 45%)",
  "hsl(280, 50%, 55%)",
  "hsl(15, 70%, 55%)",
  "hsl(330, 60%, 50%)",
  "hsl(60, 60%, 45%)",
  "hsl(180, 50%, 45%)",
];

function groupBy(items: Influencer[], key: keyof Influencer) {
  const map: Record<string, number> = {};
  items.forEach((i) => {
    const val = String(i[key]);
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
    </div>
  );
};

export function DashboardCharts({ influencers }: { influencers: Influencer[] }) {
  const locationData = groupBy(influencers, "location");
  const genderData = groupBy(influencers, "gender").map((d) => ({
    ...d,
    name: d.name === "feminino" ? "Feminino" : d.name === "masculino" ? "Masculino" : "Outro",
  }));

  // Niche data - split multi-niche entries
  const nicheMap: Record<string, number> = {};
  influencers.forEach((i) => {
    const niches = i.niche ? i.niche.split(", ").filter(Boolean) : ["Indefinido"];
    niches.forEach((n) => { nicheMap[n] = (nicheMap[n] || 0) + 1; });
  });
  const nicheData = Object.entries(nicheMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const renderChart = (title: string, data: { name: string; value: number }[], showTop = 5) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 text-xs">
            {data.slice(0, showTop).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {renderChart("Localização", locationData)}
      {renderChart("Gênero", genderData, 3)}
      {renderChart("Nicho", nicheData, 6)}
    </div>
  );
}
