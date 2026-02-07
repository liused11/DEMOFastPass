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

    // ⭐ date filter (YYYY-MM-DD)
    const date = url.searchParams.get("date")

    let start: string | null = null
    let end: string | null = null
    
    if (date) {
      start = `${date}T00:00:00Z`
      end = `${date}T23:59:59Z`
    }

    // ================= ACTIVITIES =================
    let activityQuery  = supabase
      .from("activity_logs")
      .select("*")
      .order("time", { ascending: false })
      .range(offset, offset + limit - 1)

    if (start && end) {
      activityQuery = activityQuery
        .gte("time", start)
        .lte("time", end)
    }



    const { data: activities, error } = await activityQuery
    if (error) throw error

    // ================= METRICS =================
    let metricBase = supabase
      .from("activity_logs")
      .select("id, log_type", { count: "exact" })

    if (start && end) {
      metricBase = metricBase
        .gte("time", start)
        .lte("time", end)
    }

    const { data: rows, count: totalLogs } = await metricBase

    const totalActivities =
      rows?.filter(r => r.log_type === "activity").length ?? 0

    // label logic
    const today = new Date().toISOString().slice(0, 10)
    const subtext = date === today ? "Today" : `On ${date}`

    const metrics = [
      {
        title: "Total Logs",
        value: String(totalLogs ?? 0),
        subtext,
        icon: "pi pi-database",
        color: "blue"
      },
      {
        title: "Activities",
        value: String(totalActivities),
        subtext: "Events",
        icon: "pi pi-bolt",
        color: "blue"
      }
    ]

    return new Response(
      JSON.stringify({
        success: true,
        activities,
        metrics,
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
