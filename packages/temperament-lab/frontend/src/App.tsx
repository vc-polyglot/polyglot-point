import { useEffect } from 'react';
import { initRevenueCat } from './services/revenuecat';
import { TunerScreen } from './components/TunerScreen';

export function App() {
  useEffect(() => {
    initRevenueCat().catch(console.error);
  }, []);
  return <TunerScreen />;
}
