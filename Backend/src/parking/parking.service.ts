import { Injectable } from '@nestjs/common';
import { supabase } from './supabase/supabaseClient';
import * as geohash from 'ngeohash';
import { PubSubService } from '../pubsub/pubsub.service';

@Injectable()
export class ParkingService {
  constructor(private readonly pubsub: PubSubService) {}


  // -------------------------------
  // 1. หา site จาก lat/lng → geohash prefix
  // -------------------------------
  async getCurrentSite(lat: number, lng: number) {
    const gh = geohash.encode(lat, lng);
    const prefix = gh.substring(0, 5);

    const { data, error } = await supabase
      .from('read_parking_site')
      .select('*')
      .contains('geohash', [prefix])
      .single();

    if (error) return null;
    return data;
  }

  // -------------------------------
  // 2. ดึง Parking Lots ของ site
  // -------------------------------
  async getParkingBySiteId(siteId: string) {
    type ScheduleView = {
      days: string[];
      open_time: string;
      close_time: string;
      cron?: {
        open: string;
        close: string;
      };
    };

    type ReadParkingScheduleRow = {
      lot_id: string;
      schedule: ScheduleView[];
    };
    // 📌 ใช้ Supabase ในรูปแบบ Batching Request → ดีกว่า Query 2 ที !!
    const [lotsResult, statusResult, scheduleResult] = await Promise.all([
      supabase.from('read_parking_lot')
        .select('*')
        .eq('site_id', siteId),
      supabase.from('read_parking_status')
        .select(`lot_id, available_normal, available_ev, available_motorcycle`)
        .eq('site_id', siteId),
      supabase.from('read_parking_schedule')
        .select(`lot_id, schedule`)
        .eq('site_id', siteId)
        .returns<ReadParkingScheduleRow[]>(),
    ]);

    if (lotsResult.error) throw new Error(lotsResult.error.message);
    if (statusResult.error) throw new Error(statusResult.error.message);
    if (scheduleResult.error) throw new Error(scheduleResult.error.message);

    const statusMap = new Map(
      (statusResult.data || []).map(s => [s.lot_id, s]),
    );

    const scheduleMap = new Map<string, ScheduleView[]>();
    (scheduleResult.data || []).forEach(row => {
      scheduleMap.set(row.lot_id, row.schedule ?? []);
    });

    return lotsResult.data.map(lot => {
      const status = statusMap.get(lot.lot_id);
      const supportedVehicles: string[] = lot.supported_vehicles ?? [];

      const capacity = {
        normal: supportedVehicles.includes('car') ? lot.total_capacity : 0,
        ev: supportedVehicles.includes('ev') ? lot.total_capacity : 0,
        motorcycle: supportedVehicles.includes('motorcycle') ? lot.total_capacity : 0,
      };

      const available = {
        normal: supportedVehicles.includes('car') ? status?.available_normal ?? 0 : 0,
        ev: supportedVehicles.includes('ev') ? status?.available_ev ?? 0 : 0,
        motorcycle: supportedVehicles.includes('motorcycle') ? status?.available_motorcycle?? 0 : 0,
      };

      return {
        id: lot.lot_id,
        name: lot.name,
        lat: lot.latitude,
        lng: lot.longitude,

        capacity,
        available,
        
        floor: lot.floor?? [],

        price: lot.price ?? 0,
        priceUnit:
          lot.price_unit === 'flat'
            ? 'เหมาจ่าย'
            : lot.price_unit === 'hour'
            ? 'ต่อชม.'
            : 'ฟรี',

        allowedUserTypes: lot.supported_roles ?? [],
        hasEVCharger: supportedVehicles.includes('ev'),

        schedule: scheduleMap.get(lot.lot_id) || [],
      };
    });
  }


// 🔵 Entry point เดียว
  async getParkingByLocation(lat: number, lng: number) {
    // 1. resolve site
    const site = await this.resolveSiteFromLocation(lat, lng);
    if (!site) {
      return {
        parking_list: [],
        reason: 'SITE_NOT_FOUND',
      };
    }

    // 2. get parking by site
    // const parkingList = await this.getParkingBySiteId(site.site_id);

    // 3. return ทีเดียว
    return this.getParkingBySiteId(site.site_id);
    /*{
      parking_list: parkingList,
    };*/
  }

  async resolveSiteFromLocation(lat: number, lng: number) {
    const gh = geohash.encode(lat, lng);
    const prefix = gh.slice(0, 5); // ปรับตามขนาด site

    const { data: sites, error } = await supabase
      .from('read_parking_site')
      .select('*')
      .contains('geohash', [prefix]);

    if (error || !sites?.length) return null;

    // ✅ ปกติควรได้ site เดียว
    if (sites.length === 1) return sites[0];

    // ❗ safety net: ถ้ามีหลาย site (rare)
    return sites.find(site =>
      this.isPointInsideBoundingBox(lat, lng, site)
    );
  }

  private isPointInsideBoundingBox(
    lat: number,
    lng: number,
    site: any,
  ) {
    return (
      lat >= site.lat_min &&
      lat <= site.lat_max &&
      lng >= site.lng_min &&
      lng <= site.lng_max
    );
  }

  // -------------------------------
  // 3. ใช้ push event ตาม siteId
  // -------------------------------
  publishParkingUpdate(siteId: string, payload: any) {
    return this.pubsub.publish(`parkingStatusUpdated.${siteId}`, {
      parkingStatusUpdated: payload,
    });
  }
}

