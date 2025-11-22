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

  // --- ✅ Logic การ Filter ---
  applyFilter() {
    if (!this.allDbSlots.length) return;

    const fStart = parseInt(this.filterStartHour.replace(':', ''), 10);
    const fEnd = parseInt(this.filterEndHour.replace(':', ''), 10);

    this.displayedSlots = this.allDbSlots.filter(slot => {
      // ข้าม slot ที่เป็นตัวจบ (end-marker) ให้แสดงเสมอ หรือจัดการแยก
      if (slot.slotId === 'end-marker') {
         const timeVal = parseInt(slot.timeText.replace(':', ''), 10);
         return timeVal <= fEnd && timeVal >= fStart;
      }

      const timeVal = parseInt(slot.timeText.replace(':', ''), 10);
      // แสดง Slot ที่เวลา >= filterStart และ < filterEnd
      return timeVal >= fStart && timeVal < fEnd;
    });
  }

  // --- Logic การเลือก (เหมือนเดิม) ---
  onTimeSlotClick(time: string) {
    const timeVal = parseInt(time.replace(':', ''), 10);

    if (this.selecting === 'start') {
      this.startTime = time;
      this.endTime = null;
      this.selecting = 'end';
    } else {
      if (!this.startTime) {
        this.startTime = time;
        return;
      }
      const startVal = parseInt(this.startTime.replace(':', ''), 10);
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
    const t = parseInt(time.replace(':', ''), 10);
    const s = parseInt(this.startTime.replace(':', ''), 10);
    const e = parseInt(this.endTime.replace(':', ''), 10);
    return t > s && t < e; 
  }

  // --- Generate Mock Data ---
  // ---------------------------------------------------
  // 🛠️ Mock Data Generation (ตาม Structure ที่ให้มา)
  // ---------------------------------------------------
  generateMockData() {
    this.allDbSlots = []; // Reset ข้อมูลดิบ
    let totalCap = 52; 
    if (this.selectedType === 'ev') totalCap = 20;
    if (this.selectedType === 'motorcycle') totalCap = 30;

    // สร้างข้อมูลดิบตลอดทั้งวัน (หรือตามเวลาทำการ)
    const startHour = 6; // สร้างเผื่อไว้ตั้งแต่เช้า
    const endHour = 22;  // ถึงดึก

    for (let i = startHour; i < endHour; i++) {
      const hourStart = this.pad(i) + ':00';
      const hourEnd = this.pad(i + 1) + ':00';
      
      const booked = Math.floor(Math.random() * (totalCap / 3)); 
      const remaining = totalCap - booked;

      // ✅ แก้ไข: ลบ displayText ที่ซ้ำออก และใส่ timeText เข้าไปเลย (ใช้ as any เพื่อข้าม Type check ชั่วคราว)
      const slot: any = {
        slotId: `S-${this.selectedType}-${this.selectedFloor}-${hourStart}`,
        startTime: `${this.selectedDate.split('T')[0]}T${hourStart}:00.000Z`,
        endTime: `${this.selectedDate.split('T')[0]}T${hourEnd}:00.000Z`,
        displayText: `${hourStart} - ${hourEnd}`, // มีตัวเดียวแล้วครับ
        isAvailable: remaining > 0,
        totalCapacity: totalCap,
        bookedCount: booked,
        remainingCount: remaining,
        timeText: hourStart // เพิ่มตรงนี้เลย
      };

      this.allDbSlots.push(slot);
    }
    
    // Slot สุดท้ายสำหรับ End Time
    const lastTime = this.pad(endHour) + ':00';
    
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
    if (!this.startTime) return this.displayedSlots.length > 0 ? this.displayedSlots[0].totalCapacity : 0;
    // หาจาก displayedSlots หรือ allDbSlots ก็ได้
    return this.allDbSlots.find(s => (s as any).timeText === this.startTime)?.remainingCount || 0;
  }

  getTotalCapacity() {
    return this.allDbSlots.length > 0 ? this.allDbSlots[0].totalCapacity : 0;
  }

  getDurationText() {
    if (!this.startTime || !this.endTime) return '';
    const s = parseInt(this.startTime.split(':')[0]);
    const e = parseInt(this.endTime.split(':')[0]);
    return `${e - s} ชั่วโมง`;
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