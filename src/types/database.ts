export interface Conversacion {
  id: number;
  numero: string;
  resumen: string | null;
  status: string;
  updated_at: string;
  reactivacion_intentos: number;
  ultimo_intento_reactivacion: string | null;
  proximo_seguimiento: string | null;
  nombre_contacto: string | null;
  ultimo_mensaje_resumen: string | null;
  tiene_no_leidos: boolean;
  no_leidos_count: number;
}

export interface Mensaje {
  id: number;
  tipo: string;
  numero: string;
  mensaje: string;
  fecha: string;
  nombre: string | null;
  media_url: string | null;
  leido: boolean;
  conversation_id: number | null;
}