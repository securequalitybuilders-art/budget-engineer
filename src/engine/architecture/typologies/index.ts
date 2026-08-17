export type {
  TypologyConstraints,
  ConstraintFinding,
  ConstraintEvaluation,
  ConstraintEvaluatorInput,
  FunctionalZoningConstraint,
  CorePlanningConstraint,
  WorkspaceLayoutConstraint,
  MeetingRoomConstraint,
  ReceptionConstraint,
  EmergencyExitConstraint,
  DaylightingConstraint,
  AccessibilityConstraint,
  StructuralGridConstraint,
  BuildingServicesConstraint,
  ConstraintSeverity,
  ConstraintDomain,
  ZoneRequirement,
} from './types'

export const ALL_CONSTRAINTS = [
  officeTypologyConstraints,
  houseTypologyConstraints,
  apartmentTypologyConstraints,
  duplexTypologyConstraints,
  townhouseTypologyConstraints,
  clinicTypologyConstraints,
  schoolTypologyConstraints,
  churchTypologyConstraints,
  communityHallTypologyConstraints,
  retailTypologyConstraints,
  hotelTypologyConstraints,
  restaurantTypologyConstraints,
  warehouseTypologyConstraints,
  marketTypologyConstraints,
  petrolTypologyConstraints,
  mixedUseTypologyConstraints,
] as const

export { getConstraintsForTypology, listTypologyIds, listAllConstraints } from './constraintEvaluator'

import { officeTypologyConstraints } from './office'
import { houseTypologyConstraints } from './house'
import { apartmentTypologyConstraints } from './apartment'
import { duplexTypologyConstraints } from './duplex'
import { townhouseTypologyConstraints } from './townhouse'
import { clinicTypologyConstraints } from './clinic'
import { schoolTypologyConstraints } from './school'
import { churchTypologyConstraints } from './church'
import { communityHallTypologyConstraints } from './communityHall'
import { retailTypologyConstraints } from './retail'
import { hotelTypologyConstraints } from './hotel'
import { restaurantTypologyConstraints } from './restaurant'
import { warehouseTypologyConstraints } from './warehouse'
import { marketTypologyConstraints } from './market'
import { petrolTypologyConstraints } from './petrol'
import { mixedUseTypologyConstraints } from './mixedUse'
