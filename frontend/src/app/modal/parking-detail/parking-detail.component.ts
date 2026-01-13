import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { ParkingLot } from 'src/app/tab1/tab1.page';
import { ParkingReservationsComponent } from '../parking-reservations/parking-reservations.component';
// Import Interface ใหม่
import { AvailabilityByFloorRequest, ParkingService } from 'src/app/services/parking.service';

interface ZoneData {
  id: string; // ใช้ zoneIds[0] หรือจัดการตาม logic
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
  rawIds: string[]; // เก็บ array เต็มเผื่อใช้
}

// เพิ่ม field totalAvailable/capacity ให้ตรงกับ JSON
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

  sites: ParkingLot[] = []; // ใช้ตัวแปรนี้กับ HTML (แก้ mockSites ใน HTML ให้เป็น sites ด้วยนะครับ)
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;
  selectedType = 'normal';
  isLoading = false;

  floorData: FloorData[] = [];
  selectedFloorIds: string[] = [];
  selectedZoneIds: string[] = [];
  displayZones: AggregatedZone[] = []; // โซนที่จะโชว์ฝั่งขวา

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
    this.loadAllSites();

    // เรียกดึงข้อมูลทันทีเมื่อเข้าหน้า
    this.fetchParkingDetails();
  }

  // ฟังก์ชันหลัก: ดึงข้อมูลจาก API ใหม่
  fetchParkingDetails() {
    this.isLoading = true;
    
    // เตรียม Body ตามที่คุณระบุ
    const request: AvailabilityByFloorRequest = {
      siteId: this.lot.id.split('-')[0] || '1', // fallback logic
      buildingId: this.lot.id, // ส่ง buildingId ไป (เช่น "1-2")
      vehicleTypeCode: this.getVehicleCode(this.selectedType),
      date: new Date().toISOString().split('T')[0]
    };

    this.parkingService.getAvailabilityByFloor(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res: any) => {
          // เช็คโครงสร้าง JSON
          if (res && res.summary && res.summary.floors) {
            
            // 1. Map ข้อมูลจาก JSON เข้าตัวแปร floorData
            this.floorData = res.summary.floors.map((f: any) => ({
              id: f.floorId,
              name: f.floorName,
              totalAvailable: f.totalAvailable,
              capacity: f.capacity,
              // Map Zones ที่ซ่อนอยู่ในแต่ละชั้นเตรียมไว้เลย
              zones: f.zones.map((z: any) => ({
                id: z.zoneIds?.[0] || '', 
                name: z.zoneName,
                available: z.availableCount,
                capacity: z.totalCapacity,
                status: z.status, // หรือ check (z.availableCount === 0 ? 'full' : 'available')
                rawIds: z.zoneIds
              }))
            }));

            // 2. ถ้ายังไม่ได้เลือกชั้น ให้เลือกชั้นแรกอัตโนมัติ (ถ้ามีข้อมูล)
            if (this.selectedFloorIds.length === 0 && this.floorData.length > 0) {
               // เลือกชั้นแรกสุดที่มีที่ว่าง หรือชั้นแรกเฉยๆ
               this.selectedFloorIds = [this.floorData[0].id];
            }

            // 3. อัปเดตโซนฝั่งขวา
            this.updateDisplayZones();

          } else {
            console.warn('API Response ไม่ตรงโครงสร้าง:', res);
            this.floorData = [];
          }
        },
        error: (err: any) => {
          console.error('API Error:', err);
          // Handle error (show toast etc.)
        }
      });
  }

  // เมื่อกดเลือกชั้น (ไม่ต้องยิง API แล้ว แค่ Filter ข้อมูลในเครื่อง)
  toggleFloor(floor: FloorData) {
    if (this.isFloorSelected(floor.id)) {
      // ถ้าเลือกอยู่แล้ว ให้เอาออก (Deselect)
      this.selectedFloorIds = this.selectedFloorIds.filter(id => id !== floor.id);
    } else {
      // Logic: เลือกได้ทีละชั้น (สำหรับ Split View จะดีกว่า)
      // แต่ถ้าอยากเลือกหลายชั้น ให้ใช้ .push แทนบรรทัดล่าง
      this.selectedFloorIds.push(floor.id);
    }
    
    this.clearAllZones(); // เคลียร์โซนที่เลือกตอนเปลี่ยนชั้น
    this.updateDisplayZones(); // อัปเดตรายการโซนฝั่งขวา
  }

  // ฟังก์ชันดึงโซนจาก floorData มาใส่ displayZones
updateDisplayZones() {
    // 1. สร้าง Map เพื่อใช้จำว่าโซนชื่อนี้ถูกเก็บไว้หรือยัง
    const zoneMap = new Map<string, AggregatedZone>();

    // 2. วนลูปทุกชั้นที่ถูกเลือก
    this.selectedFloorIds.forEach(floorId => {
      const floor = this.floorData.find(f => f.id === floorId);
      
      if (floor && floor.zones) {
        floor.zones.forEach(z => {
          // 3. เช็คว่ามีโซนชื่อนี้ในตะกร้าหรือยัง?
          if (zoneMap.has(z.name)) {
            // CASE A: มีแล้ว -> ให้ "บวกยอดเพิ่ม"
            const existing = zoneMap.get(z.name)!;
            existing.available += z.available;
            existing.capacity += z.capacity;
            existing.floorIds.push(floorId);
            existing.ids.push(...z.rawIds); // รวม ID ของโซนย่อย
            
            // อัปเดตสถานะ (ถ้าผลรวมยังว่างอยู่ ก็ให้ available)
            existing.status = existing.available > 0 ? 'available' : 'full';

          } else {
            // CASE B: ยังไม่มี -> "สร้างใหม่"
            zoneMap.set(z.name, {
              name: z.name,
              available: z.available,
              capacity: z.capacity,
              status: z.status,
              floorIds: [floorId],
              ids: [...z.rawIds] // copy array
            });
          }
        });
      }
    });

    // 4. แปลงจาก Map กลับเป็น Array เพื่อเอาไปโชว์
    this.displayZones = Array.from(zoneMap.values());

    // (Optional) เรียงลำดับชื่อโซน A->Z เพื่อความสวยงาม
    this.displayZones.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ปุ่ม Select All Floors (ฝั่งซ้าย)
  selectAllFloors() {
    this.selectedFloorIds = this.floorData.map(f => f.id);
    this.clearAllZones();
    this.updateDisplayZones();
  }

  clearAllFloors() {
    this.selectedFloorIds = [];
    this.displayZones = [];
    this.clearAllZones();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.clearAllZones();
    this.selectedFloorIds = []; // รีเซ็ตชั้นเมื่อเปลี่ยนประเภทรถ
    this.fetchParkingDetails(); // ยิง API ใหม่เพราะประเภทรถเปลี่ยน -> ที่ว่างเปลี่ยน
    this.closePopovers();
  }

  selectSite(site: ParkingLot) {
    this.lot = site;
    this.selectedFloorIds = [];
    this.clearAllZones();
    this.fetchParkingDetails(); // ยิง API ใหม่สำหรับตึกใหม่
    this.closePopovers();
  }

  // --- Logic เดิม ไม่ต้องเปลี่ยนมาก ---

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
    const selectedFloorNames = this.floorData
        .filter(f => this.selectedFloorIds.includes(f.id))
        .map(f => f.name).join(',');

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

  dismiss() { this.modalCtrl.dismiss(); }
}