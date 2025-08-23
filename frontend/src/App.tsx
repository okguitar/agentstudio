import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPanel } from './components/ChatPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { useSlides } from './hooks/useSlides';
import { useAppStore } from './stores/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { data: slidesData } = useSlides();
  const { setSlides } = useAppStore();

  useEffect(() => {
    if (slidesData?.slides) {
      setSlides(slidesData.slides);
    }
  }, [slidesData, setSlides]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left Panel - Chat */}
      <div className="w-96 border-r border-gray-300 flex flex-col">
        <ChatPanel />
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        <PreviewPanel />
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;