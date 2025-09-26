/**
 * Types for middleware API responses
 */

export interface Provider {
  provider_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  phone: string;
  email?: string;
  website?: string;
  description?: string;
}

export interface MiddlewareResponse<T> {
  success: boolean;
  data: T;
  message: string;
  total?: number;
}

export interface ZipcodeProvidersResponse {
  success: boolean;
  data: Provider[];
  message: string;
  zipcode: string;
  count: number;
}
