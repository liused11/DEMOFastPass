import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

interface ParkingSlot {
  id: string;
  label: string;
  status: 'available' | 'booked' | 'selected';
  type?: string;
  floor: string; // Added floor to slot interface
  zone: string;
}

@Component({
  selector: 'app-booking-slot',
  templateUrl: './booking-slot.component.html',
  styleUrls: ['./booking-slot.component.scss'],
  standalone: false,
})
export class BookingSlotComponent implements OnInit {
  @Input() data: any; // data from ParkingReservationsComponent

  // Display Variables
  siteName: string = '';
  timeString: string = '';
  
  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3'];
  zones: string[] = []; // Zones for the selected floor
  
  selectedFloor: string = 'Floor 1';
  selectedZone: string = '';

  // Zones Map (Should ideally match the one in ParkingReservations or come from API)
  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C'],
    'Floor 2': ['Zone D', 'Zone E'],
    'Floor 3': ['Zone F']
  };
  
  allSlots: ParkingSlot[] = []; // All generated slots
  visibleSlots: ParkingSlot[] = []; // Slots currently displayed based on Floor/Zone
  selectedSlot: ParkingSlot | null = null; // Stays selected even if not visible

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.data) {
        this.siteName = this.data.siteName || 'Unknown Site';
        if (this.data.startSlot && this.data.endSlot) {
            this.timeString = `${this.data.startSlot.timeText} - ${this.data.endSlot.timeText}`;
        }
        
        if (this.data.selectedFloor && this.data.selectedFloor !== 'any') {
            this.selectedFloor = this.data.selectedFloor;
        }
        
        // Update Zones based on floor
        this.updateZones();

        if (this.data.selectedZone && this.data.selectedZone !== 'any') {
            this.selectedZone = this.data.selectedZone;
        } else if (this.zones.length > 0) {
            this.selectedZone = this.zones[0];
        }
    }
    
    this.generateSlots();
    this.filterSlots();
  }

  updateZones() {
      this.zones = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];
      if (!this.zones.includes(this.selectedZone)) {
          this.selectedZone = this.zones[0];
      }
  }

  get availableCount(): number {
      return this.visibleSlots.filter(s => s.status === 'available' || (s.status === 'selected' && s.id === this.selectedSlot?.id)).length;
  }

  generateSlots() {
    this.allSlots = [];
    
    Object.keys(this.zonesMap).forEach(floor => {
        const floorZones = this.zonesMap[floor];
        floorZones.forEach(zone => {
            const totalSlotsPerZone = 12; // Mock number
            for (let i = 1; i <= totalSlotsPerZone; i++) {
                const isBooked = Math.random() < 0.3; // Random booked
                this.allSlots.push({
                  id: `${floor}-${zone}-${i}`,
                  // Removed "Zone" prefix from label
                  label: `${zone.replace('Zone ', '')}${i.toString().padStart(2, '0')}`,
                  status: isBooked ? 'booked' : 'available',
                  floor: floor, // Storing floor for filtering
                  zone: zone,
                });
            }
        });
    });
  }

  filterSlots() {
      // Filter slots based on the currently selected floor and zone
      this.visibleSlots = this.allSlots.filter(s => s.floor === this.selectedFloor && s.zone === this.selectedZone);

      // Reapply selected state to the visible slots if the selectedSlot is still valid
      this.visibleSlots.forEach(s => {
          if (this.selectedSlot && s.id === this.selectedSlot.id) {
              s.status = 'selected';
          } else if (s.status === 'selected') { // Reset if it was previously selected but not the current selection
              s.status = 'available';
          }
      });
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    // Do NOT reset selectedSlot here, it should persist
    this.updateZones();
    this.filterSlots();
  }

  selectZone(zone: string) {
      this.selectedZone = zone;
      // Do NOT reset selectedSlot here, it should persist
      this.filterSlots();
  }

  onSelectSlot(slot: ParkingSlot) {
    if (slot.status === 'booked') return;

    // Deselect old if it exists and is not the current slot
    if (this.selectedSlot && this.selectedSlot.id !== slot.id) {
      // Find the old selected slot in allSlots and reset its status
      const oldSlotInAll = this.allSlots.find(s => s.id === this.selectedSlot?.id);
      if (oldSlotInAll) {
          oldSlotInAll.status = 'available';
      }
      // Also update its status in visibleSlots if it was visible
      const oldSlotInVisible = this.visibleSlots.find(s => s.id === this.selectedSlot?.id);
      if (oldSlotInVisible) {
          oldSlotInVisible.status = 'available';
      }
    }

    // Select new
    this.selectedSlot = slot;
    // Update status in allSlots as well for persistence
    const newSlotInAll = this.allSlots.find(s => s.id === slot.id);
    if (newSlotInAll) {
        newSlotInAll.status = 'selected';
    }
    // Update status in visibleSlots
    slot.status = 'selected';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async confirmSelection() {
    if (!this.selectedSlot) return;

    const nextData = {
      ...this.data,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedZone, // Pass updated zone back
      selectedSlotId: this.selectedSlot.label, // Use the cleaned label
      isSpecificSlot: true
    };

    this.modalCtrl.dismiss(); 
    
    const modal = await this.modalCtrl.create({
      component: CheckBookingComponent,
      componentProps: { data: nextData },
      initialBreakpoint: 1,
      breakpoints: [0, 0.5, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
  }
}