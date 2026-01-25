import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { ParkingLot, Booking } from '../../data/models';
import { ParkingDataService } from '../../services/parking-data.service';
import { PARKING_DETAIL_MOCK_SITES } from '../../data/mock-data';
import { CheckBookingComponent } from '../check-booking/check-booking.component';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { ReservationService } from '../../services/reservation.service';

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
  @Input() bookingMode: 'daily' | 'monthly' | 'flat24' | 'monthly_night' = 'daily';

  mockSites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  selectedType = 'normal';

  // --- Time Selection State ---
  slotInterval: number = 60; // -1 = Full Day, -2 = Half Day
  displayDays: DaySection[] = [];
  selectedDateIndex: number = 0; // NEW: Track selected date
  currentMonthLabel: string = ''; // NEW: Month Year Label (e.g. January 2026)
  currentDisplayedDate: Date = new Date(); // NEW: For Month Navigation

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
  isSpecificSlot: boolean = true; // Default to true per user intent (selecting zones)
  isCrossDay: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private parkingService: ParkingDataService,
    private reservationService: ReservationService,
    private router: Router
  ) { }

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
    // this.updateMonthLabel(); // Removed: specific to slot gen now
    this.updateSelectionUI();
  }

  // --- Month Navigation ---
  changeMonth(offset: number) {
    const newDate = new Date(this.currentDisplayedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    this.currentDisplayedDate = newDate;

    // Reset selection when changing month in Monthly mode? Maybe yes.
    // this.resetTimeSelection(); // Optional: Keep it or clear it. 
    this.generateTimeSlots();
  }

  updateMonthLabel() {
    // Label is now set in generateTimeSlots for Monthly, or dynamic for Daily
    if (this.bookingMode === 'daily' || this.bookingMode === 'flat24') {
      if (this.displayDays.length > 0 && this.displayDays[this.selectedDateIndex]) {
        const date = this.displayDays[this.selectedDateIndex].date;
        const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        this.currentMonthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
      }
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

  toggleCrossDay() {
    this.isCrossDay = !this.isCrossDay;
    if (this.isCrossDay) {
      setTimeout(() => {
        const el = document.getElementById('time-selection-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Adjusted to center
        }
      }, 100);
    }
  }

  resetTimeSelection(fullReset: boolean = true) {
    this.startSlot = null;
    this.endSlot = null;
    if (fullReset) {
      this.selectedDateIndex = 0;
      // Do NOT reset currentDisplayedDate here, keep invisible state
    }
    this.floorData = [];
    this.selectedFloorIds = [];
    this.selectedZoneIds = [];
    this.displayZones = [];
    this.updateSelectionUI();
  }

  generateTimeSlots() {
    this.displayDays = [];
    // Use currentDisplayedDate for Monthly, today for others (unless we want navigable daily?) 
    // Usually Daily starts from Today.
    const baseDate = (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') ? this.currentDisplayedDate : new Date();

    // Thai Days (Full Names)
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') {
      // --- MONTHLY MODE: REAL CALENDAR VIEW ---
      this.currentMonthLabel = `${thaiMonths[baseDate.getMonth()]} ${baseDate.getFullYear() + 543}`;

      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Calculate padding (0=Sun, 6=Sat)
      const startDay = firstDay.getDay();

      // Add Emtpy Slots for Padding
      for (let i = 0; i < startDay; i++) {
        this.displayDays.push({
          date: new Date(year, month, 0), // Dummy
          dateLabel: '',
          dayName: '',
          dateNumber: '',
          timeLabel: 'padding',
          slots: [], // Empty slots = Padding
          available: 0,
          capacity: 0
        });
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const targetDate = new Date(year, month, i);
        const dayIndex = targetDate.getDay();
        const dailyCapacity = this.getCurrentCapacity();

        // Mock Available
        const dailyAvailable = Math.floor(dailyCapacity * (0.8 + Math.random() * 0.2));

        const timeStr = this.bookingMode === 'monthly' ? 'เริ่มสัญญา' : 'เริ่ม 18:00';

        const slots: TimeSlot[] = [{
          id: `${targetDate.toISOString()}-MONTHLY`,
          timeText: timeStr,
          dateTime: new Date(targetDate),
          isAvailable: true,
          remaining: dailyAvailable,
          isSelected: false,
          isInRange: false,
          duration: 0
        }];

        this.displayDays.push({
          date: targetDate,
          dateLabel: `${i}`,
          dayName: thaiDays[dayIndex],
          dateNumber: i.toString(),
          timeLabel: 'ว่าง',
          slots: slots,
          available: dailyAvailable,
          capacity: dailyCapacity
        });
      }

    } else {
      // --- DAILY / HOURLY / 24H MODE ---
      // Use Today for these modes
      const today = new Date();

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

          // --- ADAPTED LOGIC FOR BOOKING MODES ---
          if (this.bookingMode === 'flat24') {
            // 24H Flat Rate: Similar to Full Day but fixed 24h
            const timeStr = 'เหมาจ่าย 24 ชม.';
            // const isPast = startTime < new Date(); // Not used for flat24 availability mock

            slots.push({
              id: `${targetDate.toISOString()}-FLAT24`,
              timeText: timeStr,
              dateTime: new Date(startTime),
              isAvailable: true,
              remaining: 5,
              isSelected: false,
              isInRange: false,
              duration: 1440 // 24 Hours
            });

          } else if (this.slotInterval === -1) {
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
      this.updateMonthLabel(); // Only for daily modes
    }

    this.updateSelectionUI();
  }

  // --- Date Picker Handler ---
  onMonthSelected(event: any) {
    const val = event.detail.value;
    if (val) {
      this.currentDisplayedDate = new Date(val);
      this.generateTimeSlots();
      // Dismiss popover programmatically if needed, or let backdrop handle it
      const popover = document.querySelector('ion-popover.date-picker-popover') as any;
      if (popover) popover.dismiss();
    }
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

    // --- REFINED SELECTION LOGIC ---
    if (this.bookingMode === 'daily') {
      // Range Selection for Daily
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
    } else {
      // SINGLE SELECTION for Monthly, MonthlyNight, Flat24
      // Just click to select
      this.startSlot = slot;
      this.endSlot = slot; // Physically same slot, logic handles duration later
    }

    this.updateSelectionUI();

    // Generate Floor/Zone data if we have a valid range
    if (this.startSlot && this.endSlot) {
      this.generateMockFloorZoneData();

      // Auto-Scroll to Location Section
      setTimeout(() => {
        const el = document.getElementById('location-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      this.floorData = [];
    }
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

  // --- Floor Selection (Single) ---
  toggleFloor(floor: FloorData) {
    // Single Selection Mode: Always replace
    if (this.isFloorSelected(floor.id)) {
      // Optional: Allow deselecting if clicking the same one? 
      // User said "Select only one", implies radio behavior usually. 
      // But let's allow deselecting to be safe, or just keep it selected.
      // Let's allow deselecting for now.
      this.selectedFloorIds = [];
    } else {
      this.selectedFloorIds = [floor.id];
    }
    this.updateDisplayZones();
    this.clearAllZones();
  }

  selectAllFloors() {
    // Removed feature
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
    return false; // Feature removed
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

  // --- Zone Selection (Single) ---
  toggleZone(aggZone: AggregatedZone) {
    const isSelected = this.isZoneSelected(aggZone.name);

    if (isSelected) {
      this.selectedZoneIds = [];
    } else {
      // Single Selection: Replace all
      this.selectedZoneIds = [...aggZone.ids];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  selectAllZones() {
    // Removed
  }

  clearAllZones() {
    this.selectedZoneIds = [];
  }

  isAllZonesSelected(): boolean {
    return false;
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

  selectBookingMode(mode: 'daily' | 'monthly' | 'flat24' | 'monthly_night') {
    this.bookingMode = mode;
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.mode-popover') as any;
    if (popover) popover.dismiss();

    this.isCrossDay = false; // Always reset CrossDay when changing mode
  }

  // --- Single Line Summary ---
  // --- Single Line Summary ---
  get singleLineSummary(): string {
    if (!this.startSlot || !this.endSlot) return '';

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const sDate = this.startSlot.dateTime;

    // --- ADAPTED SUMMARY FOR MODES ---
    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') {
      // Monthly: Show Start - End Date (End of Month)
      const lastDay = new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0); // End of month
      const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]} ${sDate.getFullYear() + 543}`;
      const eDateStr = `${lastDay.getDate()} ${thaiMonths[lastDay.getMonth()]} ${lastDay.getFullYear() + 543}`;

      return `สิทธิ์วันที่ ${sDateStr} - ${eDateStr} (${this.getModeLabel()})`;
    }

    if (this.bookingMode === 'flat24') {
      const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`;
      const sTimeStr = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())}`;
      return `เริ่ม ${sDateStr} ${sTimeStr} (+24 ชม.) | ${this.getModeLabel()}`;
    }

    const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`;
    const sTimeStr = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())}`;

    const eSlotVal = this.endSlot;
    const duration = eSlotVal.duration || this.slotInterval || 60;
    const eDate = new Date(eSlotVal.dateTime.getTime() + duration * 60000);

    let datePart = '';

    if (sDate.getDate() !== eDate.getDate()) {
      // Cross Day: "13 ม.ค. 19:00 - 14 ม.ค. 08:00"
      const eDateStr = `${eDate.getDate()} ${thaiMonths[eDate.getMonth()]}`;
      const eTimeStr = `${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;
      datePart = `${sDateStr} ${sTimeStr} - ${eDateStr} ${eTimeStr}`;
    } else {
      // Single Day: "13 ม.ค. 19:00 - 20:00"
      const eTimeStr = `${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;
      datePart = `${sDateStr} ${sTimeStr} - ${eTimeStr}`;
    }

    // Location Part
    if (this.selectedFloorIds.length === 0) return datePart;

    const fNames = this.floorData.filter(f => this.selectedFloorIds.includes(f.id)).map(f => f.name.replace('Floor', 'F').replace(' ', '')).join(', ');
    let zNames = '';
    if (this.selectedZonesCount > 0) {
      zNames = this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name.replace('Zone ', '')).join(', ');
    } else {
      zNames = '-';
    }

    return `${datePart} | ชั้น ${fNames} Zone ${zNames}`;
  }

  getModeLabel(): string {
    switch (this.bookingMode) {
      case 'monthly': return 'รายเดือน';
      case 'monthly_night': return 'รายเดือน Night';
      case 'flat24': return 'เหมา 24 ชม.';
      default: return 'รายชั่วโมง';
    }
  }

  get locationSummary(): string {
    if (this.selectedFloorIds.length === 0) return '';

    const fNames = this.floorData.filter(f => this.selectedFloorIds.includes(f.id)).map(f => f.name.replace('Floor', 'F').replace(' ', '')).join(', ');

    let zNames = '';
    if (this.selectedZonesCount > 0) {
      zNames = this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name.replace('Zone ', '')).join(', ');
    } else {
      zNames = '-';
    }
    return `ชั้น ${fNames} | Zone ${zNames}`;
  }

  async Reservations() {
    if (!this.startSlot || !this.endSlot) {
      this.presentToast('กรุณาเลือกเวลา');
      return;
    }

    // Validate Zone Selection
    if (this.selectedZoneIds.length === 0) {
      this.presentToast('กรุณาเลือกโซน');
      return;
    }

    // --- LOGIC FOR BOOKING MODES ---
    let finalStart = new Date(this.startSlot.dateTime);
    let finalEnd = new Date(this.endSlot.dateTime);

    if (this.bookingMode === 'monthly') {
      // Monthly: End of Month of the selected start date
      // e.g. Start 15 Jan -> End 31 Jan ? Or 1 Month from now? 
      // User Requirement: "Monthly" usually means "Calendar Month" or "30 days".
      // Let's assume Calendar Month for now based on UI (selecting a month) or 30 days?
      // User asked to select "Start Date", implying it runs for a month?
      // Let's set it to Last Day of that Month.
      finalEnd = new Date(finalStart.getFullYear(), finalStart.getMonth() + 1, 0);
      finalEnd.setHours(23, 59, 59, 999);
    }
    else if (this.bookingMode === 'monthly_night') {
      // Fixed Time: 18:00 - 08:00 (Next Day) - BUT for a WHOLE MONTH?
      // "Monthly Night" usually means you have rights every night for a month.
      // But for a single booking objects... usually we book "The Right".
      // Let's set the "Booking Period" as the whole month.
      // And description says "Night Only".
      finalStart.setHours(18, 0, 0, 0); // Start of Rights
      finalEnd = new Date(finalStart.getFullYear(), finalStart.getMonth() + 1, 0); // End of Month
      finalEnd.setHours(8, 0, 0, 0); // End of Rights on last day?
    }
    else if (this.bookingMode === 'flat24') {
      // 24 Hours from selection
      finalEnd = new Date(finalStart.getTime() + (24 * 60 * 60 * 1000));
    } else {
        if (finalEnd.getTime() <= finalStart.getTime()) {
             finalEnd = new Date(finalStart.getTime() + (60 * 60 * 1000));
        }
    }

    let data: any = {
      siteId: this.lot.id,
      siteName: this.lot.name,
      selectedType: this.selectedType,
      selectedFloors: this.selectedFloorIds,
      selectedZones: this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name),
      startSlot: { ...this.startSlot, dateTime: finalStart }, // Override time
      endSlot: { ...this.endSlot, dateTime: finalEnd },     // Override time
      isSpecificSlot: true,
      isRandomSystem: false,
      bookingMode: this.bookingMode,
      price: this.calculatePrice(finalStart, finalEnd) // Helper to calculate rough price
    };

    try {
      // Direct Navigation to CheckBookingComponent (Summary Page)
      const modal = await this.modalCtrl.create({
        component: CheckBookingComponent,
        componentProps: {
          data: { ...data }
        },
        initialBreakpoint: 1,
        breakpoints: [0, 0.5, 1],
        backdropDismiss: true,
        cssClass: 'detail-sheet-modal',
      });
      await modal.present();

      const { data: result, role } = await modal.onDidDismiss();
      if (role === 'confirm' && result && result.confirmed) {
        const bookingData = result.data;
        const newBooking: Booking = {
          id: 'BK-' + new Date().getTime(),
          placeName: bookingData.siteName,
          locationDetails: `ชั้น ${bookingData.selectedFloors[0]} | โซน ${bookingData.selectedZones[0]} | ${bookingData.selectedSlotId}`,
          bookingTime: bookingData.startSlot.dateTime,
          endTime: bookingData.endSlot.dateTime,
          status: bookingData.status,
          statusLabel: bookingData.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอการชำระเงิน',
          price: bookingData.price,
          carBrand: 'TOYOTA YARIS', // Mock default
          licensePlate: '1กข 1234', // Mock default
          bookingType: bookingData.bookingMode || 'daily',
        };

        this.parkingService.addBooking(newBooking);
        try {
            await this.reservationService.createReservation(
                newBooking,
                this.reservationService.getTestUserId(),
                this.lot.id,
                bookingData.selectedFloors[0],
                bookingData.selectedSlotId
            );
            console.log('Saved to Supabase');
            this.router.navigate(['/tabs/tab2']);

        } catch (e: any) {
            console.error('Supabase Save Failed', e);
            if (e.message && e.message.includes('already booked')) {
                this.presentToast('ขออภัย ช่องนี้เพิ่งมีผู้จองตัดหน้า กรุณาเลือกช่องใหม่');
            } else {
                this.presentToast('บันทึกข้อมูลไม่สำเร็จ: ' + (e.message || 'Unknown Error'));
            }
        }
      }

    } catch (err) {
      console.error('Error showing booking modal', err);
    }
  }

  calculatePrice(start: Date, end: Date): number {
    // Mock Pricing Logic
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') return 1500;
    if (this.bookingMode === 'flat24') return 200;
    return hours * 20; // 20 THB/hr
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