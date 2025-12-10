import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

interface ParkingSlot {
  id: string;
  label: string;
  status: 'available' | 'booked' | 'selected';
  type?: string;
  floor: string;
  zone: string;
}

@Component({
  selector: 'app-booking-slot',
  templateUrl: './booking-slot.component.html',
  styleUrls: ['./booking-slot.component.scss'],
  standalone: false,
})
export class BookingSlotComponent implements OnInit {
  @Input() data: any;

  siteName: string = '';
  timeString: string = '';
  
  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3']; // Default
  zones: string[] = []; 
  
  selectedFloor: string = 'Floor 1';
  selectedZone: string = '';

  // ตัวแปรสำหรับเก็บรายการโซนที่อนุญาตให้เลือก (Filter)
  allowedZones: string[] = [];

  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 2': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 3': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
  };
  
  allSlots: ParkingSlot[] = [];
  visibleSlots: ParkingSlot[] = [];
  selectedSlot: ParkingSlot | null = null;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.data) {
        this.siteName = this.data.siteName || 'Unknown Site';
        if (this.data.startSlot && this.data.endSlot) {
            this.timeString = `${this.data.startSlot.timeText} - ${this.data.endSlot.timeText}`;
        }
        
        // -----------------------------------------------------------
        // ✅ 1. กรอง Floors ตามที่ส่งมา (เหมือน CheckBooking)
        // -----------------------------------------------------------
        if (this.data.selectedFloors && this.data.selectedFloors !== 'any') {
             const floorsInput = Array.isArray(this.data.selectedFloors) 
              ? this.data.selectedFloors 
              : (typeof this.data.selectedFloors === 'string' ? this.data.selectedFloors.split(',') : []);
            
             if (floorsInput.length > 0) {
                 this.floors = [...floorsInput];
             }
        }

        // -----------------------------------------------------------
        // ✅ 2. เก็บรายการ Zones ที่ส่งมาไว้ใช้กรอง
        // -----------------------------------------------------------
        if (this.data.selectedZones && this.data.selectedZones !== 'any') {
             const zonesInput = Array.isArray(this.data.selectedZones) 
              ? this.data.selectedZones 
              : (typeof this.data.selectedZones === 'string' ? this.data.selectedZones.split(',') : []);
             
             if (zonesInput.length > 0) {
                 this.allowedZones = [...zonesInput];
             }
        }

        // -----------------------------------------------------------
        // ✅ 3. ตั้งค่า Selected Floor เริ่มต้น (ต้องอยู่ใน list ที่กรองแล้ว)
        // -----------------------------------------------------------
        // พยายามใช้ค่าเดิมที่ส่งมาแบบเจาะจงก่อน (ถ้ามี)
        if (this.data.selectedFloor && this.floors.includes(this.data.selectedFloor)) {
            this.selectedFloor = this.data.selectedFloor;
        } else if (this.floors.length > 0) {
            // ถ้าไม่มี หรือค่าเดิมไม่อยู่ใน list ให้เลือกตัวแรกสุด
            this.selectedFloor = this.floors[0];
        }
        
        // อัปเดตรายการ Zones (ซึ่งจะถูกกรองโดย allowedZones)
        this.updateZones();

        // -----------------------------------------------------------
        // ✅ 4. ตั้งค่า Selected Zone เริ่มต้น
        // -----------------------------------------------------------
        if (this.data.selectedZone && this.zones.includes(this.data.selectedZone)) {
            this.selectedZone = this.data.selectedZone;
        } else if (this.zones.length > 0) {
            this.selectedZone = this.zones[0];
        }
    }
    
    this.generateSlots();
    this.filterSlots();
  }

  updateZones() {
      // ดึง Zone ทั้งหมดของชั้นนี้ตาม Config ปกติ
      const allZonesForFloor = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];
      
      // ✅ กรองเฉพาะ Zone ที่อยู่ใน allowedZones (ถ้ามีการกำหนดมา)
      if (this.allowedZones.length > 0) {
          this.zones = allZonesForFloor.filter(z => this.allowedZones.includes(z));
      } else {
          this.zones = allZonesForFloor;
      }

      // เช็คว่า selectedZone ปัจจุบันยัง valid ไหม ถ้าไม่ ให้เลือกตัวแรกใหม่
      if (!this.zones.includes(this.selectedZone) && this.zones.length > 0) {
          this.selectedZone = this.zones[0];
      }
  }

  get availableCount(): number {
      return this.visibleSlots.filter(s => s.status === 'available' || (s.status === 'selected' && s.id === this.selectedSlot?.id)).length;
  }

  generateSlots() {
    this.allSlots = [];
    Object.keys(this.zonesMap).forEach(floor => {
        const floorZones = this.zonesMap[floor];
        floorZones.forEach(zone => {
            const totalSlotsPerZone = 12; 
            for (let i = 1; i <= totalSlotsPerZone; i++) {
                const isBooked = Math.random() < 0.3; 
                this.allSlots.push({
                  id: `${floor}-${zone}-${i}`,
                  label: `${zone.replace('Zone ', '')}${i.toString().padStart(2, '0')}`,
                  status: isBooked ? 'booked' : 'available',
                  floor: floor,
                  zone: zone,
                });
            }
        });
    });
  }

  filterSlots() {
      this.visibleSlots = this.allSlots.filter(s => s.floor === this.selectedFloor && s.zone === this.selectedZone);
      this.visibleSlots.forEach(s => {
          if (this.selectedSlot && s.id === this.selectedSlot.id) {
              s.status = 'selected';
          } else if (s.status === 'selected') { 
              s.status = 'available';
          }
      });
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    this.updateZones(); // เรียก updateZones เพื่อรีโหลดรายการโซนของชั้นใหม่ (และกรองตาม allowedZones)
    this.filterSlots();
  }

  selectZone(zone: string) {
      this.selectedZone = zone;
      this.filterSlots();
  }

  onSelectSlot(slot: ParkingSlot) {
    if (slot.status === 'booked') return;

    if (this.selectedSlot && this.selectedSlot.id !== slot.id) {
      const oldSlotInAll = this.allSlots.find(s => s.id === this.selectedSlot?.id);
      if (oldSlotInAll) oldSlotInAll.status = 'available';
      
      const oldSlotInVisible = this.visibleSlots.find(s => s.id === this.selectedSlot?.id);
      if (oldSlotInVisible) oldSlotInVisible.status = 'available';
    }

    this.selectedSlot = slot;
    const newSlotInAll = this.allSlots.find(s => s.id === slot.id);
    if (newSlotInAll) newSlotInAll.status = 'selected';
    
    slot.status = 'selected';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async confirmSelection() {
    if (!this.selectedSlot) return;

    const nextData = {
      ...this.data,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedZone, 
      selectedSlotId: this.selectedSlot.label,
      isSpecificSlot: true
    };

    this.modalCtrl.dismiss(); 
    
    const modal = await this.modalCtrl.create({
      component: CheckBookingComponent,
      componentProps: { data: nextData },
      initialBreakpoint: 1,
      breakpoints: [0, 0.5, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
  }
}