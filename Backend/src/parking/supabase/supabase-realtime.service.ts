import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { supabase } from './supabaseClient';
import { PubSubService } from '../../pubsub/pubsub.service';
import { ParkingService } from '../../parking/parking.service';
import { ParkingStatusReadModelUpdated } from '../events/parking-status-read-model.event';


interface ParkingStatusRow {
  lot_id: string;
  site_id: string;
  available_slots: number;
  available_normal: number;
  available_ev: number;
  available_motorcycle: number;
  updated_at: string;
}

@Injectable()
export class SupabaseRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseRealtimeService.name);

  constructor(private readonly parkingService: ParkingService) {
    console.log('SupabaseRealtimeService constructor');
  }

  onModuleInit() {
    this.logger.log('SupabaseRealtimeService initialized');
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

          const event: ParkingStatusReadModelUpdated = {
            siteId: status.site_id,
            lotId: status.lot_id,
            availableSlots: status.available_slots,
            availableNormal: status.available_normal,
            availableEv: status.available_ev,
            availableMotorcycle: status.available_motorcycle,
            updatedAt: new Date(status.updated_at),
          };
          
          this.logger.log(
            `ParkingStatus Update → site=${event.siteId} lot=${event.lotId} `,
          );

          // ชื่อ channel ใหม่แบบเฉพาะ site
          this.parkingService.handleReadModelUpdate(event);
        },
      )
      .subscribe();
  }
}
