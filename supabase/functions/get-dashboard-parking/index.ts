// supabase/functions/get-dashboard-parking/index.ts
function computeStatus(building, used, total) {
  if (!building.is_active) {
    return "ปิดใช้งานอยู่";
  }
  if (!building.open_time || !building.close_time) {
    return "ปิดใช้งานอยู่";
  }

  const now = new Date();
  const thaiNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const currentMinutes =
    thaiNow.getHours() * 60 + thaiNow.getMinutes();

  const [openH, openM] = building.open_time.split(":").map(Number);
  const [closeH, closeM] = building.close_time.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
    return "ปิดใช้งานอยู่";
  }

  const minutesUntilClose = closeMinutes - currentMinutes;

  if (minutesUntilClose <= 30) {
    return "กำลังจะปิด";
  }

  if (used === total && total > 0) {
    return "เต็ม";
  }

  return "ใช้งานอยู่";
}


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

    const url = new URL(req.url)
    const siteId = url.searchParams.get("site_id")

    // =============================
    // 1) Buildings
    // =============================
    let buildingsQuery = supabase
      .from("buildings")
      .select(`
        id,
        name,
        open_time,
        close_time,
        price_value,
        price_info,
        is_active,
        address,
        parking_site_id
      `)

    if (siteId && siteId !== "all") {
      buildingsQuery = buildingsQuery.eq("parking_site_id", siteId)
    }

    const { data: buildingsData, error: buildingsError } =
      await buildingsQuery

    if (buildingsError) throw buildingsError

    const buildings = buildingsData ?? []

    // =============================
    // 2) Floors
    // =============================
    const { data: floorsData, error: floorError } =
      await supabase
        .from("floors")
        .select("id, building_id")

    if (floorError) throw floorError
    const floors = floorsData ?? []

    const floorToBuilding = new Map(
      floors.map((f: any) => [f.id, f.building_id])
    )

    // =============================
    // 3) Zones
    // =============================
    const { data: zonesData, error: zonesError } =
      await supabase
        .from("zones")
        .select("id, floor_id")

    if (zonesError) throw zonesError
    const zones = zonesData ?? []

    const zoneToFloor = new Map(
      zones.map((z: any) => [z.id, z.floor_id])
    )

    // =============================
    // 4) Slots
    // =============================
    const { data: slotsData, error: slotError } =
      await supabase
        .from("slots")
        .select("id, status, vehicle_type, zone_id")

    if (slotError) throw slotError
    const slots = slotsData ?? []

    // =============================
    // 5) Metrics
    // =============================
    const totalSlots = slots.length
    const evSlots =
      slots.filter((s: any) => s.vehicle_type === "EV")
        .length
    const bikeSlots =
      slots.filter((s: any) => s.vehicle_type === "BIKE")
        .length
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

    // =============================
    // 6) Parking summary
    // =============================
    const parkingSummary = buildings.map((b: any) => {
      const slotsInBuilding = slots.filter((s: any) => {
        const floorId = zoneToFloor.get(s.zone_id)
        const buildingId = floorToBuilding.get(floorId)
        return buildingId === b.id
      })

      const total = slotsInBuilding.length
      const used = slotsInBuilding.filter(
        (s: any) => s.status !== "available"
      ).length

      const types = Array.from(
        new Set(
          slotsInBuilding.map(
            (s: any) => s.vehicle_type
          )
        )
      )

      return {
        id: b.id,
        name: b.name,
        open_time: b.open_time,
        close_time: b.close_time,
        address: b.address ?? "",
        used,
        total,
        types,
        status: computeStatus(b, used, total),
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (err: any) {
    console.error("EDGE ERROR:", err)

    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})