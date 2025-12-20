import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ModalController, Platform, AlertController } from '@ionic/angular'; 
import { Subscription, interval, take } from 'rxjs';
import { UiEventService } from '../services/ui-event';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';
import { ParkingService } from '../graphql/parking.service';

import * as ngeohash from 'ngeohash';

// --- Interfaces ---
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
  timeText: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  capacity: {
    normal: number;
    ev: number;
    motorcycle: number;
  };
  available: {
    normal: number;
    ev: number;
    motorcycle: number;
  };
  floors?: string[];
  mapX: number;
  mapY: number;
  //  พิกัดสำหรับ Map (Latitude, Longitude)
  lat?: number;
  lng?: number;

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
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sheetContent') sheetContentEl!: ElementRef<HTMLElement>;

  searchQuery = '';
  selectedTab = 'all';

  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = [];
  filteredParkingLots: ParkingLot[] = [];
  
  // --- Map Variables ---
  private map: any;
  private markers: any[] = [];
  private userMarker: any;
  private geoHashBounds: any; // เลเยอร์กรอบสี่เหลี่ยม Geohash
  private userGeoHash: string | null = null;

  // --- Subscription & Animation ---
  private animationFrameId: any;
  private sheetToggleSub!: Subscription;
  private timeCheckSub!: Subscription;

  // --- Bottom Sheet Config ---
  sheetLevel = 1; 
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
    private platform: Platform,
    private alertCtrl: AlertController, // ✅ Inject AlertController
    private parkingService: ParkingService, 
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private userLat?: number;
  private userLng?: number;
  private loadParkingLots(lat: number, lng: number) {
    this.parkingService
      .getParkingByLocation(lat, lng)
      .pipe(take(1)) // 👈 เพิ่ม
      .subscribe({
        next: (lots) => {
          this.allParkingLots = lots;

          this.updateDistancesFromUser()

          // 🔁 ใช้ logic เดิมทั้งหมด
          this.processScheduleData();
          this.updateParkingStatuses();
          this.filterData();
        },
        error: (err) => {
          console.error('Load parking failed', err);
        }
      });
  }

  private updateDistancesFromUser() {
    if (this.userLat == null || this.userLng == null) return;

    this.allParkingLots.forEach(lot => {
      if (lot.lat && lot.lng) {
        lot.distance = this.calculateDistanceMeters(
          this.userLat!,
          this.userLng!,
          lot.lat,
          lot.lng
        );
      }
    });
  }

  private setUserLocation(lat: number, lng: number) {
    this.userLat = lat;
    this.userLng = lng;

    // คำนวณ distance ใหม่ทันทีถ้ามี parking แล้ว
    this.updateDistancesFromUser();

    // เรียง + update UI
    this.filterData();
    this.updateMarkers();
  }

  ngOnInit() {
  // 📍 initial location (KMUTT / หรือ default)
    const defaultLat = 13.651336;
    const defaultLng = 100.496472;

    // 🔥 DEV location
    this.setUserLocation(defaultLat, defaultLng);

    this.loadParkingLots(defaultLat, defaultLng);

    this.updateSheetHeightByLevel(this.sheetLevel);

    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      requestAnimationFrame(() => {
        this.toggleSheetState();
      });
    });

    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
    });
  }

  //  ทำงานหลังจากหน้าเว็บโหลดเสร็จ (เพื่อโหลด Map)
  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.initMap();
      this.updateMarkers();
      
      // ลองขอตำแหน่งทันทีเมื่อเข้าหน้า
      // this.focusOnUser();
    }
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  // ----------------------------------------------------------------
  //  MAP LOGIC (Leaflet + Geohash + Error Handling)
  // ----------------------------------------------------------------

  private async initMap() {
    const L = await import('leaflet');
    
    // ตั้งค่า Default Icon
    const iconUrl = 'assets/icon/favicon.png'; 
    const DefaultIcon = L.Icon.extend({
      options: {
        iconUrl,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      }
    });
    L.Marker.prototype.options.icon = new DefaultIcon();

    // พิกัดเริ่มต้น (kmUTT)
    const centerLat = 13.651336; 
    const centerLng = 100.496472;

    this.map = L.map('map', {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    
    setTimeout(() => { this.map.invalidateSize(); }, 500);
  }

  private createPinIcon(L: any, color: string) {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" width="40px" height="40px">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;
    
    return L.divIcon({
      html: svgContent,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  }

  async updateMarkers() {
    if (!this.map) return;
    const L = await import('leaflet');

    // ลบ Marker เก่า
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    // วาด Marker ใหม่
    this.visibleParkingLots.forEach(lot => {
      if (lot.lat && lot.lng) {
        let color = '#6c757d'; 
        if (lot.status === 'available') color = '#28a745';
        else if (lot.status === 'low') color = '#ffc107';
        else if (lot.status === 'full' || lot.status === 'closed') color = '#dc3545';

        const icon = this.createPinIcon(L, color);
        
        const marker = L.marker([lot.lat, lot.lng], { icon: icon })
          .addTo(this.map)
          .bindPopup(`<b>${lot.name}</b><br>ว่าง: ${this.getDisplayAvailable(lot)} คัน`);

        marker.on('click', () => {
          this.viewLotDetails(lot);
        });

        this.markers.push(marker);
      }
    });
  }

  // ✅ ฟังก์ชันหาตำแหน่ง + Geohash + Error Alert
  public focusOnUser() {
    if (!navigator.geolocation) {
      this.showLocationError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // ✅ ใช้ตัวเดียว
      this.setUserLocation(lat, lng);
      // 🔥 โหลด parking ใหม่ตามตำแหน่ง user
      this.loadParkingLots(lat, lng);
      
      // 1. คำนวณ Geohash (ความละเอียด 7 หลัก)
      this.userGeoHash = ngeohash.encode(lat, lng, 7);
      
      if (this.map) {
        const L = await import('leaflet');

        this.map.flyTo([lat, lng], 17);
        
        // 2. วาดจุดตำแหน่งผู้ใช้
        if (!this.userMarker) {
           const userIcon = L.divIcon({
             html: `<div style="width: 15px; height: 15px; background: #4285F4; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
             className: '',
             iconSize: [15, 15]
           });
           this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
        } else {
           this.userMarker.setLatLng([lat, lng]);
        }

        // 3. วาดกรอบสี่เหลี่ยม Geohash (Bounding Box)
        if (this.geoHashBounds) {
          this.map.removeLayer(this.geoHashBounds);
        }
        
        // Decode เพื่อหาขอบเขตสี่เหลี่ยม
        const boundsArray = ngeohash.decode_bbox(this.userGeoHash);
        const bounds = [[boundsArray[0], boundsArray[1]], [boundsArray[2], boundsArray[3]]];

        // @ts-ignore
        this.geoHashBounds = L.rectangle(bounds, { 
          color: '#4285f4', 
          weight: 1, 
          fillOpacity: 0.1, 
          fillColor: '#4285f4' 
        }).addTo(this.map);
      }
    }, (err) => {
      //  จัดการ Error ที่นี่ (กรณี User กด Block หรือ GPS ไม่ทำงาน)
      console.error('Error getting location', err);
      
      let message = 'ไม่สามารถระบุตำแหน่งได้';
      if (err.code === 1) { // PERMISSION_DENIED
        message = 'กรุณาเปิดสิทธิ์การเข้าถึงตำแหน่ง (Location Permission) ที่การตั้งค่าของเบราว์เซอร์หรืออุปกรณ์';
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        message = 'สัญญาณ GPS ขัดข้อง ไม่สามารถระบุตำแหน่งได้';
      } else if (err.code === 3) { // TIMEOUT
        message = 'หมดเวลาในการค้นหาตำแหน่ง ลองใหม่อีกครั้ง';
      }
      
      this.showLocationError(message);

    }, {
      enableHighAccuracy: true,
      timeout: 10000, // 10 วินาที
      maximumAge: 0
    });
  }

  //  ฟังก์ชันแสดง Alert
  async showLocationError(msg: string) {
    const alert = await this.alertCtrl.create({
      header: 'แจ้งเตือนพิกัด',
      message: msg,
      buttons: ['ตกลง'],
      mode: 'ios'
    });
    await alert.present();
  }

  // ----------------------------------------------------------------
  //  LOGIC การ Filter และ Bottom Sheet 
  // ----------------------------------------------------------------

  filterData() {
    let results = this.allParkingLots;
    
    if (this.selectedTab !== 'all') {
      results = results.filter((lot) => lot.supportedTypes?.includes(this.selectedTab));
    }
    
    if (this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    this.filteredParkingLots = results;
    this.visibleParkingLots = results;
    
    this.updateParkingStatuses();
    this.updateMarkers(); // อัปเดต Map
  }

  onSearch() { this.filterData(); }
  onTabChange() { this.filterData(); }

  // Drag & Drop
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
    if (level === 0 && this.sheetContentEl?.nativeElement) {
      this.sheetContentEl.nativeElement.scrollTop = 0;
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
        this.sheetLevel = this.startLevel;
      } else {
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
    setTimeout(() => { this.isDragging = false; }, 100);
  };

  snapToCurrentLevel() {
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      this.isSnapping = true;
      sheet.classList.add('snapping');
      this.updateSheetHeightByLevel(this.sheetLevel);
    }
  }

  toggleSheetState() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isDragging = false;
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      sheet.classList.remove('snapping');
      void sheet.offsetWidth;
      sheet.classList.add('snapping');
      this.isSnapping = true;
    }
    if (this.sheetLevel === 0) {
      this.sheetLevel = 1;
    } else {
      this.sheetLevel = 0;
    }
    this.updateSheetHeightByLevel(this.sheetLevel);
  }

  // Helper Functions
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
        lot.status = 'available'; 
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
      
      const currentAvailable = this.getDisplayAvailable(lot);

      if (!isOpenNow) {
        lot.status = 'closed';
        lot.hours = `ปิด (${hoursText})`;
      } else {
        lot.hours = `เปิดอยู่ (${hoursText})`;
        const totalCap = this.getDisplayCapacity(lot);
        
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

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'Car';
      case 'ev': return 'EV';
      case 'motorcycle': return 'Motorcycle';
      default: return type;
    }
  }

  async viewLotDetails(lot: ParkingLot) {
    this.isSnapping = true;
    this.sheetLevel = 0;
    this.updateSheetHeightByLevel(0);
    if (this.map && lot.lat && lot.lng) {
      this.map.flyTo([lot.lat, lot.lng], 18, { // Zoom Level 18 (ยิ่งมากยิ่งซูมใกล้)
        animate: true,
        duration: 1.0 // ความเร็วในการเลื่อน (วินาที)
      });
    }
    const modal = await this.modalCtrl.create({
      component: ParkingDetailComponent,
      componentProps: {
        lot: lot,
        initialType: this.selectedTab === 'all' ? 'normal' : this.selectedTab
      },
      initialBreakpoint: 0.5,
      breakpoints: [0, 0.5, 0.95],
      backdropDismiss: true,
      showBackdrop:true,
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
    if (this.selectedTab === 'all') {
      return (lot.capacity.normal || 0) + (lot.capacity.ev || 0) + (lot.capacity.motorcycle || 0);
    }
    // @ts-ignore
    return lot.capacity[this.selectedTab] || 0;
  }

  getDisplayAvailable(lot: ParkingLot): number {
    if (this.selectedTab === 'all') {
      return (lot.available.normal || 0) + (lot.available.ev || 0) + (lot.available.motorcycle || 0);
    }
    // @ts-ignore
    return lot.available[this.selectedTab] || 0;
  }

  private calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // radius โลก (เมตร)
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  //  Mock Data พร้อมพิกัด (lat, lng)
  /*getMockData(): ParkingLot[] {
    return [
      {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        capacity: { normal: 200, ev: 20, motorcycle: 100 }, 
        available: { normal: 120, ev: 18, motorcycle: 50 },
        floors: ['Floor 1', 'Floor 2', 'Floor 3'],
        mapX: 0, mapY: 0,
        lat: 13.651814, 
        lng: 100.495365,
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
        mapX: 0, mapY: 0,
        lat: 13.650207, 
        lng: 100.495112,
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
        mapX: 0, mapY: 0,
        lat: 13.654012, 
        lng: 100.496155,
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
  } */
}