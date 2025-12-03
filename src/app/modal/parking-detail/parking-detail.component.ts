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
  
  // Data
  floorData: FloorData[] = [];
  
  // Selection State
  selectedFloor: FloorData | null = null;
  selectedZoneIds: string[] = [];

  hourOptions: string[] = [];
  
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    // Mock Data (เหมือนเดิม)
    this.mockSites = [
      { id: 'lib_complex', name: 'อาคารหอสมุด (Library)', capacity: { normal: 200, ev: 20, motorcycle: 100 }, available: { normal: 120, ev: 18, motorcycle: 50 }, floors: ['Floor 1', 'Floor 2', 'Floor 3'], mapX: 50, mapY: 80, status: 'available', isBookmarked: true, distance: 50, hours: '', hasEVCharger: true, userTypes: 'นศ., บุคลากร', price: 0, priceUnit: 'ฟรี', supportedTypes: ['normal', 'ev', 'motorcycle'], schedule: [] },
      { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)', capacity: { normal: 0, ev: 10, motorcycle: 0 }, available: { normal: 0, ev: 2, motorcycle: 0 }, floors: ['G'], mapX: 300, mapY: 150, status: 'available', isBookmarked: false, distance: 500, hours: '', hasEVCharger: true, userTypes: 'All', price: 50, priceUnit: 'ต่อชม.', supportedTypes: ['ev'], schedule: [] }
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

    // Default Select First Floor
    if (this.floorData.length > 0) {
      this.selectFloor(this.floorData[0]);
    }
  }

  // --- Floor Selection (Single) ---
  selectFloor(floor: FloorData) {
    this.selectedFloor = floor;
    // เมื่อเปลี่ยนชั้น ให้เลือกโซนทั้งหมดของชั้นนั้นเป็นค่าเริ่มต้น (หรือจะ Reset ก็ได้)
    this.selectAllZones(); 
  }
  
  selectAllFloors() {
    // กรณีนี้เลือกได้แค่ชั้นเดียว การกดเลือกทั้งหมด อาจหมายถึงการเลือกชั้นที่มีที่ว่างมากสุด หรือชั้นแรก?
    // ในบริบทนี้ ถ้า UI บังคับเลือก 1 ชั้น ให้เลือกชั้นแรกละกันครับ
    if (this.floorData.length > 0) this.selectFloor(this.floorData[0]);
  }

  isAllFloorsSelected(): boolean {
    // จริงๆ เลือกได้แค่ชั้นเดียว Logic นี้อาจไม่จำเป็น หรืออาจหมายถึง selectedFloor != null
    return this.selectedFloor !== null;
  }


  // --- Zone Selection (Multiple) ---
  toggleZone(zone: ZoneData) {
    if (this.isZoneSelected(zone.id)) {
      this.selectedZoneIds = this.selectedZoneIds.filter(id => id !== zone.id);
    } else {
      this.selectedZoneIds.push(zone.id);
    }
  }

  isZoneSelected(zoneId: string): boolean {
    return this.selectedZoneIds.includes(zoneId);
  }

  selectAllZones() {
    if (this.selectedFloor) {
      this.selectedZoneIds = this.selectedFloor.zones
          .filter(z => z.status !== 'full')
          .map(z => z.id);
    }
  }

  isAllZonesSelected(): boolean {
    if (!this.selectedFloor) return false;
    const availableZones = this.selectedFloor.zones.filter(z => z.status !== 'full');
    return availableZones.length > 0 && this.selectedZoneIds.length === availableZones.length;
  }
  
  clearAllZones() {
    this.selectedZoneIds = [];
  }

  // คำนวณยอดว่างรวม ตามโซนที่เลือกในชั้นปัจจุบัน
  getAutoTotalAvailable(): number {
    if (!this.selectedFloor) return 0;
    
    // ถ้าเลือกบางโซน ให้รวมยอดเฉพาะโซนที่เลือก
    if (this.selectedZoneIds.length > 0) {
       return this.selectedFloor.zones
         .filter(z => this.isZoneSelected(z.id))
         .reduce((sum, z) => sum + z.available, 0);
    }
    // ถ้าไม่ได้เลือกโซนเลย (หรือล้าง) อาจจะแสดง 0 หรือแสดงยอดรวมทั้งชั้น?
    // ปกติถ้ากดล้าง = ไม่เลือก = 0
    return 0; 
  }

  // --- General ---
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
    // ส่งข้อมูลชั้นและโซนที่เลือกไป
    // ถ้าเลือกหลายโซน อาจจะส่งเป็น 'any' หรือ list of ids ก็ได้ แล้วแต่ backend รองรับ
    const zonesParam = this.isAllZonesSelected() ? 'any' : this.selectedZoneIds.join(',');

    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: { 
        lot: lot,
        preSelectedType: this.selectedType,
        preSelectedFloor: this.selectedFloor?.name || 'any',
        preSelectedZone: zonesParam, // เพิ่ม prop นี้ใน Reservations component ด้วยถ้าจำเป็น
        isSpecificSlot: false // Default เป็น Auto เพราะเราเลือกแบบรวมๆ
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      backdropDismiss: true,
    });
    await modal.present();
  }

  // Helpers
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