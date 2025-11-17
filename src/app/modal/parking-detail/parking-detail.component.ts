import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ParkingLot , ScheduleItem} from 'src/app/tab1/tab1.page';


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
  
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.checkOpenStatus();
    this.generateWeeklySchedule();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  checkOpenStatus() {
    // เช็คคร่าวๆ ว่าสถานะเป็นอย่างไรเพื่อแสดงสี
    this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low';
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
}