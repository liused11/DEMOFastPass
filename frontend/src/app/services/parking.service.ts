import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ParkingLot } from '../data/models';
import { MOCK_PARKING_LOTS } from './mock-parking-data';

// --- Interface ของเดิม (สำหรับ Tab1) ---
export interface AvailabilitySummaryRequest {
  siteId: string;
  buildingId: string;
  floorId: string[];
  vehicleTypeCode: number;
  date: string;
}

// --- Interface ของใหม่ (สำหรับ ParkingDetail) ---
export interface AvailabilityByFloorRequest {
  siteId: string;
  buildingId: string;
  vehicleTypeCode: number;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // 1. แก้ getSites ให้รับ geohash ได้เหมือนเดิม (แก้ Error TS2554)
  getSites(siteId: string = '1', geohash?: string): Observable<ParkingLot[]> {
    if (environment.useMockData) {
      console.log('Using Mock Data for Sites');
      return of(MOCK_PARKING_LOTS);
    }
    // ส่ง geohash ไปด้วยถ้ามี (Optional logic)
    // หรือถ้า API ไม่รับ geohash ก็ปล่อยไว้แบบนี้ แต่ต้องรับ parameter เข้ามาเพื่อไม่ให้ Tab1 error
    return this.http.get<ParkingLot[]>(`${this.apiUrl}/sites/${siteId}/buildings`);
  }

  // 2. คืนชีพฟังก์ชันเดิม getAvailabilitySummary (แก้ Error TS2339)
  // เพื่อให้ Tab1 ทำงานได้เหมือนเดิม
  getAvailabilitySummary(request: AvailabilitySummaryRequest): Observable<any> {
    if (environment.useMockData) {
      // Mock logic เดิม
      return of({});
    }
    return this.http.post<any>(`${this.apiUrl}/availability/summary`, request);
  }

  // 3. ฟังก์ชันใหม่สำหรับ ParkingDetail (ที่คุณต้องใช้)
  getAvailabilityByFloor(request: AvailabilityByFloorRequest): Observable<any> {
    if (environment.useMockData) {
      return of({});
    }
    return this.http.post<any>(`${this.apiUrl}/availability/by-floor`, request);
  }
}