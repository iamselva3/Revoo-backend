export type DisplayCondition = 
  | 'FLAWLESS' // No scratches, no dents, vibrant display
  | 'MINOR_SCRATCHES' // Light scratches, screen works perfectly
  | 'DEEP_SCRATCHES' // Noticeable visible scratches
  | 'CRACKED_GLASS' // Glass cracked, but touch and display work
  | 'BROKEN_OR_DEAD_PIXELS'; // Touch issue, lines, spots, or unresponsive

export type BodyCondition = 
  | 'FLAWLESS' // Like new, pristine body
  | 'MINOR_SIGNS_OF_USE' // Barely visible minor scuffs
  | 'DENTED_OR_SCRATCHED' // Noticeable dents or scratches on frame/back
  | 'BENT_OR_CRACKED_BACK'; // Bent body or cracked back glass

export type BatteryHealthStatus = 
  | 'EXCELLENT' // Above 85% health
  | 'GOOD' // 75% - 85%
  | 'DEGRADED'; // Below 75% or requires service

// DOFY-Style Physical Conditions
export type BackPanelCondition =
  | 'NO_DEFECTS'
  | 'MINOR_SCRATCHES'
  | 'HEAVY_SCRATCHES'
  | 'BACK_PANEL_BROKEN';

export type SidePanelCondition =
  | 'NO_DEFECTS'
  | 'MINOR_DENT_OR_SCRATCHES'
  | 'HEAVY_DENT'
  | 'BENT_OR_BROKEN';

export type ScreenTouchConditionKey =
  | 'flawless'
  | 'minor_screen_scratches'
  | 'heavy_screen_scratches'
  | 'display_spots_or_dead_pixels'
  | 'screen_cracked_glass_only'
  | 'touch_screen_not_working';

export type BodySideConditionKey =
  | 'no_scratches_flawless'
  | 'minor_scratches_center_or_side'
  | 'major_scratches_or_paint_peel'
  | 'back_glass_cracked_or_broken'
  | 'dents_or_bent_side_panel';

export type BatteryHealthKey =
  | 'above_90_percent'
  | '86_to_90_percent'
  | '80_to_85_percent'
  | 'below_80_percent_or_service';

export type HardwareDefectKey =
  | 'camera_glass_broken'
  | 'rear_camera_not_working_or_blurry'
  | 'front_camera_not_working'
  | 'face_id_or_fingerprint_not_working'
  | 'wifi_bluetooth_gps_issue'
  | 'speaker_or_mic_faulty'
  | 'charging_port_faulty'
  | 'volume_or_power_button_faulty'
  | 'network_or_sim_tray_issue';

export type AccessoryKey =
  | 'original_charger'
  | 'box_same_imei'
  | 'bill_same_imei';

export interface BasicConditionQuestions {
  isPhoneWorking: boolean;         // 1. Is the phone in proper working condition?
  isTouchscreenWorking: boolean;   // 2. Is the touchscreen working properly?
  isDisplayOriginal: boolean;      // 3. Is the phone's display original?
  hasValidWarranty: boolean;       // 4. Is there a valid warranty for your phone?
}

export interface HardwareFaults {
  volumeButtonNotWorking: boolean;
  wifiOrBluetoothNotWorking: boolean;
  chargingPortNotWorking: boolean;
  proximitySensorNotWorking: boolean;
  powerButtonNotWorking: boolean;
  earSpeakerNotWorking: boolean;
  vibratorNotWorking: boolean;
  cameraGlassBroken?: boolean;
  rearCameraNotWorking?: boolean;
  frontCameraNotWorking?: boolean;
  faceIdOrFingerprintNotWorking?: boolean;
  networkOrSimTrayIssue?: boolean;
}

export interface FunctionalFaults {
  frontCameraFaulty?: boolean;
  backCameraFaulty?: boolean;
  faceIdOrFingerprintFaulty?: boolean;
  speakerOrMicFaulty?: boolean;
  chargingPortFaulty?: boolean;
  wirelessOrBluetoothFaulty?: boolean;
}

export interface DeclaredCondition {
  // Legacy fields (kept for backward compatibility)
  displayCondition?: DisplayCondition;
  bodyCondition?: BodyCondition;
  batteryHealth?: BatteryHealthStatus | number | string;
  functionalFaults?: FunctionalFaults;

  // DOFY Condition Assessment fields
  phone_working_condition?: boolean;
  screen_condition?: ScreenTouchConditionKey | string;
  body_condition?: BodySideConditionKey | string;
  battery_health?: BatteryHealthKey | number | string;
  hardware_defects?: (HardwareDefectKey | string)[];
  accessories?: (AccessoryKey | string)[];
  accessories_present?: (AccessoryKey | string)[];

  basicQuestions?: BasicConditionQuestions;
  backPanelCondition?: BackPanelCondition;
  sidePanelCondition?: SidePanelCondition;
  hardwareFaults?: HardwareFaults;

  hasOriginalBox?: boolean;
  hasOriginalCharger?: boolean;
  hasValidBill?: boolean;
  hasValidWarranty?: boolean;
  original_charger?: boolean;
  box_same_imei?: boolean;
  bill_same_imei?: boolean;
  outOfWarranty?: boolean;
  additionalNotes?: string;
}

export interface InspectedCondition extends DeclaredCondition {
  screenFunctional: boolean;
  touchFunctional: boolean;
  camerasFunctional: boolean;
  biometricsFunctional: boolean;
  discrepancies: string[];
}
