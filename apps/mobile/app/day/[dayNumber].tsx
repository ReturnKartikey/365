import React from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';

/**
 * Deep link routing handler for 365://day/:dayNumber
 * Redirects to the editorial day share & showcase card.
 */
export default function DayRouteHandler() {
  const { dayNumber } = useLocalSearchParams<{ dayNumber: string }>();
  return <Redirect href={`/share/${dayNumber || ''}`} />;
}
