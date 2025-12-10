import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-check-booking',
  templateUrl: './check-booking.component.html',
  styleUrls: ['./check-booking.component.scss'],
  standalone: false,
})
export class CheckBookingComponent implements OnInit {
  @Input() data: any;

  durationText: string = '';

  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3'];
  availableZones: string[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
  
  assignedFloor: string = '';
  assignedZone: string = '';

  // ✅ เก็บข้อมูลจำลองที่สร้างขึ้น เพื่อให้จำนวนว่างคงที่และตรงกันตลอดการใช้งานหน้าต่างนี้
  parkingData: { [floor: string]: { [zone: string]: any[] } } = {};

  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) {}

  ngOnInit() {
    this.calculateDuration();
    
    if (!this.data.selectedFloors) this.data.selectedFloors = [];
    if (!this.data.selectedZones) this.data.selectedZones = [];
    
    if (typeof this.data.selectedFloors === 'string') {
        this.data.selectedFloors = this.data.selectedFloors === 'any' 
            ? [...this.floors] 
            : this.data.selectedFloors.split(',').map((s: string) => s.trim());
    }
    if (typeof this.data.selectedZones === 'string') {
        this.data.selectedZones = this.data.selectedZones === 'any' 
            ? [...this.availableZones] 
            : this.data.selectedZones.split(',').map((s: string) => s.trim());
    }

    if (this.data.selectedFloors.length > 0) {
        this.floors = [...this.data.selectedFloors];
    }
    if (this.data.selectedZones.length > 0) {
        this.availableZones = [...this.data.selectedZones];
    }

    // ✅ 1. สร้างข้อมูลจำลองเตรียมไว้ก่อน (Init Mock Data)
    this.initMockParkingData();

    if (this.data.isRandomSystem) {
        this.randomizeSlot();
    } else {
        this.assignedFloor = this.data.selectedFloor || (this.data.selectedFloors.length === 1 ? this.data.selectedFloors[0] : '');
        this.assignedZone = this.data.selectedZone || (this.data.selectedZones.length === 1 ? this.data.selectedZones[0] : '');
    }
  }

  // -------------------------------------------------------------
  // ✅ สร้างข้อมูลจำลอง (เพื่อให้ข้อมูล Consistent)
  // -------------------------------------------------------------
  initMockParkingData() {
    this.floors.forEach(floor => {
        this.parkingData[floor] = {};
        this.availableZones.forEach(zone => {
             const slots = [];
             const totalSlots = 12;
             for (let i = 1; i <= totalSlots; i++) {
                 // สุ่มสถานะว่าง/ไม่ว่าง
                 const isBooked = Math.random() < 0.3; 
                 if (!isBooked) {
                     slots.push({
                         i: i,
                         label: `${zone.replace('Zone ', '')}${i.toString().padStart(2, '0')}`
                     });
                 }
             }
             this.parkingData[floor][zone] = slots;
        });
    });
  }

  // ✅ ฟังก์ชันคำนวณจำนวนว่างของโซน (อิงตามชั้นที่เลือก)
  getZoneAvailability(zone: string): number {
    let total = 0;
    // วนลูปเฉพาะชั้นที่ถูกติ๊กเลือกอยู่
    this.data.selectedFloors.forEach((floor: string) => {
        if (this.parkingData[floor] && this.parkingData[floor][zone]) {
            total += this.parkingData[floor][zone].length;
        }
    });
    return total;
  }

  // -------------------------------------------------------------
  // Toggle & Selection Logic
  // -------------------------------------------------------------

  toggleFloor(floor: string) {
    const idx = this.data.selectedFloors.indexOf(floor);
    if (idx > -1) {
      this.data.selectedFloors.splice(idx, 1);
    } else {
      this.data.selectedFloors.push(floor);
    }
  }
  
  selectAllFloors() {
    this.data.selectedFloors = [...this.floors];
  }

  // ✅ เพิ่มฟังก์ชัน Clear Floors
  clearAllFloors() {
    this.data.selectedFloors = [];
  }
  
  isFloorSelected(floor: string): boolean {
    return this.data.selectedFloors.includes(floor);
  }

  isAllFloorsSelected(): boolean {
     return this.floors.length > 0 && this.floors.every(f => this.data.selectedFloors.includes(f));
  }

  toggleZone(zone: string) {
    const idx = this.data.selectedZones.indexOf(zone);
    if (idx > -1) {
      this.data.selectedZones.splice(idx, 1);
    } else {
      this.data.selectedZones.push(zone);
    }
  }

  selectAllZones() {
    this.data.selectedZones = [...this.availableZones];
  }

  // ✅ เพิ่มฟังก์ชัน Clear Zones
  clearAllZones() {
    this.data.selectedZones = [];
  }

  isZoneSelected(zone: string): boolean {
    return this.data.selectedZones.includes(zone);
  }

  isAllZonesSelected(): boolean {
     return this.availableZones.length > 0 && this.availableZones.every(z => this.data.selectedZones.includes(z));
  }

  // -------------------------------------------------------------
  // Random Logic (ปรับให้ใช้ parkingData ที่สร้างไว้แล้ว)
  // -------------------------------------------------------------
  randomizeSlot() {
      if (this.data.selectedFloors.length === 0 || this.data.selectedZones.length === 0) {
          this.presentToast('กรุณาเลือกชั้นและโซนอย่างน้อย 1 รายการเพื่อสุ่ม');
          this.data.selectedSlotId = null;
          this.assignedFloor = '';
          this.assignedZone = '';
          return;
      }

      const candidates: any[] = [];
      const floorsToRandom = this.data.selectedFloors; 
      const zonesToRandom = this.data.selectedZones;   

      floorsToRandom.forEach((floor: string) => {
          zonesToRandom.forEach((zone: string) => {
              // ✅ ดึงข้อมูลจาก mock ที่สร้างไว้ (แทนการสุ่มใหม่ทุกครั้ง)
              if (this.parkingData[floor] && this.parkingData[floor][zone]) {
                  const slots = this.parkingData[floor][zone];
                  candidates.push({
                      floor: floor,
                      zone: zone,
                      availableCount: slots.length,
                      availableSlots: slots
                  });
              }
          });
      });

      // Sort Priority: 1.ว่างสุด -> 2.ชื่อ Zone (A->Z) -> 3.ชื่อ Floor
      candidates.sort((a, b) => {
          const diff = b.availableCount - a.availableCount;
          if (diff !== 0) return diff;
          if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
          return a.floor.localeCompare(b.floor);
      });

      if (candidates.length > 0 && candidates[0].availableCount > 0) {
          const bestZone = candidates[0];
          // Clone array เพื่อไม่ให้กระทบ mock data หลักเวลา sort
          const sortedSlots = [...bestZone.availableSlots].sort((a: any, b: any) => a.i - b.i);
          const pickedSlot = sortedSlots[0];

          this.data.selectedSlotId = pickedSlot.label;
          this.assignedFloor = bestZone.floor;
          this.assignedZone = bestZone.zone;
          
          this.presentToast(`สุ่มได้: ${this.assignedFloor} - ${this.assignedZone} (${pickedSlot.label})`);
      } else {
          this.data.selectedSlotId = null;
          this.assignedFloor = 'เต็ม';
          this.assignedZone = 'เต็ม';
          this.presentToast('ไม่พบช่องจอดว่างในขอบเขตที่เลือก');
      }
  }

  // ... (Helper Functions เดิม: isNextDay, calculateDuration, presentToast, dismiss, confirm, getTypeName) ...
  isNextDay(start: any, end: any): boolean {
    if (!start || !end) return false;
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    return e.getTime() > s.getTime();
  }

  calculateDuration() {
    if (this.data?.startSlot?.dateTime && this.data?.endSlot?.dateTime) {
      const start = new Date(this.data.startSlot.dateTime).getTime();
      const end = new Date(this.data.endSlot.dateTime).getTime();
      const diffMs = end - start; 
      const diffHrs = Math.floor((diffMs / (1000 * 60 * 60)));
      const diffMins = Math.round(((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
      
      let durationStr = '';
      if (diffHrs > 0) durationStr += `${diffHrs} ชั่วโมง `;
      if (diffMins > 0) durationStr += `${diffMins} นาที`;
      if (diffMs === 0) durationStr = '1 ชั่วโมง';

      this.durationText = durationStr || '1 ชั่วโมง';
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'dark', position: 'bottom',
    });
    toast.present();
  }

  dismiss() { 
      this.modalCtrl.dismiss(); 
  }
  
  confirm() { 
    const finalData = {
        ...this.data,
        selectedFloors: [this.assignedFloor],
        selectedZones: [this.assignedZone]
    };
    this.modalCtrl.dismiss({ confirmed: true, data: finalData }, 'confirm'); 
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถยนต์ทั่วไป';
      case 'ev': return 'รถยนต์ EV';
      case 'motorcycle': return 'รถจักรยานยนต์';
      default: return type;
    }
  }
}