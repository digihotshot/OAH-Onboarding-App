import { useState, useEffect, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export const useGooglePlaces = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
          version: 'weekly',
          libraries: ['places'],
        });

        await loader.load();
        setIsLoaded(true);
        console.log('✅ Google Places API loaded');
      } catch (err) {
        console.error('❌ Error loading Google Places API:', err);
        setError('Failed to load Google Places API');
      }
    };

    initializeGooglePlaces();
  }, []);

  const initializeAutocomplete = useCallback((
    input: HTMLInputElement,
    onPlaceSelect: (address: string) => void
  ) => {
    if (!isLoaded || !input) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'US' },
      fields: ['formatted_address'],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        console.log('🎯 Selected address:', place.formatted_address);
        onPlaceSelect(place.formatted_address);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [isLoaded]);

  return {
    isLoaded,
    error,
    initializeAutocomplete,
  };
};