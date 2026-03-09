export type BookingStatus =
  | 'pending'
  | 'pending-payment'
  | 'booked'
  | 'ongoing'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type PaymentMethod =
  | 'bank_transfer'
  | 'credit_card'
  | 'company_account'
  | 'cash'
  | '';

export interface AdditionalService {
  id: string;
  name: string;
  quantity: number;
  charge: number;
}

export interface BookingStep {
  id: string;
  title: string;
  completed: boolean;
  active: boolean;
}

export interface BookingAvailability {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status?: BookingStatus | string;
}

export interface BookingSummary {
  nights: number;
  extraGuests: number;
  baseGuests: number;
  unitCharge: number;
  amenitiesCharge: number;
  serviceCharge: number;
  discount: number;
  totalCharges: number;
  subtotal?: number;
  extraGuestFees?: number;
  primaryGuests?: number;
}

export interface BookingFormData {
  listingId?: string;
  pricePerNight?: number;
  priceUnit?: string;
  extraGuestFeePerPerson?: number;
  extraGuestRate?: number;
  baseGuests?: number;
  serviceCharge?: number;
  discount?: number;

  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  numberOfGuests: number;
  extraGuests: number;

  firstName: string;
  lastName: string;
  email: string;
  nickname?: string;
  dateOfBirth?: string;
  referredBy?: string;
  gender: 'male' | 'female' | 'other' | string;
  preferredContactNumber: string;
  contactType: 'home' | 'mobile' | 'work' | string;

  additionalServices: AdditionalService[];
  requestDescription?: string;

  paymentMethod: PaymentMethod;
  requirePayment?: boolean;
  agreeToTerms: boolean;

  cardNumber?: string;
  nameOnCard?: string;
  cvvCode?: string;
  expirationDate?: string;

  bankName?: string;
  bankAccountNumber?: string;
  depositorName?: string;
  bankReceiptUploaded?: boolean;
  bankReceiptFileName?: string;
  bankReceiptUrl?: string;

  companyName?: string;
  billingContact?: string;
  billingEmail?: string;
  poNumber?: string;
  billingDocumentUploaded?: boolean;
  billingDocumentFileName?: string;
  billingDocumentUrl?: string;

  cashPayerName?: string;
  cashPayerContact?: string;
  cashPayBeforeArrival?: boolean;

  bookingReference?: string;
  assignedAgentName?: string;

  propertyType?: string;
  propertyTitle?: string;
  propertyLocationShort?: string;
  propertyImage?: string;

  locationAddress?: string;
  locationLandmark?: string;
  locationParking?: string;
  locationCoords?: string;
  checkInInstructions?: string;
  locationNotes?: string;
}

export interface BlockedRange {
  start_date: string;
  end_date: string;
  listing_id?: string;
  reason?: string;
  created_at?: string;
}

export interface PricingRule {
  start_date: string;
  end_date: string;
  price: number;
  listing_id?: string;
  created_at: string;
}

export interface ClientDetailsInput {
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  contact_number?: string;
  gender?: string;
  birth_date?: string;
  preferred_contact?: string;
  referred_by?: string;
}

export interface CreateBookingInput {
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  extra_guests: number;
  add_ons: AdditionalService[];
  landmark?: string;
  parking_info?: string;
  notes?: string;
  request_description?: string;
  payment_method?: PaymentMethod;
  require_payment?: boolean;
  total_amount: number;
  guest_user_id?: string;
  assigned_agent_id?: string;
  assigned_agent_email?: string;
  assigned_agent_name?: string;
  client: ClientDetailsInput;
}

export interface BookingRecord {
  id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  extra_guests: number;
  add_ons: AdditionalService[];
  landmark?: string;
  parking_info?: string;
  notes?: string;
  request_description?: string;
  payment_method?: PaymentMethod;
  require_payment?: boolean;
  total_amount: number;
  status: BookingStatus;
  transaction_number: string;
  assigned_agent_id?: string;
  assigned_agent_email?: string;
  assigned_agent_name?: string;
  client: ClientDetailsInput;
  created_at: string;
  updated_at: string;
}
