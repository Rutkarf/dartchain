import { LaunchStatus } from './showcase.model';

export type DaoGovernanceStatus = 'active' | 'creating' | 'closed';

export interface DaoShowcaseCard {
  id: string;
  symbol: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  chain?: string | null;
  launchStatus: LaunchStatus;
  status: DaoGovernanceStatus;
  summary: string;
  objective: string;
  proposalsCount: number;
  votesCount: number;
  membersActive: number;
}

export function mapLaunchStatusToDao(status: LaunchStatus): DaoGovernanceStatus {
  switch (status) {
    case 'LIVE':
      return 'active';
    case 'ENDED':
      return 'closed';
    default:
      return 'creating';
  }
}

export function daoStatusLabel(status: DaoGovernanceStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'closed':
      return 'Fermée';
    default:
      return 'En création';
  }
}
