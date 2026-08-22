import { R4v3FaqEntry } from './r4v3-faq.model';

export interface R4v3HubPillarSection {
  title: string;
  body: string;
}

export interface R4v3HubPillar {
  id: string;
  label: string;
  detail: string;
  icon: string;
  accent: 'cyan' | 'green' | 'magenta' | 'gold' | 'violet' | 'blue';
  drawerTitle: string;
  drawerSummary: string;
  sections: readonly R4v3HubPillarSection[];
}

export type CommunityFaqQuestionStatus = 'open' | 'answered' | 'pinned';

export interface CommunityFaqAnswer {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  isStaff: boolean;
  isValidated: boolean;
  isHighlighted: boolean;
  createdAt: string;
  relativeTime: string;
  votes: number;
}

export interface CommunityFaqQuestion {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
  relativeTime: string;
  status: CommunityFaqQuestionStatus;
  answers: readonly CommunityFaqAnswer[];
  answerCount: number;
  pendingStaffReview: boolean;
  score: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'UP' | 'DOWN' | null;
  isUnread?: boolean;
}

export type R4v3HubDrawerPayload =
  | { kind: 'pillar'; pillar: R4v3HubPillar }
  | { kind: 'faq'; entry: R4v3FaqEntry }
  | { kind: 'community'; question: CommunityFaqQuestion }
  | { kind: 'official-wiki' }
  | { kind: 'community-form' };

export type R4v3SystemStatus = 'ok' | 'degraded' | 'incident';
