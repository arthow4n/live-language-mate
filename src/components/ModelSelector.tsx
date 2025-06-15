
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
  };
}

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const ModelSelector = ({ value, onValueChange, placeholder = "Select model..." }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        console.log('Fetching models from backend...');
        const { data, error } = await supabase.functions.invoke('fetch-models');
        
        if (error) {
          console.error('Error fetching models:', error);
          throw error;
        }

        if (data?.models) {
          setModels(data.models);
          console.log(`Loaded ${data.models.length} models${data.fallback ? ' (using fallback)' : ''}`);
        } else {
          throw new Error('No models data received');
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        // Set fallback models on error
        setModels([
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
          { id: 'openai/gpt-4o', name: 'GPT-4o' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  const selectedModel = models.find(model => model.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedModel ? selectedModel.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <ScrollArea className="h-[300px]">
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading models..." : "No models found."}
              </CommandEmpty>
              <CommandGroup>
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.id}</span>
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
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ModelSelector;
export type { OpenRouterModel };
