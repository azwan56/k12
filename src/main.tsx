import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { consumeImportHash, pullFromLegacyOrigins } from './k12/migrate';

consumeImportHash()
  .catch((e) => console.warn('[migrate] import failed', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StrictMode>,
    );
    pullFromLegacyOrigins();
  });
