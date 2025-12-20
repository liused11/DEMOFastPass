import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { supabase } from './supabaseClient';
import { PubSubService } from '../../pubsub/pubsub.service';

interface ParkingStatusRow {
  lot_id: string;
  site_id: string;
  available_slots: number;
  occupied_slots: number;
  updated_at: string;
}

@Injectable()
export class SupabaseRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseRealtimeService.name);

  constructor(private readonly pubsub: PubSubService) {}

  onModuleInit() {
    this.listenParkingStatus();
  }

  async listenParkingStatus() {
    this.logger.log(' Listening Supabase Realtime: read_parking_status');

    supabase
      .channel('parking-status-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'read_parking_status',
        },
        (payload) => {
          const status = payload.new as ParkingStatusRow;
          if (!status) return;

          // ใช้ site_id จาก table เลย ไม่ต้อง query ซ้ำ
          const siteId = status.site_id;
          
          this.logger.log(
            `ParkingStatus Update → site=${siteId} lot=${status.lot_id} occupied=${status.occupied_slots}`,
          );



          // ชื่อ channel ใหม่แบบเฉพาะ site
          this.pubsub.publish(`parkingStatusUpdated.${siteId}`, {
            parkingStatusUpdated: status,
          });
        },
      )
      .subscribe();
  }
}
