/**
 * Common utilities for Mate Dealer theme
 */

export class MateDealer {
  private deals: Map<string, Deal> = new Map();

  /**
   * Create a new deal
   */
  createDeal(id: string, details: DealDetails): Deal {
    const deal: Deal = {
      id,
      ...details,
      createdAt: new Date(),
      status: 'pending'
    };
    
    this.deals.set(id, deal);
    return deal;
  }

  /**
   * Get a deal by ID
   */
  getDeal(id: string): Deal | undefined {
    return this.deals.get(id);
  }

  /**
   * List all deals
   */
  listDeals(): Deal[] {
    return Array.from(this.deals.values());
  }

  /**
   * Update deal status
   */
  updateDealStatus(id: string, status: DealStatus): boolean {
    const deal = this.deals.get(id);
    if (!deal) {
      return false;
    }
    
    deal.status = status;
    deal.updatedAt = new Date();
    return true;
  }

  /**
   * Calculate deal value
   */
  calculateDealValue(deal: Deal): number {
    return deal.amount * (1 + deal.margin / 100);
  }
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  amount: number;
  margin: number;
  status: DealStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DealDetails {
  title: string;
  description: string;
  amount: number;
  margin: number;
}

export type DealStatus = 'pending' | 'active' | 'completed' | 'cancelled';