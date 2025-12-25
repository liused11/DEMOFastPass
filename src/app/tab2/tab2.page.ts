import { Component, OnInit } from '@angular/core';

// 1. เพิ่มโครงสร้างข้อมูลรถ (Car Brand & License Plate) และ Booking Type
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
  bookingType: 'daily' | 'monthly'; // รายวัน หรือ รายเดือน
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  // Dropdown options
  selectedMonth: string = 'Dec 2568'; // Mock default
  selectedCategory: string = 'all';

  // Segment for Status
  selectedStatusSegment: string = 'in_progress'; // 'pending_payment' | 'in_progress' | 'completed' | 'cancelled'

  dailyBookings: Booking[] = [];
  monthlyBookings: Booking[] = [];

  // Mock Data: KMUTT Buildings
  allBookings: Booking[] = [
    {
      id: 'BK-001',
      placeName: 'อาคารจอดรถ 14 ชั้น (S2)',
      locationDetails: 'ชั้น 1 | โซน B04',
      bookingTime: new Date('2025-12-04T10:00:00'),
      endTime: new Date('2025-12-04T14:00:00'),
      status: 'confirmed',
      price: 30,
      carBrand: 'TOYOTA YARIS',
      licensePlate: '1กข 1234 กรุงเทพฯ',
      bookingType: 'daily'
    },
    {
      id: 'BK-002',
      placeName: 'อาคารเรียนรวม 4 (CB4)',
      locationDetails: 'ชั้น G | โซน A11',
      bookingTime: new Date('2025-12-01T08:00:00'),
      endTime: new Date('2025-12-31T18:00:00'),
      status: 'confirmed', // "ใช้งานอยู่" mapped to confirmed/in_progress visually maybe? OR specific status
      price: 1500,
      carBrand: 'TOYOTA YARIS',
      licensePlate: '1กข 1234 กรุงเทพฯ',
      bookingType: 'monthly'
    },
    {
      id: 'BK-003',
      placeName: 'อาคารเรียนรวม 14 ชั้น (S2)',
      locationDetails: 'ชั้น 1 | โซน A',
      bookingTime: new Date('2025-12-05T08:00:00'),
      endTime: new Date('2025-12-05T18:00:00'),
      status: 'pending_payment',
      price: 0,
      carBrand: '',
      licensePlate: 'A06', // As per image showing just slot number maybe? Or just mock data
      bookingType: 'daily'
    },
    // Add more mock data if needed for testing other statuses
    {
      id: 'BK-004',
      placeName: 'อาคารปฏิบัติการทางวิทยาศาสตร์ (S1)',
      locationDetails: 'ชั้น 2 | โซน C',
      bookingTime: new Date('2025-11-20T10:00:00'),
      endTime: new Date('2025-11-20T13:00:00'),
      status: 'completed',
      price: 40,
      carBrand: 'Honda Civic',
      licensePlate: '2กค 5678',
      bookingType: 'daily'
    },
  ];

  constructor() { }

  ngOnInit() {
    this.updateFilter();
  }

  segmentChanged(event: any) {
    this.selectedStatusSegment = event.detail.value;
    this.updateFilter();
  }

  updateFilter() {
    // This logic handles filtering based on the 3 tabs: Processing (Pending+Confirmed), Finished, Cancelled
    // The image shows: "กำลังดำเนินการ" (Processing), "เสร็จสิ้น" (Finished), "ยกเลิก/ล้มเหลว" (Cancelled)

    // Logic mapping:
    // 'in_progress' tab (Processing) -> status 'in_progress' | 'confirmed' | 'pending_payment'
    // 'completed' tab (Finished) -> status 'completed'
    // 'cancelled' tab -> status 'cancelled'

    let filtered = this.allBookings.filter(b => {
      if (this.selectedStatusSegment === 'in_progress') {
        return b.status === 'confirmed' || b.status === 'pending_payment';
      } else if (this.selectedStatusSegment === 'completed') {
        return b.status === 'completed';
      } else if (this.selectedStatusSegment === 'cancelled') {
        return b.status === 'cancelled';
      }
      return true;
    });

    this.dailyBookings = filtered.filter(b => b.bookingType === 'daily');
    this.monthlyBookings = filtered.filter(b => b.bookingType === 'monthly');
  }

  getStatusText(item: Booking): string {
    // Customize text based on user requirements or keep standard
    switch (item.status) {
      case 'confirmed': return item.bookingType === 'monthly' ? 'ใช้งานอยู่' : 'กำลังดำเนินการ';
      case 'completed': return 'ชำระเงินสำเร็จแล้ว';
      case 'pending_payment': return 'รอการชำระเงิน';
      case 'cancelled': return 'ยกเลิก';
      default: return item.status;
    }
  }

  // ใช้สำหรับ CSS Class
  getStatusClass(item: Booking): string {
    if (item.status === 'pending_payment') return 'pending-payment';
    if (item.status === 'confirmed') return 'in-progress'; // Gold color in image for processing
    return item.status;
  }
}