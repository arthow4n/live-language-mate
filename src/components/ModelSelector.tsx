import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn, logError } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';

/**
 *
 */
interface ModelSelectorProps {
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

/**
 *
 */
interface OpenRouterModel {
  architecture?: {
    instruct_type?: string;
    modality: string;
    tokenizer: string;
  };
  context_length?: number;
  description?: string;
  id: string;
  name: string;
  pricing?: {
    completion: string;
    prompt: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
  };
}

const ModelSelector = ({
  onValueChange,
  placeholder = 'Select model...',
  value,
}: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getModels();

        // Filter out models that don't have required properties
        const validModels = data.models.filter(
          (model: unknown): model is OpenRouterModel =>
            typeof model === 'object' &&
            model !== null &&
            'id' in model &&
            'name' in model &&
            'id' in model &&
            typeof model.id === 'string' &&
            typeof model.name === 'string'
        );
        setModels(validModels);
      } catch (error) {
        logError('Failed to load models:', error);
        // Set fallback models on error
        setModels([
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
          { id: 'openai/gpt-4o', name: 'GPT-4o' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          {
            id: 'meta-llama/llama-3.1-8b-instruct',
            name: 'Llama 3.1 8B Instruct',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    void loadModels();
  }, []);

  const selectedModel = models.find((model) => model.id === value);

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="justify-between"
          role="combobox"
          variant="outline"
        >
          {selectedModel ? selectedModel.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Loading models...' : 'No models found.'}
            </CommandEmpty>
            <CommandGroup>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                  value={model.id}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === model.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.id}
                    </span>
                    {model.description && (
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {model.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ModelSelector;
export type { OpenRouterModel };
