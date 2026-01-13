export interface ScheduleItem {
    days: string[];
    open_time: string;
    close_time: string;
    cron: { open: string; close: string; };
}

export interface ParkingSlotDB {
    slotId: string;
    startTime: string;
    endTime: string;
    displayText: string;
    isAvailable: boolean;
    totalCapacity: number;
    bookedCount: number;
    remainingCount: number;
    timeText: string;
}

export interface ParkingLot {
    id: string;
    name: string;
    capacity: {
        normal: number;
        ev: number;
        motorcycle: number;
    };
    available: {
        normal: number;
        ev: number;
        motorcycle: number;
    };
    floors?: (string | { id: string; name: string })[];
    mapX: number;
    mapY: number;
    //  พิกัดสำหรับ Map (Latitude, Longitude)
    lat?: number;
    lng?: number;

    status: 'available' | 'full' | 'closed' | 'low';
    isBookmarked: boolean;
    distance: number;
    hours: string;
    hasEVCharger: boolean;
    userTypes: string;
    price: number;
    priceUnit: string;
    supportedTypes: string[];
    schedule?: ScheduleItem[];
    images?: string[];
}

export interface Booking {
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

export interface UserProfile {
    name: string;
    phone: string;
    avatar: string;
}

export interface Vehicle {
    id: number;
    model: string;
    licensePlate: string;
    province: string;
    image: string;
    isDefault: boolean;
    status: string;
    lastUpdate: string;
    rank: number;
}

export interface SettingItem {
    title: string;
    icon: string;
    value?: string;
}

// --- Specific Interfaces moved from ParkingDetail ---
export interface DaySection {
    date: Date;
    dateLabel: string; // Full label for backup
    dayName: string;   // e.g. "Thu"
    dateNumber: string; // e.g. "15"
    timeLabel: string;
    slots: TimeSlot[];
    available: number;
    capacity: number;
}

export interface TimeSlot {
    id: string;
    timeText: string;
    dateTime: Date;
    isAvailable: boolean;
    isSelected: boolean;
    isInRange: boolean;
    remaining: number;
    duration?: number;
}

export interface ZoneData {
    id: string;
    name: string;
    available: number;
    capacity: number;
    status: 'available' | 'full';
}

export interface FloorData {
    id: string;
    name: string;
    zones: ZoneData[];
    totalAvailable: number;
    capacity: number;
}

export interface DailySchedule {
    dayName: string;
    timeRange: string;
    isToday: boolean;
}

export interface AggregatedZone {
    name: string;
    available: number;
    capacity: number;
    status: 'available' | 'full';
    floorIds: string[];
    ids: string[];
}
