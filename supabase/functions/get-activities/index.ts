import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ---------- Auth ----------
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // ---------- Supabase client (RLS user) ----------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // ---------- Query params ----------
    const url = new URL(req.url)

    const limit = Number(url.searchParams.get("limit") ?? 20)
    const offset = Number(url.searchParams.get("offset") ?? 0)
    const entityType = url.searchParams.get("entity_type")
    const entityId = url.searchParams.get("entity_id")

    // ---------- Base query ----------
    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("time", { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq("entity_type", entityType)
    }

    if (entityId) {
      query = query.eq("entity_id", entityId)
    }

    const { data, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        data,
        pagination: {
          limit,
          offset,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("get-activities error:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
