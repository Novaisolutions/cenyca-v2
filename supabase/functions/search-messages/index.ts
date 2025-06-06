import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Search Messages function starting up...");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();
    console.log("Searching for term:", searchTerm);

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
      return new Response(JSON.stringify({ error: 'searchTerm is required and must be a non-empty string.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Transforma el término de búsqueda en un formato que tsquery pueda entender,
    // uniendo palabras con el operador 'Y' (&).
    const tsQuery = searchTerm.trim().split(/\s+/).join(' & ');
    console.log("Executing with tsquery:", tsQuery);

    const { data: messages, error } = await supabaseAdmin
      .from('mensajes')
      .select('*, conversaciones(id, nombre_contacto, numero, tiene_no_leidos, no_leidos_count)')
      .textSearch('fts', tsQuery)
      .order('fecha', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    console.log("Found messages:", messages.length);
    
    // Filtramos mensajes que por alguna razón no tienen una conversación asociada.
    const validMessages = messages.filter(m => m.conversaciones);

    return new Response(JSON.stringify(validMessages), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("General error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 