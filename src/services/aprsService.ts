import { APRSResponse } from '../types';



export class APRSService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch APRS positions for a given callsign
   * @param callsign - The APRS callsign to track
   * @returns Promise<APRSResponse>
   */
  async fetchPositions(callsign: string): Promise<APRSResponse> {
    if (!this.apiKey) {
      throw new Error('API key missing. Enter it in Settings.');
    }

    const url = `/aprs/get?name=${encodeURIComponent(callsign)}&what=loc&apikey=${this.apiKey}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }

  /**
   * Validate APRS callsign format
   * @param callsign - The callsign to validate
   * @returns boolean
   */
  static isValidCallsign(callsign: string): boolean {
    return /^[A-Z0-9]{1,6}(-[0-9A-Z]{1,2})?$/i.test(callsign);
  }

  /**
   * Create APRS service instance with API key
   * @param apiKey - The APRS.fi API key
   * @returns APRSService instance
   */
  static create(apiKey: string): APRSService {
    return new APRSService(apiKey);
  }
}

export default APRSService; 