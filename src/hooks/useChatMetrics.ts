import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { obterNomeTabelaConversas } from "@/lib/conversas";
import { useAuth } from "./useAuth";

interface ChatMetrics {
  totalConversations: number;
  totalMessages: number;
  conversationsToday: number;
  messagesToday: number;
  conversationsThisWeek: number;
  messagesThisWeek: number;
  conversationsThisMonth: number;
  messagesThisMonth: number;
  conversationsLast90d: number;
  messagesLast90d: number;
  recentSessions: { session_id: string; message_count: number; last_message: string }[];
}

const emptyMetrics: ChatMetrics = {
  totalConversations: 0,
  totalMessages: 0,
  conversationsToday: 0,
  messagesToday: 0,
  conversationsThisWeek: 0,
  messagesThisWeek: 0,
  conversationsThisMonth: 0,
  messagesThisMonth: 0,
  conversationsLast90d: 0,
  messagesLast90d: 0,
  recentSessions: [],
};

export function useChatMetrics() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["chat-metrics", organization?.identificador],
    queryFn: async (): Promise<ChatMetrics> => {
      if (!organization?.identificador) return emptyMetrics;

      const tableName = await obterNomeTabelaConversas(supabase, organization.identificador);
      if (!tableName) return emptyMetrics;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 19);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const weekStartStr = weekStart.toISOString().slice(0, 19);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19);
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      const ninetyStartStr = ninetyDaysAgo.toISOString().slice(0, 19);

      try {
        let rows: Array<{ id?: string; data?: string; session_id?: string; id_sessao?: string }> = [];
        const { data: data1, error: err1 } = await (supabase as any)
          .from(tableName)
          .select("id, data, session_id")
          .order("data", { ascending: false });
        if (!err1 && data1?.length) {
          rows = data1;
        } else if (err1?.code === "42703") {
          const { data: data2, error: err2 } = await (supabase as any)
            .from(tableName)
            .select("id, data, id_sessao")
            .order("data", { ascending: false });
          if (!err2 && data2?.length) rows = data2.map((m: { id_sessao?: string }) => ({ ...m, session_id: m.id_sessao }));
        }
        const messages = rows.map((m) => ({ ...m, session_id: m.session_id ?? m.id_sessao ?? "" }));

        const totalMessages = messages.length;
        const totalConversations = new Set(messages.map((m) => m.session_id).filter(Boolean)).size;

        const byPeriod = (since: string) => {
          const list = messages.filter((m) => (m.data ?? "") >= since);
          return { messages: list.length, conversations: new Set(list.map((m) => m.session_id).filter(Boolean)).size };
        };

        const today = byPeriod(todayStart);
        const week = byPeriod(weekStartStr);
        const month = byPeriod(monthStart);
        const last90 = byPeriod(ninetyStartStr);

        const sessionCounts: Record<string, { count: number; lastMessage: string }> = {};
        messages.forEach((m) => {
          const sid = m.session_id ?? "";
          if (!sid) return;
          if (!sessionCounts[sid]) sessionCounts[sid] = { count: 0, lastMessage: m.data ?? "" };
          sessionCounts[sid].count++;
          if ((m.data ?? "") > sessionCounts[sid].lastMessage) sessionCounts[sid].lastMessage = m.data ?? "";
        });
        const recentSessions = Object.entries(sessionCounts)
          .map(([session_id, data]) => ({ session_id, message_count: data.count, last_message: data.lastMessage }))
          .sort((a, b) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime())
          .slice(0, 10);

        return {
          totalConversations,
          totalMessages,
          conversationsToday: today.conversations,
          messagesToday: today.messages,
          conversationsThisWeek: week.conversations,
          messagesThisWeek: week.messages,
          conversationsThisMonth: month.conversations,
          messagesThisMonth: month.messages,
          conversationsLast90d: last90.conversations,
          messagesLast90d: last90.messages,
          recentSessions,
        };
      } catch (error) {
        console.error("Erro ao buscar métricas de chat:", error);
        return emptyMetrics;
      }
    },
    enabled: !!organization?.identificador,
    staleTime: 30000,
  });
}

