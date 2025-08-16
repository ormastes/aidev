import { MateDealer, DealDetails } from '../../children/utils';

describe('MateDealer Utilities', () => {
  let mateDealer: MateDealer;

  beforeEach(() => {
    mateDealer = new MateDealer();
  });

  describe('createDeal', () => {
    test('should create a new deal with pending status', () => {
      const dealDetails: DealDetails = {
        title: 'Test Deal',
        description: 'A test deal for unit testing',
        amount: 1000,
        margin: 10
      };

      const deal = mateDealer.createDeal('deal-1', dealDetails);

      expect(deal).toMatchObject({
        id: 'deal-1',
        title: 'Test Deal',
        description: 'A test deal for unit testing',
        amount: 1000,
        margin: 10,
        status: 'pending'
      });
      expect(deal.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getDeal', () => {
    test('should retrieve an existing deal', () => {
      const dealDetails: DealDetails = {
        title: 'Test Deal',
        description: 'Test description',
        amount: 500,
        margin: 15
      };

      mateDealer.createDeal('deal-1', dealDetails);
      const retrieved = mateDealer.getDeal('deal-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('deal-1');
      expect(retrieved?.title).toBe('Test Deal');
    });

    test('should return undefined for non-existent deal', () => {
      const retrieved = mateDealer.getDeal('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listDeals', () => {
    test('should return empty array when no deals exist', () => {
      const deals = mateDealer.listDeals();
      expect(deals).toEqual([]);
    });

    test('should return all created deals', () => {
      mateDealer.createDeal('deal-1', {
        title: 'Deal 1',
        description: 'First deal',
        amount: 100,
        margin: 5
      });

      mateDealer.createDeal('deal-2', {
        title: 'Deal 2',
        description: 'Second deal',
        amount: 200,
        margin: 10
      });

      const deals = mateDealer.listDeals();
      expect(deals).toHaveLength(2);
      expect(deals.map(d => d.id)).toEqual(['deal-1', 'deal-2']);
    });
  });

  describe('updateDealStatus', () => {
    test('should update status of existing deal', () => {
      mateDealer.createDeal('deal-1', {
        title: 'Test Deal',
        description: 'Test',
        amount: 1000,
        margin: 10
      });

      const result = mateDealer.updateDealStatus('deal-1', 'active');
      expect(result).toBe(true);

      const deal = mateDealer.getDeal('deal-1');
      expect(deal?.status).toBe('active');
      expect(deal?.updatedAt).toBeInstanceOf(Date);
    });

    test('should return false for non-existent deal', () => {
      const result = mateDealer.updateDealStatus('non-existent', 'completed');
      expect(result).toBe(false);
    });
  });

  describe('calculateDealValue', () => {
    test('should calculate deal value with margin', () => {
      const deal = mateDealer.createDeal('deal-1', {
        title: 'Test Deal',
        description: 'Test',
        amount: 1000,
        margin: 10
      });

      const value = mateDealer.calculateDealValue(deal);
      expect(value).toBe(1100); // 1000 + 10%
    });

    test('should handle zero margin', () => {
      const deal = mateDealer.createDeal('deal-1', {
        title: 'Test Deal',
        description: 'Test',
        amount: 500,
        margin: 0
      });

      const value = mateDealer.calculateDealValue(deal);
      expect(value).toBe(500);
    });

    test('should handle negative margin', () => {
      const deal = mateDealer.createDeal('deal-1', {
        title: 'Test Deal',
        description: 'Test',
        amount: 1000,
        margin: -5
      });

      const value = mateDealer.calculateDealValue(deal);
      expect(value).toBe(950); // 1000 - 5%
    });
  });
});