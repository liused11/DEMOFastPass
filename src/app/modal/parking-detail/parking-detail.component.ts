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
  capacity: number; // เพิ่ม capacity รวมของชั้น
}

interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
}

// Interface สำหรับแสดงผลโซนที่รวมยอดแล้ว
interface AggregatedZone {
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
  floorIds: string[]; // เก็บว่าโซนชื่อนี้ อยู่ชั้นไหนบ้างที่เลือกไว้
  ids: string[]; // เก็บ id จริงของโซนทุกชั้น
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
  
  // ✅ Selection State (Multiple Floors)
  selectedFloorIds: string[] = [];
  
  // ✅ Selection State (Multiple Zones - เก็บเป็น ID จริงของโซน)
  selectedZoneIds: string[] = [];

  // ✅ Aggregated Zones for Display
  displayZones: AggregatedZone[] = [];

  hourOptions: string[] = [];
  
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
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
        totalAvailable: floorAvailCounter,
        capacity: capacityPerZone * zonesToGenerate
      });
    });

    // Default Select First Floor
    if (this.floorData.length > 0) {
      this.selectedFloorIds = [this.floorData[0].id];
      this.updateDisplayZones();
      this.selectAllZones(); // Select all zones of first floor by default
    }
  }

  // --- Floor Selection (Multiple) ---
  toggleFloor(floor: FloorData) {
    if (this.isFloorSelected(floor.id)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(id => id !== floor.id);
    } else {
      this.selectedFloorIds.push(floor.id);
    }
    this.updateDisplayZones();
    this.selectAllZones();
  }

  selectAllFloors() {
    this.selectedFloorIds = this.floorData.map(f => f.id);
    this.updateDisplayZones();
    this.selectAllZones();
  }

  clearAllFloors() {
    this.selectedFloorIds = [];
    this.updateDisplayZones();
    this.clearAllZones(); 
  }

  isFloorSelected(floorId: string): boolean {
    return this.selectedFloorIds.includes(floorId);
  }

  isAllFloorsSelected(): boolean {
    return this.floorData.length > 0 && this.selectedFloorIds.length === this.floorData.length;
  }

  // --- Zone Aggregation Logic ---
  updateDisplayZones() {
    const aggMap = new Map<string, AggregatedZone>();

    // Loop through selected floors
    this.selectedFloorIds.forEach(fid => {
      const floor = this.floorData.find(f => f.id === fid);
      if (floor) {
        floor.zones.forEach(z => {
          if (!aggMap.has(z.name)) {
            aggMap.set(z.name, {
              name: z.name,
              available: 0,
              capacity: 0,
              status: 'full',
              floorIds: [],
              ids: []
            });
          }
          const agg = aggMap.get(z.name)!;
          agg.available += z.available;
          agg.capacity += z.capacity;
          agg.floorIds.push(fid);
          agg.ids.push(z.id);
          
          if (agg.available > 0) agg.status = 'available';
        });
      }
    });

    this.displayZones = Array.from(aggMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- Zone Selection (Multiple) ---
  toggleZone(aggZone: AggregatedZone) {
    // Check if currently selected (if all IDs of this aggZone are in selectedZoneIds)
    // Actually, we treat the aggZone as one unit. 
    // If selected, we select ALL its real IDs. If deselected, remove ALL its real IDs.
    
    const isSelected = this.isZoneSelected(aggZone.name);

    if (isSelected) {
      // Remove all IDs belonging to this zone name
      this.selectedZoneIds = this.selectedZoneIds.filter(id => !aggZone.ids.includes(id));
    } else {
      // Add all IDs belonging to this zone name
      // Filter out duplicates just in case
      const newIds = aggZone.ids.filter(id => !this.selectedZoneIds.includes(id));
      this.selectedZoneIds = [...this.selectedZoneIds, ...newIds];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    // Considered selected if ALL its underlying IDs are selected (or at least one? Usually all for 'toggle')
    // Let's simpler: if any ID matches, it's visually selected? 
    // Better: We sync them. If checked, all ids are in.
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  selectAllZones() {
    this.selectedZoneIds = [];
    this.displayZones.forEach(z => {
      if (z.status !== 'full') {
        this.selectedZoneIds.push(...z.ids);
      }
    });
  }
  
  clearAllZones() {
    this.selectedZoneIds = [];
  }

  isAllZonesSelected(): boolean {
    const availableAggZones = this.displayZones.filter(z => z.status !== 'full');
    if (availableAggZones.length === 0) return false;
    
    // Check if every available agg zone is selected
    return availableAggZones.every(z => this.isZoneSelected(z.name));
  }

  // คำนวณยอดว่างรวม ตามโซนที่เลือก
  getAutoTotalAvailable(): number {
    // Sum available of displayed zones that are selected
    return this.displayZones
      .filter(z => this.isZoneSelected(z.name))
      .reduce((sum, z) => sum + z.available, 0);
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
    // เตรียมข้อมูล Floor ที่เลือก (แปลงเป็น string คั่นด้วย ,)
    const selectedFloorNames = this.floorData
        .filter(f => this.selectedFloorIds.includes(f.id))
        .map(f => f.id)
        .join(',');

    // ✅ เตรียมข้อมูล Zone ที่เลือก (แปลงเป็น string คั่นด้วย ,)
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
        preSelectedZone: selectedZoneNames, // ✅ ส่งค่า Zone ไปด้วย
        isSpecificSlot: false 
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      backdropDismiss: true,
    });
    await modal.present();
  }
  get selectedZonesCount(): number {
    return this.displayZones.filter(z => this.isZoneSelected(z.name)).length;
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