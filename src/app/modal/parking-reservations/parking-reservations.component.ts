import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

// ... Interfaces เดิม (DaySection, TimeSlot) ...
interface DaySection {
  date: Date;
  dateLabel: string;
  slots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  timeText: string;
  dateTime: Date;
  isAvailable: boolean;
  isSelected: boolean;
  isInRange: boolean;
}

@Component({
  selector: 'app-parking-reservations',
  templateUrl: './parking-reservations.component.html',
  styleUrls: ['./parking-reservations.component.scss'],
  standalone: false,
})
export class ParkingReservationsComponent implements OnInit {

  @Input() lot: any;
  @Input() preSelectedType: string = 'normal';
  @Input() preSelectedFloor: string = 'any'; // Default 'any'

  // Mock Site List
  mockSites = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)' },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)' },
    { id: 'moto_dorm', name: 'โรงจอดมอไซค์ หอพักชาย' },
    { id: 'eng_building', name: 'ตึกวิศวกรรมศาสตร์' }
  ];
  currentSiteName: string = '';

  // Selection State
  selectedType: string = 'normal';
  selectedFloor: string = 'any';
  selectedZone: string = 'any';
  slotInterval: number = 60;

  // Data
  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C'],
    'Floor 2': ['Zone D', 'Zone E'],
    'Floor 3': ['Zone F']
  };
  availableFloors: string[] = [];
  availableZones: string[] = [];
  displayDays: DaySection[] = [];
  
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;
  selectedTypeText = 'รถทั่วไป';

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.currentSiteName = this.lot.name;
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    // Init Floors
    if (this.lot.floors && this.lot.floors.length > 0) {
      this.availableFloors = this.lot.floors;
    } else {
      this.availableFloors = ['Floor 1', 'Floor 2'];
    }
    
    // Set Initial Selection
    this.selectedFloor = this.preSelectedFloor || 'any';
    this.updateAvailableZones(); // คำนวณ Zone

    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(); }

  // --- Site Selection ---
  selectSite(site: any) {
    this.currentSiteName = site.name;
    this.resetSelection();
    this.dismissPopover('site-popover');
  }

  // --- Type Selection ---
  selectType(type: string) {
    this.selectedType = type;
    this.updateTypeText();
    this.resetSelection();
    this.generateData();
    this.dismissPopover('type-popover');
  }

  // --- Floor & Zone ---
  selectFloor(floor: string) {
    this.selectedFloor = floor;
    this.selectedZone = 'any'; // Reset zone เมื่อเปลี่ยนชั้น
    this.updateAvailableZones();
    
    this.resetSelection();
    this.generateData();
    this.dismissPopover('floor-popover');
  }

  selectZone(zone: string) {
    this.selectedZone = zone;
    this.resetSelection();
    this.generateData();
    this.dismissPopover('zone-popover');
  }

  updateAvailableZones() {
    if (this.selectedFloor === 'any') {
      // รวมทุก Zone
      const allZones = new Set<string>();
      Object.values(this.zonesMap).forEach(zs => zs.forEach(z => allZones.add(z)));
      this.availableZones = Array.from(allZones).sort();
    } else {
      // เฉพาะ Zone ของชั้นนั้น
      this.availableZones = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];
    }
  }

  // --- Interval ---
  selectInterval(minutes: number) {
    this.slotInterval = minutes;
    this.resetSelection();
    this.generateData();
    this.dismissPopover('interval-popover');
  }

  // ... helpers (updateTypeText, dismissPopover) ...
  private updateTypeText() {
    if (this.selectedType === 'normal') this.selectedTypeText = 'รถทั่วไป';
    else if (this.selectedType === 'ev') this.selectedTypeText = 'EV';
    else this.selectedTypeText = 'มอเตอร์ไซค์';
  }

  private dismissPopover(id: string) {
    const popover = document.querySelector(`ion-popover#${id}`) as any;
    if (popover) popover.dismiss();
  }

  // --- Data Logic ---
  generateData() {
    this.displayDays = [];
    const today = new Date();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      const dayName = thaiDays[targetDate.getDay()];
      const dateNum = targetDate.getDate();
      const dateLabel = `${dayName} ${dateNum}`; // "พุธ 26"

      const slots: TimeSlot[] = [];
      const startHour = 6;
      const endHour = 22;
      
      let currentBtnTime = new Date(targetDate);
      currentBtnTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(targetDate);
      endTime.setHours(endHour, 0, 0, 0);

      while (currentBtnTime < endTime) {
        const timeStr = `${this.pad(currentBtnTime.getHours())}:${this.pad(currentBtnTime.getMinutes())}`;
        
        // Mock: ถ้าเลือก Floor/Zone เจาะจง โอกาสว่างน้อยลง
        const isPast = currentBtnTime < new Date(); 
        let chance = 0.8;
        if (this.selectedFloor !== 'any') chance -= 0.1;
        
        const isFull = Math.random() > chance;

        slots.push({
          id: `${targetDate.toISOString()}-${timeStr}`,
          timeText: timeStr,
          dateTime: new Date(currentBtnTime),
          isAvailable: !isPast && !isFull,
          isSelected: false,
          isInRange: false
        });

        currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
      }

      this.displayDays.push({
        date: targetDate,
        dateLabel: dateLabel,
        slots: slots
      } as any);
    }
    this.updateSelectionUI();
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    if (!this.startSlot || (this.startSlot && this.endSlot)) {
      this.startSlot = slot;
      this.endSlot = null;
    } else {
      if (slot.dateTime > this.startSlot.dateTime) {
        this.endSlot = slot;
      } else {
        this.startSlot = slot;
        this.endSlot = null;
      }
    }
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        s.isSelected = (!!this.startSlot && s.id === this.startSlot.id) || 
                       (!!this.endSlot && s.id === this.endSlot.id);
        if (this.startSlot && this.endSlot) {
          s.isInRange = s.dateTime > this.startSlot.dateTime && s.dateTime < this.endSlot.dateTime;
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  resetSelection() {
    this.startSlot = null;
    this.endSlot = null;
  }

  pad(n: number) { return n < 10 ? '0' + n : n; }

  confirmBooking() {
    this.modalCtrl.dismiss({
      selectedType: this.selectedType,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedZone,
      startSlot: this.startSlot,
      endSlot: this.endSlot
    }, 'booking');
  }
}