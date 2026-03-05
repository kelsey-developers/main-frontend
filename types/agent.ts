export interface AgentSocialLinks {
  facebook?: string;
  messenger?: string;
  whatsapp?: string;
}

export interface AgentProperty {
  id: string;
  title: string;
  image: string;
  price: number;
  currency: string;
  priceUnit: string;
  location: string;
  features: string[];
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  status: 'Available Now' | 'Popular Choice' | 'Almost Booked' | 'New Listing';
}

export interface AgentProfile {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  location: string;
  socialLinks: AgentSocialLinks;
  assignedProperties: AgentProperty[];
}
