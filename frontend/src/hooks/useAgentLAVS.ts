/**
 * Hook to check if an agent has LAVS (Local Agent View Service)
 */

import { useState, useEffect } from 'react';
import { LAVSClient, LAVSManifest } from '../lavs';

export function useAgentLAVS(agentId: string) {
  const [hasLAVS, setHasLAVS] = useState(false);
  const [manifest, setManifest] = useState<LAVSManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkLAVS = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = new LAVSClient({ agentId });
        const manifestData = await client.getManifest();

        setHasLAVS(true);
        setManifest(manifestData);
      } catch (err: any) {
        // 404 means no LAVS, not an error
        if (err.code === -1 && err.message.includes('404')) {
          setHasLAVS(false);
          setManifest(null);
        } else {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    checkLAVS();
  }, [agentId]);

  return { hasLAVS, manifest, loading, error };
}
