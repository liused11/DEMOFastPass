import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ParkingSlotDB } from 'src/app/tab1/tab1.page';

@Component({
  selector: 'app-parking-reservations',
  templateUrl: './parking-reservations.component.html',
  styleUrls: ['./parking-reservations.component.scss'],
  standalone: false,
})
export class ParkingReservationsComponent implements OnInit {

  @Input() lot: any;
  @Input() preSelectedType: string = 'normal';
  @Input() preSelectedFloor: string = 'Floor 1';

  @Input() preFilterStart: string = '08:00';
  @Input() preFilterEnd: string = '20:00';

  selectedType: string = 'normal';
  selectedFloor: string = 'Floor 1';
  selectedDate: string = new Date().toISOString();

  // ✅ New: Slot Interval (default 30 mins)
  slotInterval: number = 30;

  startTime: string | null = null;
  endTime: string | null = null;
  selecting: 'start' | 'end' = 'start';
  isTimeSelectionComplete = false;

  // ข้อมูลทั้งหมดจาก Mock Database
  allDbSlots: ParkingSlotDB[] = []; 
  // ข้อมูลที่จะแสดงผลใน Grid (หลังผ่าน Filter)
  displayedSlots: ParkingSlotDB[] = [];

  // ตัวแปรสำหรับ Filter
  filterStartHour: string = '08:00';
  filterEndHour: string = '20:00';
  hourOptions: string[] = []; // ตัวเลือกใน Dropdown

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    // รับค่าเริ่มต้น Type/Floor
    this.selectedType = this.preSelectedType;
    this.selectedFloor = this.preSelectedFloor;
    
    // ✅ รับค่าเริ่มต้น เวลา Filter
    if (this.preFilterStart) this.filterStartHour = this.preFilterStart;
    if (this.preFilterEnd) this.filterEndHour = this.preFilterEnd;
    
    // สร้าง hourOptions และ Mock Data
    this.hourOptions = Array.from({ length: 24 }, (_, i) => this.pad(i) + ':00');
    this.generateMockData();
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  dismiss() { this.modalCtrl.dismiss(); }

  onCriteriaChanged() {
    this.resetSelection();
    this.generateMockData();
  }

  // ✅ Handle Interval Change
  onIntervalChanged(val: any) {
    this.slotInterval = parseInt(val, 10);
    this.onCriteriaChanged();
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    this.onCriteriaChanged();
  }

  setSelecting(mode: 'start' | 'end') {
    this.selecting = mode;
    this.isTimeSelectionComplete = false;
    if (mode === 'start') this.endTime = null;
  }

  resetSelection() {
    this.startTime = null;
    this.endTime = null;
    this.selecting = 'start';
    this.isTimeSelectionComplete = false;
  }

  // ✅ Helper for Time Conversion
  timeStringToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // --- ✅ Logic การ Filter ---
  applyFilter() {
    if (!this.allDbSlots.length) return;

    const fStartVal = this.timeStringToMinutes(this.filterStartHour);
    const fEndVal = this.timeStringToMinutes(this.filterEndHour);

    this.displayedSlots = this.allDbSlots.filter(slot => {
      // ข้าม slot ที่เป็นตัวจบ (end-marker) ให้แสดงเสมอ หรือจัดการแยก
      if (slot.slotId === 'end-marker') {
         const timeVal = this.timeStringToMinutes(slot.timeText);
         return timeVal >= fStartVal && timeVal <= fEndVal;
      }

      const timeVal = this.timeStringToMinutes(slot.timeText);
      // แสดง Slot ที่เวลา >= filterStart และ < filterEnd
      return timeVal >= fStartVal && timeVal < fEndVal;
    });
  }

  // --- Logic การเลือก ---
  onTimeSlotClick(time: string) {
    const timeVal = this.timeStringToMinutes(time);

    if (this.selecting === 'start') {
      this.startTime = time;
      this.endTime = null;
      this.selecting = 'end';
    } else {
      if (!this.startTime) {
        this.startTime = time;
        return;
      }
      const startVal = this.timeStringToMinutes(this.startTime);
      
      // ถ้าเลือกเวลาเดิม หรือ เวลาก่อนหน้า -> รีเซ็ตเป็น Start ใหม่
      if (timeVal <= startVal) {
        this.startTime = time;
        this.endTime = null;
      } else {
        this.endTime = time;
        this.isTimeSelectionComplete = true;
        this.selecting = 'start';
      }
    }
  }

  isTimeSelected(time: string) {
    return time === this.startTime || time === this.endTime;
  }

  isInRange(time: string) {
    if (!this.startTime || !this.endTime) return false;
    const t = this.timeStringToMinutes(time);
    const s = this.timeStringToMinutes(this.startTime);
    const e = this.timeStringToMinutes(this.endTime);
    return t > s && t < e; 
  }

  // --- Generate Mock Data ---
  generateMockData() {
    this.allDbSlots = []; // Reset ข้อมูลดิบ
    let totalCap = 52; 
    if (this.selectedType === 'ev') totalCap = 20;
    if (this.selectedType === 'motorcycle') totalCap = 30;

    // สร้างข้อมูลดิบตลอดทั้งวัน (6:00 - 22:00)
    const startHour = 6; 
    const endHour = 22;  
    
    const startTimeMinutes = startHour * 60;
    const endTimeMinutes = endHour * 60;

    // ✅ Loop by minutes based on slotInterval
    for (let m = startTimeMinutes; m < endTimeMinutes; m += this.slotInterval) {
      
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeText = `${this.pad(h)}:${this.pad(min)}`;

      const nextM = m + this.slotInterval;
      const nextH = Math.floor(nextM / 60);
      const nextMin = nextM % 60;
      const endTimeText = `${this.pad(nextH)}:${this.pad(nextMin)}`;
      
      const booked = Math.floor(Math.random() * (totalCap / 3)); 
      const remaining = totalCap - booked;

      const slot: any = {
        slotId: `S-${this.selectedType}-${this.selectedFloor}-${timeText}`,
        startTime: `${this.selectedDate.split('T')[0]}T${timeText}:00.000Z`,
        endTime: `${this.selectedDate.split('T')[0]}T${endTimeText}:00.000Z`,
        displayText: `${timeText} - ${endTimeText}`,
        isAvailable: remaining > 0,
        totalCapacity: totalCap,
        bookedCount: booked,
        remainingCount: remaining,
        timeText: timeText
      };

      this.allDbSlots.push(slot);
    }
    
    // Slot สุดท้ายสำหรับ End Time
    const lastTime = `${this.pad(endHour)}:00`;
    
    const endSlot: any = {
        slotId: 'end-marker',
        startTime: '', 
        endTime: '', 
        displayText: '',
        isAvailable: true, 
        totalCapacity: 0, 
        bookedCount: 0, 
        remainingCount: 0,
        timeText: lastTime
    };
    
    this.allDbSlots.push(endSlot);

    // เรียก Filter ครั้งแรก
    this.applyFilter();
  }

  getAvailableCount() {
    if (!this.startTime) return this.displayedSlots.length > 0 && this.displayedSlots[0].slotId !== 'end-marker' ? this.displayedSlots[0].totalCapacity : 0;
    return this.allDbSlots.find(s => (s as any).timeText === this.startTime)?.remainingCount || 0;
  }

  getTotalCapacity() {
    return this.allDbSlots.length > 0 && this.allDbSlots[0].slotId !== 'end-marker' ? this.allDbSlots[0].totalCapacity : 0;
  }

  getDurationText() {
    if (!this.startTime || !this.endTime) return '';
    const s = this.timeStringToMinutes(this.startTime);
    const e = this.timeStringToMinutes(this.endTime);
    
    const diffMinutes = e - s;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    let text = '';
    if (hours > 0) text += `${hours} ชม. `;
    if (minutes > 0) text += `${minutes} นาที`;
    
    return text.trim();
  }

  confirmBooking() {
    this.modalCtrl.dismiss({
      selectedType: this.selectedType,
      selectedFloor: this.selectedFloor,
      startTime: this.startTime,
      endTime: this.endTime,
      date: this.selectedDate
    }, 'booking');
  }
}