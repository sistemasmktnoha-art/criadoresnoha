import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md space-y-4 rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Não foi possível exibir esta tela</h1>
          <p className="text-sm text-muted-foreground">
            Seus dados permanecem salvos. Recarregue a página para tentar novamente.
          </p>
          <Button onClick={() => window.location.reload()}>Recarregar página</Button>
        </section>
      </main>
    );
  }
}