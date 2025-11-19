import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-parking-reservations',
  templateUrl: './parking-reservations.component.html',
  styleUrls: ['./parking-reservations.component.scss'],
  standalone: false,
})
export class ParkingReservationsComponent implements OnInit {

  availableTimes: string[] = [];
  selectedDate: string | null = null;

  startTime: string | null = null;
  endTime: string | null = null;

  selecting: 'start' | 'end' = 'start'; // โหมดการเลือก: 'start' หรือ 'end'
  isTimeSelectionComplete: boolean = false; // สถานะการเลือกเวลาครบถ้วน

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.availableTimes = this.generateTimes();
    // กำหนดวันที่เริ่มต้นเป็นวันนี้
    this.selectedDate = new Date().toISOString();
  }

  // เปลี่ยนโหมดการเลือก (ตามข้อ 4: สามารถแก้ไขโดยกดเลือกเวลาเริ่มต้นหรือเวลาสิ้นสุดได้)
  setSelecting(type: 'start' | 'end') {
    this.selecting = type;
    this.isTimeSelectionComplete = false; // อนุญาตให้เลือกต่อ
  }

  // เมื่อเลือกวันที่ใหม่ให้ reset เวลา
  onDateSelected() {
    this.startTime = null;
    this.endTime = null;
    this.selecting = 'start';
    this.isTimeSelectionComplete = false;
    this.availableTimes = this.generateTimes(); // เพื่ออัปเดตสถานะเวลาที่ผ่านมา
  }

  // สร้างเวลา 00:00-23:00
  generateTimes(): string[] {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
  }

  // ปิดการเลือกเวลาที่ผ่านมาแล้ว (ปรับให้ใช้ค่าวันที่จริงในการเปรียบเทียบ)
  isTimePast(time: string): boolean {
    if (!this.selectedDate) return true;

    const chosenDateOnly = new Date(this.selectedDate.split('T')[0]); // ได้วันที่เริ่มต้นของวันนั้น
    const now = new Date();
    const todayDateOnly = new Date(now.toISOString().split('T')[0]);

    // เปรียบเทียบเฉพาะวันที่
    if (chosenDateOnly.toDateString() !== todayDateOnly.toDateString()) {
      return false; // ถ้าไม่ใช่ "วันนี้" เลือกได้หมด
    }

    // ถ้าเป็น "วันนี้" ให้ปิดเวลาที่ผ่านมา
    const hour = Number(time.split(':')[0]);
    return hour < now.getHours(); // เปลี่ยนจาก <= เป็น < เพื่อให้สามารถเลือกชั่วโมงปัจจุบันได้
  }

  // กดเวลา (ตามข้อ 1, 2, 3)
  selectTime(time: string) {
    if (this.isTimeSelectionComplete) return; // ไม่ให้เลือกหากเสร็จสิ้นแล้ว

    const selectedHour = Number(time.split(':')[0]);

    if (this.selecting === 'start') {
      this.startTime = time;
      this.endTime = null; // reset end time เมื่อเลือก start ใหม่
      this.selecting = 'end';
      this.isTimeSelectionComplete = false;

    } else { // selecting === 'end'
      if (!this.startTime) return; // ต้องมี start time ก่อน

      const startHour = Number(this.startTime.split(':')[0]);

      if (selectedHour > startHour) { // เลือกสิ้นสุดต้องมากกว่าเริ่มต้น
        this.endTime = time;
        this.isTimeSelectionComplete = true; // เลือกครบถ้วน
        this.selecting = 'start'; // รีเซ็ตโหมดการเลือกเป็นเริ่มต้น (แต่ยังเลือกต่อไม่ได้เพราะ isTimeSelectionComplete เป็น true)
      } else {
        // หากเลือกเวลาสิ้นสุดน้อยกว่าหรือเท่ากับเริ่มต้น ให้เลือกเป็นเวลาเริ่มต้นใหม่
        this.startTime = time;
        this.endTime = null;
        this.selecting = 'end';
      }
    }
  }

  // ไฮไลท์ช่วงเวลา
  isInRange(time: string): boolean {
    if (!this.startTime) return false;

    const t = Number(time.split(':')[0]);
    const s = Number(this.startTime.split(':')[0]);

    if (!this.endTime) {
      // ไฮไลท์แค่เวลาเริ่มต้นเมื่อยังไม่ได้เลือกเวลาสิ้นสุด (ตามข้อ 1)
      return t === s;
    }

    const e = Number(this.endTime.split(':')[0]);

    // ไฮไลท์ช่วงรวมทั้งเริ่มต้นและสิ้นสุด (ตามข้อ 2, 3)
    return t >= s && t <= e;
  }

  // สีปุ่ม (เริ่มต้น = primary / สิ้นสุด = secondary / ในช่วง = default)
  getButtonColor(time: string) {
    if (time === this.startTime) return 'primary';
    if (time === this.endTime) return 'primary';
    if (this.isInRange(time)) return 'medium'; // สีสำหรับช่วงเวลาที่ถูกเลือก
    return 'primary'; // สีเริ่มต้นสำหรับปุ่มที่ยังไม่ถูกเลือก
  }

  // สถานะ Disabled สำหรับปุ่มเวลา (ตามข้อ 3)
  isTimeButtonDisabled(time: string): boolean {
    // ถูก disabled หากเป็นเวลาที่ผ่านมา หรือเลือกช่วงเวลาครบแล้ว และไม่ใช่เวลาเริ่มต้น/สิ้นสุด
    const isSpecialTime = time === this.startTime || time === this.endTime;

    // หากเลือกครบแล้ว (isTimeSelectionComplete = true) จะ disabled ทุกปุ่มยกเว้นปุ่มเริ่มต้น/สิ้นสุด
    if (this.isTimeSelectionComplete && !isSpecialTime) {
      return true;
    }

    // Disabled หากเป็นเวลาที่ผ่านมา
    return this.isTimePast(time);
  }


  dismiss() {
    this.modalCtrl.dismiss();
  }

  bookParking() {
    if (!this.selectedDate || !this.startTime || !this.endTime) return;

    // ⭐ ส่งข้อมูลกลับด้วย modal.dismiss()
    this.modalCtrl.dismiss({
      startTime: this.startTime,
      endTime: this.endTime,
      selectedDate: this.selectedDate // ส่งวันที่ที่เลือกกลับไปด้วย
    }, 'booking'); // ใช้ role 'booking' เพื่อให้หน้าหลักรู้ว่ามีการจองสำเร็จ

    // ลบ alert เดิมออก เพราะจะไปแสดงที่หน้าหลักแทน
    // alert(`จองสำเร็จ!\nวันที่: ${this.selectedDate!.split('T')[0]}\nเริ่ม: ${this.startTime}\nสิ้นสุด: ${this.endTime}`);
  }
}