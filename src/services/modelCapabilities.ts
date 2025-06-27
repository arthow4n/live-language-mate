import type { Model, ModelsResponse } from '@/schemas/api';

import { apiClient } from './apiClient.js';

/**
 * Cache for model capabilities data with TTL
 */
interface ModelCapabilitiesCache {
  data: Model[] | null;
  timestamp: number;
  ttl: number;
}

/**
 * Service for fetching and caching model capabilities from OpenRouter
 */
class ModelCapabilitiesService {
  private cache: ModelCapabilitiesCache = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  };

  /**
   * Clears the cache - useful for testing or force refresh
   */
  clearCache(): void {
    this.cache.data = null;
    this.cache.timestamp = 0;
  }

  /**
   * Gets specific model capabilities
   * @param modelId
   */
  async getModelCapabilities(modelId: string): Promise<Model | null> {
    try {
      const models = await this.getModels();
      return models.find((m) => m.id === modelId) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches models from the API, using cache if valid
   */
  async getModels(): Promise<Model[]> {
    const now = Date.now();
    const cacheExpired = now - this.cache.timestamp > this.cache.ttl;

    if (this.cache.data && !cacheExpired) {
      return this.cache.data;
    }

    try {
      const response: ModelsResponse = await apiClient.getModels();
      this.cache.data = response.data;
      this.cache.timestamp = now;
      return this.cache.data;
    } catch (error) {
      // If cache exists but is expired, return stale data on error
      if (this.cache.data) {
        return this.cache.data;
      }
      throw error;
    }
  }

  /**
   * Gets all models that support specific input modalities
   * @param modality
   */
  async getModelsSupportingModality(modality: string): Promise<Model[]> {
    try {
      const models = await this.getModels();
      return models.filter((m) =>
        m.architecture.input_modalities.includes(modality)
      );
    } catch {
      return [];
    }
  }

  /**
   * Updates cache TTL
   * @param ttlMs
   */
  setCacheTTL(ttlMs: number): void {
    this.cache.ttl = ttlMs;
  }

  /**
   * Checks if a model supports image inputs
   * @param modelId
   */
  async supportsImages(modelId: string): Promise<boolean> {
    try {
      const models = await this.getModels();
      const model = models.find((m) => m.id === modelId);

      if (!model) {
        return false;
      }

      return model.architecture.input_modalities.includes('image');
    } catch {
      // Conservative default - assume no image support on error
      return false;
    }
  }
}

// Export singleton instance
export const modelCapabilities = new ModelCapabilitiesService();
