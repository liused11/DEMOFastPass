import { Component } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  selectedSegment: 'dashboard' | 'list' = 'dashboard';

  userProfile = {
    name: 'Atsadawut FastPass',
    phone: '+66 81 234 5678',
    avatar: 'https://i.pravatar.cc/150?u=somorn', // Placeholder
  };

  vehicles = [
    {
      id: 1,
      model: 'TOYOTA YARIS',
      licensePlate: '1กข 1234',
      province: 'กรุงเทพฯ',
      image: 'https://img.freepik.com/free-photo/red-car-street_114579-4017.jpg?t=st=1735398000~exp=1735401600~hmac=8a892b0c34567de', // Placeholder
      isDefault: true,
      status: 'พร้อมใช้งาน'
    },
    {
      id: 2,
      model: 'MAZDA 3',
      licensePlate: '5กง 9999',
      province: 'กรุงเทพฯ',
      image: 'https://img.freepik.com/free-photo/grey-metallic-car_114579-4061.jpg', // Placeholder
      isDefault: false,
      status: ''
    },
    {
      id: 3,
      model: 'HONDA PCX150',
      licensePlate: '3กค 5678',
      province: 'กรุงเทพฯ',
      image: 'https://img.freepik.com/free-photo/scooter-motorcycle_114579-7988.jpg', // Placeholder
      isDefault: false,
      status: ''
    }
  ];

  generalSettings = [
    { title: 'จัดการบัญชี', icon: '' },
    { title: 'วิธีการชำระเงิน', icon: '' },
  ];

  otherSettings = [
    { title: 'ศูนย์ความช่วยเหลือ', icon: '' },
    { title: 'การตั้งค่าความปลอดภัย', icon: '' },
    { title: 'ภาษา / Language', value: 'ไทย', icon: '' },
    { title: 'ปฏิทินการจอง', icon: '' },
    { title: 'สถานที่ที่บันทึกไว้', icon: '' },
  ];

  constructor() { }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }
}
