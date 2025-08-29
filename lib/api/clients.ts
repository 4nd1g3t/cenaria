// lib/api/client.ts
import { API_URL, TIMEOUTS } from '@/lib/config/constants';
import { getIdTokenOrRedirect } from '@/lib/auth/session';

// API Error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly originalError: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Request configuration
interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  requireAuth?: boolean;
  retries?: number;
}

// Response wrapper
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: unknown) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    if (error instanceof ApiError) {
      // Retry on server errors (5xx) but not client errors (4xx)
      return error.status >= 500;
    }
    if (error instanceof NetworkError) {
      return true; // Retry network errors
    }
    return false;
  },
};

// Main API client class
class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_URL, timeout: number = TIMEOUTS.DEFAULT_REQUEST) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  // Core request method with retry logic
  async request<T = unknown>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.defaultTimeout,
      requireAuth = true,
      retries = DEFAULT_RETRY_CONFIG.maxRetries,
    } = config;

    const url = `${this.baseUrl}${endpoint}`;
    
    // Add authentication if required
    if (requireAuth) {
      const token = await getIdTokenOrRedirect('/signin');
      headers.Authorization = `Bearer ${token}`;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      cache: 'no-store',
    };

    if (body && method !== 'GET') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Execute request with retry logic
    return this.executeWithRetry(url, requestOptions, timeout, retries);
  }

  // Execute request with automatic retries
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    maxRetries: number
  ): Promise<ApiResponse<T>> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url, options, timeout);
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt or if retry condition fails
        if (attempt === maxRetries || !DEFAULT_RETRY_CONFIG.retryCondition(error)) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = DEFAULT_RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // Execute single request
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await this.parseResponse<T>(response);

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timeout', error);
      }

      throw new NetworkError('Network request failed', error);
    }
  }

  // Handle error responses
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode: string | undefined;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.message || errorMessage;
        errorCode = parsed.code;
      }
    } catch {
      // Ignore JSON parsing errors, use default message
    }

    throw new ApiError(errorMessage, response.status, errorCode, response);
  }

  // Parse response body
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      // Return empty object for non-JSON responses
      return {} as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new ApiError('Invalid JSON response', response.status);
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, config: Omit<ApiRequestConfig, 'method'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, config: Omit<ApiRequestConfig, 'method'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility functions for common patterns
export async function handleApiError(error: unknown): Promise<never> {
  if (error instanceof ApiError) {
    // Log structured error for monitoring
    console.error('API Error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      url: error.response?.url,
    });
    throw error;
  }

  if (error instanceof NetworkError) {
    console.error('Network Error:', error.message, error.originalError);
    throw error;
  }

  console.error('Unknown API Error:', error);
  throw new ApiError('An unexpected error occurred', 500);
}

// Type-safe wrapper for form data submission
export function createFormDataBody(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value != null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`${key}[${index}]`, String(item));
        });
      } else {
        formData.append(key, String(value));
      }
    }
  });

  return formData;
}