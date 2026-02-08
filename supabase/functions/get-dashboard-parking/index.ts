import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    // =====================================================
    // 1) Load parking locations
    // =====================================================
    const { data: parkings, error: parkingError } = await supabase
      .from("buildings")
      .select("id, name, open_time, close_time")

    if (parkingError) throw parkingError

    // ---------- Slots ----------
    const { data: slots, error: slotError } = await supabase
      .from("slot")
      .select("id, status, vehicle_type, parking_id")

    if (slotError) throw slotError

    // =====================================================
    // 3) Metrics (GLOBAL)
    // =====================================================
    const totalSlots = slots.length
    const evSlots = slots.filter(s => s.vehicle_type === "EV").length
    const bikeSlots = slots.filter(s => s.vehicle_type === "BIKE").length
    const parkingCount = parkings.length

    const metrics = [
      {
        title: "ลานจอดรถทั้งหมด",
        value: parkingCount.toString(),
        subtext: "สถานที่ที่เปิดให้ใช้งาน",
        icon: "pi pi-map-marker",
        color: "blue",
      },
      {
        title: "ที่จอดรถทั้งหมด",
        value: totalSlots.toString(),
        subtext: "จำนวนช่องจอดทั้งหมดในระบบ",
        icon: "pi pi-car",
        color: "blue",
      },
      {
        title: "ที่จอดรถยนต์ EV ทั้งหมด",
        value: evSlots.toString(),
        subtext: "รองรับรถยนต์ไฟฟ้า",
        icon: "pi pi-bolt",
        color: "blue",
      },
      {
        title: "ที่จอดจักรยานยนต์ทั้งหมด",
        value: bikeSlots.toString(),
        subtext: "สำหรับรถจักรยานยนต์",
        icon: "pi pi-motorcycle",
        color: "blue",
      },
    ]

    // =====================================================
    // 4) Parking summary (per location)
    // =====================================================
    const parkingSummary = parkings.map((p) => {
      const slotsInParking = slots.filter(
        (s) => s.parking_id === p.id
      )

      const total = slotsInParking.length
      const used = slotsInParking.filter(
        (s) => s.status !== "available"
      ).length

      const types = Array.from(
        new Set(slotsInParking.map((s) => s.vehicle_type))
      )

      let status = "ใช้งานอยู่"
      if (used === total && total > 0) status = "เต็ม"
      if (total === 0) status = "ไม่มีข้อมูล"

      return {
        id: p.id,
        name: p.name, // ใช้เป็น "สถานที่" / "Zone A"
        open_time: p.open_time,
        close_time: p.close_time,
        used,
        total,
        types,
        status,
        price: "฿10/ชั่วโมง",
        rate: "เหมาจ่าย 80 บาท",
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        parking_summary: parkingSummary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})