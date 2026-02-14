// supabase/functions/admin-update-config/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    const body = await req.json()
    const { entity_type, entity_id, updates } = body

    if (!entity_type || !entity_id || !updates) {
      return new Response("Missing required fields", { status: 400 })
    }

    // 🔐 ใช้ anon key เพื่อให้ auth ทำงานตาม user จริง
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      }
    )

    // 🔹 1️⃣ ตรวจ user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // 🔹 2️⃣ ตรวจ role (สมมติ role อยู่ใน user_metadata)
    if (user.app_metadata.role !== "admin") {
      return new Response("Forbidden", { status: 403 })
    }

    // 🔹 3️⃣ เรียก RPC
    const { error: rpcError } = await supabase.rpc(
      "update_config_with_log",
      {
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_updates: updates,
        p_user_id: user.id,
        p_user_name: user.email,
      }
    )

    if (rpcError) {
      console.error(rpcError)
      return new Response(rpcError.message, { status: 400 })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Config updated successfully",
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
