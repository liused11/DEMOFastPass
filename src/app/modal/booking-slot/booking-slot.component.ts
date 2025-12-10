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
  
  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3']; 
  zones: string[] = []; 
  
  selectedFloor: string = 'Floor 1';
  selectedZone: string = '';

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
        
        if (this.data.selectedFloors && this.data.selectedFloors !== 'any') {
             const floorsInput = Array.isArray(this.data.selectedFloors) 
              ? this.data.selectedFloors 
              : (typeof this.data.selectedFloors === 'string' ? this.data.selectedFloors.split(',') : []);
            
             if (floorsInput.length > 0) {
                 this.floors = [...floorsInput];
             }
        }

        if (this.data.selectedZones && this.data.selectedZones !== 'any') {
             const zonesInput = Array.isArray(this.data.selectedZones) 
              ? this.data.selectedZones 
              : (typeof this.data.selectedZones === 'string' ? this.data.selectedZones.split(',') : []);
             
             if (zonesInput.length > 0) {
                 this.allowedZones = [...zonesInput];
             }
        }

        if (this.data.selectedFloor && this.floors.includes(this.data.selectedFloor)) {
            this.selectedFloor = this.data.selectedFloor;
        } else if (this.floors.length > 0) {
            this.selectedFloor = this.floors[0];
        }
        
        this.updateZones();

        if (this.data.selectedZone && this.zones.includes(this.data.selectedZone)) {
            this.selectedZone = this.data.selectedZone;
        } else if (this.zones.length > 0) {
            this.selectedZone = this.zones[0]; // Default to 'All Zones' if it's the first one
        }
    }
    
    this.generateSlots();
    this.filterSlots();
  }

  updateZones() {
      const allZonesForFloor = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];
      
      let filteredZones = [];
      if (this.allowedZones.length > 0) {
          filteredZones = allZonesForFloor.filter(z => this.allowedZones.includes(z));
      } else {
          filteredZones = allZonesForFloor;
      }

      // ✅ เพิ่มตัวเลือก 'All Zones' ไว้ตำแหน่งแรกสุด
      this.zones = ['All Zones', ...filteredZones];

      // ถ้า selectedZone ปัจจุบันไม่อยู่ในรายการใหม่ ให้ reset ไปตัวแรก (All Zones)
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
      // ✅ ปรับ Logic: ถ้าเลือก 'All Zones' ให้แสดงเฉพาะโซนที่มีสิทธิ์เลือก (allowedZones)
      // หรือถ้าไม่ได้กำหนด allowedZones มา (allowedZones ว่าง) ถึงจะแสดงทั้งหมดจริงๆ
      this.visibleSlots = this.allSlots.filter(s => {
          const isFloorMatch = s.floor === this.selectedFloor;
          
          let isZoneMatch = false;
          if (this.selectedZone === 'All Zones') {
              // เช็คว่าต้องกรองตามที่ส่งมาไหม
              if (this.allowedZones.length > 0) {
                  isZoneMatch = this.allowedZones.includes(s.zone);
              } else {
                  isZoneMatch = true; // แสดงหมดถ้าไม่มีตัวกรอง
              }
          } else {
              // กรณีเลือกโซนเจาะจง
              isZoneMatch = s.zone === this.selectedZone;
          }

          return isFloorMatch && isZoneMatch;
      });

      // คงสถานะการเลือกไว้ (Logic เดิม)
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
    this.updateZones(); 
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
      selectedZone: this.selectedSlot.zone, // ✅ ส่ง Zone จริงของ Slot ที่เลือกกลับไป (ไม่ใช่ 'All Zones')
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