import { Field, ObjectType, ID, Float, Int } from '@nestjs/graphql';
import { ParkingStatus } from './parking-status.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class ParkingLot {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => [String], { nullable: true })
  floor: string[];

  @Field(() => Float)
  lat: number;

  @Field(() => Float)
  lng: number;

  @Field(() => GraphQLJSONObject, { nullable: true })
  capacity: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  available: any;

  @Field(() => Int)
  price: number;

  @Field()
  priceUnit: string;

  @Field(() => [String])
  allowedUserTypes: string[];

  @Field(() => Boolean)
  hasEVCharger: boolean;

  @Field(() => [GraphQLJSONObject], { nullable: true })
  schedule?: any;

  
  
  
  /*
  @Field(() => ID)
  lot_id: string;  // ✅ map กับ lot_id (uuid)

  @Field(() => ID)
  site_id: string; // ✅ map กับ site_id (uuid)

  @Field()
  name: string;    // ✅ map กับ name (text)

  @Field(() => [String]) 
  floor: string[]; // ✅ map กับ floor (text)

  @Field(() => Float)
  latitude: number;  // ✅ map กับ latitude (float8)

  @Field(() => Float)
  longitude: number; // ✅ map กับ longitude (float8)

  @Field()
  geohash: string; // ✅ map กับ geohash (text)

  @Field(() => Int)
  total_capacity: number; // ✅ map กับ total_capacity (int4)

  @Field(() => Int)
  total_normal: number; // ✅ map กับ total_capacity (int4)

  @Field(() => Int)
  total_ev: number; // ✅ map กับ total_capacity (int4)

  @Field(() => Int)
  total_motorcycle: number; // ✅ map กับ total_capacity (int4)

  @Field(() => Boolean)
  has_ev_charger: boolean;

  @Field(() => [String]) 
  supported_vehicles: string[]; // ✅ map กับ supported_vehicles (jsonb)

  @Field(() => [String]) 
  supported_roles: string[]; // ✅ map กับ supported_roles (jsonb)

    // 🔧 จากเดิมเป็น String → เปลี่ยนเป็น JSON object
  @Field(() => GraphQLJSONObject, { nullable: true })
  classification?: any;  // ✅ รับ JSON ทั้งก้อนจาก DB ได้ ไม่ serialize error

  @Field(() => Int)
  price: number;

  @Field()
  price_unit: string; // ✅ map กับ price_unit (text)

  @Field(() => ParkingStatus, { nullable: true })
  status?: ParkingStatus; */
}