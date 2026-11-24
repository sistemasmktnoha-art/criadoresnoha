import { ChevronRight, FileText, HelpCircle, MapPin, MessageSquareText, Settings as SettingsIcon, Store, Tags, UserCog, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

const settingsItems = [
  { title: "Unidades", description: "Lojas usadas em campanhas, envios e visitas.", path: "/settings/unidades", icon: Store },
  { title: "Localizações", description: "Cidades e regiões dos influenciadores.", path: "/settings/localizacoes", icon: MapPin },
  { title: "Gêneros", description: "Opções disponíveis nos perfis.", path: "/settings/generos", icon: UsersRound },
  { title: "Nichos / Categorias", description: "Segmentos usados para organizar creators.", path: "/settings/categorias", icon: Tags },
  { title: "Modelos de Texto", description: "Mensagens prontas e preenchimento rápido.", path: "/backoffice/messages", icon: MessageSquareText },
  { title: "Informações Fiscais", description: "Dados usados para emissão de notas fiscais.", path: "/backoffice/fiscal", icon: FileText },
  { title: "Membros da Equipe", description: "Pessoas que registram comentários nas campanhas.", path: "/settings/equipe", icon: UserCog },
  { title: "Gerenciar FAQ", description: "Perguntas e respostas da página de Ajuda.", path: "/settings/faq", icon: HelpCircle },
];

export default function Settings() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie suas preferências e listas.</p>
        </div>
      </div>
      <nav aria-label="Categorias de configurações" className="grid gap-3 sm:grid-cols-2">
        {settingsItems.map((item, index) => (
          <Card key={item.path} className={settingsItems.length % 2 === 1 && index === settingsItems.length - 1 ? "sm:col-span-2" : undefined}>
            <CardContent className="p-0">
              <Link to={item.path} className="group flex min-h-24 items-center gap-4 p-4 transition-colors hover:bg-accent/60 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </nav>
    </div>
  );
}
