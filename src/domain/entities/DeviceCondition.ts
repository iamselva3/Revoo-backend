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
  batteryHealth?: BatteryHealthStatus;
  functionalFaults?: FunctionalFaults;

  // New DOFY Condition Assessment fields
  basicQuestions?: BasicConditionQuestions;
  backPanelCondition?: BackPanelCondition;
  sidePanelCondition?: SidePanelCondition;
  hardwareFaults?: HardwareFaults;

  hasOriginalBox: boolean;
  hasOriginalCharger: boolean;
  additionalNotes?: string;
}

export interface InspectedCondition extends DeclaredCondition {
  screenFunctional: boolean;
  touchFunctional: boolean;
  camerasFunctional: boolean;
  biometricsFunctional: boolean;
  discrepancies: string[];
}

