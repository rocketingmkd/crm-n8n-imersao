import { Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Observability from "@/pages/Observability";
import N8nInsights from "@/pages/super-admin/N8nInsights";
import GestaoVps from "@/pages/super-admin/GestaoVps";

export default function ObservabilidadeUnificada() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Activity className="h-4 w-4 text-orange-500" />
          </div>
          Observabilidade
        </h1>
        <p>Servidor, execuções de workflows e gestão de VPS</p>
      </div>

      <Tabs defaultValue="servidor" className="w-full">
        <TabsList className="w-full justify-start liquid-glass-subtle">
          <TabsTrigger value="servidor" className="text-xs sm:text-sm">
            Servidor
          </TabsTrigger>
          <TabsTrigger value="monitoramento" className="text-xs sm:text-sm">
            Monitoramento de Execuções
          </TabsTrigger>
          <TabsTrigger value="gestao-vps" className="text-xs sm:text-sm">
            Gestão de VPS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servidor">
          <ObservabilityContent />
        </TabsContent>
        <TabsContent value="monitoramento">
          <N8nInsightsContent />
        </TabsContent>
        <TabsContent value="gestao-vps">
          <GestaoVpsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Wrappers that render the page content without duplicating the page header */
function ObservabilityContent() {
  return <Observability hideHeader />;
}

function N8nInsightsContent() {
  return <N8nInsights hideHeader />;
}

function GestaoVpsContent() {
  return <GestaoVps hideHeader />;
}
