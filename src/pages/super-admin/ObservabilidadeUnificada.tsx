import { Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Observability from "@/pages/Observability";
import N8nInsights from "@/pages/super-admin/N8nInsights";
import { useTranslation } from "react-i18next";

export default function ObservabilidadeUnificada() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Activity className="h-4 w-4 text-orange-500" />
          </div>
          {t("superAdmin.observability.title")}
        </h1>
        <p>{t("superAdmin.observability.subtitle")}</p>
      </div>

      <Tabs defaultValue="servidor" className="w-full">
        <TabsList className="w-full justify-start liquid-glass-subtle">
          <TabsTrigger value="servidor" className="text-xs sm:text-sm">
            {t("superAdmin.observability.tabServer")}
          </TabsTrigger>
          <TabsTrigger value="monitoramento" className="text-xs sm:text-sm">
            {t("superAdmin.observability.tabMonitoring")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servidor">
          <Observability hideHeader />
        </TabsContent>
        <TabsContent value="monitoramento">
          <N8nInsights hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
