export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversaciones: {
        Row: {
          id: string
          nombre_contacto: string | null
          no_leidos_count: number
          numero: string
          resumen: string | null
          status: string
          tiene_no_leidos: boolean
          ultimo_intento_reactivacion: string | null
          ultimo_mensaje_resumen: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          nombre_contacto?: string | null
          no_leidos_count?: number
          numero: string
          resumen?: string | null
          status?: string
          tiene_no_leidos?: boolean
          ultimo_intento_reactivacion?: string | null
          ultimo_mensaje_resumen?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          nombre_contacto?: string | null
          no_leidos_count?: number
          numero?: string
          resumen?: string | null
          status?: string
          tiene_no_leidos?: boolean
          ultimo_intento_reactivacion?: string | null
          ultimo_mensaje_resumen?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          conversation_id: string | null
          fecha: string
          fts: string | null
          id: string
          leido: boolean
          media_url: string | null
          mensaje: string
          numero: string
          tipo: string
        }
        Insert: {
          conversation_id?: string | null
          fecha?: string
          fts?: string | null
          id?: string
          leido?: boolean
          media_url?: string | null
          mensaje: string
          numero: string
          tipo: string
        }
        Update: {
          conversation_id?: string | null
          fecha?: string
          fts?: string | null
          id?: string
          leido?: boolean
          media_url?: string | null
          mensaje?: string
          numero?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

// TIPOS PERSONALIZADOS A PARTIR DE AQUÍ

export type ConversationListItem = Pick<
    Tables<'conversaciones'>, 
    'id' | 'nombre_contacto' | 'numero' | 'ultimo_mensaje_resumen' | 'updated_at' | 'tiene_no_leidos' | 'no_leidos_count'
>;

export type MessageListItem = Pick<
    Tables<'mensajes'>,
    'id' | 'fecha' | 'mensaje' | 'media_url' | 'tipo' | 'leido'
>;

// Nuevo tipo para los resultados de la búsqueda
export type SearchResult = Tables<'mensajes'> & {
    conversaciones: Pick<Tables<'conversaciones'>, 'id' | 'nombre_contacto' | 'numero'> | null;
};

// Nuevo tipo unificado para la lista lateral
export type DisplayItem = {
    type: 'conversation' | 'searchResult';
    id: string; // ID de la conversación o del mensaje
    title: string;
    subtitle: string;
    timestamp?: string;
    unreadCount?: number;
    original: ConversationListItem | SearchResult;
};