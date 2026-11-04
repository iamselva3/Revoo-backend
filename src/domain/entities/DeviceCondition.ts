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

export interface FunctionalFaults {
  frontCameraFaulty: boolean;
  backCameraFaulty: boolean;
  faceIdOrFingerprintFaulty: boolean;
  speakerOrMicFaulty: boolean;
  chargingPortFaulty: boolean;
  wirelessOrBluetoothFaulty: boolean;
}

export interface DeclaredCondition {
  displayCondition: DisplayCondition;
  bodyCondition: BodyCondition;
  batteryHealth: BatteryHealthStatus;
  functionalFaults: FunctionalFaults;
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

