import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ParkingLot } from '../tab1/tab1.page';
import { MOCK_PARKING_LOTS } from './mock-parking-data';

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
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getSites(siteId: string = '1', geohash?: string): Observable<ParkingLot[]> {
    if (environment.useMockData) {
      console.log('Using Mock Data for Sites');
      return of(MOCK_PARKING_LOTS);
    }
    
    return this.http.get<ParkingLot[]>(`${this.apiUrl}/sites/${siteId}/buildings`);
  }


  getAvailabilitySummary(request: AvailabilitySummaryRequest): Observable<any> {
    if (environment.useMockData) {
       const mockResponse = {
         remaining: Math.floor(Math.random() * 50),
         summary: {
           zones: request.floorId.map((fid, index) => ({
             zoneName: `Zone ${String.fromCharCode(65 + index)}`,
             availableCount: Math.floor(Math.random() * 20),
             totalCapacity: 20,
             status: Math.random() > 0.5 ? 'available' : 'full',
             zoneIds: [`${fid}-1`]
           }))
         }
       };
       return of(mockResponse);
    }

    return this.http.post<any>(`${this.apiUrl}/availability/summary`, request);
  }
}