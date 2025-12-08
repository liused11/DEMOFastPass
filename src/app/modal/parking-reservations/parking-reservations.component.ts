import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

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
  @Input() preSelectedFloor: string = '';
  @Input() preSelectedZone: string = '';
  mockSites = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)' },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)' },
    { id: 'moto_dorm', name: 'โรงจอดมอไซค์ หอพักชาย' },
    { id: 'eng_building', name: 'ตึกวิศวกรรมศาสตร์' }
  ];
  currentSiteName: string = '';
  isSpecificSlot: boolean = false; 

  selectedType: string = 'normal';
  selectedTypeText = 'รถทั่วไป';
  
  // ✅ เปลี่ยนเป็น Array สำหรับ Multiple Selection
  selectedFloorIds: string[] = [];
  selectedZoneNames: string[] = [];
  
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

  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) { }

  ngOnInit() {
    this.currentSiteName = this.lot?.name || 'Unknown';
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    // --- Init Floors ---
    if (this.lot?.floors && this.lot.floors.length > 0) {
      this.availableFloors = this.lot.floors;
    } else {
      this.availableFloors = ['Floor 1', 'Floor 2'];
    }
    
    // จัดการค่าเริ่มต้น Floor (Multiple Selection)
    if (this.preSelectedFloor && this.preSelectedFloor !== 'any') {
        const floors = this.preSelectedFloor.split(',');
        this.selectedFloorIds = floors.filter(f => this.availableFloors.includes(f));
        if (this.selectedFloorIds.length === 0) this.selectAllFloors();
    } else {
        this.selectAllFloors();
    }

    // --- Init Zones ---
    this.updateAvailableZones(); // สร้าง availableZones

    // ✅ 2. จัดการค่าเริ่มต้น Zone (Multiple Selection)
    if (this.preSelectedZone && this.preSelectedZone !== 'any') {
        const zones = this.preSelectedZone.split(',');
        this.selectedZoneNames = zones.filter(z => this.availableZones.includes(z));
        if (this.selectedZoneNames.length === 0) this.selectAllZones();
    } else {
        this.selectAllZones();
    }
    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(null, 'cancel'); }

  get currentAvailable(): number { return this.lot?.available?.[this.selectedType] || 0; }
  get currentCapacity(): number { return this.lot?.capacity?.[this.selectedType] || 0; }

  // ------------------------------------------------
  // ✅ Logic สำหรับ Multiple Selection (Floors)
  // ------------------------------------------------
  toggleFloor(floor: string) {
    if (this.selectedFloorIds.includes(floor)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(f => f !== floor);
    } else {
      this.selectedFloorIds.push(floor);
    }
    this.resetSelection();
    // ถ้าไม่มีชั้นไหนถูกเลือก ให้เลือกชั้นนั้นกลับคืนมา (บังคับเลือกอย่างน้อย 1)
    if (this.selectedFloorIds.length === 0) {
        this.selectedFloorIds.push(floor);
    }
    this.generateData();
  }

  selectAllFloors() {
    this.selectedFloorIds = [...this.availableFloors];
    this.resetSelection();
    this.generateData();
  }

  isFloorSelected(floor: string): boolean {
    return this.selectedFloorIds.includes(floor);
  }

  isAllFloorsSelected(): boolean {
    return this.selectedFloorIds.length === this.availableFloors.length;
  }

  getFloorDisplayText(): string {
    if (this.isAllFloorsSelected()) return 'ทุกชั้น';
    if (this.selectedFloorIds.length === 0) return 'เลือกชั้น';
    if (this.selectedFloorIds.length === 1) return this.selectedFloorIds[0];
    return `${this.selectedFloorIds.length} ชั้น`;
  }

  // ------------------------------------------------
  // ✅ Logic สำหรับ Multiple Selection (Zones)
  // ------------------------------------------------
  updateAvailableZones() {
    this.availableZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
  }

  toggleZone(zone: string) {
    if (this.selectedZoneNames.includes(zone)) {
      this.selectedZoneNames = this.selectedZoneNames.filter(z => z !== zone);
    } else {
      this.selectedZoneNames.push(zone);
    }
    this.resetSelection();
    if (this.selectedZoneNames.length === 0) {
        this.selectedZoneNames.push(zone);
    }
    this.generateData();
  }

  selectAllZones() {
    this.selectedZoneNames = [...this.availableZones];
    this.resetSelection();
    this.generateData();
  }

  isZoneSelected(zone: string): boolean {
    return this.selectedZoneNames.includes(zone);
  }

  isAllZonesSelected(): boolean {
    return this.selectedZoneNames.length === this.availableZones.length;
  }

  getZoneDisplayText(): string {
    if (this.isAllZonesSelected()) return 'ทุกโซน';
    if (this.selectedZoneNames.length === 0) return 'เลือกโซน';
    if (this.selectedZoneNames.length === 1) return this.selectedZoneNames[0];
    return `${this.selectedZoneNames.length} โซน`;
  }

  // ------------------------------------------------

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

  // ... (ส่วน Helper Functions: parseCronTime, checkDayInCron คงเดิม) ...
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
     this.displayDays = [];
     const today = new Date();
     const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
 
     for (let i = 0; i < 3; i++) {
       const targetDate = new Date(today);
       targetDate.setDate(today.getDate() + i);
       const dateLabel = `${thaiDays[targetDate.getDay()]} ${targetDate.getDate()}`; 
 
       // คำนวณ Capacity ตามสัดส่วนชั้นที่เลือก
       let dailyCapacity = this.currentCapacity;
       if (this.availableFloors.length > 0) {
          const ratio = this.selectedFloorIds.length / this.availableFloors.length;
          dailyCapacity = Math.ceil(dailyCapacity * ratio);
       }

       let dailyAvailable = 0;
       if (i === 0) {
         dailyAvailable = Math.min(this.currentAvailable, dailyCapacity); 
       } else {
         dailyAvailable = Math.floor(dailyCapacity * (0.8 + Math.random() * 0.2));
       }
 
       // ... (Logic เวลาเปิดปิด คงเดิม) ...
       let startH = 0, startM = 0;
       let endH = 23, endM = 59;
       let isOpen = false;
       let timeLabel = 'ปิดบริการ';
       
       if (this.lot?.schedule && this.lot.schedule.length > 0) {
         const activeSch = this.lot.schedule.find((s: any) => this.checkDayInCron(targetDate, s.cron.open));
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
           date: targetDate, dateLabel: dateLabel, timeLabel: 'ปิดบริการ',
           slots: [], available: 0, capacity: dailyCapacity
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
         let remaining = 0;
         if (!isPast) {
             const isFull = Math.random() > chance;
             if (!isFull) {
                 remaining = Math.floor(Math.random() * dailyCapacity) + 1;
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
         date: targetDate, dateLabel: dateLabel, timeLabel: timeLabel,
         slots: slots, available: dailyAvailable, capacity: dailyCapacity
       });
     }
     this.updateSelectionUI();
  }

  // ... (Logic การเลือก TimeSlot คงเดิม) ...
  private getAllSlotsFlattened(): TimeSlot[] {
    return this.displayDays.reduce((acc, day) => acc.concat(day.slots), [] as TimeSlot[]);
  }

  isRangeValid(start: TimeSlot, end: TimeSlot): boolean {
    const allSlots = this.getAllSlotsFlattened();
    const startIndex = allSlots.findIndex(s => s.id === start.id);
    const endIndex = allSlots.findIndex(s => s.id === end.id);
    if (startIndex === -1 || endIndex === -1) return false;
    for (let i = startIndex; i <= endIndex; i++) {
      if (!allSlots[i].isAvailable) return false;
    }
    return true;
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;
    if (!this.startSlot || (this.startSlot && this.endSlot)) {
      this.startSlot = slot;
      this.endSlot = null;
      this.updateSelectionUI();
      return;
    }
    if (slot.id === this.startSlot.id) return;
    if (slot.dateTime < this.startSlot.dateTime) {
      this.startSlot = slot;
      this.endSlot = null;
      this.updateSelectionUI();
      return;
    }
    if (this.isRangeValid(this.startSlot, slot)) {
      this.endSlot = slot;
    } else {
      this.presentToast('ไม่สามารถเลือกช่วงเวลาที่มีรอบเต็มคั่นอยู่ได้');
      this.startSlot = slot;
      this.endSlot = null;
    }
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        s.isSelected = (!!this.startSlot && s.id === this.startSlot.id) || (!!this.endSlot && s.id === this.endSlot.id);
        s.isInRange = (!!this.startSlot && !!this.endSlot) && (s.dateTime > this.startSlot.dateTime && s.dateTime < this.endSlot.dateTime);
      });
    });
  }

  resetSelection() { this.startSlot = null; this.endSlot = null; }
  pad(n: number) { return n < 10 ? '0' + n : n; }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'danger', position: 'top',
    });
    toast.present();
  }

  async confirmBooking() {
    if (this.selectedFloorIds.length === 0 || this.selectedZoneNames.length === 0) {
        this.presentToast('กรุณาเลือกอย่างน้อย 1 ชั้นและ 1 โซน');
        return;
    }

    // ✅ ส่งข้อมูลเป็น Array ของ Strings
    const data = {
      siteName: this.currentSiteName,
      selectedType: this.selectedType,
      selectedFloors: this.selectedFloorIds, // ส่ง Array
      selectedZones: this.selectedZoneNames, // ส่ง Array
      startSlot: this.startSlot,
      endSlot: this.endSlot,
      isSpecificSlot: this.isSpecificSlot
    };

    try {
      if (this.isSpecificSlot) {
          // กรณีระบุช่องจอด (ยังใช้ logic เดิมที่เลือก 1 ช่อง)
          const modal = await this.modalCtrl.create({
            component: BookingSlotComponent,
            componentProps: { data: {
                ...data, 
                // แปลงเป็น string เดียวสำหรับหน้าเลือกช่อง (หรือจะปรับหน้า BookingSlot ให้รับ array ก็ได้)
                selectedFloor: this.selectedFloorIds[0], 
                selectedZone: this.selectedZoneNames[0]
            }},
            // ...
          });
          await modal.present();
          await modal.onDidDismiss(); 
      } else {
          // กรณี Auto Assign (Multiple Choice)
          const modal = await this.modalCtrl.create({
            component: CheckBookingComponent,
            componentProps: { data },
            initialBreakpoint: 1,
            breakpoints: [0, 0.5, 1],
            backdropDismiss: true,
            cssClass: 'detail-sheet-modal',
          });
          await modal.present();
          await modal.onDidDismiss();
      }
    } catch (err) {
      console.error('Error showing booking modal', err);
    }
  }
}