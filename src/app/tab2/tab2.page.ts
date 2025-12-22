import { Component, OnInit } from '@angular/core';

// 1. เพิ่มโครงสร้างข้อมูลรถ (Car Brand & License Plate)
interface Booking {
  id: string;
  placeName: string;
  locationDetails: string;
  bookingTime: Date;
  endTime: Date;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  carBrand: string;     // ยี่ห้อรถ
  licensePlate: string; // ทะเบียนรถ
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  selectedSegment: string = 'in_progress';
  filteredBookings: Booking[] = [];

  // Mock Data: ผมตั้งวันที่ให้เป็นวัน "พฤหัสบดี" ตามที่ขอครับ
  // (เช่น 17 ก.ค. 2025, 25 ธ.ค. 2025 เป็นวันพฤหัสทั้งหมด)
  allBookings: Booking[] = [
    {
      id: 'BK-001',
      placeName: 'Siam Paragon',
      locationDetails: 'VIP Zone, Floor M',
      // พฤหัสบดีที่ 25 ธันวาคม 2025 (อนาคต)
      bookingTime: new Date('2025-12-25T14:00:00'), 
      endTime: new Date('2025-12-25T18:00:00'),
      status: 'confirmed',
      price: 150,
      carBrand: 'Honda Civic',
      licensePlate: '1กข 9999'
    },
    {
      id: 'BK-002',
      placeName: 'Central World',
      locationDetails: 'Zone B, Floor 2',
      // พฤหัสบดีที่ 1 มกราคม 2024 (อดีต)
      bookingTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T13:00:00'),
      status: 'completed',
      price: 200,
      carBrand: 'Toyota Camry',
      licensePlate: 'ฮฮ 5555'
    },
    {
      id: 'BK-003',
      placeName: 'EmQuartier',
      locationDetails: 'Supercar Zone',
      // พฤหัสบดีที่ผ่านมา (สมมติให้เลยเวลาแล้ว เพื่อทดสอบสถานะ Missed)
      bookingTime: new Date(new Date().getTime() - 5 * 60 * 60 * 1000), 
      endTime: new Date(new Date().getTime() - 3 * 60 * 60 * 1000),
      status: 'confirmed', 
      price: 120,
      carBrand: 'BMW Series 5',
      licensePlate: 'พพ 888'
    },
    {
      id: 'BK-004',
      placeName: 'Icon Siam',
      locationDetails: 'Regular Zone',
      bookingTime: new Date(),
      endTime: new Date(),
      status: 'cancelled',
      price: 0,
      carBrand: 'Honda Civic',
      licensePlate: '1กข 9999'
    },
    {
      id: 'BK-005',
      placeName: 'Samyan Mitrtown',
      locationDetails: 'Zone C',
      // อีก 1 ชั่วโมง (เพื่อให้ขึ้นรอชำระ)
      bookingTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000),
      endTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000),
      status: 'pending_payment',
      price: 50,
      carBrand: 'Mazda 3',
      licensePlate: 'กอ 1234'
    }
  ];

  constructor() {}

  ngOnInit() {
    this.updateFilter();
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.updateFilter();
  }

  updateFilter() {
    const now = new Date().getTime();
    this.filteredBookings = this.allBookings.filter(booking => {
      const bTime = booking.bookingTime.getTime();
      switch (this.selectedSegment) {
        case 'all': return true;
        case 'pending_payment': return booking.status === 'pending_payment';
        case 'in_progress': return booking.status === 'confirmed' && bTime > now;
        case 'completed': return booking.status === 'completed';
        case 'cancelled': return booking.status === 'cancelled' || (booking.status === 'confirmed' && bTime <= now);
        default: return false;
      }
    });
  }

  getStatusText(item: Booking): string {
    const now = new Date().getTime();
    if (item.status === 'confirmed' && item.bookingTime.getTime() <= now) return 'ไม่มาจอด';
    switch (item.status) {
      case 'confirmed': return 'จองสำเร็จ';
      case 'completed': return 'เสร็จสิ้น';
      case 'pending_payment': return 'รอชำระเงิน';
      case 'cancelled': return 'ยกเลิก';
      default: return item.status;
    }
  }

  // ใช้สำหรับ CSS Class
  getStatusClass(item: Booking): string {
    const now = new Date().getTime();
    if (item.status === 'confirmed' && item.bookingTime.getTime() <= now) return 'missed';
    return item.status;
  }
}