import axios from 'axios';
import {BankMetadataApiFactory} from '../../../src'; // adjust this path to your actual file location

jest.mock('axios');

describe('BankMetadataApi', () => {
    let api: { getMeta: any; };

    beforeEach(() => {
        api = BankMetadataApiFactory(); // replace with your actual configuration
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('getMeta returns data on success', async () => {
        // Mock successful response from axios
        (axios.request as jest.Mock).mockResolvedValue({
            data: [{ /* your mock data here */}],
        });

        // Call function with mocked axios
        const response = await api.getMeta(/* your parameters here */);

        // Check if data is returned
        expect(response.data).toBeDefined();

        // Additional checks like
        // - was axios called with correct parameters?
        // - is the data structure as expected?
    });

    it('getMeta throws error on failure', async () => {
        // Mock failure response from axios
        (axios.request as jest.Mock).mockRejectedValue(new Error('Request failed'));

        // Expect the function to reject
        await expect(api.getMeta(/* your parameters here */)).rejects.toThrow('Request failed');
    });
});
