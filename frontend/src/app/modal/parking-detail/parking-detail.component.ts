import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { ParkingLot } from 'src/app/tab1/tab1.page';
import { ParkingReservationsComponent } from '../parking-reservations/parking-reservations.component';
import { AvailabilitySummaryRequest, ParkingService } from 'src/app/services/parking.service';


interface ZoneData {
  id: string;
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
}

interface FloorData {
  id: string;
  name: string;
  zones: ZoneData[];
  totalAvailable: number;
  capacity: number;
}

interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
}

interface AggregatedZone {
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
  floorIds: string[];
  ids: string[];
}

@Component({
  selector: 'app-parking-detail',
  templateUrl: './parking-detail.component.html',
  styleUrls: ['./parking-detail.component.scss'],
  standalone: false
})
export class ParkingDetailComponent implements OnInit {
  @Input() lot!: ParkingLot;
  @Input() initialType: string = 'normal';


  
  sites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;
  selectedType = 'normal';
  isLoading = false;

  floorData: FloorData[] = [];
  selectedFloorIds: string[] = [];
  selectedZoneIds: string[] = [];
  displayZones: AggregatedZone[] = [];
  
  hourOptions: string[] = [];
  currentImageIndex = 0;

  constructor(
    private modalCtrl: ModalController,
    private parkingService: ParkingService
  ) { }

  ngOnInit() {
    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    }

    this.checkOpenStatus();
    this.generateWeeklySchedule();
    

    this.initializeFloorData();



    this.loadAllSites();
  }

  initializeFloorData() {
    const floors = (this.lot.floors && this.lot.floors.length > 0) ? this.lot.floors : [];
    this.floorData = floors.map(f => ({
      id: f.id,
      name: f.name,
      zones: [],
      totalAvailable: 0,
      capacity: 0
    }));



    if (this.floorData.length > 0) {
      this.selectedFloorIds = [this.floorData[0].id];
      this.fetchParkingDetails();
    }
  }

  fetchParkingDetails() {
    if (this.selectedFloorIds.length === 0) {
      this.displayZones = [];
      return;
    }

    this.isLoading = true;

    const request: AvailabilitySummaryRequest = {
      siteId: this.lot.id.split('-')[0],
      buildingId: this.lot.id,
      floorId: this.selectedFloorIds,
      vehicleTypeCode: this.getVehicleCode(this.selectedType),
      date: new Date().toISOString().split('T')[0]
    };

    this.parkingService.getAvailabilitySummary(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res: any) => {
          if (res && res.summary && res.summary.zones) {
             this.displayZones = res.summary.zones.map((z: any) => ({
              name: z.zoneName,
              available: z.availableCount,
              capacity: z.totalCapacity,
              status: z.status,
              floorIds: this.selectedFloorIds,
              ids: z.zoneIds
            }));
          }
        },
        error: (err: any) => {
          console.error('ไม่สามารถดึงข้อมูลสรุปได้:', err);
        }
      });

  }

  toggleFloor(floor: FloorData) {
    if (this.isFloorSelected(floor.id)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(id => id !== floor.id);
    } else {
      this.selectedFloorIds.push(floor.id);
    }
    this.clearAllZones();
    this.fetchParkingDetails();
  }

  selectAllFloors() {
    this.selectedFloorIds = this.floorData.map(f => f.id);
    this.clearAllZones();
    this.fetchParkingDetails();
  }

  clearAllFloors() {
    this.selectedFloorIds = [];
    this.displayZones = [];
    this.clearAllZones();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.clearAllZones();
    this.fetchParkingDetails();
    this.closePopovers();
  }

  selectSite(site: ParkingLot) {
    this.lot = site;
    this.initializeFloorData();
    this.closePopovers();
  }

  toggleZone(aggZone: AggregatedZone) {
    const isSelected = this.isZoneSelected(aggZone.name);
    if (isSelected) {
      this.selectedZoneIds = this.selectedZoneIds.filter(id => !aggZone.ids.includes(id));
    } else {
      const newIds = aggZone.ids.filter(id => !this.selectedZoneIds.includes(id));
      this.selectedZoneIds = [...this.selectedZoneIds, ...newIds];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  selectAllZones() {
    this.selectedZoneIds = [];
    this.displayZones.forEach(z => {
      if (z.status !== 'full') this.selectedZoneIds.push(...z.ids);
    });
  }

  clearAllZones() {
    this.selectedZoneIds = [];
  }

  async Reservations(lot: ParkingLot) {
    const selectedFloorNames = this.selectedFloorIds.join(',');
    const selectedZoneNames = this.displayZones
      .filter(z => this.isZoneSelected(z.name))
      .map(z => z.name)
      .join(',');

    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: {
        lot: lot,
        preSelectedType: this.selectedType,
        preSelectedFloor: selectedFloorNames,
        preSelectedZone: selectedZoneNames,
        selectedZoneIds: this.selectedZoneIds 
      }
    });
    await modal.present();
  }

  loadAllSites() {
    this.parkingService.getSites().subscribe((res: ParkingLot[]) => this.sites = res);
  }

  getVehicleCode(type: string): number {
    const codes: { [key: string]: number } = { 'normal': 1, 'ev': 2, 'motorcycle': 3 };
    return codes[type] || 1;
  }

  isFloorSelected(floorId: string): boolean { return this.selectedFloorIds.includes(floorId); }
  isAllFloorsSelected(): boolean { return this.floorData.length > 0 && this.selectedFloorIds.length === this.floorData.length; }
  get selectedZonesCount(): number { return this.displayZones.filter(z => this.isZoneSelected(z.name)).length; }
  isAllZonesSelected(): boolean {
    const availableAgg = this.displayZones.filter(z => z.status !== 'full');
    return availableAgg.length > 0 && availableAgg.every(z => this.isZoneSelected(z.name));
  }

  closePopovers() {
    const popovers = document.querySelectorAll('ion-popover');
    popovers.forEach(p => (p as any).dismiss());
  }

  checkOpenStatus() { this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low'; }
  getTypeName(type: string): string {
    const names: { [key: string]: string } = { 'normal': 'รถทั่วไป', 'ev': 'รถ EV', 'motorcycle': 'มอเตอร์ไซค์' };
    return names[type] || type;
  }

  generateWeeklySchedule() {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const today = new Date().getDay();
    this.weeklySchedule = Array.from({ length: 7 }, (_, i) => ({
      dayName: dayNames[(today + i) % 7],
      timeRange: '08:00 - 20:00',
      isToday: i === 0
    }));
  }

  pad(num: number): string { return num < 10 ? '0' + num : num.toString(); }
  dismiss() { this.modalCtrl.dismiss(); }
}