export interface CeremonyTimeInput {
  startTime?: string;
  endTime?: string;
}

export interface CompanyFormData {
  name: string;
  address?: string;
  phone?: string;
  homepage?: string;
  accessibility?: string;
  gps_coordinates?: string;
  ceremony_times: CeremonyTimeInput[]; // Always have the array, even if empty initially
}

