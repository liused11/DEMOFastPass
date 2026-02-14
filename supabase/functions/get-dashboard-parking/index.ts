// supabase/functions/get-dashboard-parking/index.ts
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
    // 1) Buildings (ลานจอดรถ)
    // =====================================================
    const { data: buildings, error: buildingsError } = await supabase
      .from("buildings")
      .select(`
              id,
              name,
              open_time,
              close_time,
              price_value,
              price_info,
              price_per_hour
            `)

    if (buildingsError) throw buildingsError

    // =====================================================
    // 2) Floors (ไว้ map slot → building)
    // =====================================================
    const { data: floors, error: floorError } = await supabase
      .from("floors")
      .select("id, building_id")

    if (floorError) throw floorError

    const floorToBuilding = new Map(
      floors.map((f) => [f.id, f.building_id])
    )

    // =====================================================
    // 3) zones (ไว้ map slot → building)
    // =====================================================
    const { data: zones, error: zonesError } = await supabase
      .from("zones")
      .select("id, floor_id")
    
    if (zonesError) throw zonesError

    const zoneToFloor = new Map(
      zones.map(z => [z.id, z.floor_id])
    )

    // =====================================================
    // 4) Slots
    // =====================================================
    const { data: slots, error: slotError } = await supabase
      .from("slots")
      .select("id, status, vehicle_type, zone_id")

    if (slotError) throw slotError

    // =====================================================
    // 5) Metrics (GLOBAL)
    // =====================================================
    const totalSlots = slots.length
    const evSlots = slots.filter(s => s.vehicle_type === "EV").length
    const bikeSlots = slots.filter(s => s.vehicle_type === "BIKE").length
    const parkingCount = buildings.length

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
    // 6) Parking summary (per location)
    // =====================================================
    const parkingSummary = buildings.map((b) => {
      const slotsInBuilding = slots.filter((s) => {
        const floorId = zoneToFloor.get(s.zone_id)
        const buildingId = floorToBuilding.get(floorId)
        return buildingId === b.id
      })

      const total = slotsInBuilding.length
      const used = slotsInBuilding.filter(
        (s) => s.status !== "available"
      ).length

      const types = Array.from(
        new Set(slotsInBuilding.map((s) => s.vehicle_type))
      )

      let status = "ใช้งานอยู่"
      if (used === total && total > 0) status = "เต็ม"
      if (total === 0) status = "ไม่มีข้อมูล"

      return {
        id: b.id,
        name: b.name, // ใช้เป็น "สถานที่" / "Zone A"
        open_time: b.open_time,
        close_time: b.close_time,
        used,
        total,
        types,
        status,
        price: b.price_value,
        rate: b.price_info,
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