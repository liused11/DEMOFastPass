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

// ✅ 1. Interface รองรับ cronExpression
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
  
  // เก็บ string cron เช่น '* 8-22 * * 1-5'
  cronExpression?: string; 
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

  sheetLevel = 1; 
  sheetHeights = ['80px', '45vh', '90vh']; 
  canScroll = false;
  isSnapping = true; 
  isDragging = false; 
  startY = 0;
  startHeight = 0;

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService,
    private platform: Platform
  ) { }

  ngOnInit() {
    // 1. โหลดข้อมูล
    this.allParkingLots = this.getMockData();
    
    // 2. ✅ รัน Test ทันทีที่เข้าหน้า (เปิด Console ดูผลได้เลย)
    this.runCronTests();

    // 3. คำนวณสถานะครั้งแรก
    this.updateParkingStatuses();
    this.filterData();

    // 4. Subscribe Events
    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      this.toggleSheetState();
    });

    // 5. ✅ Real-time Check: ตรวจสอบเวลาทุกๆ 1 นาที
    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
      this.filterData(); 
    });
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
  }

  // -------------------------------------------------------------
  // ✅ ZONE A: LOGIC การเช็คเวลา (Cron Job Logic)
  // -------------------------------------------------------------

  updateParkingStatuses() {
    this.allParkingLots.forEach(lot => {
      if (!lot.cronExpression) {
        lot.hours = 'เปิด 24 ชั่วโมง';
        return; 
      }

      const isOpen = this.isCronActive(lot.cronExpression);
      
      // ✅ เรียกใช้ฟังก์ชันแปลงข้อความตรงนี้
      const humanText = this.getCronText(lot.cronExpression);

      if (!isOpen) {
        lot.status = 'closed';
        lot.available = 0;
        // โชว์ว่า "ปิด (จ.-ศ. 08:00 - 22:00)"
        lot.hours = `ปิด (${humanText})`;
      } else {
        if (lot.status === 'closed') {
             // Logic คืนค่าสถานะ (เหมือนเดิม)
             const ratio = (lot.available || 0) / lot.capacity;
             if ((lot.available || 0) <= 0) lot.status = 'full';
             else if (ratio < 0.1) lot.status = 'low';
             else lot.status = 'available';
        }
        // โชว์ว่า "เปิดอยู่ (จ.-ศ. 08:00 - 22:00)"
        lot.hours = `เปิดอยู่ (${humanText})`;
      }
    });
  }

  // Helper: เช็คว่า Cron นี้ Active หรือไม่
  // รองรับ mockDate สำหรับการ Testing
  isCronActive(cron: string, mockDate?: Date): boolean {
    if (!cron) return true;

    const now = mockDate || new Date(); // ถ้ามี mockDate ให้ใช้ mockDate
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat

    const parts = cron.split(' ');
    if (parts.length < 5) return false; 

    // Cron Format: [min] [hour] [day] [month] [dayOfWeek]
    const cronHour = parts[1];
    const cronDayOfWeek = parts[4];

    const checkField = (value: number, cronField: string): boolean => {
      if (cronField === '*') return true;
      
      // Range: "8-22"
      if (cronField.includes('-')) {
        const [start, end] = cronField.split('-').map(Number);
        return value >= start && value <= end;
      }
      
      // List: "0,6"
      if (cronField.includes(',')) {
        const list = cronField.split(',').map(Number);
        return list.includes(value);
      }

      return value === Number(cronField);
    };

    const isDayValid = checkField(currentDay, cronDayOfWeek);
    const isHourValid = checkField(currentHour, cronHour);
    
    return isDayValid && isHourValid;
  }

  // -------------------------------------------------------------
  // ✅ ZONE B: UNIT TEST (เอาไว้เช็คว่า Logic ทำงานถูกไหม)
  // -------------------------------------------------------------
  runCronTests() {
    console.log('%c=== เริ่มการทดสอบ Cron Logic ===', 'color: cyan; font-weight: bold;');

    const testCases = [
      {
        desc: 'CASE 1: วันจันทร์ 09:00 (ในเวลาทำการ)',
        cron: '* 8-22 * * 1-5', 
        mockDate: new Date('2023-10-23T09:00:00'), // จันทร์
        expected: true
      },
      {
        desc: 'CASE 2: วันเสาร์ 09:00 (นอกวันทำการ)',
        cron: '* 8-22 * * 1-5', 
        mockDate: new Date('2023-10-21T09:00:00'), // เสาร์
        expected: false
      },
      {
        desc: 'CASE 3: วันจันทร์ 23:00 (นอกเวลาทำการ)',
        cron: '* 8-22 * * 1-5', 
        mockDate: new Date('2023-10-23T23:00:00'), 
        expected: false
      },
      {
        desc: 'CASE 4: วันจันทร์ 07:59 (ก่อนเวลาทำการ)',
        cron: '* 8-22 * * 1-5',
        mockDate: new Date('2023-10-23T07:59:00'), 
        expected: false
      }
    ];

    testCases.forEach(t => {
      const result = this.isCronActive(t.cron, t.mockDate);
      const isPass = result === t.expected;
      const icon = isPass ? '✅ PASS' : '❌ FAIL';
      console.log(`${icon} : ${t.desc}`, result);
    });
    
    console.log('%c=== จบการทดสอบ ===', 'color: cyan; font-weight: bold;');
  }

  // -------------------------------------------------------------
  // ✅ ZONE C: MOCK DATA
  // -------------------------------------------------------------
  getMockData(): ParkingLot[] {
    return [
      {
        id: 'cron_job_lot',
        name: 'ลานจอดรถพี่ออฟ (จ-ศ 08:00-22:00)',
        available: 50,
        capacity: 100,
        mapX: 200,
        mapY: 150,
        status: 'available',
        isBookmarked: false,
        distance: 150,
        hours: '',
        hasEVCharger: false,
        userTypes: 'บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        type: 'normal',
        // ✅ Cron: นาที(*) ชั่วโมง(8-22) วัน(*) เดือน(*) วันในสัปดาห์(1-5)
        cronExpression: '* 8-22 * * 1-5'
      },
      {
        id: 's2',
        name: 'ลานจอดรถ 14 ชั้น (S2) [24 ชม.]',
        available: 317,
        capacity: 366,
        mapX: 150,
        mapY: 100,
        status: 'available',
        isBookmarked: true,
        distance: 230,
        hours: '', 
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร, ภายนอก',
        price: 10,
        priceUnit: 'ต่อชั่วโมง',
        type: 'normal',
        cronExpression: '* * * * *' // เปิดตลอด
      },
      // เพิ่มตัวอย่างอื่นๆ ได้ตามต้องการ
    ];
  }

  // -------------------------------------------------------------
  // ZONE D: UI Helper (เหมือนเดิม)
  // -------------------------------------------------------------
  toggleSheetState() {
    if (this.sheetLevel === 0) {
      this.sheetLevel = 1; 
    } else {
      this.sheetLevel = 0;
    }
    this.canScroll = this.sheetLevel === 2;
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

  onSearch() { this.filterData(); }
  onTabChange() { this.filterData(); }
  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.filterData();
  }
  navigateTo(tab: string) { this.activeNav = tab; }

  async viewLotDetails(lot: ParkingLot) {
    this.isSnapping = true;
    this.sheetLevel = 0; 

    console.log(lot);
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
      this.startY = currentY; 
      this.startHeight = this.platform.height() * 0.9; 
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
        const threshold_High = platformHeight * 0.70; 
        const threshold_Low = platformHeight * 0.25;  
     
        if (h > threshold_High) this.sheetLevel = 2; 
        else if (h > threshold_Low) this.sheetLevel = 1; 
        else this.sheetLevel = 0; 
        
        sheet.style.height = this.sheetHeights[this.sheetLevel];
    }
    this.canScroll = this.sheetLevel === 2;
    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);
  };

  getCronText(cron: string): string {
    if (!cron || cron === '* * * * *') return 'ทุกวัน 24 ชม.';

    const parts = cron.split(' ');
    if (parts.length < 5) return '';

    const cronHour = parts[1];       // เช่น "8-22"
    const cronDayOfWeek = parts[4];  // เช่น "1-5"

    // 1. แปลงเวลา
    let timeText = '';
    if (cronHour === '*') {
      timeText = '24 ชม.';
    } else if (cronHour.includes('-')) {
      const [start, end] = cronHour.split('-');
      timeText = `${start}:00 - ${end}:00`;
    } else {
      timeText = `${cronHour}:00`;
    }

    // 2. แปลงวัน
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    let dayText = '';

    if (cronDayOfWeek === '*') {
      dayText = 'ทุกวัน';
    } else if (cronDayOfWeek.includes('-')) {
      // กรณีช่วง: 1-5 -> จ.-ศ.
      const [start, end] = cronDayOfWeek.split('-').map(Number);
      dayText = `${dayNames[start]} - ${dayNames[end]}`;
    } else if (cronDayOfWeek.includes(',')) {
      // กรณีระบุวัน: 0,6 -> อา., ส.
      const days = cronDayOfWeek.split(',').map(Number);
      dayText = days.map(d => dayNames[d]).join(', ');
    } else {
      // วันเดียว
      dayText = dayNames[Number(cronDayOfWeek)];
    }

    return `${dayText} ${timeText}`;
  }
}