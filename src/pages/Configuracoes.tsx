import { Bot, Plug, Settings, ListTodo } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AgentIA from "@/pages/AgentIA";
import Integrations from "@/pages/Integrations";
import TiposAtendimento from "@/pages/TiposAtendimento";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

export default function Configuracoes() {
  const { features } = usePlanFeatures();
  const hasAgendamento = features.agendamento_automatico;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Configurações
          </h1>
        </div>
        <p className="text-base md:text-lg text-muted-foreground">
          Gerencie seu agente de IA, integrações e tipos de atendimento
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agente-ia" className="animate-fade-in-up">
        <TabsList className="w-full sm:w-auto h-10 liquid-glass-subtle p-1">
          <TabsTrigger value="agente-ia" className="gap-2 text-sm px-4">
            <Bot className="h-4 w-4" />
            Agente de IA
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 text-sm px-4">
            <Plug className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          {hasAgendamento && (
            <TabsTrigger value="tipos-atendimento" className="gap-2 text-sm px-4">
              <ListTodo className="h-4 w-4" />
              Tipos de Atendimento
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="agente-ia" className="mt-4">
          <AgentIA embedded />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Integrations embedded />
        </TabsContent>

        {hasAgendamento && (
          <TabsContent value="tipos-atendimento" className="mt-4">
            <TiposAtendimento embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
