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
  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 2': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 3': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
  };
  availableZones: string[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.calculateDuration();
    this.updateAvailableZones();
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

  // ✅ New Methods for Popover Selection
  selectFloor(floor: string) {
    this.data.selectedFloor = floor;
    if (floor === 'any') {
        this.data.selectedZone = 'any';
    } else {
        this.data.selectedZone = 'any'; 
    }
    this.updateAvailableZones();
    
    // Dismiss popover programmatically (Optional if dismissOnSelect is true)
    const popover = document.querySelector('ion-popover#cb-floor-popover') as any;
    if(popover) popover.dismiss();
  }

  selectZone(zone: string) {
    this.data.selectedZone = zone;
    const popover = document.querySelector('ion-popover#cb-zone-popover') as any;
    if(popover) popover.dismiss();
  }

  updateAvailableZones() {
    if (this.data.selectedFloor && this.data.selectedFloor !== 'any') {
      this.availableZones = this.zonesMap[this.data.selectedFloor] || [];
    } else {
      this.availableZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    }
  }
}