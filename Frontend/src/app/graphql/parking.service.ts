import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { ParkingLot } from '../tab1/tab1.page';

type ParkingByLocationResponse = {
  parkingByLocation: {
    site: {
      site_id: string;
      name: string;
    };
    parkingList: ParkingApi[];
  };
};

export type ParkingByLocationResult = {
  siteId: string;
  siteName: string;
  lots: ParkingLot[];
};

type ParkingApi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: any;
  available: any;
  floor: string[];
  price: number;
  priceUnit: string;
  allowedUserTypes: string[];
  hasEVCharger: boolean;
  schedule: any[];
};

const PARKING_STATUS_SUBSCRIPTION = gql`
  subscription parkingStatusUpdated($siteId: String!) {
    parkingStatusUpdated(siteId: $siteId) {
      siteId
      lotId
      availableSlots
      availableNormal
      availableEv
      availableMotorcycle
      updatedAt
    }
  }
`;

const PARKING_BY_LOCATION = gql`
  query parkingByLocation($lat: Float!, $lng: Float!) {
    parkingByLocation(lat: $lat, lng: $lng) {
      site {
      site_id
      name
      }
      parkingList {
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
  }
`;
@Injectable({ providedIn: 'root' })
export class ParkingService {
  constructor(private apollo: Apollo) {}

  getParkingByLocation(
    lat: number,
    lng: number
  ): Observable<ParkingByLocationResult> {
    return this.apollo
      .query<ParkingByLocationResponse>({
        query: PARKING_BY_LOCATION,
        variables: { lat, lng },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(res => {
        const data = res.data?.parkingByLocation;

        if (!data) {
          return {
            siteId: '',
            siteName: '',
            lots: [],
          };
        }

        return {
          siteId: data.site.site_id,
          siteName: data.site.name,
          lots: data.parkingList.map(p =>
            this.mapToParkingLot(p)
          ),
        };
      })
    );

  }

  subscribeParkingStatus(siteId: string): Observable<any> {
    return this.apollo.subscribe({
      query: PARKING_STATUS_SUBSCRIPTION,
      variables: { siteId },
    });
  }
  
  applyParkingStatusUpdate(
    lots: ParkingLot[],
    event: any
  ): ParkingLot[] {
    return lots.map(lot => {
      if (lot.id !== event.lotId) return lot;

      return {
        ...lot,
        available: {
          normal: event.availableNormal,
          ev: event.availableEv,
          motorcycle: event.availableMotorcycle,
        },
        status: event.availableSlots > 0 ? 'available' : 'full',
      };
    });
  }

  private formatUserTypes(types: string[]): string {
    const map: Record<string, string> = {
      student: 'นักศึกษา',
      staff: 'บุคลากร',
      visitor: 'บุคคลทั่วไป',
    };

    return types.map(t => map[t] ?? t).join(', ');
  }

  // 🔥 Map GraphQL → UI Model (ParkingLot)
  private mapToParkingLot(api: ParkingApi): ParkingLot {
    const userTypesText = this.formatUserTypes(api.allowedUserTypes);
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
      userTypes: (api.allowedUserTypes ?? []).join(', '),
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