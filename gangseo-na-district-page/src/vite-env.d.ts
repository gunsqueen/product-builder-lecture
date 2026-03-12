/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE_MODE?: 'mock' | 'real' | 'auto';
  readonly VITE_USE_REAL_DATA?: string;
  readonly VITE_SEOUL_OPEN_API_KEY?: string;
  readonly VITE_SEOUL_OPEN_API_BASE_URL?: string;
  readonly VITE_SEOUL_POPULATION_BASE_DATE?: string;
  readonly VITE_SEOUL_DISTRICT_POPULATION_SERVICE?: string;
  readonly VITE_SEOUL_DISTRICT_HOUSEHOLD_SERVICE?: string;
  readonly VITE_SEOUL_DONG_POPULATION_SERVICE?: string;
  readonly VITE_SEOUL_DONG_HOUSEHOLD_SERVICE?: string;
  readonly VITE_DISTRICT_INDEX_URL?: string;
  readonly VITE_DONG_INDEX_URL?: string;
  readonly VITE_ELECTION_RESULTS_URL?: string;
  readonly VITE_DISTRICT_GEO_URL?: string;
  readonly VITE_DONG_GEO_URL?: string;
  readonly VITE_DISTRICT_GEO_SIMPLIFIED_URL?: string;
  readonly VITE_DONG_GEO_SIMPLIFIED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
