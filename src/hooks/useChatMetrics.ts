import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { identificadorParaTabela } from "@/lib/conversas";
import { useAuth } from "./useAuth";

interface ChatMessage {
  id: string;
  session_id: string;
  message: {
    content: string;
    role?: string;
  };
  data: string;
}

interface ChatMetrics {
  totalConversations: number;
  totalMessages: number;
  conversationsToday: number;
  messagesToday: number;
  conversationsThisWeek: number;
  messagesThisWeek: number;
  conversationsThisMonth: number;
  messagesThisMonth: number;
  recentSessions: { session_id: string; message_count: number; last_message: string }[];
}

export function useChatMetrics() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['chat-metrics', organization?.identificador],
    queryFn: async (): Promise<ChatMetrics> => {
      if (!organization?.identificador) {
        return {
          totalConversations: 0,
          totalMessages: 0,
          conversationsToday: 0,
          messagesToday: 0,
          conversationsThisWeek: 0,
          messagesThisWeek: 0,
          conversationsThisMonth: 0,
          messagesThisMonth: 0,
          recentSessions: [],
        };
      }

      const tableName = identificadorParaTabela(organization.identificador);
      
      // Datas para filtros
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const weekStartStr = weekStart.toISOString();
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      try {
        // Buscar todas as mensagens
        const { data: allMessages, error } = await (supabase as any)
          .from(tableName)
          .select('id, session_id, message, data')
          .order('data', { ascending: false });

        if (error) {
          console.error('Erro ao buscar chats:', error);
          // Se a tabela não existir, retornar zeros
          if (error.code === '42P01') {
            return {
              totalConversations: 0,
              totalMessages: 0,
              conversationsToday: 0,
              messagesToday: 0,
              conversationsThisWeek: 0,
              messagesThisWeek: 0,
              conversationsThisMonth: 0,
              messagesThisMonth: 0,
              recentSessions: [],
            };
          }
          throw error;
        }

        const messages = allMessages || [];
        
        // Total de mensagens
        const totalMessages = messages.length;
        
        // Sessions únicas (conversas)
        const uniqueSessions = new Set(messages.map(m => m.session_id));
        const totalConversations = uniqueSessions.size;

        // Mensagens de hoje
        const todayMessages = messages.filter(m => m.data >= todayStart);
        const messagesToday = todayMessages.length;
        const conversationsToday = new Set(todayMessages.map(m => m.session_id)).size;

        // Mensagens da semana
        const weekMessages = messages.filter(m => m.data >= weekStartStr);
        const messagesThisWeek = weekMessages.length;
        const conversationsThisWeek = new Set(weekMessages.map(m => m.session_id)).size;

        // Mensagens do mês
        const monthMessages = messages.filter(m => m.data >= monthStart);
        const messagesThisMonth = monthMessages.length;
        const conversationsThisMonth = new Set(monthMessages.map(m => m.session_id)).size;

        // Sessões recentes com contagem de mensagens
        const sessionCounts: Record<string, { count: number; lastMessage: string }> = {};
        messages.forEach(m => {
          if (!sessionCounts[m.session_id]) {
            sessionCounts[m.session_id] = { count: 0, lastMessage: m.data };
          }
          sessionCounts[m.session_id].count++;
          if (m.data > sessionCounts[m.session_id].lastMessage) {
            sessionCounts[m.session_id].lastMessage = m.data;
          }
        });

        const recentSessions = Object.entries(sessionCounts)
          .map(([session_id, data]) => ({
            session_id,
            message_count: data.count,
            last_message: data.lastMessage,
          }))
          .sort((a, b) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime())
          .slice(0, 10);

        return {
          totalConversations,
          totalMessages,
          conversationsToday,
          messagesToday,
          conversationsThisWeek,
          messagesThisWeek,
          conversationsThisMonth,
          messagesThisMonth,
          recentSessions,
        };
      } catch (error) {
        console.error('Erro ao buscar métricas de chat:', error);
        return {
          totalConversations: 0,
          totalMessages: 0,
          conversationsToday: 0,
          messagesToday: 0,
          conversationsThisWeek: 0,
          messagesThisWeek: 0,
          conversationsThisMonth: 0,
          messagesThisMonth: 0,
          recentSessions: [],
        };
      }
    },
    enabled: !!organization?.identificador,
    staleTime: 30000, // Cache por 30 segundos
  });
}

