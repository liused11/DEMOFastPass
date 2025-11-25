import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ParkingLot, ScheduleItem } from 'src/app/tab1/tab1.page';
import { ParkingReservationsComponent } from '../parking-reservations/parking-reservations.component';


interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
}

@Component({
  selector: 'app-parking-detail',
  templateUrl: './parking-detail.component.html',
  styleUrls: ['./parking-detail.component.scss'],
  standalone: false
})
export class ParkingDetailComponent implements OnInit {

  @Input() lot!: ParkingLot;
  @Input() initialType: string = 'normal'; // รับค่าจากหน้าแรก

  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  lastReservedDate: string | null = null;
  lastReservedStartTime: string | null = null;
  lastReservedEndTime: string | null = null;

  selectedType = 'normal';
  selectedFloor: string = 'Floor 1'; // Default
  
  filterStartHour: string = '08:00';
  filterEndHour: string = '20:00';
  hourOptions: string[] = [];
  
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    // ตั้งค่าเริ่มต้นตามที่ส่งมาจากหน้าแรก (ถ้าสถานที่รองรับ)
    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    }

    // ตั้งค่าเริ่มต้นชั้น
    if (!this.lot.floors || this.lot.floors.length === 0) {
      this.lot.floors = ['Floor 1', 'Floor 2'];
    }
    this.selectedFloor = this.lot.floors[0];

    // ✅ 2. สร้างตัวเลือกเวลา 00:00 - 23:00
    this.hourOptions = Array.from({ length: 24 }, (_, i) => this.pad(i) + ':00');
    
    // Mock ชั้นถ้าไม่มีในข้อมูล
    if (!this.lot.floors || this.lot.floors.length === 0) {
      this.lot.floors = ['Floor 1', 'Floor 2'];
    }
    this.selectedFloor = this.lot.floors[0];
    this.checkOpenStatus();
    this.generateWeeklySchedule();
  }
  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }
  dismiss() {
    this.modalCtrl.dismiss();
  }

  checkOpenStatus() {
    // เช็คคร่าวๆ ว่าสถานะเป็นอย่างไรเพื่อแสดงสี
    this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low';
  }

  async Reservations(lot: ParkingLot) {
    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: { 
        lot: lot,
        preSelectedType: this.selectedType,
        preSelectedFloor: this.selectedFloor,
        // ส่งค่าอื่นๆ ถ้ามี
      },
      // ... breakpoints config ...
      initialBreakpoint: 1, // เปิดเกือบเต็มจอเพื่อให้เห็นข้อมูลครบ
      breakpoints: [0, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();

    // ⭐ ดักจับเมื่อ Modal ถูกปิด (ส่วนที่ต้องแก้ไข)
    const { data, role } = await modal.onWillDismiss();

    if (role === 'booking' && data) {
      // -------------------------------------------------------
      // ✅ FIX: รับค่าแบบใหม่ (startSlot, endSlot) แทนแบบเก่า
      // -------------------------------------------------------
      const { startSlot, endSlot, selectedZone, selectedFloor } = data;

      if (startSlot && endSlot) {
        // แปลง Date Object เป็น String เพื่อเก็บค่า (YYYY-MM-DD)
        // ต้องใช้ new Date() ครอบกันเหนียวเผื่อถูก serialize เป็น string มา
        this.lastReservedDate = new Date(startSlot.dateTime).toISOString().split('T')[0]; 
        
        // เก็บเวลาเริ่ม-จบ
        this.lastReservedStartTime = startSlot.timeText;
        this.lastReservedEndTime = endSlot.timeText;

        // (Optional) อัปเดต Floor/Zone ที่เลือกกลับมาด้วยถ้าต้องการ
        this.selectedFloor = selectedFloor;
        // this.selectedZone = selectedZone; // ถ้ามีตัวแปรรับ

        console.log('✅ Booking Confirmed:');
        console.log(`Date: ${this.lastReservedDate}`);
        console.log(`Time: ${this.lastReservedStartTime} - ${this.lastReservedEndTime}`);
        console.log(`Location: ${selectedFloor} ${selectedZone ? '(' + selectedZone + ')' : ''}`);
      }
    }
  }

  // ✅ ฟังก์ชันแปลง Cron เป็นตารางเวลา 7 วัน
  generateWeeklySchedule() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

    const todayIndex = new Date().getDay();

    this.weeklySchedule = days.map((dayEng, index) => {
      let timeText = 'ปิด'; // Default คือปิด

      // ถ้าไม่มี Schedule เลย ให้ถือว่าเปิด 24 ชม.
      if (!this.lot.schedule || this.lot.schedule.length === 0) {
        timeText = '00:00 - 24:00';
      } else {
        // หา Schedule ที่ active ในวันนี้
        const activeSch = this.lot.schedule.find(s => s.days.includes(dayEng.toLowerCase()));
        if (activeSch) {
          timeText = `${activeSch.open_time} - ${activeSch.close_time}`;
        }
      }

      return {
        dayName: thaiDays[index],
        timeRange: timeText,
        isToday: index === todayIndex
      };
    });
  }
  getCurrentCapacity() {
    // @ts-ignore
    return this.lot.capacity[this.selectedType] || 0;
  }
  
  getCurrentAvailable() {
    // @ts-ignore
    return this.lot.available[this.selectedType] || 0;
  }

  
}