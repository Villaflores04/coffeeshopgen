import { useEffect, useRef } from 'react';
import { supabase } from './supabase.js';

/**
 * Calls onChange whenever a row in `table` matching `filter` changes.
 * `filter` looks like "customer_id=eq.<uuid>". Pass a falsy filter to pause.
 */
export function useRealtime(name, table, filter, onChange) {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    if (!filter) return undefined;
    const channel = supabase
      .channel(`${name}:${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => callback.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [name, table, filter]);
}
