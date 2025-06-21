import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import Index from './pages/Index';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <UnifiedStorageProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route element={<Index />} path="/" />
              <Route element={<NotFound />} path="*" />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UnifiedStorageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
