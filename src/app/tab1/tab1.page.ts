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
  cron: { open: string; close: string; };
}

export interface ParkingSlotDB {
  slotId: string;
  startTime: string;
  endTime: string;
  displayText: string;
  isAvailable: boolean;
  totalCapacity: number;
  bookedCount: number;
  remainingCount: number;
  timeText: string; // เพิ่ม field นี้เพื่อใช้ใน UI Grid
}

export interface ParkingLot {
  id: string;
  name: string;
  // ✅ ปรับ Capacity เป็น Object
  capacity: {
    normal: number;
    ev: number;
    motorcycle: number;
  };
  // ✅ ปรับ Available เป็น Object
  available: {
    normal: number;
    ev: number;
    motorcycle: number;
  };
  floors?: string[];
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
  supportedTypes: string[];
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
  sheetLevel = 1; // 0=Low, 1=Mid, 2=High
  currentSheetHeight = 0;

  canScroll = false;
  isSnapping = true;
  isDragging = false;
  startY = 0;
  startHeight = 0;
  startLevel = 1;

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.allParkingLots = this.getMockData();
    this.processScheduleData();
    this.updateParkingStatuses();
    this.filterData();

    // Init Height
    this.updateSheetHeightByLevel(this.sheetLevel);

    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      // ✅ ห่อด้วย requestAnimationFrame เพื่อให้แน่ใจว่าทำงานในรอบการ render ที่ถูกต้อง
      requestAnimationFrame(() => {
        this.toggleSheetState();
      });
    });

    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
    });
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
  }

  // -------------------------------------------------------------
  // ✅ ZONE A: DRAG & DROP LOGIC (Full Fix)
  // -------------------------------------------------------------

  getPixelHeightForLevel(level: number): number {
    const platformHeight = this.platform.height();
    if (level === 0) return 80;
    if (level === 1) return platformHeight * 0.5;
    if (level === 2) return platformHeight * 0.9;
    return 80;
  }

  updateSheetHeightByLevel(level: number) {
    this.currentSheetHeight = this.getPixelHeightForLevel(level);
    this.canScroll = level === 2;

    // ✅ เพิ่มส่วนนี้: ถ้า Level เป็น 0 (ย่อลงสุด) ให้ดีด Scroll กลับไปบนสุด
    if (level === 0) {
      if (this.sheetContentEl && this.sheetContentEl.nativeElement) {
        // สั่งให้เนื้อหาเลื่อนกลับไปที่ 0 ทันที
        this.sheetContentEl.nativeElement.scrollTop = 0;
      }
    }
  }

  startDrag(ev: any) {
    const touch = ev.touches ? ev.touches[0] : ev;
    this.startY = touch.clientY;

    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    sheet.classList.remove('snapping');
    this.isSnapping = false;

    this.startHeight = sheet.offsetHeight;
    this.startLevel = this.sheetLevel;
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
      this.startY = currentY;
      this.startHeight = this.getPixelHeightForLevel(2);
      return;
    }

    const diff = this.startY - currentY;

    if (!this.isDragging && Math.abs(diff) < 5) return;

    if (!isMaxLevel || (isMaxLevel && isAtTop && diff < 0)) {
      if (ev.cancelable) ev.preventDefault();
      this.isDragging = true;

      let newHeight = this.startHeight + diff;
      const maxHeight = this.platform.height() - 40;
      newHeight = Math.max(80, Math.min(newHeight, maxHeight));

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

      this.animationFrameId = requestAnimationFrame(() => {
        this.currentSheetHeight = newHeight;
      });
    }
  };

  endDrag = (ev: any) => {
    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);

    // 1. ยกเลิก Frame เก่า กันกระตุก
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.isDragging) {
      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      const finalH = sheet.offsetHeight;

      const totalDragged = finalH - this.startHeight;
      const platformHeight = this.platform.height();
      const dragThreshold = platformHeight * 0.15;

      if (Math.abs(totalDragged) < dragThreshold) {
        // ลากไม่ถึง 15% กลับที่เดิม
        this.sheetLevel = this.startLevel;
      } else {
        // หาจุด Snap ที่ใกล้ที่สุด
        const distLow = Math.abs(finalH - this.getPixelHeightForLevel(0));
        const distMid = Math.abs(finalH - this.getPixelHeightForLevel(1));
        const distHigh = Math.abs(finalH - this.getPixelHeightForLevel(2));
        const minDist = Math.min(distLow, distMid, distHigh);

        if (minDist === distLow) this.sheetLevel = 0;
        else if (minDist === distMid) this.sheetLevel = 1;
        else this.sheetLevel = 2;
      }

      this.snapToCurrentLevel();
    } else {
      this.snapToCurrentLevel();
    }

    // ✅ FIX KEY: หน่วงเวลาคืนค่า isDragging เพื่อกัน Click Event หลุดไปโดนปุ่ม
    setTimeout(() => {
      this.isDragging = false;
    }, 100);
  };

  snapToCurrentLevel() {
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      this.isSnapping = true;
      sheet.classList.add('snapping');
      this.updateSheetHeightByLevel(this.sheetLevel);
    }
  }

  // -------------------------------------------------------------
  // ✅ ZONE B & C: Helpers & Mock (Standard)
  // -------------------------------------------------------------

  toggleSheetState() {
    // 1. 🛑 หยุดการลาก และ Animation Frame ที่ค้างอยู่ทันที
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isDragging = false; // สำคัญ: บอกระบบว่าเลิกดึงแล้ว

    // 2. 🏗️ เตรียม Class สำหรับ Animation
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      // ลบ Class ก่อนแล้วใส่ใหม่เพื่อกระตุ้น (Optional แต่ช่วยในบางเคส)
      sheet.classList.remove('snapping');

      // บังคับ Browser ให้อ่านค่า (Force Reflow) เพื่อให้มันรู้ตัวว่า Class หายไปแล้ว
      void sheet.offsetWidth;

      // ใส่ Class กลับเข้าไป
      sheet.classList.add('snapping');
      this.isSnapping = true;
    }

    // 3. 🧮 คำนวณ Level ใหม่
    // ตัวอย่าง: สลับระหว่าง 0 (ปิด) กับ 1 (ครึ่งจอ)
    // หรือถ้าคุณอยากให้กดซ้ำแล้วสลับ 1 -> 0 ก็ปรับ Logic ตรงนี้
    if (this.sheetLevel === 0) {
      this.sheetLevel = 1;
    } else {
      // ถ้าเปิดอยู่ (จะเป็น 1 หรือ 2) ให้ยุบลงไปเหลือ 1 หรือ 0 ตามดีไซน์
      // สมมติว่ากดซ้ำให้ยุบลง
      this.sheetLevel = 0;
    }

    // 4. 🚀 สั่งเปลี่ยนความสูง
    this.updateSheetHeightByLevel(this.sheetLevel);
  }

  processScheduleData() {
    this.allParkingLots.forEach(lot => {
      if (lot.schedule && lot.schedule.length > 0) {
        lot.schedule.forEach(sch => this.parseCronToScheduleData(sch));
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
      
      // ดึงค่าว่างปัจจุบันตาม Tab ที่เลือก
      const currentAvailable = this.getDisplayAvailable(lot);

      if (!isOpenNow) {
        lot.status = 'closed';
        lot.hours = `ปิด (${hoursText})`;
      } else {
        lot.hours = `เปิดอยู่ (${hoursText})`;
        const totalCap = this.getDisplayCapacity(lot);
        
        // คำนวณสถานะตาม Type ที่เลือก
        if (currentAvailable <= 0) lot.status = 'full';
        else if (totalCap > 0 && (currentAvailable / totalCap) < 0.1) lot.status = 'low';
        else lot.status = 'available';
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
    if (dayPart === '*') return [...dayMap];
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
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
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

  filterData() {
    let results = this.allParkingLots;
    // กรองเฉพาะสถานที่ที่มีที่จอดรถประเภทที่เลือก
    results = results.filter((lot) => lot.supportedTypes.includes(this.selectedTab));
    
    if (this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    this.filteredParkingLots = results;
    this.visibleParkingLots = results;
    
    // อัพเดทสถานะสี/ข้อความใหม่ตาม Tab ที่เปลี่ยน
    this.updateParkingStatuses();
  }

  onSearch() { this.filterData(); }
  onTabChange() { this.filterData(); }

  async viewLotDetails(lot: ParkingLot) {
    this.isSnapping = true;
    this.sheetLevel = 0;
    this.updateSheetHeightByLevel(0);

    const modal = await this.modalCtrl.create({
      component: ParkingDetailComponent,
      componentProps: {
        lot: lot,
        // ⭐ ส่งประเภทรถที่ Filter อยู่ปัจจุบันไปด้วย
        initialType: this.selectedTab
      },
      initialBreakpoint: 0.95, // เปิดเกือบเต็มจอเพื่อให้เห็นข้อมูลครบ
      breakpoints: [0, 0.5, 0.95],
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

  getDisplayCapacity(lot: ParkingLot): number {
    // @ts-ignore
    return lot.capacity[this.selectedTab] || 0;
  }

  getDisplayAvailable(lot: ParkingLot): number {
    // @ts-ignore
    return lot.available[this.selectedTab] || 0;
  }

getMockData(): ParkingLot[] {
    return [
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        // ระบุความจุแยกประเภท
        capacity: { normal: 200, ev: 20, motorcycle: 100 }, 
        available: { normal: 120, ev: 18, motorcycle: 50 },
        floors: ['Floor 1', 'Floor 2', 'Floor 3'],
        mapX: 50, mapY: 80,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '', // ปล่อยว่างตามที่ขอ
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        supportedTypes: ['normal', 'ev', 'motorcycle'],
        schedule: [
          { days: [], open_time: '', close_time: '', cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' } },
          { days: [], open_time: '', close_time: '', cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' } }
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
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 6 * * *', close: '0 22 * * *' } }]
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
  }
}
