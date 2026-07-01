import type { SchemePortfolioItem } from '@/lib/portfolio/executive-portfolio';

export type StatusFilter = 'all' | 'active' | 'archived';
export type SortBy = 'newest' | 'name' | 'highest-cost' | 'lowest-cost';

export interface FilterSortInput {
  projects: SchemePortfolioItem[];
  search: string;
  statusFilter: StatusFilter;
  sortBy: SortBy;
}

export function filterAndSortPortfolioProjects(input: FilterSortInput): SchemePortfolioItem[] {
  const { projects, search, statusFilter, sortBy } = input;

  let result = projects;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q));
  }

  if (statusFilter === 'active') {
    result = result.filter((p) => !p.isArchived);
  } else if (statusFilter === 'archived') {
    result = result.filter((p) => p.isArchived);
  }

  const sorted = [...result];

  switch (sortBy) {
    case 'newest':
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'highest-cost':
      sorted.sort((a, b) => b.grandTotal - a.grandTotal);
      break;
    case 'lowest-cost':
      sorted.sort((a, b) => a.grandTotal - b.grandTotal);
      break;
  }

  return sorted;
}
