import { Booking, ParkingLot, SettingItem, UserProfile, Vehicle } from './models';

// =======================================================
// MOCK DATA FOR TAB 1 (Parking List & Map)
// =======================================================

export const TAB1_PARKING_LOTS: ParkingLot[] = [
    {
        id: 'lib_complex',
        name: 'อาคารหอสมุด (Library)',
        capacity: { normal: 100, ev: 100, motorcycle: 100 },
        available: { normal: 100, ev: 100, motorcycle: 100 },
        floors: ['Floor 1', 'Floor 2', 'Floor 3'],
        mapX: 0, mapY: 0,
        lat: 13.651814,
        lng: 100.495365,
        status: 'available',
        isBookmarked: true,
        distance: 50,
        hours: '',
        hasEVCharger: true,
        userTypes: 'นศ., บุคลากร',
        price: 0,
        priceUnit: 'ฟรี',
        supportedTypes: ['normal', 'ev', 'motorcycle'],
        schedule: [
            { days: [], open_time: '', close_time: '', cron: { open: '0 8 * * 1-5', close: '0 20 * * 1-5' } },
            { days: [], open_time: '', close_time: '', cron: { open: '0 10 * * 6,0', close: '0 16 * * 6,0' } }
        ],
        images: ['assets/images/parking/exterior.png', 'assets/images/parking/indoor.png']
    },
    {
        id: 'ev_station_1',
        name: 'สถานีชาร์จ EV (ตึก S11)',
        capacity: { normal: 100, ev: 100, motorcycle: 100 },
        available: { normal: 100, ev: 100, motorcycle: 100 },
        floors: ['G'],
        mapX: 0, mapY: 0,
        lat: 13.650207,
        lng: 100.495112,
        status: 'available',
        isBookmarked: false,
        distance: 500,
        hours: '',
        hasEVCharger: true,
        userTypes: 'All',
        price: 50,
        priceUnit: 'ต่อชม.',
        supportedTypes: ['ev'],
        schedule: [{ days: [], open_time: '', close_time: '', cron: { open: '0 6 * * *', close: '0 22 * * *' } }],
        images: ['assets/images/parking/ev.png']
    },
    {
        id: 'moto_dorm',
        name: 'โรงจอดมอไซค์ หอพักชาย',
        capacity: { normal: 100, ev: 100, motorcycle: 100 },
        available: { normal: 100, ev: 100, motorcycle: 100 },
        floors: ['Laney'],
        mapX: 0, mapY: 0,
        lat: 13.654012,
        lng: 100.496155,
        status: 'low',
        isBookmarked: false,
        distance: 800,
        hours: '',
        hasEVCharger: false,
        userTypes: 'นศ. หอพัก',
        price: 100,
        priceUnit: 'เหมาจ่าย',
        supportedTypes: ['motorcycle'],
        schedule: [],
        images: ['assets/images/parking/exterior.png']
    }
];

// =======================================================
// MOCK DATA FOR TAB 2 (Bookings & History)
// =======================================================

export const TAB2_BOOKINGS: Booking[] = [
    // ----------------------------------------------------
    // 1. Daily / Latest
    // ----------------------------------------------------
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
    {
        id: 'BK-NEW-PENDING',
        placeName: 'อาคารหอสมุด (Library)',
        locationDetails: 'ชั้น 2 | โซน A | A05',
        bookingTime: new Date(),
        endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: 'pending_payment',
        statusLabel: 'รอการชำระเงิน',
        price: 40,
        discountBadge: '',
        carBrand: 'HONDA CIVIC',
        licensePlate: '2ขค 5678',
        bookingType: 'daily'
    },
    {
        id: 'BK-001-COMPLETED',
        placeName: 'อาคารจอดรถ KX',
        locationDetails: 'ชั้น 3 | โซน A | A12',
        bookingTime: new Date('2025-12-01T09:00:00'),
        endTime: new Date('2025-12-01T12:00:00'),
        status: 'completed',
        statusLabel: 'เสร็จสิ้น',
        price: 45,
        carBrand: 'HONDA CIVIC',
        licensePlate: '2ขค 5678 กรุงเทพฯ',
        bookingType: 'daily'
    },
    {
        id: 'BK-001-CANCELLED',
        placeName: 'ลานจอดรถตึกอธิการบดี',
        locationDetails: 'ชั้น G | โซน C | C05',
        bookingTime: new Date('2025-11-28T08:00:00'),
        endTime: new Date('2025-11-28T10:00:00'),
        status: 'cancelled',
        statusLabel: 'ยกเลิกแล้ว',
        price: 0,
        carBrand: 'TOYOTA YARIS',
        licensePlate: '1กข 1234 กรุงเทพฯ',
        bookingType: 'daily'
    },

    // ----------------------------------------------------
    // 2. Flat 24h
    // ----------------------------------------------------
    {
        id: 'BK-002',
        placeName: 'ลานจอดรถอาคารการเรียนรู้...',
        locationDetails: 'ชั้น 1 | โซน D | D15',
        bookingTime: new Date('2025-12-27T00:00:00'),
        endTime: new Date('2025-12-28T00:00:00'),
        status: 'pending_payment', // "รอการชำระเงิน"
        statusLabel: 'รอการชำระเงิน',
        price: 180,
        carBrand: 'TOYOTA YARIS',
        licensePlate: '1กข 1234 กรุงเทพฯ',
        bookingType: 'flat24',
        periodLabel: 'เหมาจ่าย 24 ชั่วโมง'
    },
    {
        id: 'BK-002-ACTIVE',
        placeName: 'ลานจอดรถ 14 ชั้น (S2)',
        locationDetails: 'ชั้น 5 | โซน A | A01',
        bookingTime: new Date('2025-12-15T12:00:00'),
        endTime: new Date('2025-12-16T12:00:00'),
        status: 'active',
        statusLabel: 'กำลังใช้งาน',
        price: 150,
        discountBadge: 'Pro 24h',
        carBrand: 'MAZDA 2',
        licensePlate: '3กฆ 9999 ชลบุรี',
        bookingType: 'flat24',
        periodLabel: 'เหมาจ่าย 24 ชั่วโมง'
    },

    // ----------------------------------------------------
    // 3. Monthly (Standard)
    // ----------------------------------------------------
    {
        id: 'BK-003',
        placeName: 'อาคารจอดรถ KX',
        locationDetails: 'ชั้น 1 | โซน B | B04', // Member usually generic
        bookingTime: new Date('2025-12-01T00:00:00'),
        endTime: new Date('2025-12-31T23:59:59'),
        status: 'active',
        statusLabel: 'สมาชิกรายเดือน',
        price: 1500,
        carBrand: 'HONDA HR-V',
        licensePlate: '4งจ 5555 กรุงเทพฯ',
        bookingType: 'monthly',
        periodLabel: 'ธันวาคม 2568'
    },
    {
        id: 'BK-003-EXPIRED',
        placeName: 'อาคารจอดรถ KX',
        locationDetails: '-',
        bookingTime: new Date('2025-11-01T00:00:00'),
        endTime: new Date('2025-11-30T23:59:59'),
        status: 'completed',
        statusLabel: 'หมดอายุ',
        price: 1500,
        carBrand: 'HONDA HR-V',
        licensePlate: '4งจ 5555 กรุงเทพฯ',
        bookingType: 'monthly',
        periodLabel: 'พฤศจิกายน 2568'
    },

    // ----------------------------------------------------
    // 4. Monthly Night
    // ----------------------------------------------------
    {
        id: 'BK-004',
        placeName: 'ลานจอดรถ 14 ชั้น (S2)',
        locationDetails: 'ชั้น 1 | โซน D | D15',
        bookingTime: new Date('2025-12-01T18:00:00'),
        endTime: new Date('2025-12-31T08:00:00'),
        status: 'active', // "ใช้งานอยู่"
        statusLabel: 'ใช้งานอยู่',
        price: 2675,
        carBrand: 'TOYOTA YARIS',
        licensePlate: '1กข 1234 กรุงเทพฯ',
        bookingType: 'monthly_night',
        periodLabel: '1 ธ.ค. - 31 ธ.ค.',
        timeDetailLabel: '18:00 - 08:00 น.\n(ทุกวัน จ. - ศ.)'
    }
];

// =======================================================
// MOCK DATA FOR TAB 3 (Profile & Settings)
// =======================================================

export const TAB3_USER_PROFILE: UserProfile = {
    name: 'Atsadawut FastPass',
    phone: '+66 81 234 5678',
    avatar: 'https://i.pravatar.cc/150?u=somorn',
};

export const TAB3_VEHICLES: Vehicle[] = [
    {
        id: 1,
        model: 'TOYOTA YARIS',
        licensePlate: '1กข 1234',
        province: 'กรุงเทพฯ',
        image: 'https://img.freepik.com/free-photo/red-car-street_114579-4017.jpg?t=st=1735398000~exp=1735401600~hmac=8a892b0c34567de',
        isDefault: true,
        status: 'พร้อมใช้งาน',
        lastUpdate: '2 พ.ย. 2568, 09:29 น.',
        rank: 2,
    },
    {
        id: 2,
        model: 'MAZDA 3',
        licensePlate: '5กง 9999',
        province: 'กรุงเทพฯ',
        image: 'https://img.freepik.com/free-photo/grey-metallic-car_114579-4061.jpg',
        isDefault: false,
        status: '',
        lastUpdate: '24 ต.ค. 2568, 13:38 น.',
        rank: 1,
    },
    {
        id: 3,
        model: 'HONDA PCX150',
        licensePlate: '3กค 5678',
        province: 'กรุงเทพฯ',
        image: 'https://img.freepik.com/free-photo/scooter-motorcycle_114579-7988.jpg',
        isDefault: false,
        status: '',
        lastUpdate: '',
        rank: 3,
    },
];

export const TAB3_GENERAL_SETTINGS: SettingItem[] = [
    { title: 'เปลี่ยนรหัสผ่าน', icon: 'lock-closed-outline' },
    { title: 'ตั้งค่าการแจ้งเตือน', icon: 'notifications-outline' },
    { title: 'ภาษา', icon: 'language-outline' },
];

export const TAB3_OTHER_SETTINGS: SettingItem[] = [
    { title: 'เกี่ยวกับเรา', icon: 'information-circle-outline' },
    { title: 'เงื่อนไขการใช้งาน', icon: 'document-text-outline' },
    { title: 'นโยบายความเป็นส่วนตัว', icon: 'shield-checkmark-outline' },
    { title: 'เวอร์ชันแอปพลิเคชัน', value: '1.0.0', icon: 'phone-portrait-outline' },
];

// =======================================================
// MOCK DATA FOR PARKING DETAIL COMPONENT (Site Dropdown)
// =======================================================

export const PARKING_DETAIL_MOCK_SITES: ParkingLot[] = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)', capacity: { normal: 100, ev: 100, motorcycle: 100 }, available: { normal: 100, ev: 100, motorcycle: 100 }, floors: ['Floor 1', 'Floor 2', 'Floor 3'], mapX: 50, mapY: 80, status: 'available', isBookmarked: true, distance: 50, hours: '', hasEVCharger: true, userTypes: 'นศ., บุคลากร', price: 0, priceUnit: 'ฟรี', supportedTypes: ['normal', 'ev', 'motorcycle'], schedule: [], images: ['assets/images/parking/exterior.png', 'assets/images/parking/indoor.png'] },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)', capacity: { normal: 100, ev: 100, motorcycle: 100 }, available: { normal: 100, ev: 100, motorcycle: 100 }, floors: ['G'], mapX: 300, mapY: 150, status: 'available', isBookmarked: false, distance: 500, hours: '', hasEVCharger: true, userTypes: 'All', price: 50, priceUnit: 'ต่อชม.', supportedTypes: ['ev'], schedule: [], images: ['assets/images/parking/ev.png'] }
];
