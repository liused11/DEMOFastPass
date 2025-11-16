import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Tab2Page } from '../tab2/tab2.page';

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
export class Tab1Page {
  searchQuery = '';
  selectedFilter = 'car';
  selectedTab = 'normal';
  activeNav = 'search';
  canScroll = false;
  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = [];
  filteredParkingLots: ParkingLot[] = [];

  sheetLevel = 1;

  // สำหรับ drag bottom-sheet
  startY = 0;
  startHeight = 0;

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.allParkingLots = this.getMockData();
    this.filterData();
  }

  getMockData(): ParkingLot[] {
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
      case 'full':
      case 'closed': return 'danger';
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


  /** ------------ Bottom Sheet Drag --------------- */

  startDrag(ev: any) {
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
    ev.preventDefault(); // สำคัญมาก — ป้องกันการแย่ง scroll

    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const diff = this.startY - y;

    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;

    let newHeight = this.startHeight + diff;
    newHeight = Math.max(150, Math.min(newHeight, window.innerHeight - 80));

    sheet.style.height = newHeight + 'px';
  };

  endDrag = () => {
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    const h = sheet.offsetHeight;

    // ถ้าสูงเกิน 50% ให้ไป level 2 (สูงสุด)
    this.sheetLevel = h > window.innerHeight * 0.5 ? 2 : 1;

    // ปลดล็อก scroll ต่อเมื่ออยู่ระดับสูงสุด
    this.canScroll = this.sheetLevel === 2;

    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);

    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);
  };

}
