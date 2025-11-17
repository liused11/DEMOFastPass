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
  ) {}

  ngOnInit() {
    this.allParkingLots = this.getMockData();
    this.processScheduleData();
    this.updateParkingStatuses();
    this.filterData();

    // Init Height
    this.updateSheetHeightByLevel(this.sheetLevel);

    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      this.toggleSheetState();
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
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) sheet.classList.add('snapping');
    this.isSnapping = true;
    if (this.sheetLevel === 0) this.sheetLevel = 1;
    else this.sheetLevel = 0;
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
    this.isSnapping = true;
    this.sheetLevel = 0;
    this.updateSheetHeightByLevel(0);

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
          { days: [], open_time: '', close_time: '', cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' } },
          { days: [], open_time: '', close_time: '', cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' } }
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
          { days: [], open_time: '', close_time: '', cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' } },
          { days: [], open_time: '', close_time: '', cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' } }
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