/**
 * Types partagés — miroir des réponses de l'API.
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  neighborhood: string | null;
  createdAt?: string;
}

export type ListingCategory = 'TOOL' | 'SERVICE' | 'DONATION' | 'OTHER';
export type ListingStatus = 'OPEN' | 'RESERVED' | 'CLOSED';

export interface ListingOwner {
  id: string;
  firstName: string;
  neighborhood: string | null;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ListingCategory;
  status: ListingStatus;
  neighborhood: string;
  distanceKm?: number;
  isOwner: boolean;
  createdAt: string;
  owner: ListingOwner;
}

export interface ListingPage {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUser: ListingOwner;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  TOOL: 'Prêt de matériel',
  SERVICE: 'Service entre voisins',
  DONATION: 'Don',
  OTHER: 'Autre',
};

export const CATEGORY_EMOJI: Record<ListingCategory, string> = {
  TOOL: '🔧',
  SERVICE: '🤝',
  DONATION: '🎁',
  OTHER: '📦',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  OPEN: 'Disponible',
  RESERVED: 'Réservée',
  CLOSED: 'Clôturée',
};
