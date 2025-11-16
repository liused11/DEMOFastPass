import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Tab2Page } from '../tab2/tab2.page';

import { Subscription } from 'rxjs'; // ❗️ Import Subscription
import { UiEventService } from '../services/ui-event';

// ... (Interface ParkingLot อยู่ที่นี่) ...
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

  // --- ❗️ Logic ของ Bottom Sheet ---
  private sheetToggleSub!: Subscription;
  sheetLevel = 1; // 0 = ปิด, 1 = ครึ่ง, 2 = เต็ม
  sheetHeights = ['80px', '25vh', '40vh', '60vh', '85vh'];
  canScroll = false;
  isSnapping = true; // ❗️ ใช้สำหรับ .snapping class

  startY = 0;
  startHeight = 0;
  // --- จบ Logic ของ Bottom Sheet ---

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService, // ❗️ Inject Service
    private platform: Platform
  ) { }

  ngOnInit() {
    this.allParkingLots = this.getMockData();
    this.filterData();

    // ❗️ เริ่มฟังคำสั่งจาก Service
    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      this.toggleSheetState();
    });
  }

  ngOnDestroy() {
    // ❗️ หยุดฟังเมื่อออกจาก Page
    if (this.sheetToggleSub) {
      this.sheetToggleSub.unsubscribe();
    }
  }

  // ❗️ ฟังก์ชันสำหรับ Toggle Sheet (เรียกจาก Service)
  toggleSheetState() {
    this.isSnapping = true; // ❗️ เปิด animation
    if (this.sheetLevel === 0) {
      this.sheetLevel = 2; // ❗️ ถ้าปิดอยู่ ให้เปิดไปที่ "ระดับกลาง" (index 2)
    } else {
      this.sheetLevel = 0; // ❗️ ถ้าเปิดอยู่ (ไม่ว่าจะ level ไหน) ให้ปิด
    }

    // อัปเดตสถานะการ Scroll
    this.canScroll = this.sheetLevel === 4;
  }

  // ... (getMockData, filterData, onSearch, onTabChange, ...etc. เหมือนเดิม) ...

  getMockData(): ParkingLot[] {
    // ... (โค้ด Mock Data เหมือนเดิม) ...
    return [
      {
        id: 's2',
        name: 'ลานจอดรถ 14 ชั้น (S2) อันนี้กดไปแล้วเปิด modal ใหม่ออกมา',
        available: 317,
        capacity: 366,
        mapX: 150,
        mapY: 100,
        status: 'available',
        isBookmarked: true,
        distance: 230,
        hours: 'เปิดอยู่ - ปิด 24:00 น.',
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร, ภายนอก',
        price: 10,
        priceUnit: 'ต่อชั่วโมง',
        type: 'normal',
      },
      {
        id: 'n16',
        name: 'อาคารเรียนรวม (N16)',
        available: 40,
        capacity: 150,
        mapX: 250,
        mapY: 180,
        status: 'low',
        isBookmarked: false,
        distance: 450,
        hours: 'ใกล้ปิด - ปิด 20:00 น.',
        hasEVCharger: false,
        userTypes: 'นศ., บุคลากร',
        price: 10,
        priceUnit: 'ต่อชั่วโมง',
        type: 'normal',
      },
      {
        id: 's9',
        name: 'คณะพลังงาน (S9)',
        available: 0,
        capacity: 50,
        mapX: 100,
        mapY: 220,
        status: 'full',
        isBookmarked: false,
        distance: 450,
        hours: 'เปิดอยู่ - ปิด 24:00 น.',
        hasEVCharger: false,
        userTypes: 'บุคลากร',
        price: 10,
        priceUnit: 'ต่อชั่วโมง',
        type: 'normal',
      },
      {
        id: 'ev1',
        name: 'S2 - EV Charger',
        available: 8,
        capacity: 10,
        mapX: 155,
        mapY: 110,
        status: 'available',
        isBookmarked: false,
        distance: 230,
        hours: 'เปิดอยู่ - ปิด 24:00 น.',
        hasEVCharger: true,
        userTypes: 'ทั้งหมด',
        price: 15,
        priceUnit: 'ต่อชั่วโมง',
        type: 'ev',
      },
      {
        id: 'mc1',
        name: 'ที่จอดมอเตอร์ไซค์ (ใต้ S2)',
        available: 50,
        capacity: 200,
        mapX: 140,
        mapY: 120,
        status: 'available',
        isBookmarked: false,
        distance: 240,
        hours: 'เปิดอยู่ - ปิด 24:00 น.',
        hasEVCharger: false,
        userTypes: 'ทั้งหมด',
        price: 5,
        priceUnit: 'ต่อวัน',
        type: 'motorcycle',
      },
    ];
  }

  filterData() {
    let results = this.allParkingLots;

    results = results.filter((lot) => lot.type === this.selectedTab);

    if (this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    if (this.selectedFilter === 'visitor') {
      results = results.filter((lot) => lot.userTypes.includes('ภายนอก'));
    }

    this.filteredParkingLots = results;
    this.visibleParkingLots = results;
  }

  onSearch() {
    this.filterData();
  }

  onTabChange() {
    this.filterData();
  }

  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.filterData();
  }

  navigateTo(tab: string) {
    this.activeNav = tab;
  }

  async viewLotDetails(lot: ParkingLot) {
    console.log(lot)
    const modal = await this.modalCtrl.create({
      component: Tab2Page,
      componentProps: { lot },
      initialBreakpoint: 0.5,
      breakpoints: [0, 0.5, 0.9],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
  }

  // ... (getMarkerColor, getStatusColor, getStatusText เหมือนเดิม) ...
  getMarkerColor(available: number | null, capacity: number) {
    if (available === null || available === 0) return 'danger';
    if (available / capacity < 0.3) return 'warning';
    return 'success';
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'available':
        return 'success';
      case 'low':
        return 'warning';
      case 'full':
      case 'closed':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusText(status: string) {
    switch (status) {
      case 'available':
        return 'ว่าง';
      case 'low':
        return 'ใกล้เต็ม';
      case 'full':
        return 'เต็ม';
      case 'closed':
        return 'ปิด';
      default:
        return 'N/A';
    }
  }

  /** ------------ Bottom Sheet Drag (Manual) --------------- */

  startDrag(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();

    this.isSnapping = false; // ❗️ ปิด animation ตอนกำลังลาก
    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
    this.startY = y;

    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    this.startHeight = sheet.offsetHeight;

    window.addEventListener('mousemove', this.dragMove);
    window.addEventListener('mouseup', this.endDrag);

    window.addEventListener('touchmove', this.dragMove, { passive: false });
    window.addEventListener('touchend', this.endDrag);
  }

  dragMove = (ev: any) => {
    ev.preventDefault();
    ev.stopPropagation();

    // ❗️ กันไม่ให้ scroll ของ content ทำงานตอนลาก sheet
    if (this.sheetContentEl.nativeElement.scrollTop > 0 && this.sheetLevel === 2) {
      // ถ้าอยู่ level 2 และ content scroll ลงมาแล้ว -> ให้ scroll content
      return;
    }

    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const diff = this.startY - y;

    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    let newHeight = this.startHeight + diff;

    // ❗️ จำกัด min/max (80px ถึง 80px จากขอบบน)
    const maxHeight = this.platform.height() - 80;
    newHeight = Math.max(80, Math.min(newHeight, maxHeight));

    sheet.style.height = newHeight + 'px';
  };

  endDrag = () => {
    this.isSnapping = true; // ❗️ เปิด animation เพื่อ Snap
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    const h = sheet.offsetHeight;
    const platformHeight = this.platform.height(); // ความสูงจอทั้งหมด

    // ❗️❗️ === 2. กำหนดจุดตัดสินใจ 4 จุด (สำหรับ 5 ระดับ) === ❗️❗️
    // (ลองนึกภาพว่ามีเส้น 4 เส้นขีดแบ่งหน้าจอ)
    const point_4 = platformHeight * 0.75; // 75% (จุดปล่อยสำหรับ level 4)
    const point_3 = platformHeight * 0.5;  // 50% (จุดปล่อยสำหรับ level 3)
    const point_2 = platformHeight * 0.3;  // 30% (จุดปล่อยสำหรับ level 2)
    const point_1 = platformHeight * 0.15; // 15% (จุดปล่อยสำหรับ level 1)
    // --------------------------------------------------------

    if (h > point_4) {
      this.sheetLevel = 4; // -> 85vh (จาก sheetHeights[4])
    } else if (h > point_3) {
      this.sheetLevel = 3; // -> 60vh (จาก sheetHeights[3])
    } else if (h > point_2) {
      this.sheetLevel = 2; // -> 40vh (จาก sheetHeights[2])
    } else if (h > point_1) {
      this.sheetLevel = 1; // -> 25vh (จาก sheetHeights[1])
    } else {
      this.sheetLevel = 0; // -> 80px (จาก sheetHeights[0])
    }

    // อัปเดตความสูงใน [ngStyle] ให้ตรงกับ level
    sheet.style.height = this.sheetHeights[this.sheetLevel];

    // ❗️ ปลดล็อก scroll ต่อเมื่ออยู่ระดับสูงสุด (level 4)
    this.canScroll = this.sheetLevel === 4;

    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);

    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);
  };
}