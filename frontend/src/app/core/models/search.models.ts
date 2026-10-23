export type SearchScopeType = 'all' | 'tasks' | 'projects' | 'expenses';

export interface SearchResultItem {
  id: string;
  type: 'task' | 'project' | 'expense';
  title: string;
  subtitle?: string | null;
  status?: string | null;
  priority?: string | null;
  amount?: number | null;
  date?: string | null;
  categoryName?: string | null;
  projectName?: string | null;
  data: any;
}

export interface SearchResponse {
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    all: number;
    tasks: number;
    projects: number;
    expenses: number;
  };
  results: SearchResultItem[];
}
