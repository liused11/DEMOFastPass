import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Subscription, interval } from 'rxjs';
import { UiEventService } from '../services/ui-event';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';

// --- INTERFACES ---
export interface ScheduleItem {
  days: string[];
  open_time: string;
  close_time: string;
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
  hours: string;
  hasEVCharger: boolean;
  userTypes: string;
  price: number;
  priceUnit: string;
  type: 'normal' | 'ev' | 'motorcycle';
  schedule?: ScheduleItem[];
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

  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = [];
  filteredParkingLots: ParkingLot[] = [];
  private animationFrameId: any;
  private sheetToggleSub!: Subscription;
  private timeCheckSub!: Subscription;

  // --- Bottom Sheet Config ---
  // Level 0 = 80px (Low)
  // Level 1 = 50vh (Mid)
  // Level 2 = 90vh (High)
  sheetLevel = 1;
  sheetHeights = ['80px', '50vh', '90vh'];

  canScroll = false;   // จะเป็น true เมื่อ sheetLevel = 2
  isSnapping = true;   // ใช้คุม class css transition
  isDragging = false;
  startY = 0;
  startHeight = 0;

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.allParkingLots = this.getMockData();

    // 1. Cron Logic
    this.processScheduleData();

    // 2. Status Logic
    this.updateParkingStatuses();
    this.filterData();

    // 3. UI Events
    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      this.toggleSheetState();
    });

    // 4. Update Status every 1 min
    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
    });
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
  }

  // -------------------------------------------------------------
  // ✅ ZONE A: DRAG & DROP LOGIC (แก้ไขใหม่)
  // -------------------------------------------------------------

  startDrag(ev: any) {
    const touch = ev.touches ? ev.touches[0] : ev;
    this.startY = touch.clientY;

    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;

    // ⚡️ 1. แก้สั่น: ลบ class snapping ออกทันทีผ่าน DOM
    // เพื่อให้ไม่มี transition ค้างตอนเริ่มลาก
    sheet.classList.remove('snapping');
    this.isSnapping = false;

    this.startHeight = sheet.offsetHeight;
    this.isDragging = false;

    // Bind Events
    window.addEventListener('mousemove', this.dragMove);
    window.addEventListener('mouseup', this.endDrag);
    // passive: false จำเป็นมากสำหรับกัน scroll บนมือถือ
    window.addEventListener('touchmove', this.dragMove, { passive: false });
    window.addEventListener('touchend', this.endDrag);
  }

  dragMove = (ev: any) => {
    const touch = ev.touches ? ev.touches[0] : ev;
    const currentY = touch.clientY;
    const contentEl = this.sheetContentEl.nativeElement;

    const isAtTop = contentEl.scrollTop <= 0;
    const isMaxLevel = this.sheetLevel === 2;

    // Logic: ถ้าอยู่สูงสุด (90vh) แล้ว user เลื่อนเนื้อหาลงมา (Scroll Down)
    // เราต้องยอมให้เขา scroll เนื้อหา ไม่ใช่ลาก sheet
    if (isMaxLevel && !isAtTop) {
      this.startY = currentY;
      // ✅ แก้บั๊กตัวแดง: คำนวณ 90vh เป็น pixel จริงๆ
      this.startHeight = this.platform.height() * 0.9;
      return;
    }

    const diff = this.startY - currentY;

    // Threshold: ลากเกิน 5px ถึงจะเริ่มขยับ (กันมือลั่น)
    if (!this.isDragging && Math.abs(diff) < 5) return;

    // เริ่มลาก Sheet
    if (!isMaxLevel || (isMaxLevel && isAtTop && diff < 0)) {
      if (ev.cancelable) ev.preventDefault();
      this.isDragging = true;

      let newHeight = this.startHeight + diff;
      const maxHeight = this.platform.height() - 50;
      newHeight = Math.max(80, Math.min(newHeight, maxHeight));

      // ✅ แก้ตรงนี้: ยกเลิกเฟรมเก่าก่อนสร้างเฟรมใหม่ (กันกระตุกซ้อน)
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      // ✅ เก็บ ID ไว้
      this.animationFrameId = requestAnimationFrame(() => {
        const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
        if (sheet) sheet.style.height = `${newHeight}px`;
      });
    }
  };

  endDrag = (ev: any) => {
    // 1. ล้าง Event Listener ทั้งหมดออก เพื่อคืน Memory
    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);

    // ✅ หัวใจสำคัญ: สั่งหยุดการวาดความสูงจาก dragMove ทันที! 
    // (ถ้าไม่หยุด มันอาจจะเขียนทับค่า Snap ของเรา ทำให้หยุดกลางทาง)
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.isDragging) {
      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      const h = sheet.offsetHeight; // ความสูงปัจจุบันตอนปล่อยมือ
      const platformHeight = this.platform.height();

      // 2. คำนวณจุด Snap (Threshold Logic)
      // - ลากเกิน 75% ของจอ -> ดีดไปบนสุด (Level 2: 90vh)
      if (h > platformHeight * 0.75) {
        this.sheetLevel = 2;
      }
      // - ต่ำกว่า 75% แต่เกิน 25% ของจอ -> ดีดไปตรงกลาง (Level 1: 50vh)
      else if (h > platformHeight * 0.25) {
        this.sheetLevel = 1;
      }
      // - ต่ำกว่านั้น -> หุบลงล่างสุด (Level 0: 80px)
      else {
        this.sheetLevel = 0;
      }

      // 3. สั่ง Snap
      this.isSnapping = true;
      sheet.classList.add('snapping'); // เปิด CSS Transition

      // บังคับค่าความสูงใหม่ตาม Level ที่คำนวณได้
      sheet.style.height = this.sheetHeights[this.sheetLevel];
    } else {
      // 4. กรณีแค่จิ้มๆ (Tap) ไม่ได้ลาก -> ให้ Snap กลับที่เดิมเพื่อความชัวร์
      this.isSnapping = true;
      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      if (sheet) {
        sheet.classList.add('snapping');
        sheet.style.height = this.sheetHeights[this.sheetLevel];
      }
    }

    // 5. อัปเดตสถานะ Scroll (ถ้าอยู่บนสุด Level 2 ถึงจะยอมให้ Scroll เนื้อหาได้)
    this.canScroll = this.sheetLevel === 2;

    // รีเซ็ตสถานะการลาก
    this.isDragging = false;
  };

  // -------------------------------------------------------------
  // ✅ ZONE B: HELPER LOGIC (Cron & Utilities)
  // -------------------------------------------------------------

  toggleSheetState() {
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) sheet.classList.add('snapping'); // Ensure animation is on

    this.isSnapping = true;
    if (this.sheetLevel === 0) this.sheetLevel = 1;
    else this.sheetLevel = 0;
    this.canScroll = this.sheetLevel === 2;
  }

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
      if (!lot.schedule || lot.schedule.length === 0) {
        lot.hours = 'เปิด 24 ชั่วโมง';
        return;
      }

      let isOpenNow = false;
      let displayTexts: string[] = [];

      lot.schedule.forEach((sch) => {
        const isActive = this.checkIsScheduleActive(sch, now);
        if (isActive) isOpenNow = true;
        const dayText = this.formatDaysText(sch.days);
        displayTexts.push(`${dayText} ${sch.open_time} - ${sch.close_time}`);
      });

      const hoursText = displayTexts.join(', ');

      if (!isOpenNow) {
        lot.status = 'closed';
        lot.available = 0;
        lot.hours = `ปิด (${hoursText})`;
      } else {
        lot.hours = `เปิดอยู่ (${hoursText})`;
        if (lot.status === 'closed') {
          const ratio = (lot.available || 0) / lot.capacity;
          if ((lot.available || 0) <= 0) lot.status = 'full';
          else if (ratio < 0.1) lot.status = 'low';
          else lot.status = 'available';
        }
      }
    });
  }

  parseCronToScheduleData(sch: ScheduleItem) {
    const openParts = sch.cron.open.split(' ');
    const closeParts = sch.cron.close.split(' ');
    if (openParts.length >= 5 && closeParts.length >= 5) {
      sch.open_time = `${this.pad(openParts[1])}:${this.pad(openParts[0])}`;
      sch.close_time = `${this.pad(closeParts[1])}:${this.pad(closeParts[0])}`;
      sch.days = this.parseCronDays(openParts[4]);
    }
  }

  parseCronDays(dayPart: string): string[] {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysIndex: number[] = [];
    if (dayPart === '*') {
      return [...dayMap];
    }
    if (dayPart.includes('-')) {
      const [start, end] = dayPart.split('-').map(Number);
      let current = start;
      let loopCount = 0;
      while (current !== end && loopCount < 8) {
        daysIndex.push(current % 7);
        current = (current + 1) % 7;
        loopCount++;
      }
      daysIndex.push(end % 7);
    } else if (dayPart.includes(',')) {
      dayPart.split(',').forEach((d) => daysIndex.push(Number(d) % 7));
    } else {
      daysIndex.push(Number(dayPart) % 7);
    }
    return [...new Set(daysIndex.map((i) => dayMap[i]))];
  }

  checkIsScheduleActive(sch: ScheduleItem, now: Date): boolean {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayMap[now.getDay()];
    if (!sch.days.includes(currentDayName)) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = sch.open_time.split(':').map(Number);
    const startMinutes = openH * 60 + openM;
    const [closeH, closeM] = sch.close_time.split(':').map(Number);
    let endMinutes = closeH * 60 + closeM;
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  pad(val: string | number): string {
    return val.toString().padStart(2, '0');
  }

  formatDaysText(days: string[]): string {
    const thaiDays: { [key: string]: string } = {
      sunday: 'อา.', monday: 'จ.', tuesday: 'อ.', wednesday: 'พ.',
      thursday: 'พฤ.', friday: 'ศ.', saturday: 'ส.'
    };
    if (days.length === 7) return 'ทุกวัน';
    return days.map(d => thaiDays[d]).join(',');
  }

  // -------------------------------------------------------------
  // ✅ ZONE C: MOCK DATA & FILTER
  // -------------------------------------------------------------

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
    console.log("PARKING DETAIL", lot);

    // หุบ Sheet ลงต่ำสุดเมื่อดูรายละเอียด
    this.isSnapping = true;
    this.sheetLevel = 0;

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

  getMockData(): ParkingLot[] {
    return [
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' }
          }
        ]
      }, {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' }
          }
        ]
      },
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        available: 120,
        capacity: 200,
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' }
          },
          {
            days: [], open_time: '', close_time: '',
            cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' }
          }
        ]
      },
      {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        available: 2,
        capacity: 10,
        mapX: 300, mapY: 150,
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        type: 'ev',
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 6 * * *', close: '0 22 * * *' } }]
      },
      {
        id: 'moto_dorm',
        name: 'โรงจอดมอไซค์ หอพักชาย',
        available: 0,
        capacity: 150,
        mapX: 120, mapY: 350,
        status: 'full',
        isBookmarked: false,
        distance: 800,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ. หอพัก',
        price: 100,
        priceUnit: 'เหมาจ่าย',
        type: 'motorcycle',
        schedule: []
      },
      {
        id: 'staff_office',
        name: 'ที่จอดรถผู้บริหาร (Staff Only)',
        available: 45,
        capacity: 50,
        mapX: 220, mapY: 250,
        status: 'available',
        isBookmarked: false,
        distance: 300,
        hours: '',
        hasEVCharger: true,
        userTypes: 'บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 7 * * 1-5', close: '0 17 * * 1-5' } }]
      },
      {
        id: 'night_market',
        name: 'ลานจอดตลาดนัดเย็น',
        available: 200,
        capacity: 300,
        mapX: 320, mapY: 400,
        status: 'available',
        isBookmarked: false,
        distance: 1200,
        hours: '',
        hasEVCharger: false,
        userTypes: 'บุคคลภายนอก',
        price: 20,
        priceUnit: 'เหมา',
        type: 'normal',
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 16 * * *', close: '0 23 * * *' } }]
      },
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
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 18 * * *', close: '0 2 * * *' } }]
      }
    ];
  }
}