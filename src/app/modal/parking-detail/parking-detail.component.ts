import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { ParkingLot } from '../../data/models';
import { PARKING_DETAIL_MOCK_SITES } from '../../data/mock-data';
import { CheckBookingComponent } from '../check-booking/check-booking.component';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';

// --- Interfaces copied from ParkingReservations ---
interface DaySection {
  date: Date;
  dateLabel: string; // Full label for backup
  dayName: string;   // e.g. "Thu"
  dateNumber: string; // e.g. "15"
  timeLabel: string;
  slots: TimeSlot[];
  available: number;
  capacity: number;
}

interface TimeSlot {
  id: string;
  timeText: string;
  dateTime: Date;
  isAvailable: boolean;
  isSelected: boolean;
  isInRange: boolean;
  remaining: number;
  duration?: number;
}

interface ZoneData {
  id: string;
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
}

interface FloorData {
  id: string;
  name: string;
  zones: ZoneData[];
  totalAvailable: number;
  capacity: number;
}

interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
}

interface AggregatedZone {
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
  floorIds: string[];
  ids: string[];
}

@Component({
  selector: 'app-parking-detail',
  templateUrl: './parking-detail.component.html',
  styleUrls: ['./parking-detail.component.scss'],
  standalone: false
})
export class ParkingDetailComponent implements OnInit {

  @Input() lot!: ParkingLot;
  @Input() initialType: string = 'normal';

  mockSites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  selectedType = 'normal';

  // --- Time Selection State ---
  slotInterval: number = 60; // -1 = Full Day, -2 = Half Day
  displayDays: DaySection[] = [];
  selectedDateIndex: number = 0; // NEW: Track selected date
  currentMonthLabel: string = ''; // NEW: Month Year Label (e.g. January 2026)

  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;

  // --- Floor & Zone Data ---
  floorData: FloorData[] = [];

  // Selection State (Multiple Floors)
  selectedFloorIds: string[] = [];

  // Selection State (Multiple Zones - actual IDs)
  selectedZoneIds: string[] = [];

  // Aggregated Zones for Display
  displayZones: AggregatedZone[] = [];

  currentImageIndex = 0;
  isSpecificSlot: boolean = false;

  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) { }

  ngOnInit() {
    this.mockSites = PARKING_DETAIL_MOCK_SITES;

    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    } else if (this.lot.supportedTypes.length > 0) {
      this.selectedType = this.lot.supportedTypes[0];
    }

    this.checkOpenStatus();
    this.generateWeeklySchedule();

    // Generate Time Slots initially
    this.generateTimeSlots();
  }

  // --- Date Selection ---
  selectDate(index: number) {
    this.selectedDateIndex = index;
    // Don't reset selection when changing dates to allow cross-day selection
    // this.startSlot = null;
    // this.endSlot = null;
    // this.floorData = [];

    // Update labels and re-run UI updates to reflect selections on the new date view
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

  // --- Time Selection Logic ---

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
    this.floorData = [];
    this.selectedFloorIds = [];
    this.selectedZoneIds = [];
    this.displayZones = [];
    this.updateMonthLabel();
    this.updateSelectionUI();
  }

  generateTimeSlots() {
    this.displayDays = [];
    const today = new Date();
    // Thai Days (Full Names)
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    // Mock 5 days (Traveloka style: showing fewer days for cleaner look)
    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayIndex = targetDate.getDay();
      const dayName = thaiDays[dayIndex];
      const dateNumber = targetDate.getDate().toString();
      const dateLabel = `${dayName} ${dateNumber}`;

      // Mock capacity/availability
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

      if (this.lot.schedule && this.lot.schedule.length > 0) {
        // Mock
      }

      const slots: TimeSlot[] = [];
      const startTime = new Date(targetDate);
      startTime.setHours(startH, startM, 0, 0);
      const closingTime = new Date(targetDate);
      closingTime.setHours(endH, endM, 0, 0);

      const totalOpenMinutes = Math.floor((closingTime.getTime() - startTime.getTime()) / 60000);

      if (!isOpen) {
        // ... 
      } else {
        if (this.slotInterval === -1) {
          // Full Day
          const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
          const isPast = startTime < new Date();
          let remaining = 0;
          if (!isPast) remaining = Math.floor(Math.random() * dailyCapacity) + 1;

          slots.push({
            id: `${targetDate.toISOString()}-FULL`,
            timeText: timeStr,
            dateTime: new Date(startTime),
            isAvailable: remaining > 0,
            remaining: remaining,
            isSelected: false,
            isInRange: false,
            duration: totalOpenMinutes
          });
        } else if (this.slotInterval === -2) {
          // Half Day logic...
          const halfDuration = Math.floor(totalOpenMinutes / 2);
          const slot1Time = new Date(startTime);
          this.createSingleSlot(slots, targetDate, slot1Time, dailyCapacity, halfDuration);
          const slot2Time = new Date(startTime.getTime() + halfDuration * 60000);
          if (slot2Time < closingTime) {
            this.createSingleSlot(slots, targetDate, slot2Time, dailyCapacity, halfDuration);
          }
        } else {
          // Interval
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
    // Re-run UI update to ensures correct visuals
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
    let remaining = 0;
    if (!isPast) {
      remaining = Math.floor(Math.random() * capacity) + 1;
    }

    slots.push({
      id: `${targetDate.toISOString()}-${timeStr}`,
      timeText: timeStr,
      dateTime: new Date(timeObj),
      isAvailable: remaining > 0,
      remaining: remaining,
      isSelected: false,
      isInRange: false,
      duration: duration
    });
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    if (this.slotInterval < 0) {
      this.startSlot = slot;
      const endTime = new Date(slot.dateTime.getTime() + (slot.duration || 0) * 60000);
      this.endSlot = {
        id: 'auto-end',
        timeText: `${this.pad(endTime.getHours())}:${this.pad(endTime.getMinutes())}`,
        dateTime: endTime,
        isAvailable: true,
        isSelected: true,
        isInRange: false,
        remaining: 0
      };
      this.updateSelectionUI();
      this.generateMockFloorZoneData();
      return;
    }

    // --- Range Selection Logic ---

    // Case 0: No Selection -> Start New
    if (!this.startSlot || !this.endSlot) {
      this.startSlot = slot;
      this.endSlot = slot;
    }

    // Case 1: Single Slot Selected (Start == End)
    else if (this.startSlot.id === this.endSlot.id) {
      if (slot.id === this.startSlot.id) {
        // Clicked same slot -> Deselect (Reset)
        this.resetTimeSelection(false);
        return;
      } else {
        // Clicked different slot -> Form Range
        if (slot.dateTime.getTime() < this.startSlot.dateTime.getTime()) {
          // Clicked before -> Range is [Clicked, Start]
          const oldStart = this.startSlot;
          this.startSlot = slot;
          this.endSlot = oldStart;
        } else {
          // Clicked after -> Range is [Start, Clicked]
          this.endSlot = slot;
        }
      }
    }

    // Case 2: Range Selected (Start != End)
    else {
      // If clicked Start or End -> Reset (User Request)
      if (slot.id === this.startSlot.id || slot.id === this.endSlot.id) {
        this.resetTimeSelection(false);
        return;
      }
      else {
        // Clicked a new 3rd slot -> Start New Single Selection
        this.startSlot = slot;
        this.endSlot = slot;
      }
    }

    this.updateSelectionUI();

    // Generate Floor/Zone data if we have a valid range
    if (this.startSlot && this.endSlot) {
      this.generateMockFloorZoneData();
    } else {
      this.floorData = [];
    }
  }

  get bookingSummary(): string {
    if (!this.startSlot || !this.endSlot) return '';

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const sDate = this.startSlot.dateTime;
    const eSlotVal = this.endSlot;

    // Calculate End Time of the End Slot
    const duration = eSlotVal.duration || this.slotInterval || 60;
    const eDate = new Date(eSlotVal.dateTime.getTime() + duration * 60000);

    const dateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`;
    const timeStr = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())} - ${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;

    let locStr = '';
    if (this.selectedFloorIds.length > 0) {
      const fNames = this.floorData.filter(f => this.selectedFloorIds.includes(f.id)).map(f => f.name.replace('Floor', 'F').replace(' ', '')).join(', ');
      locStr += ` | ${fNames}`;
    }

    if (this.selectedZonesCount > 0) {
      const zNames = this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name.replace('Zone ', 'Zone')).join(', ');
      locStr += ` | ${zNames}`;
    }

    // Handle cross-day text
    if (sDate.getDate() !== eDate.getDate()) {
      const eDateStr = `${eDate.getDate()} ${thaiMonths[eDate.getMonth()]}`;
      return `${dateStr} ${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())} - ${eDateStr} ${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}${locStr}`;
    }

    return `${dateStr} ${timeStr}${locStr}`;
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        // Safe check for nulls
        const isStart = !!this.startSlot && s.id === this.startSlot.id;
        const isEnd = !!this.endSlot && s.id === this.endSlot.id;
        s.isSelected = isStart || isEnd;

        if (this.startSlot && this.endSlot) {
          // Check range using raw time values
          s.isInRange = s.dateTime.getTime() > this.startSlot.dateTime.getTime() &&
            s.dateTime.getTime() < this.endSlot.dateTime.getTime();

          // Explicitly exclude start/end from in-range visual (they have their own Selected style)
          if (s.id === this.startSlot.id || s.id === this.endSlot.id) {
            s.isInRange = false;
          }
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  // --- Mock Data Generation ---

  generateMockFloorZoneData() {
    this.floorData = [];
    if (!this.startSlot || !this.endSlot) return;

    const floors = (this.lot.floors && this.lot.floors.length > 0) ? this.lot.floors : ['F1', 'F2'];
    const zoneNames = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H', 'Zone I'];

    let totalAvail = this.getCurrentAvailable();
    totalAvail = Math.floor(totalAvail * (0.5 + Math.random() * 0.5));

    floors.forEach((floorName: string) => {
      const zones: ZoneData[] = [];
      let floorAvailCounter = 0;
      const zonesToGenerate = zoneNames.length;
      const capacityPerZone = Math.ceil(this.getCurrentCapacity() / (floors.length * zonesToGenerate)) || 10;

      zoneNames.forEach(zName => {
        let avail = 0;
        if (totalAvail > 0) {
          const maxRandom = Math.min(totalAvail, capacityPerZone);
          avail = Math.floor(Math.random() * (maxRandom + 1));
          totalAvail -= avail;
          floorAvailCounter += avail;
        }

        zones.push({
          id: `${this.lot.id}-${floorName}-${zName}`,
          name: zName,
          available: avail,
          capacity: capacityPerZone,
          status: avail === 0 ? 'full' : 'available'
        });
      });

      this.floorData.push({
        id: floorName,
        name: floorName,
        zones: zones,
        totalAvailable: floorAvailCounter,
        capacity: capacityPerZone * zonesToGenerate
      });
    });

    // Default Select First Floor
    if (this.floorData.length > 0) {
      this.selectedFloorIds = [this.floorData[0].id];
      this.updateDisplayZones();
      this.clearAllZones();
    }
  }

  // --- Floor Selection (Multiple) ---
  toggleFloor(floor: FloorData) {
    if (this.isFloorSelected(floor.id)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(id => id !== floor.id);
    } else {
      this.selectedFloorIds.push(floor.id);
    }
    this.updateDisplayZones();
    this.clearAllZones();
  }

  selectAllFloors() {
    this.selectedFloorIds = this.floorData.map(f => f.id);
    this.updateDisplayZones();
    this.clearAllZones();
  }

  clearAllFloors() {
    this.selectedFloorIds = [];
    this.updateDisplayZones();
    this.clearAllZones();
  }

  isFloorSelected(floorId: string): boolean {
    return this.selectedFloorIds.includes(floorId);
  }

  isAllFloorsSelected(): boolean {
    return this.floorData.length > 0 && this.selectedFloorIds.length === this.floorData.length;
  }

  // --- Zone Aggregation Logic ---
  updateDisplayZones() {
    const aggMap = new Map<string, AggregatedZone>();

    this.selectedFloorIds.forEach(fid => {
      const floor = this.floorData.find(f => f.id === fid);
      if (floor) {
        floor.zones.forEach(z => {
          if (!aggMap.has(z.name)) {
            aggMap.set(z.name, {
              name: z.name,
              available: 0,
              capacity: 0,
              status: 'full',
              floorIds: [],
              ids: []
            });
          }
          const agg = aggMap.get(z.name)!;
          agg.available += z.available;
          agg.capacity += z.capacity;
          agg.floorIds.push(fid);
          agg.ids.push(z.id);

          if (agg.available > 0) agg.status = 'available';
        });
      }
    });

    this.displayZones = Array.from(aggMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- Zone Selection (Multiple) ---
  toggleZone(aggZone: AggregatedZone) {
    const isSelected = this.isZoneSelected(aggZone.name);

    if (isSelected) {
      this.selectedZoneIds = this.selectedZoneIds.filter(id => !aggZone.ids.includes(id));
    } else {
      const newIds = aggZone.ids.filter(id => !this.selectedZoneIds.includes(id));
      this.selectedZoneIds = [...this.selectedZoneIds, ...newIds];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  selectAllZones() {
    this.selectedZoneIds = [];
    this.displayZones.forEach(z => {
      if (z.status !== 'full') {
        this.selectedZoneIds.push(...z.ids);
      }
    });
  }

  clearAllZones() {
    this.selectedZoneIds = [];
  }

  isAllZonesSelected(): boolean {
    const availableAggZones = this.displayZones.filter(z => z.status !== 'full');
    if (availableAggZones.length === 0) return false;
    return availableAggZones.every(z => this.isZoneSelected(z.name));
  }

  get selectedZonesCount(): number {
    return this.displayZones.filter(z => this.isZoneSelected(z.name)).length;
  }

  // --- General ---
  selectSite(site: ParkingLot) {
    this.lot = site;
    if (this.lot.supportedTypes.length > 0 && !this.lot.supportedTypes.includes(this.selectedType)) {
      this.selectedType = this.lot.supportedTypes[0];
    }
    this.checkOpenStatus();
    this.generateWeeklySchedule();
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if (popover) popover.dismiss();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if (popover) popover.dismiss();
  }

  async Reservations() {
    if (!this.startSlot || !this.endSlot) {
      this.presentToast('กรุณาเลือกเวลา');
      return;
    }

    let data: any = {
      siteName: this.lot.name,
      selectedType: this.selectedType,
      selectedFloors: this.selectedFloorIds,
      selectedZones: this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name),
      startSlot: this.startSlot,
      endSlot: this.endSlot,
      isSpecificSlot: this.isSpecificSlot,
      isRandomSystem: !this.isSpecificSlot
    };

    try {
      if (this.isSpecificSlot) {
        const modal = await this.modalCtrl.create({
          component: BookingSlotComponent,
          componentProps: {
            data: {
              ...data,
              selectedFloor: this.selectedFloorIds[0],
              selectedZone: data.selectedZones[0]
            }
          },
          initialBreakpoint: 1,
          breakpoints: [0, 1],
          backdropDismiss: true,
        });
        await modal.present();
      } else {
        const modal = await this.modalCtrl.create({
          component: CheckBookingComponent,
          componentProps: {
            data: { ...data, isSpecificSlot: true }
          },
          initialBreakpoint: 1,
          breakpoints: [0, 0.5, 1],
          backdropDismiss: true,
          cssClass: 'detail-sheet-modal',
        });
        await modal.present();
      }
    } catch (err) {
      console.error('Error showing booking modal', err);
    }
  }

  // Helpers
  onImageScroll(event: any) {
    const scrollLeft = event.target.scrollLeft;
    const width = event.target.offsetWidth;
    this.currentImageIndex = Math.round(scrollLeft / width);
  }

  pad(num: number): string { return num < 10 ? '0' + num : num.toString(); }
  dismiss() { this.modalCtrl.dismiss(); }
  checkOpenStatus() { this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low'; }
  getCurrentCapacity(): number { return (this.lot.capacity as any)[this.selectedType] || 0; }
  getCurrentAvailable(): number { return (this.lot.available as any)[this.selectedType] || 0; }
  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถทั่วไป';
      case 'ev': return 'รถ EV';
      case 'motorcycle': return 'มอเตอร์ไซค์';
      default: return type;
    }
  }

  generateWeeklySchedule() {
    const today = new Date().getDay();
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    this.weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7;
      this.weeklySchedule.push({
        dayName: dayNames[dayIndex],
        timeRange: '08:00 - 20:00',
        isToday: i === 0
      });
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'danger', position: 'top',
    });
    toast.present();
  }
}