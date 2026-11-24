import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento principal da aplicação não encontrado.");
}

const root = createRoot(rootElement);

void import("./App.tsx")
  .then(({ default: App }) => root.render(<App />))
  .catch((error: unknown) => {
    console.error("Falha ao inicializar a aplicação:", error);
    rootElement.innerHTML = `
      <main class="startup-error">
        <section>
          <h1>Não foi possível iniciar a aplicação</h1>
          <p>Recarregue a página para tentar novamente.</p>
          <button type="button" onclick="window.location.reload()">Recarregar página</button>
        </section>
      </main>
    `;
  });
