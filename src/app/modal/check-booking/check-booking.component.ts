import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-check-booking',
  templateUrl: './check-booking.component.html',
  styleUrls: ['./check-booking.component.scss'],
  standalone: false,
})
export class CheckBookingComponent implements OnInit {
  @Input() data: any;

  durationText: string = '';
  timeDisplay: string = '';
  totalPrice: number = 0;
  hourlyRate: number = 20; // 20 THB per hour

  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3'];
  availableZones: string[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];

  assignedFloor: string = '';
  assignedZone: string = '';

  parkingData: { [floor: string]: { [zone: string]: any[] } } = {};

  zonePriority: { [key: string]: number } = {
    'Zone A': 1, 'Zone B': 2, 'Zone C': 3, 'Zone D': 4, 'Zone E': 5
  };
  floorPriority: { [key: string]: number } = {
    'Floor 1': 1, 'Floor 2': 2, 'Floor 3': 3
  };

  paymentMethods = [
    { id: 'promptpay', name: 'PromptPay', icon: 'qr-code-outline', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'creditcard', name: 'Credit Card', icon: 'card-outline', color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'wallet', name: 'TrueMoney', icon: 'wallet-outline', color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'pay_later', name: 'จ่ายทีหลัง (Pay Later)', icon: 'time-outline', color: 'text-gray-600', bg: 'bg-gray-100' }
  ];
  selectedPaymentMethod: string = 'promptpay';

  constructor(private modalCtrl: ModalController, private toastCtrl: ToastController) { }

  ngOnInit() {
    this.calculateDurationAndPrice();

    if (!this.data.selectedFloors) this.data.selectedFloors = [];
    if (!this.data.selectedZones) this.data.selectedZones = [];

    if (typeof this.data.selectedFloors === 'string') {
      this.data.selectedFloors = this.data.selectedFloors === 'any'
        ? [...this.floors]
        : this.data.selectedFloors.split(',').map((s: string) => s.trim());
    }
    if (typeof this.data.selectedZones === 'string') {
      this.data.selectedZones = this.data.selectedZones === 'any'
        ? [...this.availableZones]
        : this.data.selectedZones.split(',').map((s: string) => s.trim());
    }

    if (this.data.selectedFloors.length > 0) {
      this.floors = [...this.data.selectedFloors];
    }
    if (this.data.selectedZones.length > 0) {
      this.availableZones = [...this.data.selectedZones];
    }

    this.initMockParkingData();

    if (this.data.isRandomSystem || !this.data.selectedSlotId) {
      this.randomizeSlot();
    } else {
      this.assignedFloor = this.data.selectedFloor || (this.data.selectedFloors.length === 1 ? this.data.selectedFloors[0] : '');
      this.assignedZone = this.data.selectedZone || (this.data.selectedZones.length === 1 ? this.data.selectedZones[0] : '');
    }
  }





  initMockParkingData() {
    this.floors.forEach(floor => {
      this.parkingData[floor] = {};
      this.availableZones.forEach(zone => {
        const slots = [];
        const totalSlots = 12;
        for (let i = 1; i <= totalSlots; i++) {
          const isBooked = Math.random() < 0.3;
          if (!isBooked) {
            slots.push({
              i: i,
              label: `${zone.replace('Zone ', '')}${i.toString().padStart(2, '0')}`
            });
          }
        }
        this.parkingData[floor][zone] = slots;
      });
    });
  }

  getZoneAvailability(zone: string): number {
    let total = 0;
    this.data.selectedFloors.forEach((floor: string) => {
      if (this.parkingData[floor] && this.parkingData[floor][zone]) {
        total += this.parkingData[floor][zone].length;
      }
    });
    return total;
  }

  toggleFloor(floor: string) {
    const idx = this.data.selectedFloors.indexOf(floor);
    if (idx > -1) this.data.selectedFloors.splice(idx, 1);
    else this.data.selectedFloors.push(floor);
  }

  selectAllFloors() {
    this.data.selectedFloors = [...this.floors];
  }

  clearAllFloors() {
    this.data.selectedFloors = [];
    this.data.selectedZones = [];
  }

  isFloorSelected(floor: string): boolean {
    return this.data.selectedFloors.includes(floor);
  }

  isAllFloorsSelected(): boolean {
    return this.floors.length > 0 && this.floors.every(f => this.data.selectedFloors.includes(f));
  }

  toggleZone(zone: string) {
    if (this.data.selectedFloors.length === 0) {
      this.presentToast('กรุณาเลือกชั้น (Floor) อย่างน้อย 1 ชั้นก่อนเลือกโซน');
      return;
    }
    const idx = this.data.selectedZones.indexOf(zone);
    if (idx > -1) this.data.selectedZones.splice(idx, 1);
    else this.data.selectedZones.push(zone);
  }

  selectAllZones() {
    if (this.data.selectedFloors.length === 0) {
      this.presentToast('กรุณาเลือกชั้น (Floor) อย่างน้อย 1 ชั้นก่อนเลือกโซน');
      return;
    }
    this.data.selectedZones = [...this.availableZones];
  }

  clearAllZones() {
    this.data.selectedZones = [];
  }

  isZoneSelected(zone: string): boolean {
    return this.data.selectedZones.includes(zone);
  }

  isAllZonesSelected(): boolean {
    return this.availableZones.length > 0 && this.availableZones.every(z => this.data.selectedZones.includes(z));
  }

  randomizeSlot() {
    if (this.data.selectedFloors.length === 0 || this.data.selectedZones.length === 0) {
      if (this.data.selectedFloors.length === 0 && this.data.selectedZones.length === 0) {
        // do nothing quietly or handled by UI
      } else {
        this.presentToast('กรุณาเลือกชั้นและโซนอย่างน้อย 1 รายการเพื่อสุ่ม');
      }
      this.data.selectedSlotId = null;
      this.assignedFloor = '';
      this.assignedZone = '';
      return;
    }

    const candidates: any[] = [];
    const floorsToRandom = this.data.selectedFloors;
    const zonesToRandom = this.data.selectedZones;

    floorsToRandom.forEach((floor: string) => {
      zonesToRandom.forEach((zone: string) => {
        if (this.parkingData[floor] && this.parkingData[floor][zone]) {
          const slots = this.parkingData[floor][zone];
          if (slots.length > 0) {
            candidates.push({
              floor: floor,
              zone: zone,
              availableCount: slots.length,
              availableSlots: slots,
              priorityScore: (this.floorPriority[floor] || 99) * 10 + (this.zonePriority[zone] || 99)
            });
          }
        }
      });
    });

    candidates.sort((a, b) => a.priorityScore - b.priorityScore);

    if (candidates.length > 0) {
      const bestCandidate = candidates[0];
      const randomSlotIndex = Math.floor(Math.random() * bestCandidate.availableSlots.length);
      const pickedSlot = bestCandidate.availableSlots[randomSlotIndex];

      this.data.selectedSlotId = pickedSlot.label;
      this.assignedFloor = bestCandidate.floor;
      this.assignedZone = bestCandidate.zone;

      this.presentToast(`ระบบเลือกให้: ${this.assignedFloor} - ${this.assignedZone} (${pickedSlot.label})`);
    } else {
      this.data.selectedSlotId = null;
      this.assignedFloor = 'เต็ม';
      this.assignedZone = 'เต็ม';
      this.presentToast('ไม่พบช่องจอดว่างในขอบเขตที่เลือก');
    }
  }

  isNextDay(start: any, end: any): boolean {
    if (!start || !end) return false;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(0, 0, 0, 0);
    return e.getTime() > s.getTime();
  }

  calculateDurationAndPrice() {
    if (this.data?.startSlot?.dateTime && this.data?.endSlot?.dateTime) {
      const start = new Date(this.data.startSlot.dateTime).getTime();
      const endSlotDuration = this.data.endSlot.duration || 0;
      const end = new Date(this.data.endSlot.dateTime).getTime() + (endSlotDuration * 60000);
      const diffMs = end - start;
      const roundedHours = Math.ceil(diffMs / (1000 * 60 * 60)); // Round up for pricing

      const diffHrs = Math.floor((diffMs / (1000 * 60 * 60)));
      const diffMins = Math.round(((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

      let durationStr = '';
      if (diffHrs > 0) durationStr += `${diffHrs} ชม. `;
      if (diffMins > 0) durationStr += `${diffMins} นาที`;
      if (diffMs === 0) durationStr = '1 ชม.';

      this.durationText = durationStr || '1 ชม.';
      this.totalPrice = roundedHours * this.hourlyRate;

      // Calculate formatted time display
      const startDate = new Date(this.data.startSlot.dateTime);
      const endDate = new Date(end);

      const pad = (n: number) => n < 10 ? '0' + n : n;
      this.timeDisplay = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} - ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

      // --- PRICE CALCULATION BY MODE ---
      const mode = this.data.bookingMode || 'daily';
      if (mode === 'monthly') {
        this.totalPrice = 2000;
        this.durationText = 'รายเดือน (1 เดือน)';
      } else if (mode === 'monthly_night') {
        this.totalPrice = 1200;
        this.durationText = 'รายเดือน (เฉพาะกลางคืน)';
      } else if (mode === 'flat24') {
        this.totalPrice = 250;
        this.durationText = 'เหมาจ่าย 24 ชม.';
      } else {
        // Daily / Hourly
        this.totalPrice = roundedHours * this.hourlyRate;
      }
    }
  }



  selectPaymentMethod(methodId: string) {
    this.selectedPaymentMethod = methodId;
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'dark', position: 'bottom',
    });
    toast.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  confirm() {
    const isPayLater = this.selectedPaymentMethod === 'pay_later';
    const finalData = {
      ...this.data,
      selectedFloors: [this.assignedFloor],
      selectedZones: [this.assignedZone],
      totalPrice: this.totalPrice,
      paymentMethod: this.selectedPaymentMethod,
      status: isPayLater ? 'pending_payment' : 'confirmed'
    };
    this.modalCtrl.dismiss({ confirmed: true, data: finalData, action: isPayLater ? 'pay_later' : 'pay_now' }, 'confirm');
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถยนต์ทั่วไป';
      case 'ev': return 'รถยนต์ EV';
      case 'motorcycle': return 'รถจักรยานยนต์';
      default: return type || 'รถยนต์ทั่วไป';
    }
  }

  getModeLabel(mode: string): string {
    switch (mode) {
      case 'monthly': return 'รายเดือน';
      case 'monthly_night': return 'รายเดือน Night';
      case 'flat24': return 'เหมา 24 ชม.';
      default: return 'รายชั่วโมง (' + this.hourlyRate + ' บ./ชม.)';
    }
  }
}