import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Generate 3 variations of marketing copy.
   * @param {object} data - { product_name, product_description, platform, tone, temperature, top_p }
   */
  generateCopy: async (data) => {
    const response = await api.post('/generate-copy', data);
    return response.data;
  },

  /**
   * Save a selected copywriting variation to history database.
   * @param {object} data - { product_name, platform, tone, prompt, headline, content, cta, hashtags, temperature, top_p }
   */
  saveContent: async (data) => {
    const response = await api.post('/save-content', data);
    return response.data;
  },

  /**
   * Retrieve saved history, optionally filtered.
   * @param {object} params - { search, platform, tone }
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/history', { params });
    return response.data;
  },

  /**
   * Delete an item from database history.
   * @param {number} id - History record ID
   */
  deleteHistoryItem: async (id) => {
    const response = await api.delete(`/history/${id}`);
    return response.data;
  },

  /**
   * Fetch aggregated copy generation analytics.
   */
  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  },
};
