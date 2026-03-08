import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { initI18n } from "./i18n";

const root = document.getElementById("root")!;
root.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-background"><div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>';
const render = () =>
  createRoot(root).render(
    <ErrorBoundary>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  );

initI18n().then(render);
