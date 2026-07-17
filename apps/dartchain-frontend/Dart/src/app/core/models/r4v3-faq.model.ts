export type R4v3FaqCategoryId =
  | 'essentiel'
  | 'utilisation'
  | 'stabilite'
  | 'ecosysteme'
  | 'evolution';

export type R4v3FaqActionType =
  | 'NONE'
  | 'OPEN_FAUCET'
  | 'OPEN_SWAP'
  | 'OPEN_WHITEPAPER';

export interface R4v3FaqCategory {
  id: R4v3FaqCategoryId;
  label: string;
  icon: string;
}

export interface R4v3FaqHighlight {
  id: string;
  label: string;
  detail: string;
  icon: string;
}

export interface R4v3FaqEntry {
  id: string;
  categoryId: R4v3FaqCategoryId;
  title: string;
  summary: string;
  body: string;
  popular?: boolean;
  isNew?: boolean;
  updatedAt?: string;
  actionType?: R4v3FaqActionType;
  actionLabel?: string;
  tags?: readonly string[];
}
