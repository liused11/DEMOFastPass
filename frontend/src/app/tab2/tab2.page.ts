import { Component, OnInit } from '@angular/core';

// 1. เพิ่มโครงสร้างข้อมูลรถ (Car Brand & License Plate) และ Booking Type
interface Booking {
  id: string;
  placeName: string;
  locationDetails: string; // e.g. "ชั้น 1 | โซน B | B04"
  bookingTime: Date;
  endTime: Date;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'active'; // Added 'active' for currently parking
  statusLabel?: string; // Optional override for status text
  price: number;
  discountBadge?: string; // e.g. "ลด 15%"
  carBrand: string;     // ยี่ห้อรถ
  licensePlate: string; // ทะเบียนรถ
  bookingType: 'daily' | 'monthly' | 'flat24' | 'monthly_night'; // Updated types
  periodLabel?: string; // For special textual times like "เหมาจ่าย 24 ชั่วโมง" or "1 ธ.ค. - 31 ธ.ค."
  timeDetailLabel?: string; // For explicit time range text if needed
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  // Dropdown options
  selectedMonth: string = 'ธันวาคม 2568';
  selectedCategory: string = 'all';

  // Segment for Status
  selectedStatusSegment: string = 'in_progress'; // 'in_progress' | 'completed' | 'cancelled'

  // Arrays for 4 Categories
  latestBookings: Booking[] = [];
  flat24Bookings: Booking[] = [];
  monthlyBookings: Booking[] = [];
  nightlyBookings: Booking[] = [];

  // Mock Data
  allBookings: Booking[] = [
    // 1. Daily / Latest
    {
      id: 'BK-001',
      placeName: 'ลานจอดรถ 14 ชั้น (S2)',
      locationDetails: 'ชั้น 1 | โซน B | B04',
      bookingTime: new Date('2025-12-04T10:00:00'),
      endTime: new Date('2025-12-04T14:00:00'),
      status: 'active', // "กำลังดำเนินการ"
      statusLabel: 'กำลังดำเนินการ',
      price: 30,
      discountBadge: 'ลด 15%',
      carBrand: 'TOYOTA YARIS',
      licensePlate: '1กข 1234 กรุงเทพฯ',
      bookingType: 'daily'
    },
    // 2. Flat 24h
    {
      id: 'BK-002',
      placeName: 'ลานจอดรถอาคารการเรียนรู้...',
      locationDetails: 'ชั้น 1 | โซน D | D15',
      bookingTime: new Date('2025-12-27T00:00:00'), // Date only matter
      endTime: new Date('2025-12-28T00:00:00'),
      status: 'pending_payment', // "รอการชำระเงิน"
      statusLabel: 'รอการชำระเงิน',
      price: 180,
      carBrand: 'TOYOTA YARIS',
      licensePlate: '1กข 1234 กรุงเทพฯ',
      bookingType: 'flat24',
      periodLabel: 'เหมาจ่าย 24 ชั่วโมง'
    },
    // 3. Monthly (Standard) - Empty in example
    /*
    {
      id: 'BK-003',
      placeName: 'อาคาร X',
      locationDetails: 'ชั้น 2',
      bookingTime: new Date(),
      endTime: new Date(),
      status: 'confirmed',
      price: 500,
      carBrand: 'Honda',
      licensePlate: '8888',
      bookingType: 'monthly'
    },
    */

    // 4. Monthly Night
    {
      id: 'BK-004',
      placeName: 'ลานจอดรถ 14 ชั้น (S2)',
      locationDetails: 'ชั้น 1 | โซน D | D15',
      bookingTime: new Date('2025-12-01T18:00:00'),
      endTime: new Date('2025-12-31T08:00:00'),
      status: 'confirmed', // "ใช้งานอยู่"
      statusLabel: 'ใช้งานอยู่',
      price: 2675,
      carBrand: 'TOYOTA YARIS',
      licensePlate: '1กข 1234 กรุงเทพฯ',
      bookingType: 'monthly_night',
      periodLabel: '1 ธ.ค. - 31 ธ.ค.',
      timeDetailLabel: '18:00 - 08:00 น.\n(ทุกวัน จ. - ศ.)'
    }
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
    // Basic filtering based on Status Tab
    // 'in_progress' -> includes active, confirmed, pending_payment
    // 'completed' -> includes completed
    // 'cancelled' -> includes cancelled

    let filtered = this.allBookings.filter(b => {
      if (this.selectedStatusSegment === 'in_progress') {
        return ['active', 'confirmed', 'pending_payment'].includes(b.status);
      } else if (this.selectedStatusSegment === 'cancelled') {
        return b.status === 'cancelled';
      } else {
        return b.status === 'completed';
      }
    });

    // Valid statuses for display logic
    this.latestBookings = filtered.filter(b => b.bookingType === 'daily');
    this.flat24Bookings = filtered.filter(b => b.bookingType === 'flat24');
    this.monthlyBookings = filtered.filter(b => b.bookingType === 'monthly');
    this.nightlyBookings = filtered.filter(b => b.bookingType === 'monthly_night');
  }

  getStatusClass(item: Booking): string {
    if (item.status === 'pending_payment') return 'status-pending';
    if (item.status === 'active') return 'status-active'; // Yellow/Gold
    if (item.status === 'confirmed') return 'status-confirmed'; // Blue
    if (item.status === 'completed') return 'status-completed'; // Green
    return '';
  }
}