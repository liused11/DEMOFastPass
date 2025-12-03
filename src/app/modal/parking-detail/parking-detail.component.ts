import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ParkingLot } from 'src/app/tab1/tab1.page';
import { ParkingReservationsComponent } from '../parking-reservations/parking-reservations.component';

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
}

interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
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

  mockSites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  selectedType = 'normal';
  bookingMode: 'auto' | 'specific' = 'auto'; 

  floorData: FloorData[] = [];
  uniqueZoneNames: string[] = []; 

  specificSelectedFloor: FloorData | null = null;
  specificSelectedZone: ZoneData | null = null;

  autoSelectedFloorIds: string[] = []; 
  autoSelectedZoneNames: string[] = []; 

  filterStartHour: string = '08:00';
  filterEndHour: string = '20:00';
  hourOptions: string[] = [];
  
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.mockSites = [
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        capacity: { normal: 200, ev: 20, motorcycle: 100 }, 
        available: { normal: 120, ev: 18, motorcycle: 50 },
        floors: ['Floor 1', 'Floor 2', 'Floor 3'],
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        supportedTypes: ['normal', 'ev', 'motorcycle'],
        schedule: []
      },
      {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        capacity: { normal: 0, ev: 10, motorcycle: 0 },
        available: { normal: 0, ev: 2, motorcycle: 0 },
        floors: ['G'],
        mapX: 300, mapY: 150,
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        supportedTypes: ['ev'],
        schedule: []
      }
    ];

    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    } else if (this.lot.supportedTypes.length > 0) {
      this.selectedType = this.lot.supportedTypes[0];
    }

    this.hourOptions = Array.from({ length: 24 }, (_, i) => this.pad(i) + ':00');
    
    this.checkOpenStatus();
    this.generateWeeklySchedule();
    this.generateMockFloorZoneData();
  }

  generateMockFloorZoneData() {
    this.floorData = [];
    const floors = (this.lot.floors && this.lot.floors.length > 0) ? this.lot.floors : ['F1', 'F2'];
    const zoneNames = ['Zone A', 'Zone B', 'Zone C', 'Zone D']; 
    this.uniqueZoneNames = zoneNames;

    let totalAvail = this.getCurrentAvailable();

    floors.forEach((floorName) => {
      const zones: ZoneData[] = [];
      let floorAvailCounter = 0;
      const zonesToGenerate = zoneNames.length;
      const capacityPerZone = Math.ceil(this.getCurrentCapacity() / (floors.length * zonesToGenerate)) || 10;
      
      zoneNames.forEach(zName => {
        let avail = 0;
        if (totalAvail > 0) {
           const maxRandom = Math.min(totalAvail, capacityPerZone);
           avail = Math.floor(Math.random() * (maxRandom + 1));
           totalAvail -= avail;
           floorAvailCounter += avail;
        }

        zones.push({
          id: `${this.lot.id}-${floorName}-${zName}`,
          name: zName,
          available: avail,
          capacity: capacityPerZone,
          status: avail === 0 ? 'full' : 'available'
        });
      });

      this.floorData.push({
        id: floorName,
        name: floorName,
        zones: zones,
        totalAvailable: floorAvailCounter
      });
    });

    if (this.floorData.length > 0) {
      this.selectSpecificFloor(this.floorData[0]);
    }
    this.selectAllFloors();
    this.selectAllZones();
  }

  selectSpecificFloor(floor: FloorData) {
    this.specificSelectedFloor = floor;
    this.specificSelectedZone = null;
  }

  selectSpecificZone(zone: ZoneData) {
    this.specificSelectedZone = zone;
  }

  isAutoFloorSelected(floorId: string): boolean {
    return this.autoSelectedFloorIds.includes(floorId);
  }

  toggleAutoFloor(floorId: string) {
    if (this.isAutoFloorSelected(floorId)) {
      this.autoSelectedFloorIds = this.autoSelectedFloorIds.filter(id => id !== floorId);
    } else {
      this.autoSelectedFloorIds.push(floorId);
    }
  }

  selectAllFloors() {
    this.autoSelectedFloorIds = this.floorData.map(f => f.id);
  }

  isAllFloorsSelected(): boolean {
    return this.floorData.length > 0 && this.autoSelectedFloorIds.length === this.floorData.length;
  }

  isAutoZoneSelected(zoneName: string): boolean {
    return this.autoSelectedZoneNames.includes(zoneName);
  }

  toggleAutoZone(zoneName: string) {
    if (this.isAutoZoneSelected(zoneName)) {
      this.autoSelectedZoneNames = this.autoSelectedZoneNames.filter(z => z !== zoneName);
    } else {
      this.autoSelectedZoneNames.push(zoneName);
    }
  }

  selectAllZones() {
    this.autoSelectedZoneNames = [...this.uniqueZoneNames];
  }

  isAllZonesSelected(): boolean {
    return this.uniqueZoneNames.length > 0 && this.autoSelectedZoneNames.length === this.uniqueZoneNames.length;
  }

  getAutoTotalAvailable(): number {
    let total = 0;
    this.floorData.forEach(floor => {
      if (this.isAutoFloorSelected(floor.id)) {
        floor.zones.forEach(zone => {
          if (this.isAutoZoneSelected(zone.name)) {
            total += zone.available;
          }
        });
      }
    });
    return total;
  }

  selectSite(site: ParkingLot) {
    this.lot = site;
    if (this.lot.supportedTypes.length > 0 && !this.lot.supportedTypes.includes(this.selectedType)) {
      this.selectedType = this.lot.supportedTypes[0];
    }
    this.checkOpenStatus();
    this.generateWeeklySchedule();
    this.generateMockFloorZoneData(); 
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if(popover) popover.dismiss();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.generateMockFloorZoneData(); 
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if(popover) popover.dismiss();
  }

  async Reservations(lot: ParkingLot) {
    let selectedFloor = 'any';
    if (this.bookingMode === 'specific') {
      selectedFloor = this.specificSelectedFloor?.name || 'any';
    } else {
      if (this.isAllFloorsSelected()) selectedFloor = 'any';
      else selectedFloor = this.autoSelectedFloorIds.join(',');
    }

    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: { 
        lot: lot,
        preSelectedType: this.selectedType,
        preSelectedFloor: selectedFloor,
        isSpecificSlot: this.bookingMode === 'specific' 
      },
      initialBreakpoint:  1,
      breakpoints: [0, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
  }

  pad(num: number): string { return num < 10 ? '0' + num : num.toString(); }
  dismiss() { this.modalCtrl.dismiss(); }
  checkOpenStatus() { this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low'; }
  getCurrentCapacity(): number { return (this.lot.capacity as any)[this.selectedType] || 0; }
  getCurrentAvailable(): number { return (this.lot.available as any)[this.selectedType] || 0; }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถทั่วไป';
      case 'ev': return 'รถ EV';
      case 'motorcycle': return 'มอเตอร์ไซค์';
      default: return type;
    }
  }
  
  generateWeeklySchedule() {
    const today = new Date().getDay();
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    this.weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7;
      this.weeklySchedule.push({
        dayName: dayNames[dayIndex],
        timeRange: '08:00 - 20:00',
        isToday: i === 0
      });
    }
  }
}