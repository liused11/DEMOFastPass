import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular'; // Import ToastController
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

// ... interfaces remain the same ...
interface DaySection {
  date: Date;
  dateLabel: string;
  timeLabel: string;
  slots: TimeSlot[];
  available: number;
  capacity: number;
}

interface TimeSlot {
  id: string;
  timeText: string;
  dateTime: Date;
  isAvailable: boolean;
  isSelected: boolean;
  isInRange: boolean;
  remaining: number;
}

@Component({
  selector: 'app-parking-reservations',
  templateUrl: './parking-reservations.component.html',
  styleUrls: ['./parking-reservations.component.scss'],
  standalone: false,
})
export class ParkingReservationsComponent implements OnInit {

  @Input() lot: any;
  @Input() preSelectedType: string = 'normal';
  @Input() preSelectedFloor: string = 'any';

  // ... properties remain the same ...
  mockSites = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)' },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)' },
    { id: 'moto_dorm', name: 'โรงจอดมอไซค์ หอพักชาย' },
    { id: 'eng_building', name: 'ตึกวิศวกรรมศาสตร์' }
  ];
  currentSiteName: string = '';

  isSpecificSlot: boolean = false; 

  selectedType: string = 'normal';
  selectedFloor: string = 'any';
  selectedZone: string = 'any';
  slotInterval: number = 60;

  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 2': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 3': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
  };
  availableFloors: string[] = [];
  availableZones: string[] = [];
  displayDays: DaySection[] = [];
  
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;
  selectedTypeText = 'รถทั่วไป';

  // Inject ToastController
  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) { }

  ngOnInit() {
    this.currentSiteName = this.lot?.name || 'Unknown';
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    if (this.lot?.floors && this.lot.floors.length > 0) {
      this.availableFloors = this.lot.floors;
    } else {
      this.availableFloors = ['Floor 1', 'Floor 2'];
    }
    
    this.selectedFloor = this.preSelectedFloor || 'any';
    this.updateAvailableZones(); // Initialize zones based on floor

    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(); }

  // ... getters remain the same ...
  get currentAvailable(): number { return this.lot?.available?.[this.selectedType] || 0; }
  get currentCapacity(): number { return this.lot?.capacity?.[this.selectedType] || 0; }

  // ... selectSite, selectType remain the same ...
  selectSite(site: any) {
    this.currentSiteName = site.name;
    this.resetSelection();
    const popover = document.querySelector('ion-popover#site-popover') as any;
    if(popover) popover.dismiss();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.updateTypeText();
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#type-popover') as any;
    if(popover) popover.dismiss();
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
   // Reset zone when floor changes this.selectedZone = 'any'; 
    this.updateAvailableZones();
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#floor-popover') as any;
    if(popover) popover.dismiss();
  }

  updateAvailableZones() {
    this.availableZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
  }

  selectZone(zone: string) {
    this.selectedZone = zone;
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#zone-popover') as any;
    if(popover) popover.dismiss();
  }

  // ... selectInterval, updateTypeText, parseCronTime, checkDayInCron, generateData, onSlotClick, updateSelectionUI, resetSelection remain the same ...
  
  selectInterval(minutes: number) {
    this.slotInterval = minutes;
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#interval-popover') as any;
    if(popover) popover.dismiss();
  }

  private updateTypeText() {
    if (this.selectedType === 'normal') this.selectedTypeText = 'รถทั่วไป';
    else if (this.selectedType === 'ev') this.selectedTypeText = 'EV';
    else this.selectedTypeText = 'มอเตอร์ไซค์';
  }

  private parseCronTime(cron: string): { h: number, m: number } {
    const parts = cron.split(' ');
    if (parts.length < 5) return { h: 0, m: 0 };
    return { h: parseInt(parts[1], 10), m: parseInt(parts[0], 10) };
  }

  private checkDayInCron(date: Date, cron: string): boolean {
    const parts = cron.split(' ');
    if (parts.length < 5) return false;
    const dayPart = parts[4];
    const currentDay = date.getDay();
    if (dayPart === '*') return true;
    const days = new Set<number>();
    const groups = dayPart.split(',');
    groups.forEach(g => {
      if (g.includes('-')) {
        const [start, end] = g.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) days.add(i % 7);
        }
      } else {
        days.add(Number(g) % 7);
      }
    });
    return days.has(currentDay);
  }

  generateData() {
     // ... (Keep existing logic from provided file) ...
     this.displayDays = [];
     const today = new Date();
     const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
 
     for (let i = 0; i < 3; i++) {
       const targetDate = new Date(today);
       targetDate.setDate(today.getDate() + i);
       
       const dateLabel = `${thaiDays[targetDate.getDay()]} ${targetDate.getDate()}`; 
 
       let dailyAvailable = 0;
       let dailyCapacity = this.currentCapacity;
 
       if (i === 0) {
         dailyAvailable = this.currentAvailable;
       } else {
         dailyAvailable = Math.floor(dailyCapacity * (0.8 + Math.random() * 0.2));
       }
 
       let startH = 0, startM = 0;
       let endH = 23, endM = 59;
       let isOpen = false;
       let timeLabel = 'ปิดบริการ';
 
       if (this.lot?.schedule && this.lot.schedule.length > 0) {
         const activeSch = this.lot.schedule.find((s: any) => 
           this.checkDayInCron(targetDate, s.cron.open)
         );
 
         if (activeSch) {
           isOpen = true;
           const openT = this.parseCronTime(activeSch.cron.open);
           const closeT = this.parseCronTime(activeSch.cron.close);
           startH = openT.h; startM = openT.m;
           endH = closeT.h; endM = closeT.m;
           timeLabel = `เปิด ${this.pad(startH)}.${this.pad(startM)} | ปิด ${this.pad(endH)}.${this.pad(endM)}`;
         }
       } else {
         isOpen = true;
         timeLabel = '24 ชั่วโมง';
       }
 
       if (!isOpen) {
         this.displayDays.push({
           date: targetDate,
           dateLabel: dateLabel,
           timeLabel: 'ปิดบริการ',
           slots: [],
           available: 0,
           capacity: dailyCapacity
         });
         continue;
       }
 
       const slots: TimeSlot[] = [];
       let currentBtnTime = new Date(targetDate);
       currentBtnTime.setHours(startH, startM, 0, 0);
       
       const endTime = new Date(targetDate);
       endTime.setHours(endH, endM, 0, 0);
 
       while (currentBtnTime <= endTime) {
         const timeStr = `${this.pad(currentBtnTime.getHours())}:${this.pad(currentBtnTime.getMinutes())}`;
         const isPast = currentBtnTime < new Date(); 
         
         let chance = 0.8;
         if (this.selectedFloor !== 'any') chance -= 0.1;
         
         let remaining = 0;
         if (!isPast) {
             const isFull = Math.random() > chance;
             if (!isFull) {
                 let max = dailyCapacity > 0 ? dailyCapacity : 20;
                 if (this.selectedFloor !== 'any') max = Math.ceil(max / 3);
                 remaining = Math.floor(Math.random() * max) + 1;
             }
         }
 
         slots.push({
           id: `${targetDate.toISOString()}-${timeStr}`,
           timeText: timeStr,
           dateTime: new Date(currentBtnTime),
           isAvailable: remaining > 0,
           remaining: remaining,
           isSelected: false,
           isInRange: false
         });
 
         currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
       }
 
       this.displayDays.push({
         date: targetDate,
         dateLabel: dateLabel,
         timeLabel: timeLabel,
         slots: slots,
         available: dailyAvailable,
         capacity: dailyCapacity
       });
     }
     this.updateSelectionUI();
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    if (!this.startSlot || (this.startSlot && this.endSlot)) {
      this.startSlot = slot;
      this.endSlot = null;
    } else {
      if (slot.dateTime > this.startSlot.dateTime) {
        this.endSlot = slot;
      } else {
        this.startSlot = slot;
        this.endSlot = null;
      }
    }
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        s.isSelected = (!!this.startSlot && s.id === this.startSlot.id) || 
                       (!!this.endSlot && s.id === this.endSlot.id);
        if (this.startSlot && this.endSlot) {
          s.isInRange = s.dateTime > this.startSlot.dateTime && s.dateTime < this.endSlot.dateTime;
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  resetSelection() {
    this.startSlot = null;
    this.endSlot = null;
  }

  pad(n: number) { return n < 10 ? '0' + n : n; }

  isNextDay(start: Date, end: Date): boolean {
    if (!start || !end) return false;
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    return e.getTime() > s.getTime();
  }

  async confirmBooking() {
    // Validation for specific slot
    if (this.isSpecificSlot) {
      if (this.selectedFloor === 'any' || this.selectedZone === 'any') {
        const toast = await this.toastCtrl.create({
          message: 'กรุณาระบุชั้นและโซนก่อนเลือกช่องจอด',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
        return;
      }
    }

    const data = {
      siteName: this.currentSiteName, // Pass site name
      selectedType: this.selectedType,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedZone,
      startSlot: this.startSlot,
      endSlot: this.endSlot,
      isSpecificSlot: this.isSpecificSlot
    };

    try {
      if (this.isSpecificSlot) {
        const modal = await this.modalCtrl.create({
          component: BookingSlotComponent,
          componentProps: { data },
          initialBreakpoint: 1,
          breakpoints: [0, 0.5, 1],
          backdropDismiss: true,
          cssClass: 'detail-sheet-modal',
        });
        await modal.present();
        const result = await modal.onDidDismiss();
        // Handle result if needed
      } else {
        const modal = await this.modalCtrl.create({
          component: CheckBookingComponent,
          componentProps: { data },
          initialBreakpoint: 1,
          breakpoints: [0, 0.5, 1],
          backdropDismiss: true,
          cssClass: 'detail-sheet-modal',
        });
        await modal.present();
        const result = await modal.onDidDismiss();
      }
    } catch (err) {
      console.error('Error showing booking modal', err);
    }
  }
}