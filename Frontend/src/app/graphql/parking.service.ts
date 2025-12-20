import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { ParkingLot } from '../tab1/tab1.page';

type ParkingByLocationResponse = {
  parkingByLocation: any[];
};

const PARKING_BY_LOCATION = gql`
  query parkingByLocation($lat: Float!, $lng: Float!) {
    parkingByLocation(lat: $lat, lng: $lng) {
      id
      name
      lat
      lng
      capacity
      available
      floor
      price
      priceUnit
      allowedUserTypes
      hasEVCharger
      schedule
    }
  }
`;
@Injectable({ providedIn: 'root' })
export class ParkingService {
  constructor(private apollo: Apollo) {}

  getParkingByLocation(
    lat: number,
    lng: number
  ): Observable<ParkingLot[]> {
    return this.apollo
      .query<ParkingByLocationResponse>({
        query: PARKING_BY_LOCATION,
        variables: { lat, lng },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(res => {
          const lots = res.data?.parkingByLocation ?? [];
          return lots.map(p => this.mapToParkingLot(p));
        })
      );
  }

  // 🔥 Map GraphQL → UI Model (ParkingLot)
  private mapToParkingLot(api: any): ParkingLot {
    return {
      id: api.id,
      name: api.name,

      lat: api.lat,
      lng: api.lng,

      capacity: api.capacity,
      available: api.available,

      floors: api.floor ?? [],

      // UI fields (คำนวณทีหลัง)
      status: 'available',
      distance: 0,
      hours: '',
      mapX: 0,
      mapY: 0,
      isBookmarked: false,

      // business
      price: api.price,
      priceUnit: api.priceUnit,
      userTypes: api.allowedUserTypes,
      hasEVCharger: api.hasEVCharger,
      supportedTypes: Object.keys(api.capacity ?? {}).filter(
        (k: string) => api.capacity?.[k] > 0
      ),

      schedule: (api.schedule ?? []).map((s: any) => ({
        ...s,
        days: this.normalizeDays(s.days)
      }))
    };
  }

    private normalizeDays(days: string[]): string[] {
        const map: Record<string, string> = {
            sun: 'sunday',
            mon: 'monday',
            tue: 'tuesday',
            wed: 'wednesday',
            thu: 'thursday',
            fri: 'friday',
            sat: 'saturday',
        };

        return days.map(d => map[d] ?? d);
    }
}