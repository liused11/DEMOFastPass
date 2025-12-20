import { Module } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { ParkingResolver } from './parking.resolver';
import { PubSubModule } from '../pubsub/pubsub.module';
import { SupabaseRealtimeService } from './supabase/supabase-realtime.service'

@Module({
  imports: [PubSubModule],
  providers: [ParkingResolver, ParkingService, SupabaseRealtimeService],
})
export class ParkingModule {}
