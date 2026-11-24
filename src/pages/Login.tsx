import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { setRememberPreference } from "@/context/AuthContext";

function isTransientAuthError(err: unknown) {
  const message = String((err as any)?.message || "").toLowerCase();
  return /failed to fetch|timeout|network|connection terminated|5\d\d|request_timeout|fetch/i.test(message);
}

function normalizeAuthError(err: any) {
  const message = String(err?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (isTransientAuthError(err)) {
    return "Servidor instável no momento. Tente novamente em instantes.";
  }

  return err?.message || "Erro ao autenticar";
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function signInWithRetry() {
    let lastError: any = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (!error) return;

      lastError = error;
      if (!isTransientAuthError(error) || attempt === 3) throw error;

      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw lastError;
  }

  const ALLOWED_EMAIL = "nohacreators@outlook.com";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
        throw new Error("Acesso restrito ao login oficial da NOHA Creators.");
      }
      if (isSignUp) {
        throw new Error("Criação de novas contas está desabilitada.");
      }

      setRememberPreference(rememberMe);
      await signInWithRetry();
      navigate("/");
    } catch (err: any) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            NOHA <span className="text-muted-foreground font-medium text-base">Creators</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Criar conta" : "Entrar na central de controle"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
              <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">Permanecer conectado</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-muted-foreground">{successMessage}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
