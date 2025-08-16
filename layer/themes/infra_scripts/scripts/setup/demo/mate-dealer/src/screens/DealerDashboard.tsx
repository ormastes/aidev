import React, { useState, useEffect } from 'react';
import { useLogger } from '../hooks/useLogger';
import { api } from '../services/api';

interface DealerMetrics {
  total_customers: number;
  active_orders: number;
  monthly_revenue: number;
  average_rating: number;
  total_products: number;
}

export const DealerDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DealerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'customers' | 'analytics'>('overview');

  const { logAction, measureAsync, logPerformance } = useLogger({ 
    componentName: 'DealerDashboard' 
  });

  // Load dealer metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const result = await measureAsync(
          async () => {
            const response = await api.getDealerDashboard();
            if (response.error) {
              throw new Error(response.error);
            }
            return response.data;
          },
          'load_dealer_metrics'
        );

        if (result && result.metrics) {
          setMetrics(result.metrics);
        }
        setIsLoading(false);
      } catch (error) {
        logger.error('Failed to load dealer metrics', error as Error);
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [measureAsync]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    logAction('dealer_tab_changed', { from: activeTab, to: tab });
  };

  const handleAddProduct = () => {
    logAction('add_product_clicked');
    alert('Add Product feature - Coming soon!');
  };

  const handleViewOrders = () => {
    logAction('view_orders_clicked');
    alert('View Orders feature - Coming soon!');
  };

  const handleExportData = () => {
    logAction('export_data_clicked', { tab: activeTab });
    
    // Simulate export
    const startTime = performance.now();
    setTimeout(() => {
      const duration = performance.now() - startTime;
      logPerformance('data_export', duration, { tab: activeTab });
      alert('Data exported successfully!');
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dealer Dashboard</h1>
      </div>

      <div className="page-content">
        <nav className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => handleTabChange('products')}
          >
            Products
          </button>
          <button 
            className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleTabChange('customers')}
          >
            Customers
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
          >
            Analytics
          </button>
        </nav>

        {activeTab === 'overview' && metrics && (
          <div className="overview-section">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <h3>Total Customers</h3>
                  <span className="metric-trend positive">+12%</span>
                </div>
                <p className="metric-value">{metrics.total_customers}</p>
                <p className="metric-subtitle">Active this month</p>
              </div>

              <div className="metric-card clickable" onClick={handleViewOrders}>
                <div className="metric-header">
                  <h3>Active Orders</h3>
                  {metrics.active_orders > 0 && (
                    <span className="notification-badge">{metrics.active_orders}</span>
                  )}
                </div>
                <p className="metric-value">{metrics.active_orders}</p>
                <p className="metric-subtitle">Click to view</p>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h3>Monthly Revenue</h3>
                  <span className="metric-trend positive">+8%</span>
                </div>
                <p className="metric-value">${metrics.monthly_revenue?.toLocaleString() || '0'}</p>
                <p className="metric-subtitle">USD this month</p>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h3>Average Rating</h3>
                </div>
                <p className="metric-value">
                  {(metrics.average_rating || 0).toFixed(1)} ⭐
                </p>
                <p className="metric-subtitle">From {metrics.total_customers} reviews</p>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button onClick={handleAddProduct} className="action-button primary">
                  + Add New Product
                </button>
                <button onClick={handleViewOrders} className="action-button">
                  📦 View Orders
                </button>
                <button onClick={() => logAction('view_messages_clicked')} className="action-button">
                  💬 Messages
                </button>
                <button onClick={handleExportData} className="action-button">
                  📊 Export Data
                </button>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-time">2 hours ago</span>
                  <span className="activity-text">New order from Carlos M.</span>
                  <span className="activity-amount">$89.50</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">5 hours ago</span>
                  <span className="activity-text">Product review from Ana S.</span>
                  <span className="activity-rating">5 ⭐</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">1 day ago</span>
                  <span className="activity-text">Inventory low: Traditional Mate</span>
                  <span className="activity-warning">⚠️ 3 left</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-section">
            <div className="section-header">
              <h2>Your Products ({metrics?.total_products || 0})</h2>
              <button onClick={handleAddProduct} className="add-button">
                + Add Product
              </button>
            </div>
            <p className="placeholder-text">Product management coming soon...</p>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="customers-section">
            <div className="section-header">
              <h2>Your Customers ({metrics?.total_customers || 0})</h2>
              <button onClick={handleExportData} className="export-button">
                Export List
              </button>
            </div>
            <p className="placeholder-text">Customer management coming soon...</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <div className="section-header">
              <h2>Business Analytics</h2>
              <button onClick={handleExportData} className="export-button">
                Export Report
              </button>
            </div>
            <p className="placeholder-text">Advanced analytics coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};