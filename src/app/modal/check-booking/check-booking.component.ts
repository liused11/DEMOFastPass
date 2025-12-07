import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

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

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.calculateDuration();
    
    // Convert string to array if necessary (fallback)
    if (!this.data.selectedFloors) this.data.selectedFloors = [];
    if (!this.data.selectedZones) this.data.selectedZones = [];
    
    // ถ้ามาเป็น string หรือ any ให้แปลง (กรณีรับมาจากหน้าอื่นที่ไม่ใช่ reservation)
    if (typeof this.data.selectedFloors === 'string') {
        this.data.selectedFloors = this.data.selectedFloors === 'any' ? [...this.floors] : [this.data.selectedFloors];
    }
    if (typeof this.data.selectedZones === 'string') {
        this.data.selectedZones = this.data.selectedZones === 'any' ? [...this.availableZones] : [this.data.selectedZones];
    }
  }

  isNextDay(start: any, end: any): boolean {
    if (!start || !end) return false;
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    return e.getTime() > s.getTime();
  }

  calculateDuration() {
    if (this.data?.startSlot?.dateTime && this.data?.endSlot?.dateTime) {
      const start = this.data.startSlot.dateTime.getTime();
      const end = this.data.endSlot.dateTime.getTime();
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

  dismiss() { this.modalCtrl.dismiss(); }
  
  confirm() { 
    this.modalCtrl.dismiss({ confirmed: true, data: this.data }, 'confirm'); 
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถยนต์ทั่วไป';
      case 'ev': return 'รถยนต์ EV';
      case 'motorcycle': return 'รถจักรยานยนต์';
      default: return type;
    }
  }

  // ✅ Multiple Choice Logic
  toggleFloor(floor: string) {
    const idx = this.data.selectedFloors.indexOf(floor);
    if (idx > -1) {
      this.data.selectedFloors.splice(idx, 1);
    } else {
      this.data.selectedFloors.push(floor);
    }
    // Prevent empty selection
    if (this.data.selectedFloors.length === 0) {
        this.data.selectedFloors.push(floor);
    }
  }

  toggleSelectAllFloors() {
    if (this.isAllFloorsSelected()) {
        this.data.selectedFloors = [];
    } else {
        this.data.selectedFloors = [...this.floors];
    }
  }

  isFloorSelected(floor: string): boolean {
    return this.data.selectedFloors.includes(floor);
  }
  
  isAllFloorsSelected(): boolean {
      return this.floors.every(f => this.data.selectedFloors.includes(f));
  }

  toggleZone(zone: string) {
    const idx = this.data.selectedZones.indexOf(zone);
    if (idx > -1) {
      this.data.selectedZones.splice(idx, 1);
    } else {
      this.data.selectedZones.push(zone);
    }
    if (this.data.selectedZones.length === 0) {
        this.data.selectedZones.push(zone);
    }
  }

  toggleSelectAllZones() {
    if (this.isAllZonesSelected()) {
        this.data.selectedZones = [];
    } else {
        this.data.selectedZones = [...this.availableZones];
    }
  }

  isZoneSelected(zone: string): boolean {
    return this.data.selectedZones.includes(zone);
  }

  isAllZonesSelected(): boolean {
      return this.availableZones.every(z => this.data.selectedZones.includes(z));
  }
}