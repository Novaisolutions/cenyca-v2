import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  fetchConversations, 
  fetchMessages, 
  subscribeToConversations, 
  subscribeToMessages, 
  updateMessagesReadStatus,
  searchConversationsByMessageContent
} from '../services/conversationService';
import { Conversacion, Mensaje } from '../types/database';

export const useChatData = () => {
  const [conversations, setConversations] = useState<Conversacion[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversacion | null>(null);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageContentConversations, setMessageContentConversations] = useState<Conversacion[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Función para cargar conversaciones
  const loadConversations = useCallback(async () => {
    const conversationsData = await fetchConversations();
    setConversations(conversationsData);
  }, []);

  // Función para cargar mensajes
  const loadMessages = useCallback(async (conversationId: number) => {
    const messagesData = await fetchMessages(conversationId);
    setMessages(messagesData);
  }, []);

  // Cargar conversaciones al inicio y suscribirse
  useEffect(() => {
    loadConversations();
    const subscription = subscribeToConversations(loadConversations);
    return () => {
      subscription.unsubscribe();
    };
  }, [loadConversations]);

  // Cargar mensajes y manejar estado "leído" al seleccionar conversación
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      if (selectedConversation.tiene_no_leidos) {
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, tiene_no_leidos: false, no_leidos_count: 0 } 
              : conv
          )
        );
        
        updateMessagesReadStatus(selectedConversation.id, true)
          .then(success => {
            if (!success) {
              console.error('Error al marcar mensajes como leídos, revertiendo...');
              loadConversations(); // Revertir en caso de error
            }
          });
      }
      
      const subscription = subscribeToMessages(
        selectedConversation.id,
        () => loadMessages(selectedConversation.id)
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Limpiar mensajes si no hay conversación seleccionada
      setMessages([]);
    }
  }, [selectedConversation, loadConversations, loadMessages]);

  // Búsqueda de mensajes con debounce
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchTerm && searchTerm.length >= 3) {
        setIsSearchingMessages(true);
        try {
          const matchingConversations = await searchConversationsByMessageContent(searchTerm);
          setMessageContentConversations(matchingConversations);
        } catch (error) {
          console.error("Error buscando mensajes:", error);
          setMessageContentConversations([]);
        } finally {
          setIsSearchingMessages(false);
        }
      } else {
        setMessageContentConversations([]);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  // Filtrado de conversaciones memoizado
  const filteredConversations = useMemo(() => {
    const filteredByBasicInfo = conversations.filter(conv => {
      if (!searchTerm) return true;
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchContactInfo = conv.nombre_contacto?.toLowerCase().includes(lowerSearchTerm) ||
        conv.numero.includes(searchTerm);
      const matchLastMessage = conv.ultimo_mensaje_resumen?.toLowerCase().includes(lowerSearchTerm);
      return matchContactInfo || matchLastMessage;
    });

    if (searchTerm.length < 3 || messageContentConversations.length === 0) {
      return filteredByBasicInfo;
    }

    const combinedResults = [...filteredByBasicInfo];
    const existingIds = new Set(filteredByBasicInfo.map(conv => conv.id));
    
    messageContentConversations.forEach(msgConv => {
      if (!existingIds.has(msgConv.id)) {
        combinedResults.push(msgConv);
        existingIds.add(msgConv.id);
      }
    });
    
    // Opcional: ordenar resultados combinados (ej: por fecha)
    combinedResults.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return combinedResults;
  }, [conversations, searchTerm, messageContentConversations]);

  return {
    conversations,
    selectedConversation,
    messages,
    searchTerm,
    filteredConversations,
    isSearchingMessages,
    messagesContainerRef,
    setSelectedConversation,
    setSearchTerm,
    loadConversations,
    loadMessages,
  };
}; 