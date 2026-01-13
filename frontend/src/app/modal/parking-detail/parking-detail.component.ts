import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { ParkingLot, DaySection, TimeSlot, ZoneData, FloorData, DailySchedule, AggregatedZone } from '../../data/models';
import { PARKING_DETAIL_MOCK_SITES } from '../../data/mock-data';
import { ParkingReservationsComponent } from '../parking-reservations/parking-reservations.component';
import { AvailabilityByFloorRequest, ParkingService } from 'src/app/services/parking.service';
// import { CheckBookingComponent } from '../check-booking/check-booking.component';
// import { BookingSlotComponent } from '../booking-slot/booking-slot.component';

@Component({
  selector: 'app-parking-detail',
  templateUrl: './parking-detail.component.html',
  styleUrls: ['./parking-detail.component.scss'],
  standalone: false
})
export class ParkingDetailComponent implements OnInit {

  @Input() lot!: ParkingLot;
  @Input() initialType: string = 'normal';

  // --- UI Properties (Satisfying Template) ---
  mockSites: ParkingLot[] = []; // Used in template iteration
  sites: ParkingLot[] = [];     // Used for API results (and likely synced with mockSites)

  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;
  selectedType = 'normal';
  isLoading = false;

  // --- Time Selection State (Restored) ---
  slotInterval: number = 60; // -1 = Full Day, -2 = Half Day
  displayDays: DaySection[] = [];
  selectedDateIndex: number = 0; // NEW: Track selected date
  currentMonthLabel: string = ''; // NEW: Month Year Label (e.g. January 2026)
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;

  // --- Floor & Zone Data ---
  floorData: FloorData[] = [];
  selectedFloorIds: string[] = [];
  selectedZoneIds: string[] = [];
  displayZones: AggregatedZone[] = []; // Zones to show on the right

  currentImageIndex = 0;
  isSpecificSlot: boolean = true;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private parkingService: ParkingService
  ) { }

  ngOnInit() {
    this.mockSites = PARKING_DETAIL_MOCK_SITES; // Initialize for template

    if (this.initialType && this.lot && this.lot.supportedTypes && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    } else if (this.lot && this.lot.supportedTypes && this.lot.supportedTypes.length > 0) {
      this.selectedType = this.lot.supportedTypes[0];
    }

    this.checkOpenStatus();
    this.generateWeeklySchedule();

    // UI Init
    this.generateTimeSlots();

    // API Call
    this.loadAllSites();
    this.fetchParkingDetails();
  }

  // --- Service Integration ---
  fetchParkingDetails() {
    this.isLoading = true;

    // Prepare Body
    const request: AvailabilityByFloorRequest = {
      siteId: this.lot.id ? this.lot.id.split('-')[0] : '1',
      buildingId: this.lot.id || '1',
      vehicleTypeCode: this.getVehicleCode(this.selectedType),
      date: new Date().toISOString().split('T')[0]
    };

    console.log('Fetching details for:', request);

    this.parkingService.getAvailabilityByFloor(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res: any) => {
          if (res && res.summary && res.summary.floors) {

            // Map JSON to FloorData
            this.floorData = res.summary.floors.map((f: any) => ({
              id: f.floorId,
              name: f.floorName,
              totalAvailable: f.totalAvailable,
              capacity: f.capacity,
              zones: f.zones.map((z: any) => ({
                id: z.zoneIds?.[0] || '',
                name: z.zoneName,
                available: z.availableCount,
                capacity: z.totalCapacity,
                status: z.status,
                // rawIds: z.zoneIds // Not in shared interface, ignoring for now or extending interface if critical
              }))
            }));

            // Select first floor if none selected
            if (this.selectedFloorIds.length === 0 && this.floorData.length > 0) {
              this.selectedFloorIds = [this.floorData[0].id];
            }

            this.updateDisplayZones();

          } else {
            console.warn('API Response mismatch:', res);
            this.floorData = [];
            // Fallback to mock generation if API fails/empty?
            // this.generateMockFloorZoneData();
          }
        },
        error: (err: any) => {
          console.error('API Error:', err);
          this.presentToast('ไม่สามารถดึงข้อมูลที่จอดรถได้');
        }
      });
  }

  loadAllSites() {
    this.parkingService.getSites().subscribe({
      next: (res: ParkingLot[]) => this.sites = res,
      error: (err) => console.log('Error loading sites', err)
    });
  }

  getVehicleCode(type: string): number {
    const codes: { [key: string]: number } = { 'normal': 1, 'ev': 2, 'motorcycle': 3 };
    return codes[type] || 1;
  }


  // --- Time Selection Logic (Restored) ---
  selectInterval(minutes: number) {
    this.slotInterval = minutes;
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.interval-popover') as any;
    if (popover) popover.dismiss();
  }

  resetTimeSelection(fullReset: boolean = true) {
    this.startSlot = null;
    this.endSlot = null;
    if (fullReset) {
      this.selectedDateIndex = 0;
    }
    // Don't wipe floorData here if we rely on API, but maybe clear selection?
    // this.floorData = []; 
    // this.selectedFloorIds = [];
    this.selectedZoneIds = [];
    // this.displayZones = [];
    this.updateMonthLabel();
    this.updateSelectionUI();
  }

  generateTimeSlots() {
    this.displayDays = [];
    const today = new Date();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    // Mock 5 days
    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayIndex = targetDate.getDay();
      const dayName = thaiDays[dayIndex];
      const dateNumber = targetDate.getDate().toString();
      const dateLabel = `${dayName} ${dateNumber}`;

      // Mock capacity/availability for Time Slots
      const dailyCapacity = this.getCurrentCapacity();
      let dailyAvailable = 0;
      if (i === 0) {
        dailyAvailable = Math.min(this.getCurrentAvailable(), dailyCapacity);
      } else {
        dailyAvailable = Math.floor(dailyCapacity * (0.8 + Math.random() * 0.2));
      }

      let startH = 8, startM = 0;
      let endH = 20, endM = 0;
      let isOpen = true;
      let timeLabel = '08:00 - 20:00';

      // Simple mock logic for slots
      const slots: TimeSlot[] = [];
      const startTime = new Date(targetDate);
      startTime.setHours(startH, startM, 0, 0);
      const closingTime = new Date(targetDate);
      closingTime.setHours(endH, endM, 0, 0);

      const totalOpenMinutes = Math.floor((closingTime.getTime() - startTime.getTime()) / 60000);

      if (isOpen) {
        if (this.slotInterval === -1) {
          // Full Day
          const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
          slots.push({
            id: `${targetDate.toISOString()}-FULL`,
            timeText: timeStr,
            dateTime: new Date(startTime),
            isAvailable: true,
            remaining: 10,
            isSelected: false,
            isInRange: false,
            duration: totalOpenMinutes
          });
        } else if (this.slotInterval > 0) {
          let currentBtnTime = new Date(startTime);
          while (currentBtnTime < closingTime) {
            this.createSingleSlot(slots, targetDate, currentBtnTime, dailyCapacity, this.slotInterval);
            currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
          }
        }
      }

      this.displayDays.push({
        date: targetDate,
        dateLabel: dateLabel,
        dayName: dayName,
        dateNumber: dateNumber,
        timeLabel: isOpen ? timeLabel : 'ปิดบริการ',
        slots: slots,
        available: dailyAvailable,
        capacity: dailyCapacity
      });
    }
    this.updateMonthLabel();
    this.updateSelectionUI();
  }

  createSingleSlot(slots: TimeSlot[], targetDate: Date, timeObj: Date, capacity: number, duration: number) {
    const startH = timeObj.getHours();
    const startM = timeObj.getMinutes();
    const endTime = new Date(timeObj.getTime() + duration * 60000);
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
    const isPast = timeObj < new Date();

    slots.push({
      id: `${targetDate.toISOString()}-${timeStr}`,
      timeText: timeStr,
      dateTime: new Date(timeObj),
      isAvailable: !isPast,
      remaining: isPast ? 0 : 5,
      isSelected: false,
      isInRange: false,
      duration: duration
    });
  }

  selectDate(index: number) {
    this.selectedDateIndex = index;
    this.updateMonthLabel();
    this.updateSelectionUI();
  }

  updateMonthLabel() {
    if (this.displayDays.length > 0 && this.displayDays[this.selectedDateIndex]) {
      const date = this.displayDays[this.selectedDateIndex].date;
      const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      this.currentMonthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    if (!this.startSlot || !this.endSlot) {
      this.startSlot = slot;
      this.endSlot = slot;
    } else if (this.startSlot.id === this.endSlot.id) {
      if (slot.id === this.startSlot.id) {
        this.resetTimeSelection(false);
        return;
      } else {
        if (slot.dateTime.getTime() < this.startSlot.dateTime.getTime()) {
          const oldStart = this.startSlot;
          this.startSlot = slot;
          this.endSlot = oldStart;
        } else {
          this.endSlot = slot;
        }
      }
    } else {
      if (slot.id === this.startSlot.id || slot.id === this.endSlot.id) {
        this.resetTimeSelection(false);
        return;
      } else {
        this.startSlot = slot;
        this.endSlot = slot;
      }
    }
    this.updateSelectionUI();

    // Refresh floor availability when time changes?
    // Maybe we just assume floor availability is checked by date (already fetched)
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        const isStart = !!this.startSlot && s.id === this.startSlot.id;
        const isEnd = !!this.endSlot && s.id === this.endSlot.id;
        s.isSelected = isStart || isEnd;

        if (this.startSlot && this.endSlot) {
          s.isInRange = s.dateTime.getTime() > this.startSlot.dateTime.getTime() &&
            s.dateTime.getTime() < this.endSlot.dateTime.getTime();
          if (s.id === this.startSlot.id || s.id === this.endSlot.id) s.isInRange = false;
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  // --- Floor/Zone Logic (Merged) ---
  toggleFloor(floor: FloorData) {
    if (this.isFloorSelected(floor.id)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(id => id !== floor.id);
    } else {
      // Allow multiple? Service logic seemed to allow multiple, Single selection logic allowed one.
      // Let's allow multiple as per Service Code.
      this.selectedFloorIds.push(floor.id);
    }

    this.clearAllZones();
    this.updateDisplayZones();
  }

  updateDisplayZones() {
    const zoneMap = new Map<string, AggregatedZone>();
    this.selectedFloorIds.forEach(floorId => {
      const floor = this.floorData.find(f => f.id === floorId);
      if (floor && floor.zones) {
        floor.zones.forEach(z => {
          if (zoneMap.has(z.name)) {
            const existing = zoneMap.get(z.name)!;
            existing.available += z.available;
            existing.capacity += z.capacity;
            existing.floorIds.push(floorId);
            existing.ids.push(z.id); // Or push rawIds if available
            existing.status = existing.available > 0 ? 'available' : 'full';
          } else {
            zoneMap.set(z.name, {
              name: z.name,
              available: z.available,
              capacity: z.capacity,
              status: z.status,
              floorIds: [floorId],
              ids: [z.id]
            });
          }
        });
      }
    });

    this.displayZones = Array.from(zoneMap.values());
    this.displayZones.sort((a, b) => a.name.localeCompare(b.name));
  }

  isFloorSelected(floorId: string): boolean { return this.selectedFloorIds.includes(floorId); }

  toggleZone(aggZone: AggregatedZone) {
    const isSelected = this.isZoneSelected(aggZone.name);
    if (isSelected) {
      this.selectedZoneIds = this.selectedZoneIds.filter(id => !aggZone.ids.includes(id));
    } else {
      // Toggle logic
      const newIds = aggZone.ids.filter(id => !this.selectedZoneIds.includes(id));
      this.selectedZoneIds = [...this.selectedZoneIds, ...newIds];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    // Check if ANY sub-id is selected? Or ALL? Logic implies usually all for "Zone A".
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  clearAllZones() { this.selectedZoneIds = []; }

  // --- Helpers ---
  selectSite(site: ParkingLot) {
    this.lot = site;
    this.selectedFloorIds = [];
    this.clearAllZones();
    this.fetchParkingDetails();
    this.closePopovers();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.clearAllZones();
    this.selectedFloorIds = [];
    this.fetchParkingDetails();
    this.closePopovers();
  }

  closePopovers() {
    const popovers = document.querySelectorAll('ion-popover');
    popovers.forEach(p => (p as any).dismiss());
  }

  pad(num: number | string): string { return num.toString().padStart(2, '0'); }
  dismiss() { this.modalCtrl.dismiss(); }
  checkOpenStatus() { this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low'; }
  getCurrentCapacity(): number { return (this.lot.capacity as any)[this.selectedType] || 0; }
  getCurrentAvailable(): number { return (this.lot.available as any)[this.selectedType] || 0; }

  getTypeName(type: string): string {
    const names: { [key: string]: string } = { 'normal': 'รถทั่วไป', 'ev': 'รถ EV', 'motorcycle': 'มอเตอร์ไซค์' };
    return names[type] || type;
  }

  generateWeeklySchedule() {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const today = new Date().getDay();
    this.weeklySchedule = Array.from({ length: 7 }, (_, i) => ({
      dayName: dayNames[(today + i) % 7],
      timeRange: '08:00 - 20:00',
      isToday: i === 0
    }));
  }

  onImageScroll(event: any) {
    const scrollLeft = event.target.scrollLeft;
    const width = event.target.offsetWidth;
    this.currentImageIndex = Math.round(scrollLeft / width);
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'danger', position: 'top',
    });
    toast.present();
  }

  get singleLineSummary(): string {
    // Simple Summary
    if (!this.startSlot || !this.endSlot) return '';
    return `${this.startSlot.timeText} - ${this.endSlot.timeText}`;
  }

  async Reservations(lot?: ParkingLot) {
    const selectedFloorNames = this.floorData
      .filter(f => this.selectedFloorIds.includes(f.id))
      .map(f => f.name).join(',');

    const selectedZoneNames = this.displayZones
      .filter(z => this.isZoneSelected(z.name))
      .map(z => z.name)
      .join(',');

    const modal = await this.modalCtrl.create({
      component: ParkingReservationsComponent,
      componentProps: {
        lot: lot || this.lot, // Use passed lot or current lot
        preSelectedType: this.selectedType,
        preSelectedFloor: selectedFloorNames,
        preSelectedZone: selectedZoneNames,
        selectedZoneIds: this.selectedZoneIds
      }
    });
    await modal.present();
  }
}