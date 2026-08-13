import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useMoodData = () => {
  const [pastEntries, setPastEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getMoodEntries();
      
      setPastEntries(data.map((entry) => ({ ...entry, selections: entry.selections || [] })));
    } catch (error) {
      console.error('Failed to load history:', error);
      setError('暂时无法读取记录');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return {
    pastEntries,
    setPastEntries,
    loading,
    error,
    refreshHistory: loadHistory,
  };
};
