import { Field, ObjectType, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ParkingStatus {
  @Field(() => ID)
  lot_id: string;               // ✅ uuid

  @Field(() => ID)
  site_id: string;              // ✅ uuid

  @Field(() => Int)
  available_slots: number;      // ✅ int4

  @Field(() => Int)
  occupied_slots: number;       // ✅ int4

  @Field(() => Boolean)
  is_full: boolean;             // ✅ bool

  @Field(() => Boolean)
  is_open_now: boolean;         // ✅ bool

  @Field(() => String, { nullable: true })
  current_status?: string;      // ✅ text (nullable กันไว้เผื่อ)

  @Field(() => String, { nullable: true })
  current_open_time?: string;   // ✅ timestamptz

  @Field(() => String, { nullable: true })
  current_close_time?: string;  // ✅ timestamptz

  @Field(() => String, { nullable: true })
  next_close_time?: string;     // ✅ timestamptz

  @Field(() => String, { nullable: true })
  updated_at?: string;          // ✅ timestamptz
}
