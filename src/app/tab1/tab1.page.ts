import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Tab2Page } from '../tab2/tab2.page';
// CLEANUP: ลบ ParkingListComponent ที่ไม่ได้ใช้ออก
// import { ParkingListComponent } from './parking-list/parking-list.component';

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
  searchQuery: string = '';
  selectedFilter: string = 'car';
  selectedTab: string = 'normal';
  activeNav: string = 'search';

  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = []; // สำหรับแสดงบน Map
  filteredParkingLots: ParkingLot[] = []; // สำหรับแสดงใน List (Modal)

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.allParkingLots = this.getMockData();
    this.filterData(); // กรองข้อมูลครั้งแรกเมื่อหน้าโหลด
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
        status: 'low', // Data มี 'low'
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
        available: 0, // 0 เพื่อให้ logic 'เต็ม' ทำงาน
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

  /**
   * FIX: ปรับปรุง logic การกรองข้อมูล
   * ให้ทั้ง map (visibleParkingLots) และ list (filteredParkingLots)
   * ถูกกรองด้วยเงื่อนไขเดียวกัน
   */
  filterData() {
    let results = this.allParkingLots;

    // 1. กรองด้วย Segment Tab (normal, ev, motorcycle)
    results = results.filter(
      (lot) => lot.type === this.selectedTab
    );

    // 2. กรองด้วย Search Query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    
    // (Optional) 3. กรองด้วย Chip Filter (car, visitor)
    // Logic นี้ยังไม่ได้ใช้งาน แต่ถ้าจะใช้ สามารถเพิ่มเงื่อนไขที่นี่
    if (this.selectedFilter === 'visitor') {
      // สมมติว่า 'visitor' คือที่จอดสำหรับ 'ภายนอก'
      results = results.filter(lot => lot.userTypes.includes('ภายนอก'));
    }

    // 4. อัปเดตข้อมูลทั้ง Map และ List ให้ตรงกัน
    this.filteredParkingLots = results;
    this.visibleParkingLots = results;
  }

  // เรียก filterData() เมื่อมีการค้นหา
  onSearch() {
    this.filterData();
  }
  
  /**
   * NEW: เพิ่มฟังก์ชันนี้เพื่อให้ Segment ทำงาน
   */
  onTabChange() {
    this.filterData();
  }

  // เรียก filterData() เมื่อกด Chip
  selectFilter(filter: string) {
    this.selectedFilter = filter;
    console.log('Filter selected:', filter);
    this.filterData(); // เรียก filterData() ใหม่
  }
  
  /**
   * NEW: เพิ่มฟังก์ชันนี้เพื่อให้ Tab Bar ทำงาน
   */
  navigateTo(tab: string) {
    this.activeNav = tab;
    console.log('Navigating to:', tab);
    // หากมีการใช้ Angular Router สามารถเพิ่ม logic navigation ที่นี่
    // เช่น this.router.navigateByUrl('/tabs/' + tab);
  }

  async viewLotDetails(lot: ParkingLot) {
    console.log('===== CLICKED LOT DATA (JSON) =====');
    console.log(JSON.stringify(lot, null, 2));
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

  getMarkerColor(available: number | null, capacity: number): string {
    if (available === null || available === 0) return 'danger';
    if (available / capacity < 0.3) return 'warning';
    return 'success';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'success';
      case 'low': // FIX: แก้จาก 'limited' เป็น 'low' ให้ตรงกับ data
        return 'warning';
      case 'full':
      case 'closed':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'available':
        return 'ว่าง';
      case 'low': // FIX: แก้จาก 'limited' เป็น 'low' ให้ตรงกับ data
        return 'ใกล้เต็ม';
      case 'full':
        return 'เต็ม';
      case 'closed':
        return 'ปิด';
      default:
        return 'N/A';
    }
  }
}