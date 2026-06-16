import axios from 'axios';

// Automatically maps paths relatively so they loop directly into our unified /app backend proxy tunnel
const apiClient = axios.create({
  baseURL: window.location.origin, 
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true' // Extra shield to make sure Axios never hits an ngrok intercept page
  }
});

export const transactionService = {
  /**
   * Universal Search Router Module
   * Hits: /transactions/details/:referenceId
   */
  searchByReference: async (referenceId: string) => {
    // We strip out '/app' from the base since we want this hitting your main Express router blocks
    const response = await apiClient.get(`/transactions/details/${encodeURIComponent(referenceId)}`);
    return response.data;
  },

  /**
   * Direct InstaPay Trace Scanner Module
   * Hits: /transactions/details/instapay/trace?date=YYYY-MM-DD&traceNumber=XXXXXX
   */
  getInvoiceByTrace: async (date: string, traceNumber: string) => {
    const response = await apiClient.get('/transactions/details/instapay/trace', {
      params: { date, traceNumber }
    });
    return response.data;
  }
};