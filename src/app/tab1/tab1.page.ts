import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Tab2Page } from '../tab2/tab2.page';
import { Subscription, interval } from 'rxjs';
import { UiEventService } from '../services/ui-event';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';


// --- INTERFACES ---
export interface ScheduleItem {
  days: string[];       // จะถูกเติมอัตโนมัติจาก cron
  open_time: string;    // จะถูกเติมอัตโนมัติจาก cron
  close_time: string;   // จะถูกเติมอัตโนมัติจาก cron
  cron: {
    open: string;
    close: string;
  };
}

export interface ParkingLot {
  id: string;
  name: string;
  available: number | null;
  capacity: number;
  mapX: number;
  mapY: number;
  status: 'available' | 'full' | 'closed' | 'low';
  isBookmarked: boolean;
  distance: number;
  hours: string;       // ใช้แสดงผลข้อความรวม
  hasEVCharger: boolean;
  userTypes: string;
  price: number;
  priceUnit: string;
  type: 'normal' | 'ev' | 'motorcycle';
  schedule?: ScheduleItem[]; // ✅ โครงสร้างใหม่
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  @ViewChild('sheetContent') sheetContentEl!: ElementRef<HTMLElement>;

  searchQuery = '';
  selectedFilter = 'car';
  selectedTab = 'normal';
  activeNav = 'search';

  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = [];
  filteredParkingLots: ParkingLot[] = [];

  private sheetToggleSub!: Subscription;
  private timeCheckSub!: Subscription;

  // --- Bottom Sheet Config ---
  sheetLevel = 1; // 0=Low, 1=Mid, 2=High
  sheetHeights = ['80px', '50vh', '90vh'];
  canScroll = false;
  isSnapping = true;
  isDragging = false;
  startY = 0;
  startHeight = 0;

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.allParkingLots = this.getMockData();

    // 1. แปลง Cron เป็น Data ครั้งแรกทันที
    this.processScheduleData();

    // 2. คำนวณสถานะ (เปิด/ปิด) ทันที
    this.updateParkingStatuses();
    this.filterData();

    // 3. Subscribe UI Events
    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      this.toggleSheetState();
    });

    // 4. เช็คเวลาทุกๆ 1 นาที เพื่อเปลี่ยนสถานะ เปิด <-> ปิด
    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
    });
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
  }

  // -------------------------------------------------------------
  // ✅ ZONE A: CRON & SCHEDULE PARSING LOGIC
  // -------------------------------------------------------------

  // ฟังก์ชันนี้จะ loop เพื่อแกะ cron ใส่ days/times ให้ครบทุกตัว
  processScheduleData() {
    this.allParkingLots.forEach(lot => {
      if (lot.schedule && lot.schedule.length > 0) {
        lot.schedule.forEach(sch => {
          this.parseCronToScheduleData(sch);
        });
      }
    });
  }

  updateParkingStatuses() {
    const now = new Date();

    this.allParkingLots.forEach((lot) => {
      // กรณีไม่มี Schedule ให้ถือว่าเปิดตลอด 24 ชม.
      if (!lot.schedule || lot.schedule.length === 0) {
        lot.hours = 'เปิด 24 ชั่วโมง';
        return;
      }

      let isOpenNow = false;
      let displayTexts: string[] = [];

      lot.schedule.forEach((sch) => {
        // 1. เช็คว่าเวลานี้ Active ไหม
        const isActive = this.checkIsScheduleActive(sch, now);
        if (isActive) isOpenNow = true;

        // 2. สร้างข้อความสวยๆ เก็บไว้ (เช่น "จ.-ศ. 05:00-22:00")
        const dayText = this.formatDaysText(sch.days);
        displayTexts.push(`${dayText} ${sch.open_time} - ${sch.close_time}`);
      });

      // รวมข้อความ (ถ้ามีหลาย schedule)
      const hoursText = displayTexts.join(', ');

      if (!isOpenNow) {
        // ปิดอยู่
        lot.status = 'closed';
        lot.available = 0;
        lot.hours = `ปิด (${hoursText})`;
      } else {
        // เปิดอยู่ -> คำนวณ status ตามจำนวนที่ว่าง
        lot.hours = `เปิดอยู่ (${hoursText})`;

        if (lot.status === 'closed') {
          // ถ้าสถานะเดิมเป็น closed ให้คำนวณใหม่
          const ratio = (lot.available || 0) / lot.capacity;
          if ((lot.available || 0) <= 0) lot.status = 'full';
          else if (ratio < 0.1) lot.status = 'low';
          else lot.status = 'available';
        }
      }
    });
  }

  // --- Helper: แกะ Cron String เป็น Data ---
  parseCronToScheduleData(sch: ScheduleItem) {
    // Cron Format: [min] [hour] [day] [month] [dayOfWeek]
    const openParts = sch.cron.open.split(' ');
    const closeParts = sch.cron.close.split(' ');

    if (openParts.length >= 5 && closeParts.length >= 5) {
      // 1. Set Times (HH:mm)
      sch.open_time = `${this.pad(openParts[1])}:${this.pad(openParts[0])}`;
      sch.close_time = `${this.pad(closeParts[1])}:${this.pad(closeParts[0])}`;

      // 2. Set Days (Array of string names)
      // ใช้ Cron ของเวลาเปิด เป็นตัวกำหนดวัน
      sch.days = this.parseCronDays(openParts[4]);
    }
  }

  // --- Helper: แปลง Cron Day (1-5) เป็น ["monday", ...] ---
  parseCronDays(dayPart: string): string[] {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysIndex: number[] = [];

    if (dayPart === '*') {
      return [...dayMap]; // Clone array
    }

    if (dayPart.includes('-')) {
      const [start, end] = dayPart.split('-').map(Number);
      // Loop handle 1-5 or 6-0
      let current = start;
      // ป้องกัน loop ไม่จบ กรณี config ผิด
      let loopCount = 0;
      while (current !== end && loopCount < 8) {
        daysIndex.push(current % 7);
        current = (current + 1) % 7;
        loopCount++;
      }
      daysIndex.push(end % 7); // push ตัวสุดท้าย
    } else if (dayPart.includes(',')) {
      dayPart.split(',').forEach((d) => daysIndex.push(Number(d) % 7));
    } else {
      daysIndex.push(Number(dayPart) % 7);
    }

    // คืนค่าเป็นชื่อวัน (unique values)
    return [...new Set(daysIndex.map((i) => dayMap[i]))];
  }

  // --- Helper: เช็คว่า now อยู่ในช่วงเวลาของ schedule นี้หรือไม่ ---
  checkIsScheduleActive(sch: ScheduleItem, now: Date): boolean {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayMap[now.getDay()];

    // 1. เช็ควัน
    if (!sch.days.includes(currentDayName)) return false;

    // 2. เช็คเวลา (แปลงเป็นนาทีนับจากเที่ยงคืน)
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = sch.open_time.split(':').map(Number);
    const startMinutes = openH * 60 + openM;

    const [closeH, closeM] = sch.close_time.split(':').map(Number);
    let endMinutes = closeH * 60 + closeM;

    // กรณีข้ามวัน (เช่น เปิด 18:00 ปิด 02:00)
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  // --- Utility ---
  pad(val: string | number): string {
    return val.toString().padStart(2, '0');
  }

  formatDaysText(days: string[]): string {
    const thaiDays: {[key: string]: string} = {
      sunday: 'อา.', monday: 'จ.', tuesday: 'อ.', wednesday: 'พ.',
      thursday: 'พฤ.', friday: 'ศ.', saturday: 'ส.'
    };
    if (days.length === 7) return 'ทุกวัน';
    return days.map(d => thaiDays[d]).join(',');
  }

// -------------------------------------------------------------
  // ✅ ZONE B: MOCK DATA (ชุดข้อมูลจำลองแบบจัดเต็ม)
  // -------------------------------------------------------------
  getMockData(): ParkingLot[] {
    return [
      // ---------------------------------------------------------
      // 1. ลานจอดที่มีตารางเวลาซับซ้อน (หอสมุด)
      //    - จันทร์-ศุกร์: 08:00 - 20:00
      //    - เสาร์-อาทิตย์: 10:00 - 16:00
      // ---------------------------------------------------------
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80, // มุมซ้ายบน
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '', // รอคำนวณ
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 8 * * 1-5',   // จ-ศ เปิด 08:00
              close: '0 20 * * 1-5'  // จ-ศ ปิด 20:00
            }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 10 * * 6,0',  // ส-อา เปิด 10:00
              close: '0 16 * * 6,0'  // ส-อา ปิด 16:00
            }
          }
        ]
      },
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80, // มุมซ้ายบน
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '', // รอคำนวณ
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 8 * * 1-5',   // จ-ศ เปิด 08:00
              close: '0 20 * * 1-5'  // จ-ศ ปิด 20:00
            }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 10 * * 6,0',  // ส-อา เปิด 10:00
              close: '0 16 * * 6,0'  // ส-อา ปิด 16:00
            }
          }
        ]
      },
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80, // มุมซ้ายบน
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '', // รอคำนวณ
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 8 * * 1-5',   // จ-ศ เปิด 08:00
              close: '0 20 * * 1-5'  // จ-ศ ปิด 20:00
            }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 10 * * 6,0',  // ส-อา เปิด 10:00
              close: '0 16 * * 6,0'  // ส-อา ปิด 16:00
            }
          }
        ]
      },

      // ---------------------------------------------------------
      // 2. ลานจอด EV (S11)
      //    - เปิดทุกวัน 06:00 - 22:00
      //    - เอาไว้เทส Tab EV
      // ---------------------------------------------------------
      {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        available: 2, // เหลือน้อย -> สถานะควรเป็น low หรือ available
        capacity: 10,
        mapX: 300, mapY: 150, // ขวา
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        type: 'ev',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 6 * * *',    // ทุกวัน 06:00
              close: '0 22 * * *'   // ทุกวัน 22:00
            }
          }
        ]
      },

      // ---------------------------------------------------------
      // 3. ลานจอดมอเตอร์ไซค์ (เต็ม!)
      //    - เปิด 24 ชม.
      //    - available = 0 -> สถานะต้องแดง (Full)
      // ---------------------------------------------------------
      {
        id: 'moto_dorm',
        name: 'โรงจอดมอไซค์ หอพักชาย',
        available: 0, // เต็ม
        capacity: 150,
        mapX: 120, mapY: 350, // ล่างซ้าย
        status: 'full',
        isBookmarked: false,
        distance: 800,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ. หอพัก',
        price: 100,
        priceUnit: 'เหมาจ่าย',
        type: 'motorcycle',
        schedule: [] // ว่าง = 24 ชม.
      },

      // ---------------------------------------------------------
      // 4. ลานจอดบุคลากร (Staff Only)
      //    - เปิดเฉพาะ จันทร์-ศุกร์ 07:00 - 17:00
      //    - เสาร์อาทิตย์ ปิด
      // ---------------------------------------------------------
      {
        id: 'staff_office',
        name: 'ที่จอดรถผู้บริหาร (Staff Only)',
        available: 45,
        capacity: 50,
        mapX: 220, mapY: 250, // กลางๆ
        status: 'available',
        isBookmarked: false,
        distance: 300,
        hours: '',
        hasEVCharger: true,
        userTypes: 'บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 7 * * 1-5',   // จ-ศ 07:00
              close: '0 17 * * 1-5'  // จ-ศ 17:00
            }
          }
        ]
      },

      // ---------------------------------------------------------
      // 5. ลานจอดตลาดนัด (Night Market)
      //    - เปิดเฉพาะตอนเย็น 16:00 - 23:00 ทุกวัน
      // ---------------------------------------------------------
      {
        id: 'night_market',
        name: 'ลานจอดตลาดนัดเย็น',
        available: 200,
        capacity: 300,
        mapX: 320, mapY: 400, // ขวาล่าง
        status: 'available',
        isBookmarked: false,
        distance: 1200,
        hours: '',
        hasEVCharger: false,
        userTypes: 'บุคคลภายนอก',
        price: 20,
        priceUnit: 'เหมา',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 16 * * *',    // 16:00
              close: '0 23 * * *'    // 23:00
            }
          }
        ]
      },

       // ---------------------------------------------------------
      // 6. ลานจอดทั่วไป (ทดสอบปิดข้ามวัน)
      //    - เปิด 18:00 - 02:00 (ตี 2)
      // ---------------------------------------------------------
      {
        id: 'bar_parking',
        name: 'ลานจอดโซนร้านอาหาร (Late Night)',
        available: 50,
        capacity: 80,
        mapX: 80, mapY: 200,
        status: 'available',
        isBookmarked: false,
        distance: 600,
        hours: '',
        hasEVCharger: false,
        userTypes: 'All',
        price: 40,
        priceUnit: 'ต่อชม.',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: {
              open: '0 18 * * *',    // 18:00
              close: '0 2 * * *'     // 02:00 (ตี 2) Logic เรา handle ข้ามวันไว้แล้ว
            }
          }
        ]
      }
    ];
  }

  // -------------------------------------------------------------
  // ✅ ZONE C: UI & BOTTOM SHEET LOGIC
  // -------------------------------------------------------------

  toggleSheetState() {
    this.isSnapping = true;
    if (this.sheetLevel === 0) this.sheetLevel = 1;
    else this.sheetLevel = 0;
    this.canScroll = this.sheetLevel === 2;
  }

  startDrag(ev: any) {
    const touch = ev.touches ? ev.touches[0] : ev;
    this.startY = touch.clientY;
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    this.startHeight = sheet.offsetHeight;
    this.isSnapping = false;
    this.isDragging = false;

    window.addEventListener('mousemove', this.dragMove);
    window.addEventListener('mouseup', this.endDrag);
    window.addEventListener('touchmove', this.dragMove, { passive: false });
    window.addEventListener('touchend', this.endDrag);
  }

  dragMove = (ev: any) => {
    const touch = ev.touches ? ev.touches[0] : ev;
    const currentY = touch.clientY;
    const contentEl = this.sheetContentEl.nativeElement;
    const isAtTop = contentEl.scrollTop <= 0;
    const isMaxLevel = this.sheetLevel === 2;

    if (isMaxLevel && !isAtTop) {
      // ถ้าอยู่บนสุดแต่ User scroll เนื้อหาลง -> ให้ update startY ใหม่
      this.startY = currentY;
      this.startHeight = this.platform.height() * 0.9; // (90vh)
      return;
    }

    const diff = this.startY - currentY;

    if (!this.isDragging && Math.abs(diff) < 10) return;

    if (!isMaxLevel || (isMaxLevel && isAtTop && diff < 0)) {
      if (ev.cancelable) ev.preventDefault();
      this.isDragging = true;

      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      let newHeight = this.startHeight + diff;
      const maxHeight = this.platform.height() - 80;
      newHeight = Math.max(80, Math.min(newHeight, maxHeight));

      sheet.style.height = newHeight + 'px';
    }
  };

  endDrag = (ev: any) => {
    this.isSnapping = true;

    if (this.isDragging) {
      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      const h = sheet.offsetHeight;
      const platformHeight = this.platform.height();

      // Logic Snap 3 ระดับ
      if (h > platformHeight * 0.7) this.sheetLevel = 2;      // -> 90vh
      else if (h > platformHeight * 0.25) this.sheetLevel = 1; // -> 45vh
      else this.sheetLevel = 0;                                // -> 80px

      // Apply ความสูงจาก Array
      sheet.style.height = this.sheetHeights[this.sheetLevel];
    }

    this.canScroll = this.sheetLevel === 2;

    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);
  };

  // --- Standard Filter/Nav Functions ---
  filterData() {
    let results = this.allParkingLots;
    results = results.filter((lot) => lot.type === this.selectedTab);
    if (this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    this.filteredParkingLots = results;
    this.visibleParkingLots = results;
  }
  onSearch() { this.filterData(); }
  onTabChange() { this.filterData(); }

  async viewLotDetails(lot: ParkingLot) {
    console.log("PARKING DETAIL",lot)
    this.isSnapping = true;
    this.sheetLevel = 0; // หุบ Sheet เมื่อกดดูรายละเอียด
    const modal = await this.modalCtrl.create({
      component: ParkingDetailComponent,
      componentProps: { lot },
      initialBreakpoint: 0.5,
      breakpoints: [0, 0.5, 0.9],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
  }

  getMarkerColor(available: number | null, capacity: number) {
    if (available === null || available === 0) return 'danger';
    if (available / capacity < 0.3) return 'warning';
    return 'success';
  }
  getStatusColor(status: string) {
    switch (status) {
      case 'available': return 'success';
      case 'low': return 'warning';
      case 'full': case 'closed': return 'danger';
      default: return 'medium';
    }
  }
  getStatusText(status: string) {
    switch (status) {
      case 'available': return 'ว่าง';
      case 'low': return 'ใกล้เต็ม';
      case 'full': return 'เต็ม';
      case 'closed': return 'ปิด';
      default: return 'N/A';
    }
  }
}