import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

interface DaySection {
  date: Date;
  dateLabel: string;
  timeLabel: string;
  slots: TimeSlot[];
  // ✅ เพิ่ม 2 ค่านี้เพื่อเก็บสถานะของแต่ละวัน
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

  // ... (Properties & Constructor เหมือนเดิม) ...
  @Input() lot: any;
  @Input() preSelectedType: string = 'normal';
  @Input() preSelectedFloor: string = 'any';

  mockSites = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)' },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)' },
    { id: 'moto_dorm', name: 'โรงจอดมอไซค์ หอพักชาย' },
    { id: 'eng_building', name: 'ตึกวิศวกรรมศาสตร์' }
  ];
  currentSiteName: string = '';

  selectedType: string = 'normal';
  selectedFloor: string = 'any';
  selectedZone: string = 'any';
  slotInterval: number = 60;

  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C'],
    'Floor 2': ['Zone D', 'Zone E'],
    'Floor 3': ['Zone F']
  };
  availableFloors: string[] = [];
  availableZones: string[] = [];
  displayDays: DaySection[] = [];
  
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;
  selectedTypeText = 'รถทั่วไป';

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.currentSiteName = this.lot.name;
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    if (this.lot.floors && this.lot.floors.length > 0) {
      this.availableFloors = this.lot.floors;
    } else {
      this.availableFloors = ['Floor 1', 'Floor 2'];
    }
    
    this.selectedFloor = this.preSelectedFloor || 'any';
    this.updateAvailableZones();

    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(); }

  get currentAvailable(): number {
    return this.lot.available?.[this.selectedType] || 0;
  }

  get currentCapacity(): number {
    return this.lot.capacity?.[this.selectedType] || 0;
  }

  // ... (Selection Functions & Helpers เหมือนเดิม) ...
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
    this.selectedZone = 'any';
    this.updateAvailableZones();
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#floor-popover') as any;
    if(popover) popover.dismiss();
  }

  selectZone(zone: string) {
    this.selectedZone = zone;
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#zone-popover') as any;
    if(popover) popover.dismiss();
  }

  updateAvailableZones() {
    if (this.selectedFloor === 'any') {
      const allZones = new Set<string>();
      Object.values(this.zonesMap).forEach(zs => zs.forEach(z => allZones.add(z)));
      this.availableZones = Array.from(allZones).sort();
    } else {
      this.availableZones = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];
    }
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

  // --- Data Logic ---
  generateData() {
    this.displayDays = [];
    const today = new Date();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      const dateLabel = `${thaiDays[targetDate.getDay()]} ${targetDate.getDate()}`; 

      // คำนวณสถานะความจุ (Mock Logic)
      let dailyAvailable = 0;
      let dailyCapacity = this.currentCapacity;

      if (i === 0) {
        // ถ้าเป็นวันนี้ ให้ใช้ค่าจริงจาก Database (Mock)
        dailyAvailable = this.currentAvailable;
      } else {
        // ถ้าเป็นวันอนาคต ให้สมมติว่าว่างเยอะหน่อย (เช่น 80-100% ของความจุ)
        dailyAvailable = Math.floor(dailyCapacity * (0.8 + Math.random() * 0.2));
      }

      let startH = 0, startM = 0;
      let endH = 23, endM = 59;
      let isOpen = false;
      let timeLabel = 'ปิดบริการ';

      if (this.lot.schedule && this.lot.schedule.length > 0) {
        const activeSch = this.lot.schedule.find((s: any) => 
          this.checkDayInCron(targetDate, s.cron.open)
        );

        if (activeSch) {
          isOpen = true;
          const openT = this.parseCronTime(activeSch.cron.open);
          const closeT = this.parseCronTime(activeSch.cron.close);
          startH = openT.h; startM = openT.m;
          endH = closeT.h; endM = closeT.m;
          timeLabel = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
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
          available: 0, // ปิดก็คือ 0
          capacity: dailyCapacity
        });
        continue;
      }

      const slots: TimeSlot[] = [];
      let currentBtnTime = new Date(targetDate);
      currentBtnTime.setHours(startH, startM, 0, 0);
      
      const endTime = new Date(targetDate);
      endTime.setHours(endH, endM, 0, 0);

      while (currentBtnTime < endTime) {
        const timeStr = `${this.pad(currentBtnTime.getHours())}:${this.pad(currentBtnTime.getMinutes())}`;
        const isPast = currentBtnTime < new Date(); 
        
        let chance = 0.8;
        if (this.selectedFloor !== 'any') chance -= 0.1;
        if (dailyCapacity > 0 && (dailyAvailable / dailyCapacity) < 0.1) {
           chance = 0.3; 
        }

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
        // ✅ ใส่ค่าที่คำนวณได้ลงไป
        available: dailyAvailable,
        capacity: dailyCapacity
      });
    }
    this.updateSelectionUI();
  }

  // ... (onSlotClick, updateSelectionUI, resetSelection, pad, confirmBooking คงเดิม) ...
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

  confirmBooking() {
    this.modalCtrl.dismiss({
      selectedType: this.selectedType,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedZone,
      startSlot: this.startSlot,
      endSlot: this.endSlot
    }, 'booking');
  }
}