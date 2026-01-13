import { Component } from '@angular/core';
import { SettingItem, UserProfile, Vehicle } from '../data/models';
import {
  TAB3_GENERAL_SETTINGS,
  TAB3_OTHER_SETTINGS,
  TAB3_USER_PROFILE,
  TAB3_VEHICLES
} from '../data/mock-data';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  selectedSegment: 'dashboard' | 'list' = 'dashboard';

  userProfile = TAB3_USER_PROFILE;
  vehicles = [...TAB3_VEHICLES]; // Create a copy to allow modification
  generalSettings = TAB3_GENERAL_SETTINGS;
  otherSettings = TAB3_OTHER_SETTINGS;

  vehicleCounter = 4;

  constructor() { }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  selectVehicle(vehicleId: number) {
    this.vehicles = this.vehicles.map(v => ({
      ...v,
      isDefault: v.id === vehicleId,
      status: v.id === vehicleId ? 'พร้อมใช้งาน' : ''
    }));
  }

  addVehicle() {
    const newVehicle = {
      id: this.vehicleCounter++,
      model: 'NEW CAR ' + this.vehicleCounter,
      licensePlate: '9กก ' + (1000 + this.vehicleCounter),
      province: 'กรุงเทพฯ',
      image: 'https://img.freepik.com/free-photo/blue-car-speed-motion-stretch-style_53876-126838.jpg',
      isDefault: false,
      status: '',
      lastUpdate: 'เพิ่งเพิ่ม',
      rank: this.vehicleCounter
    };
    this.vehicles.push(newVehicle);
  }

  getLicensePlateParts(plate: string): string[] {
    return plate.split(' ');
  }
}



