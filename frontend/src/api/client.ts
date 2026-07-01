import axios from 'axios';

// The Backend API is running on port 3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to all requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('synccap_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// --- API Service Functions ---

export const ApiService = {

  /**
   * Request a sandbox token for a specific party.
   * @param party The Canton party name
   * @param additionalActAs Optional array of additional parties to act as
   * @returns The JWT token and the fully qualified party ID
   */
  async login(party: string, additionalActAs?: string[]): Promise<{ token: string; partyId: string }> {
    const res = await client.post('/auth/token', { party, additionalActAs });
    // Save token for future requests
    localStorage.setItem('synccap_token', res.data.token);
    localStorage.setItem('synccap_partyId', res.data.partyId);
    return res.data;
  },

  logout() {
    localStorage.removeItem('synccap_token');
    localStorage.removeItem('synccap_partyId');
  },

  /**
   * Get all CapacityAssets visible to the currently logged in party.
   */
  async getAssets(): Promise<any[]> {
    const res = await client.get('/api/v1/assets');
    return res.data.data || [];
  },

  /**
   * Issue a new Capacity Asset (Manufacturer only)
   */
  async createAsset(payload: {
    owner: string;
    assetId: string;
    technologyNode: 'N3nm' | 'N5nm' | 'N7nm' | 'N14nm';
    waferStartsPerMonth: number;
    costBasisPerWafer: string;
    commitmentStartDate: string;
    commitmentEndDate: string;
  }): Promise<{ contractId: string }> {
    const res = await client.post('/api/v1/assets', payload);
    return res.data;
  },

  /**
   * Propose a Dark Pool Transfer (Primary Buyer only).
   * Hides the original cost basis from the secondary buyer.
   */
  async proposeTransfer(payload: {
    assetContractId: string;
    secondaryBuyer: string;
    askingPricePerWafer: string;
  }): Promise<{ rfqContractId: string }> {
    const res = await client.post('/api/v1/transfers/propose', payload);
    return res.data;
  },

  /**
   * View all Transfer RFQs visible to the current party.
   */
  async getTransfers(): Promise<any[]> {
    const res = await client.get('/api/v1/transfers');
    return res.data.data || [];
  },

  /**
   * Accept an RFQ (Secondary Buyer only)
   */
  async acceptTransfer(payload: { rfqContractId: string; agreedPricePerWafer: string }): Promise<{ newAssetContractId: string }> {
    const res = await client.post('/api/v1/transfers/accept', payload);
    return res.data;
  },

  /**
   * View all Penalty Agreements visible to the current party.
   */
  async getPenalties(): Promise<any[]> {
    const res = await client.get('/api/v1/penalties');
    return res.data.data || [];
  },

  /**
   * Initiate a Penalty Agreement for cancellation
   */
  async initiatePenalty(payload: {
    assetContractId: string;
    penaltyRate: string;
  }): Promise<{ penaltyContractId: string }> {
    const res = await client.post('/api/v1/penalties/initiate', payload);
    return res.data;
  },

  /**
   * Settle a Penalty Agreement (Manufacturer only)
   */
  async settlePenalty(payload: { penaltyContractId: string }): Promise<{ settledContractId: string }> {
    const res = await client.post('/api/v1/penalties/settle', payload);
    return res.data;
  }
};
