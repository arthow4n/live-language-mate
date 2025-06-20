import LanguageMateApp from '@/components/LanguageMateApp';
import { LocalStorageProvider } from '@/contexts/LocalStorageContext';

const Index = () => {
  return (
    <LocalStorageProvider>
      <LanguageMateApp />
    </LocalStorageProvider>
  );
};

export default Index;
