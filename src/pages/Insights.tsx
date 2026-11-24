import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb, RefreshCw, Calendar, Sparkles, TrendingUp, Music, ShoppingBag, X,
  Image, Smartphone, Youtube, Mail, Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentIdeas {
  instagramFeed?: string;
  instagramStories?: string;
  tiktok?: string;
  youtube?: string;
  emailMarketing?: string;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  contentType: string;
  urgency: "urgent" | "soon" | "plan";
  category: "data_comemorativa" | "evento" | "tendencia" | "sazonal" | "cultural";
  contentIdeas?: ContentIdeas;
}

const urgencyConfig = {
  urgent: { label: "🔴 Urgente", variant: "destructive" as const },
  soon: { label: "🟡 Em breve", variant: "default" as const },
  plan: { label: "🟢 Planejar", variant: "secondary" as const },
};

const categoryIcons: Record<string, React.ElementType> = {
  data_comemorativa: Calendar,
  evento: ShoppingBag,
  tendencia: TrendingUp,
  sazonal: Sparkles,
  cultural: Music,
};

const platforms = [
  {
    key: "instagramFeed" as keyof ContentIdeas,
    label: "Instagram Feed",
    Icon: Image,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    key: "instagramStories" as keyof ContentIdeas,
    label: "Stories",
    Icon: Smartphone,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    key: "tiktok" as keyof ContentIdeas,
    label: "TikTok",
    Icon: Play,
    color: "text-foreground",
    bg: "bg-secondary",
  },
  {
    key: "youtube" as keyof ContentIdeas,
    label: "YouTube",
    Icon: Youtube,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    key: "emailMarketing" as keyof ContentIdeas,
    label: "E-mail",
    Icon: Mail,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const { toast } = useToast();

  async function fetchInsights() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newInsights: Insight[] = (data.insights || []).map((ins: any, i: number) => ({
        ...ins,
        id: `${Date.now()}-${i}`,
      }));
      setInsights((prev) => [...newInsights, ...prev]);
      setGenerated(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao gerar insights", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function removeInsight(id: string) {
    setInsights((prev) => prev.filter((ins) => ins.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">Oportunidades de campanha geradas por IA</p>
        </div>
        <Button onClick={fetchInsights} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          {loading ? "Gerando..." : generated ? "Gerar mais" : "Gerar Insights"}
        </Button>
      </div>

      {!generated && !loading && insights.length === 0 && (
        <div className="py-16 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Clique em "Gerar Insights" para receber oportunidades de campanha personalizadas para a NOHA Shoes</p>
          <p className="text-xs text-muted-foreground mt-1">Baseado em datas comemorativas, eventos, tendências de moda e lifestyle masculino</p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.map((insight) => {
            const Icon = categoryIcons[insight.category] || Sparkles;
            const urgency = urgencyConfig[insight.urgency] || urgencyConfig.plan;
            return (
              <Card key={insight.id} className="transition-colors hover:border-primary/20 group relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => removeInsight(insight.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <CardContent className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-secondary p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                    </div>
                    <Badge variant={urgency.variant} className="text-[10px] shrink-0">
                      {urgency.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{insight.description}</p>

                  <Badge variant="outline" className="text-[10px]">
                    {insight.contentType}
                  </Badge>

                  {/* Per-platform content ideas */}
                  {insight.contentIdeas && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ideias por plataforma</p>
                      {platforms.map(({ key, label, Icon: PlatformIcon, color, bg }) => {
                        const idea = insight.contentIdeas?.[key];
                        if (!idea) return null;
                        return (
                          <div key={key} className="flex gap-2.5 items-start">
                            <div className={`rounded-md p-1.5 shrink-0 ${bg}`}>
                              <PlatformIcon className={`h-3.5 w-3.5 ${color}`} />
                            </div>
                            <div className="min-w-0">
                              <span className={`text-[10px] font-semibold ${color}`}>{label} </span>
                              <span className="text-xs text-muted-foreground">{idea}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
