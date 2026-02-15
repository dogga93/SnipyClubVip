import { CompositeOddsProvider, MockInternalModelProvider, MockPublicCashProvider } from '@/lib/providers/mockProviders';

export const oddsProvider = new CompositeOddsProvider();
export const publicCashProvider = new MockPublicCashProvider();
export const internalModelProvider = new MockInternalModelProvider();
