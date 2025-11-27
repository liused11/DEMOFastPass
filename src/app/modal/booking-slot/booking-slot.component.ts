import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

interface ParkingSlot {
  id: string;
  label: string;
  status: 'available' | 'booked' | 'selected';
  type?: string;
}

@Component({
  selector: 'app-booking-slot',
  templateUrl: './booking-slot.component.html',
  styleUrls: ['./booking-slot.component.scss'],
  standalone: false,
})
export class BookingSlotComponent implements OnInit {
  @Input() data: any;

  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3'];
  selectedFloor: string = 'Floor 1';
  
  // จำลองข้อมูลช่องจอด
  slots: ParkingSlot[] = [];
  selectedSlot: ParkingSlot | null = null;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.data?.selectedFloor && this.data.selectedFloor !== 'any') {
      this.selectedFloor = this.data.selectedFloor;
    }
    this.generateSlots();
  }

  generateSlots() {
    this.slots = [];
    const zones = ['A', 'B']; // ตัวอย่างโซน
    const totalSlotsPerZone = 12;

    zones.forEach(zone => {
      for (let i = 1; i <= totalSlotsPerZone; i++) {
        const isBooked = Math.random() < 0.3; // สุ่มสถานะไม่ว่าง 30%
        this.slots.push({
          id: `${this.selectedFloor}-${zone}${i}`,
          label: `${zone}${i.toString().padStart(2, '0')}`,
          status: isBooked ? 'booked' : 'available'
        });
      }
    });
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    this.selectedSlot = null; // รีเซ็ตการเลือกเมื่อเปลี่ยนชั้น
    this.generateSlots();
  }

  onSelectSlot(slot: ParkingSlot) {
    if (slot.status === 'booked') return;

    // ยกเลิกการเลือกอันเก่า
    if (this.selectedSlot) {
      this.selectedSlot.status = 'available';
    }

    // เลือกอันใหม่
    this.selectedSlot = slot;
    slot.status = 'selected';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async confirmSelection() {
    if (!this.selectedSlot) return;

    // อัปเดตข้อมูลเพื่อส่งต่อไปยังหน้า Check Booking
    const nextData = {
      ...this.data,
      selectedFloor: this.selectedFloor,
      selectedSlotId: this.selectedSlot.label,
      isSpecificSlot: true
    };

    // ปิดหน้านี้แล้วเปิด Check Booking
    // หรือจะซ้อน Modal ก็ได้ แต่วิธีนี้สะอาดกว่า
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