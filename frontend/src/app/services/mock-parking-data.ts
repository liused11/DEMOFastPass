import { ParkingLot } from "../tab1/tab1.page";

export const MOCK_PARKING_LOTS: ParkingLot[] = [
    {
        "id": "1-1",
        "name": "ลานจอดรถ FIBO",
        "capacity": {
            "normal": 205,
            "ev": 0,
            "motorcycle": 0
        },
        "available": {
            "normal": 205,
            "ev": 0,
            "motorcycle": 0
        },
        "floors": [
            {
                "id": "1-1-1",
                "name": "ชั้น 1"
            }
        ],
        "mapX": 0,
        "mapY": 0,
        "lat": 13.655,
        "lng": 100.496,
        "status": "available",
        "isBookmarked": false,
        "distance": 0,
        "hours": "เปิด 08:00:00 - 20:00:00",
        "hasEVCharger": false,
        "userTypes": "นศ., บุคลากร",
        "price": 0,
        "priceUnit": "ฟรี",
        "supportedTypes": [
            "normal"
        ],
        "schedule": [
            {
                "days": [],
                "open_time": "08:00",
                "close_time": "20:00",
                "cron": {
                    "open": "0 8 * * *",
                    "close": "0 20 * * *"
                }
            }
        ],
        "images": [
            "assets/images/parking/fibo_ext.png",
            "assets/images/parking/fibo_int.png"
        ]
    },
    {
        "id": "1-2",
        "name": "อาคารจอดรถ 14 ชั้น (S2)",
        "capacity": {
            "normal": 366,
            "ev": 0,
            "motorcycle": 0
        },
        "available": {
            "normal": 366,
            "ev": 0,
            "motorcycle": 0
        },
        "floors": [
            {
                "id": "1-2-1",
                "name": "ชั้น 1"
            },
            {
                "id": "1-2-2",
                "name": "ชั้น 2"
            },
            {
                "id": "1-2-3",
                "name": "ชั้น 3"
            },
            {
                "id": "1-2-4",
                "name": "ชั้น 4"
            },
            {
                "id": "1-2-5",
                "name": "ชั้น 5"
            },
            {
                "id": "1-2-6",
                "name": "ชั้น 6"
            },
            {
                "id": "1-2-7",
                "name": "ชั้น 7"
            },
            {
                "id": "1-2-8",
                "name": "ชั้น 8"
            },
            {
                "id": "1-2-9",
                "name": "ชั้น 9"
            },
            {
                "id": "1-2-10",
                "name": "ชั้น 10"
            },
            {
                "id": "1-2-11",
                "name": "ชั้น 11"
            },
            {
                "id": "1-2-12",
                "name": "ชั้น 12"
            },
            {
                "id": "1-2-13",
                "name": "ชั้น 13"
            },
            {
                "id": "1-2-14",
                "name": "ชั้น 14"
            }
        ],
        "mapX": 0,
        "mapY": 0,
        "lat": 13.6515,
        "lng": 100.4945,
        "status": "available",
        "isBookmarked": false,
        "distance": 0,
        "hours": "เปิด 08:00:00 - 20:00:00",
        "hasEVCharger": false,
        "userTypes": "นศ., บุคลากร",
        "price": 0,
        "priceUnit": "ฟรี",
        "supportedTypes": [
            "normal"
        ],
        "schedule": [
            {
                "days": [],
                "open_time": "08:00",
                "close_time": "20:00",
                "cron": {
                    "open": "0 8 * * *",
                    "close": "0 20 * * *"
                }
            }
        ],
        "images": [
            "assets/images/parking/s2_ext.png",
            "assets/images/parking/s2_int.png"
        ]
    }
];
