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
  @Input() initialType: string = 'normal';

  mockSites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  lastReservedDate: string | null = null;
  lastReservedStartTime: string | null = null;
  lastReservedEndTime: string | null = null;

  selectedType = 'normal';
  selectedFloor: string = 'Floor 1';
  
  filterStartHour: string = '08:00';
  filterEndHour: string = '20:00';
  hourOptions: string[] = [];
  
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.mockSites = [
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        capacity: { normal: 200, ev: 20, motorcycle: 100 }, 
        available: { normal: 120, ev: 18, motorcycle: 50 },
        floors: ['Floor 1', 'Floor 2', 'Floor 3'],
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        supportedTypes: ['normal', 'ev', 'motorcycle'],
        schedule: [
          { days: [], open_time: '08:00', close_time: '20:00', cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' } },
          { days: [], open_time: '10:00', close_time: '16:00', cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' } }
        ]
      },
      {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        capacity: { normal: 0, ev: 10, motorcycle: 0 },
        available: { normal: 0, ev: 2, motorcycle: 0 },
        floors: ['G'],
        mapX: 300, mapY: 150,
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        supportedTypes: ['ev'],
        schedule: [{ days: [], open_time: '06:00', close_time: '22:00', cron: { open: '0 6 * * *', close: '0 22 * * *' } }]
      },
      {
        id: 'moto_dorm',
        name: 'โรงจอดมอไซค์ หอพักชาย',
        capacity: { normal: 0, ev: 0, motorcycle: 150 },
        available: { normal: 0, ev: 0, motorcycle: 5 },
        floors: ['Laney'],
        mapX: 120, mapY: 350,
        status: 'low',
        isBookmarked: false,
        distance: 800,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ. หอพัก',
        price: 100,
        priceUnit: 'เหมาจ่าย',
        supportedTypes: ['motorcycle'],
        schedule: []
      }
    ];

    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    } else if (this.lot.supportedTypes.length > 0) {
      this.selectedType = this.lot.supportedTypes[0];
    }

    if (!this.lot.floors || this.lot.floors.length === 0) {
      this.lot.floors = ['Floor 1', 'Floor 2'];
    }
    this.selectedFloor = this.lot.floors[0];

    this.hourOptions = Array.from({ length: 24 }, (_, i) => this.pad(i) + ':00');
    
    this.checkOpenStatus();
    this.generateWeeklySchedule();
  }

  selectSite(site: ParkingLot) {
    this.lot = site;
    
    if (!this.lot.supportedTypes.includes(this.selectedType)) {
        this.selectedType = this.lot.supportedTypes[0] || 'normal';
    }

    if (!this.lot.floors || this.lot.floors.length === 0) {
      this.lot.floors = ['Floor 1', 'Floor 2'];
    }
    this.selectedFloor = this.lot.floors[0];

    this.checkOpenStatus();
    this.generateWeeklySchedule();

    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if(popover) popover.dismiss();
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }
  dismiss() {
    this.modalCtrl.dismiss();
  }

  checkOpenStatus() {
    this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low';
  }

  async Reservations(lot: ParkingLot) {
    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: { 
        lot: lot,
        preSelectedType: this.selectedType,
        preSelectedFloor: this.selectedFloor,
      },
      initialBreakpoint: 1, 
      breakpoints: [0, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    // ✅ รับค่า role ที่ส่งกลับมา
    if (role === 'next-specific' && data) {
        console.log('➡️ ไปหน้าเลือกช่องจอด (Specific Slot)', data);
        // TODO: เรียก Modal เลือกช่องจอด
        
    } else if (role === 'next-random' && data) {
        console.log('➡️ ไปหน้าสรุปการจอง (Random Slot)', data);
        // TODO: เรียก Modal สรุปการจอง
        
        // (Logic เดิม)
        const { startSlot, endSlot, selectedFloor } = data;
        if (startSlot && endSlot) {
          this.lastReservedDate = new Date(startSlot.dateTime).toISOString().split('T')[0]; 
          this.lastReservedStartTime = startSlot.timeText;
          this.lastReservedEndTime = endSlot.timeText;
          this.selectedFloor = selectedFloor;
        }
    }
  }

  generateWeeklySchedule() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

    const todayIndex = new Date().getDay();

    this.weeklySchedule = days.map((dayEng, index) => {
      let timeText = 'ปิด';

      if (!this.lot.schedule || this.lot.schedule.length === 0) {
        timeText = '00:00 - 24:00';
      } else {
        const activeSch = this.lot.schedule[0]; 
        if (activeSch) {
           timeText = `${activeSch.open_time || '08:00'} - ${activeSch.close_time || '20:00'}`;
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

  selectType(type: string) {
    this.selectedType = type;
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if(popover) popover.dismiss();
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if(popover) popover.dismiss();
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'Car';
      case 'ev': return 'EV';
      case 'motorcycle': return 'Motorcycle';
      default: return type;
    }
  }
}