import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ParkingLot } from '../tab1/tab1.page';

export interface AvailabilitySummaryRequest {
  siteId: string;
  buildingId: string;
  floorId: string[];
  vehicleTypeCode: number;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private apiUrl = 'http://localhost:3003';

  constructor(private http: HttpClient) { }

  /**
   * จำลองข้อมูลสถานที่ทั้งหมด (ใช้ชั่วคราวระหว่างรอ Backend)
   */
  getSites(): Observable<ParkingLot[]> {
    const mockData: ParkingLot[] = [
      {
        id: '1',
        name: 'อาคารหอสมุด (Library)',
        capacity: { normal: 200, ev: 20, motorcycle: 0 },
        available: { normal: 120, ev: 18, motorcycle: 0 },
        floors: [
          { id: '1-1-1', name: 'ชั้น 1' },
        ],
        mapX: 50,
        mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '08:00 - 20:00',
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        supportedTypes: ['normal', 'ev', 'motorcycle'],
        schedule: [],
        images: ['assets/images/parking/exterior.png', 'assets/images/parking/indoor.png']
      },
      {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        capacity: { normal: 0, ev: 10, motorcycle: 0 },
        available: { normal: 0, ev: 2, motorcycle: 0 },
        floors: [{ id: '1-2-1', name: 'G' }],
        mapX: 300,
        mapY: 150,
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '24 ชั่วโมง',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        supportedTypes: ['ev'],
        schedule: [],
        images: ['assets/images/parking/ev.png']
      }
    ];

    return of(mockData);
  }

  getAvailabilitySummary(request: AvailabilitySummaryRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/availability/summary`, request);
  }
}