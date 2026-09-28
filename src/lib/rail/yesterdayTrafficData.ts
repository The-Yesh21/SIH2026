export type DelayGapCategory = 
  | "HEADWAY_WAKE"
  | "SBC_THROAT_INTERLOCKING"
  | "DWELL_TIME_OVERRUN"
  | "PSR_SPEED_RESTRICTION"
  | "LOOP_LINE_STABLING"
  | "RAKE_TURNAROUND";

export interface SectionalDelayBreakdown {
  sectionName: string;
  fromStation: string;
  toStation: string;
  chainageKm: string;
  delayIncurredMin: number;
  rootCause: string;
  category: DelayGapCategory;
}

export interface YesterdayTrainRunRecord {
  trainNumber: string;
  trainName: string;
  serviceType: string;
  scheduledDep: string;
  actualDep: string;
  scheduledArr: string;
  actualArr: string;
  totalDelayMin: number;
  punctualityScorePercent: number;
  statusCategory: "ON_TIME" | "MODERATE_DELAY" | "SEVERE_DELAY";
  primaryGapTitle: string;
  primaryGapCategory: DelayGapCategory;
  primaryGapDescription: string;
  bottleneckHotspot: string;
  aiDispatcherRecommendation: string;
  sectionalBreakdown: SectionalDelayBreakdown[];
}

export interface CorridorTrafficSummary {
  reportDate: string;
  totalServicesOperated: number;
  onTimeServicesCount: number;
  delayedServicesCount: number;
  averageFleetPunctualityPercent: number;
  totalCorridorDelayMinutesLost: number;
  worstDelayHotspot: string;
  topDelayCategory: string;
  recoverableMinutesWithAiDispatch: number;
}

export const CORRIDOR_TRAFFIC_SUMMARY: CorridorTrafficSummary = {
  reportDate: "Yesterday Operational Log (19-Sep-2026)",
  totalServicesOperated: 10,
  onTimeServicesCount: 4,
  delayedServicesCount: 6,
  averageFleetPunctualityPercent: 81.4,
  totalCorridorDelayMinutesLost: 142,
  worstDelayHotspot: "SBC Outer Throat (Nayandahalli - SBC, KM 130.8 ➔ 138.2)",
  topDelayCategory: "Suburban Commuter Dwell Overrun & Preceding Headway Wake",
  recoverableMinutesWithAiDispatch: 98,
};

export const YESTERDAY_FLEET_RUN_DATA: YesterdayTrainRunRecord[] = [
  {
    trainNumber: "16586",
    trainName: "MRDW - SMVB Express",
    serviceType: "Express",
    scheduledDep: "03:45",
    actualDep: "03:47",
    scheduledArr: "06:25",
    actualArr: "06:33",
    totalDelayMin: 8,
    punctualityScorePercent: 91.2,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "SBC Throat Interlocking Detention",
    primaryGapCategory: "SBC_THROAT_INTERLOCKING",
    primaryGapDescription: "Held at Nayandahalli outer home signal for 5 minutes awaiting platform clearance at KSR Bengaluru City due to morning empty coach shunting.",
    bottleneckHotspot: "SBC Throat (KM 135.2)",
    aiDispatcherRecommendation: "Dynamic direct routing to Platform 3 without stopping at Nayandahalli outer signal.",
    sectionalBreakdown: [
      {
        sectionName: "MYS - MYA",
        fromStation: "MYS",
        toStation: "MYA",
        chainageKm: "0.0 - 45.4",
        delayIncurredMin: 1,
        rootCause: "Late start from platform (+2m dep)",
        category: "RAKE_TURNAROUND",
      },
      {
        sectionName: "MYA - MAD",
        fromStation: "MYA",
        toStation: "MAD",
        chainageKm: "45.4 - 63.8",
        delayIncurredMin: 2,
        rootCause: "Unreserved coach luggage loading overrun (+2m dwell at Mandya)",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 5,
        rootCause: "SBC PF 1-4 interlocking throat conflict with Shatabdi empty rake shunting",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "16215",
    trainName: "Chamundi Express",
    serviceType: "Express",
    scheduledDep: "06:45",
    actualDep: "06:48",
    scheduledArr: "09:35",
    actualArr: "10:04",
    totalDelayMin: 29,
    punctualityScorePercent: 68.5,
    statusCategory: "SEVERE_DELAY",
    primaryGapTitle: "Commuter Surge Dwell Bleed & Headway Bunching",
    primaryGapCategory: "DWELL_TIME_OVERRUN",
    primaryGapDescription: "Heavy morning office commuter surge across 10 halts caused 14 minutes dwell overrun, resulting in trailing yellow signal aspects into Kengeri.",
    bottleneckHotspot: "Mandya, Maddur & Kengeri Platforms",
    aiDispatcherRecommendation: "Synchronize 45-second automated station chime and allocate dedicated unreserved boarding marshals at Mandya & Kengeri.",
    sectionalBreakdown: [
      {
        sectionName: "PANP - MYA",
        fromStation: "PANP",
        toStation: "MYA",
        chainageKm: "23.8 - 45.4",
        delayIncurredMin: 4,
        rootCause: "Mandya platform 1 commuter surge (dwell extended to 6 min vs 2 min booked)",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "MAD - CPT",
        fromStation: "MAD",
        toStation: "CPT",
        chainageKm: "63.8 - 82.8",
        delayIncurredMin: 5,
        rootCause: "Maddur & Channapatna passenger boarding delay (+5m total)",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "BID - KGI",
        fromStation: "BID",
        toStation: "KGI",
        chainageKm: "108.6 - 126.0",
        delayIncurredMin: 12,
        rootCause: "Trailed preceding freight rake running at 45 km/h; repeated double-yellow signals",
        category: "HEADWAY_WAKE",
      },
      {
        sectionName: "KGI - SBC",
        fromStation: "KGI",
        toStation: "SBC",
        chainageKm: "126.0 - 138.25",
        delayIncurredMin: 8,
        rootCause: "Kengeri surge dwell (+4m) and SBC throat platform clearance queue (+4m)",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "12613",
    trainName: "Wodeyar Superfast Express",
    serviceType: "Superfast",
    scheduledDep: "11:30",
    actualDep: "11:30",
    scheduledArr: "14:00",
    actualArr: "14:18",
    totalDelayMin: 18,
    punctualityScorePercent: 79.2,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "Preceding MEMU Wake Detention (Headway Gap)",
    primaryGapCategory: "HEADWAY_WAKE",
    primaryGapDescription: "Wodeyar SF caught up to all-stop MEMU #66552 near Bidadi. Wodeyar was forced to decelerate from 110 km/h MPS to 55 km/h through 3 consecutive block sections.",
    bottleneckHotspot: "Bidadi - Hejjala Section (KM 108.6 ➔ 115.5)",
    aiDispatcherRecommendation: "Loop MEMU #66552 at Bidadi Loop Line 2 at 12:52 PM to grant uninterrupted 110 km/h run to Wodeyar SF.",
    sectionalBreakdown: [
      {
        sectionName: "RMGM - BID",
        fromStation: "RMGM",
        toStation: "BID",
        chainageKm: "93.2 - 108.6",
        delayIncurredMin: 4,
        rootCause: "Approached yellow aspect behind MEMU at Ramanagaram departure",
        category: "HEADWAY_WAKE",
      },
      {
        sectionName: "BID - HJL - KGI",
        fromStation: "BID",
        toStation: "KGI",
        chainageKm: "108.6 - 126.0",
        delayIncurredMin: 11,
        rootCause: "Speed choked to 55 km/h due to MEMU stopping at Hejjala passenger halt",
        category: "HEADWAY_WAKE",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 3,
        rootCause: "SBC PF 5 entry speed restriction (15 km/h switch crossover)",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "20608",
    trainName: "Vande Bharat Express (MYS-MAS)",
    serviceType: "Vande Bharat",
    scheduledDep: "13:05",
    actualDep: "13:05",
    scheduledArr: "14:45",
    actualArr: "14:51",
    totalDelayMin: 6,
    punctualityScorePercent: 94.3,
    statusCategory: "ON_TIME",
    primaryGapTitle: "Cauvery Bridge PSR & SBC South Cabin Crossing",
    primaryGapCategory: "PSR_SPEED_RESTRICTION",
    primaryGapDescription: "High-speed run achieved 130 km/h across 80% of track, but lost 2 min at Cauvery Bridge (45 km/h PSR) and 4 min at SBC South Cabin awaiting return crossover.",
    bottleneckHotspot: "Srirangapatna Cauvery Bridge & SBC Throat",
    aiDispatcherRecommendation: "Lock dedicated non-stop Green Wave from Nayandahalli direct to SBC PF 1.",
    sectionalBreakdown: [
      {
        sectionName: "S - PANP",
        fromStation: "S",
        toStation: "PANP",
        chainageKm: "14.3 - 23.8",
        delayIncurredMin: 2,
        rootCause: "Cauvery River Bridge permanent speed restriction (45 km/h limit on EMU)",
        category: "PSR_SPEED_RESTRICTION",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 4,
        rootCause: "Held 3 min outside SBC South Cabin for departure crossover of Train 12614",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "66552",
    trainName: "Mysuru - SBC MEMU Commuter",
    serviceType: "MEMU",
    scheduledDep: "13:45",
    actualDep: "13:45",
    scheduledArr: "17:20",
    actualArr: "18:02",
    totalDelayMin: 42,
    punctualityScorePercent: 58.4,
    statusCategory: "SEVERE_DELAY",
    primaryGapTitle: "17-Station Dwell Creep & Loop Line Siding Detentions",
    primaryGapCategory: "LOOP_LINE_STABLING",
    primaryGapDescription: "Put on loop lines at Maddur (12m) and Bidadi (15m) to allow Shatabdi #12008 and Rajya Rani to overtake, compounded by 15 min cumulative halt overruns.",
    bottleneckHotspot: "Maddur & Bidadi Loop Lines",
    aiDispatcherRecommendation: "Re-slot MEMU departure to 13:30 to create a 25-minute buffer before Shatabdi #12008 path.",
    sectionalBreakdown: [
      {
        sectionName: "MYS - MYA",
        fromStation: "MYS",
        toStation: "MYA",
        chainageKm: "0.0 - 45.4",
        delayIncurredMin: 8,
        rootCause: "6 passenger halts (NHY, S, PANP, BDRL, CGKR, MYA) averaged 2.5m dwell vs 1m booked",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "MAD Loop Siding",
        fromStation: "MAD",
        toStation: "MAD",
        chainageKm: "63.8",
        delayIncurredMin: 12,
        rootCause: "Stabled on Loop Line 3 to allow Shatabdi Express #12008 to overtake on Main Line",
        category: "LOOP_LINE_STABLING",
      },
      {
        sectionName: "BID Loop Siding",
        fromStation: "BID",
        toStation: "BID",
        chainageKm: "108.6",
        delayIncurredMin: 15,
        rootCause: "Stabled on Bidadi Loop Line 2 for Rajya Rani Express overtake",
        category: "LOOP_LINE_STABLING",
      },
      {
        sectionName: "KGI - SBC",
        fromStation: "KGI",
        toStation: "SBC",
        chainageKm: "126.0 - 138.25",
        delayIncurredMin: 7,
        rootCause: "Evening rush hour traffic at Nayandahalli and SBC PF 7 arrival",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "12008",
    trainName: "Shatabdi Express (MYS-MAS)",
    serviceType: "Shatabdi",
    scheduledDep: "14:15",
    actualDep: "14:15",
    scheduledArr: "16:05",
    actualArr: "16:07",
    totalDelayMin: 2,
    punctualityScorePercent: 98.2,
    statusCategory: "ON_TIME",
    primaryGapTitle: "Ramanagaram Track Engineering TSR",
    primaryGapCategory: "PSR_SPEED_RESTRICTION",
    primaryGapDescription: "Flawless green line clearance provided by controllers; 2 minutes lost solely due to 80 km/h speed restriction at Ramanagaram rock cuttings.",
    bottleneckHotspot: "Ramanagaram Cuttings (KM 91.5 - 94.0)",
    aiDispatcherRecommendation: "Maintain current dispatch protocol; accelerate over recovered section past Hejjala.",
    sectionalBreakdown: [
      {
        sectionName: "CPT - RMGM",
        fromStation: "CPT",
        toStation: "RMGM",
        chainageKm: "82.8 - 93.2",
        delayIncurredMin: 2,
        rootCause: "80 km/h PSR on curve #14 near Ramanagaram",
        category: "PSR_SPEED_RESTRICTION",
      },
    ],
  },
  {
    trainNumber: "16232",
    trainName: "Mayiladuturai Express",
    serviceType: "Express",
    scheduledDep: "16:15",
    actualDep: "16:20",
    scheduledArr: "18:50",
    actualArr: "19:08",
    totalDelayMin: 18,
    punctualityScorePercent: 78.4,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "Origin Yard Delay & Kengeri Evening Surge",
    primaryGapCategory: "RAKE_TURNAROUND",
    primaryGapDescription: "Late rake placement at Mysuru PF 2 (+5m) cascaded with heavy evening commuter boarding at Kengeri (+6m) and SBC terminal throat detention (+7m).",
    bottleneckHotspot: "MYS Yard, KGI Platform & SBC Throat",
    aiDispatcherRecommendation: "Advance yard rake placement to 15:45 at MYS; assign KGI PF 2 clear departure window.",
    sectionalBreakdown: [
      {
        sectionName: "MYS Origin",
        fromStation: "MYS",
        toStation: "MYS",
        chainageKm: "0.0",
        delayIncurredMin: 5,
        rootCause: "Mechanical rake maintenance certificate delay at Mysuru Yard (+5m dep)",
        category: "RAKE_TURNAROUND",
      },
      {
        sectionName: "BID - KGI",
        fromStation: "BID",
        toStation: "KGI",
        chainageKm: "108.6 - 126.0",
        delayIncurredMin: 6,
        rootCause: "Kengeri evening commuter rush (dwell took 6 min vs 2 min booked)",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 7,
        rootCause: "Evening rush hour platform congestion at SBC PF 5",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "16236",
    trainName: "Tuticorin Express",
    serviceType: "Express",
    scheduledDep: "18:20",
    actualDep: "18:20",
    scheduledArr: "20:50",
    actualArr: "21:04",
    totalDelayMin: 14,
    punctualityScorePercent: 82.6,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "Nayandahalli Suburban Crossover Detention",
    primaryGapCategory: "SBC_THROAT_INTERLOCKING",
    primaryGapDescription: "Held 8 minutes at Nayandahalli home signal to allow priority passage for incoming suburban express entering SBC Platform 6.",
    bottleneckHotspot: "Nayandahalli Interlocking (KM 130.85)",
    aiDispatcherRecommendation: "Pre-set route 4B at Nayandahalli to admit Tuticorin Express simultaneously on UP Line without stopping.",
    sectionalBreakdown: [
      {
        sectionName: "MYA - MAD",
        fromStation: "MYA",
        toStation: "MAD",
        chainageKm: "45.4 - 63.8",
        delayIncurredMin: 3,
        rootCause: "Mandya & Maddur evening crowd dwell overrun (+3m)",
        category: "DWELL_TIME_OVERRUN",
      },
      {
        sectionName: "SET - CPT",
        fromStation: "SET",
        toStation: "CPT",
        chainageKm: "72.8 - 82.8",
        delayIncurredMin: 3,
        rootCause: "1:150 rising gradient drag on heavy 21-coach LHB rake (+3m)",
        category: "PSR_SPEED_RESTRICTION",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 8,
        rootCause: "Nayandahalli junction signal detention awaiting platform clear at SBC",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "16022",
    trainName: "Kaveri Express",
    serviceType: "Express",
    scheduledDep: "21:00",
    actualDep: "21:00",
    scheduledArr: "23:45",
    actualArr: "23:54",
    totalDelayMin: 9,
    punctualityScorePercent: 90.5,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "SBC Night Platform Re-allocation Switch",
    primaryGapCategory: "SBC_THROAT_INTERLOCKING",
    primaryGapDescription: "Diverted from Platform 5 to Platform 7 at SBC due to a stabled empty rake, adding 4 minutes switch transit time at 15 km/h.",
    bottleneckHotspot: "SBC Yard West Crossover (KM 137.5)",
    aiDispatcherRecommendation: "Clear SBC Platform 5 30 minutes before 23:45 to avoid late platform diversion.",
    sectionalBreakdown: [
      {
        sectionName: "RMGM - BID",
        fromStation: "RMGM",
        toStation: "BID",
        chainageKm: "93.2 - 108.6",
        delayIncurredMin: 5,
        rootCause: "Held for night freight crossing clearance at Ramanagaram",
        category: "HEADWAY_WAKE",
      },
      {
        sectionName: "NYH - SBC",
        fromStation: "NYH",
        toStation: "SBC",
        chainageKm: "130.8 - 138.25",
        delayIncurredMin: 4,
        rootCause: "Platform re-allocation from PF 5 to PF 7 with slow turnout speed (15 km/h)",
        category: "SBC_THROAT_INTERLOCKING",
      },
    ],
  },
  {
    trainNumber: "BOXN-58219",
    trainName: "Automobile Cargo Goods Rake",
    serviceType: "Freight",
    scheduledDep: "01:00",
    actualDep: "01:10",
    scheduledArr: "04:30",
    actualArr: "04:52",
    totalDelayMin: 22,
    punctualityScorePercent: 74.0,
    statusCategory: "MODERATE_DELAY",
    primaryGapTitle: "Yard Brake Test Delay & Loop Line Stabling",
    primaryGapCategory: "LOOP_LINE_STABLING",
    primaryGapDescription: "Delayed 10m at Mysuru yard during pneumatic brake pipe test, followed by 12m detention on Bidadi Loop Line for block section maintenance clearance.",
    bottleneckHotspot: "MYS Goods Yard & Bidadi Loop Line 3",
    aiDispatcherRecommendation: "Pre-charge brake pipe in siding 30m prior to scheduled path; run continuous 75 km/h freight wave.",
    sectionalBreakdown: [
      {
        sectionName: "MYS Goods Yard",
        fromStation: "MYS",
        toStation: "MYS",
        chainageKm: "0.0",
        delayIncurredMin: 10,
        rootCause: "Brake continuity & air pressure test overrun (+10m dep)",
        category: "RAKE_TURNAROUND",
      },
      {
        sectionName: "BID Loop 3",
        fromStation: "BID",
        toStation: "BID",
        chainageKm: "108.6",
        delayIncurredMin: 12,
        rootCause: "Held on Bidadi Loop Line 3 for OHE night inspection car clearance",
        category: "LOOP_LINE_STABLING",
      },
    ],
  },
];
