import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { VirtuosoHandle } from 'react-virtuoso';
import { supabase } from '../supabaseClient';
import { 
  fetchConversations, 
  fetchMessages, 
  subscribeToConversations, 
  subscribeToMessages, 
  updateMessagesReadStatus
} from '../services/conversationService';
import { ConversationListItem, MessageListItem } from '../types/database';
import { toast } from 'sonner';

const CONVERSATIONS_PER_PAGE = 50;
const MESSAGES_PER_PAGE = 30;

export const useChatData = (virtuosoRef: React.RefObject<VirtuosoHandle>) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [conversationPage, setConversationPage] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  const [messagePage, setMessagePage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (page: number) => {
    setLoadingConversations(true);
    const fetchedConversations = await fetchConversations(page, CONVERSATIONS_PER_PAGE);
    
    if (fetchedConversations.length < CONVERSATIONS_PER_PAGE) {
        setHasMoreConversations(false);
    }
    setConversations(prev => page === 0 ? fetchedConversations : [...prev, ...fetchedConversations]);
    setLoadingConversations(false);
  }, []);

  // Carga inicial
  useEffect(() => {
    loadConversations(0);
  }, [loadConversations]);

  const loadMoreConversations = useCallback(() => {
    const nextPage = conversationPage + 1;
    if (!loadingConversations && hasMoreConversations) {
        loadConversations(nextPage);
        setConversationPage(nextPage);
    }
  }, [loadingConversations, hasMoreConversations, conversationPage, loadConversations]);

  const handleConversationSelected = useCallback(async (conversation: ConversationListItem | null) => {
    setSelectedConversation(null);
    setMessages([]);
    setMessagePage(0);
    setHasMoreMessages(true);

    if (conversation) {
      setLoadingMessages(true);
      const initialMessages = await fetchMessages(conversation.id, 0, MESSAGES_PER_PAGE);
      
      setMessages(initialMessages);
      if (initialMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
      setLoadingMessages(false);
      setSelectedConversation(conversation);

      if (conversation.tiene_no_leidos) {
        await updateMessagesReadStatus(conversation.id, true);
        setConversations(prev => 
          prev.map(c => 
            c.id === conversation.id ? { ...c, no_leidos_count: 0, tiene_no_leidos: false } : c
          )
        );
      }
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMessages || !hasMoreMessages || !selectedConversation) return;

    setLoadingMessages(true);
    const nextPage = messagePage + 1;
    const olderMessages = await fetchMessages(selectedConversation.id, nextPage, MESSAGES_PER_PAGE);

    if (olderMessages.length < MESSAGES_PER_PAGE) {
      setHasMoreMessages(false);
    }

    setMessages(prev => [...olderMessages, ...prev]);
    setMessagePage(nextPage);
    setLoadingMessages(false);
  }, [loadingMessages, hasMoreMessages, selectedConversation, messagePage]);

  // Suscripción a cambios en conversaciones
  useEffect(() => {
    const handleInsert = (payload: RealtimePostgresChangesPayload<ConversationListItem>) => {
      const newItem = payload.new as ConversationListItem;
      if (newItem.id) {
        setConversations(prev => [newItem, ...prev.filter(item => item.id !== newItem.id)]);
      }
    };
    const handleUpdate = (payload: RealtimePostgresChangesPayload<ConversationListItem>) => {
      const updatedItem = payload.new as ConversationListItem;
      if (updatedItem.id) {
        setConversations(prev => prev.map(c => c.id === updatedItem.id ? updatedItem : c));
      }
    };
    const handleDelete = (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
      const oldItem = payload.old;
      if (oldItem && 'id' in oldItem) {
        setConversations(prev => prev.filter(item => item.id !== oldItem.id));
      }
    };
    
    const conversationSubscription = subscribeToConversations(handleInsert, handleUpdate, handleDelete);
    return () => {
      conversationSubscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (selectedConversation) {
      const messageSubscription = subscribeToMessages(selectedConversation.id, async () => {
        const refreshedMessages = await fetchMessages(selectedConversation.id, 0, MESSAGES_PER_PAGE);
        setMessages(refreshedMessages);
      });

      return () => {
        if (messageSubscription && typeof messageSubscription.unsubscribe === 'function') {
          messageSubscription.unsubscribe();
        }
      };
    }
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm) {
      return conversations;
    }
    return conversations.filter(c => 
      (c.nombre_contacto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ultimo_mensaje_resumen || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  return {
    conversations: filteredConversations,
    selectedConversation,
    messages,
    searchTerm,
    setSearchTerm,
    loadingConversations,
    hasMoreConversations,
    loadMoreConversations,
    loadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    isSearching: false,
    onConversationSelected: handleConversationSelected,
  };
}; 