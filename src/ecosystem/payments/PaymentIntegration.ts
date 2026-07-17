/**
 * Aether OS - Payment Integration
 * Stripe-powered marketplace payments
 */

import { EventBus } from '../../core/EventBus';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: 'plugin' | 'theme' | 'template' | 'subscription';
  price: number; // in cents
  currency: string;
  images?: string[];
  metadata?: Record<string, string>;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // monthly in cents
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxWorkspaces: number;
  maxNodes: number;
  maxStorage: number; // MB
  maxCollaborators: number;
  aiRequestsPerMonth?: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  productId?: string;
  createdAt: number;
  receiptUrl?: string;
}

export interface CreatorRevenue {
  totalEarnings: number;
  pendingPayout: number;
  lifetimeSales: number;
  thisMonth: number;
  lastMonth: number;
  revenueHistory: RevenueData[];
}

export interface RevenueData {
  date: string;
  amount: number;
  sales: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'in_transit' | 'paid' | 'failed';
  arrivalDate?: number;
  method: string;
}

export class StripePaymentProvider {
  private eventBus: EventBus;
  private publishableKey: string;
  private apiBase: string = '/api/payments'; // Backend endpoint

  constructor(eventBus: EventBus, publishableKey: string = '') {
    this.eventBus = eventBus;
    this.publishableKey = publishableKey;
  }

  async createCheckoutSession(productId: string, quantity: number = 1): Promise<{ sessionId: string; url: string }> {
    // In production, this would call your backend which creates a Stripe session
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = `https://checkout.stripe.com/pay/${sessionId}`;

    console.log(`💳 Created checkout session: ${sessionId}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    return { sessionId, url };
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // Simulated - would call backend
    return [
      {
        id: 'pm_1',
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
        isDefault: true
      }
    ];
  }

  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    // Simulate adding payment method
    console.log(`💳 Added payment method: ${paymentMethodId}`);
    
    return {
      id: paymentMethodId,
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
      isDefault: false
    };
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    console.log(`💳 Deleted payment method: ${paymentMethodId}`);
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    console.log(`💳 Set default payment method: ${paymentMethodId}`);
  }

  async createSubscription(planId: string, paymentMethodId?: string): Promise<Subscription> {
    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId: 'current-user',
      plan: this.getPlanById(planId)!,
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false
    };

    console.log(`💳 Created subscription: ${subscription.id}`);
    this.eventBus.emit('subscription:created', subscription);

    return subscription;
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void> {
    console.log(`💳 Canceling subscription: ${subscriptionId}, immediately: ${immediately}`);
    
    if (!immediately) {
      this.eventBus.emit('subscription:cancel_scheduled', { subscriptionId });
    } else {
      this.eventBus.emit('subscription:canceled', { subscriptionId });
    }
  }

  async updateSubscription(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    const subscription: Subscription = {
      id: subscriptionId,
      userId: 'current-user',
      plan: this.getPlanById(newPlanId)!,
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false
    };

    console.log(`💳 Updated subscription to plan: ${newPlanId}`);
    this.eventBus.emit('subscription:updated', subscription);

    return subscription;
  }

  async getTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    // Simulated transactions
    return [
      {
        id: 'txn_1',
        userId,
        amount: 999,
        currency: 'usd',
        status: 'succeeded',
        description: 'Pro Plan - Monthly',
        createdAt: Date.now() - 86400000 * 5,
        receiptUrl: '#'
      },
      {
        id: 'txn_2',
        userId,
        amount: 1999,
        currency: 'usd',
        status: 'succeeded',
        description: 'Analytics Dashboard Plugin',
        productId: 'plugin-analytics',
        createdAt: Date.now() - 86400000 * 15,
        receiptUrl: '#'
      }
    ];
  }

  async refundTransaction(transactionId: string, amount?: number): Promise<void> {
    console.log(`💳 Refunding transaction: ${transactionId}, amount: ${amount || 'full'}`);
    this.eventBus.emit('transaction:refunded', { transactionId, amount });
  }

  private getPlanById(planId: string): SubscriptionPlan | undefined {
    const plans = this.getAvailablePlans();
    return plans.find(p => p.id === planId);
  }

  getAvailablePlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'Free',
        description: 'For individuals getting started',
        price: 0,
        features: [
          '3 workspaces',
          '50 nodes per workspace',
          '100 MB storage',
          'Basic AI features',
          'Community support'
        ],
        limits: {
          maxWorkspaces: 3,
          maxNodes: 50,
          maxStorage: 100,
          maxCollaborators: 1
        }
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'For professionals and small teams',
        price: 999, // $9.99
        features: [
          'Unlimited workspaces',
          '500 nodes per workspace',
          '5 GB storage',
          'Advanced AI features',
          'Priority support',
          'Custom themes',
          'API access'
        ],
        limits: {
          maxWorkspaces: -1, // unlimited
          maxNodes: 500,
          maxStorage: 5000,
          maxCollaborators: 5,
          aiRequestsPerMonth: 1000
        }
      },
      {
        id: 'team',
        name: 'Team',
        description: 'For growing teams and organizations',
        price: 2999, // $29.99
        features: [
          'Everything in Pro',
          'Unlimited nodes',
          '50 GB storage',
          'Unlimited collaborators',
          'Admin dashboard',
          'SSO integration',
          'Dedicated support',
          'Custom branding'
        ],
        limits: {
          maxWorkspaces: -1,
          maxNodes: -1,
          maxStorage: 50000,
          maxCollaborators: -1,
          aiRequestsPerMonth: -1
        }
      }
    ];
  }
}

// Creator Dashboard for marketplace sellers
export class CreatorDashboard {
  private eventBus: EventBus;
  private creatorId: string;

  constructor(eventBus: EventBus, creatorId: string) {
    this.eventBus = eventBus;
    this.creatorId = creatorId;
  }

  async getRevenue(): Promise<CreatorRevenue> {
    // Simulated revenue data
    const history: RevenueData[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 5000) + 1000,
        sales: Math.floor(Math.random() * 50) + 10
      });
    }

    return {
      totalEarnings: 125000,
      pendingPayout: 15800,
      lifetimeSales: 450000,
      thisMonth: 42000,
      lastMonth: 38500,
      revenueHistory: history
    };
  }

  async getProducts(): Promise<Product[]> {
    return [
      {
        id: 'plugin-analytics',
        name: 'Analytics Dashboard',
        description: 'Real-time analytics for workspaces',
        type: 'plugin',
        price: 499,
        currency: 'usd',
        images: ['https://picsum.photos/400/300?random=1']
      },
      {
        id: 'theme-cyberpunk',
        name: 'Cyberpunk Dark Theme',
        description: 'Futuristic neon theme',
        type: 'theme',
        price: 999,
        currency: 'usd',
        images: ['https://picsum.photos/400/300?random=2']
      }
    ];
  }

  async getSalesAnalytics(startDate: number, endDate: number): Promise<{
    totalSales: number;
    totalRevenue: number;
    topProducts: { productId: string; sales: number; revenue: number }[];
    geography: { country: string; sales: number; revenue: number }[];
    trends: { date: string; sales: number; revenue: number }[];
  }> {
    return {
      totalSales: 342,
      totalRevenue: 45800,
      topProducts: [
        { productId: 'plugin-analytics', sales: 150, revenue: 22400 },
        { productId: 'theme-cyberpunk', sales: 120, revenue: 17900 }
      ],
      geography: [
        { country: 'United States', sales: 180, revenue: 28000 },
        { country: 'United Kingdom', sales: 50, revenue: 7500 },
        { country: 'Germany', sales: 40, revenue: 5500 }
      ],
      trends: []
    };
  }

  async requestPayout(amount: number, method: 'bank_account' | 'paypal' = 'bank_account'): Promise<Payout> {
    const payout: Payout = {
      id: `po_${Date.now()}`,
      amount,
      status: 'pending',
      arrivalDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      method: method === 'bank_account' ? 'Bank Transfer' : 'PayPal'
    };

    console.log(`💰 Requested payout: ${amount}`);
    this.eventBus.emit('payout:requested', payout);

    return payout;
  }

  async getPayoutHistory(): Promise<Payout[]> {
    return [
      {
        id: 'po_1',
        amount: 25000,
        status: 'paid',
        arrivalDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
        method: 'Bank Transfer'
      },
      {
        id: 'po_2',
        amount: 18500,
        status: 'paid',
        arrivalDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
        method: 'Bank Transfer'
      }
    ];
  }

  async submitForReview(productId: string): Promise<void> {
    console.log(`📦 Submitted product ${productId} for review`);
    this.eventBus.emit('product:submitted', { productId });
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    console.log(`📝 Updated product ${productId}:`, updates);
    this.eventBus.emit('product:updated', { productId, updates });
  }

  async toggleProductListing(productId: string, active: boolean): Promise<void> {
    console.log(`📋 Product ${productId} is now ${active ? 'active' : 'inactive'}`);
    this.eventBus.emit('product:toggled', { productId, active });
  }
}
