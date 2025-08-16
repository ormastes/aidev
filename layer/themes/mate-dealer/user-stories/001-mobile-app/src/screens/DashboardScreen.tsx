import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { deals } = useSelector((state: RootState) => state.mate);

  const stats = {
    totalDeals: deals.length,
    activeDeals: deals.filter(d => d.status === 'active').length,
    completedDeals: deals.filter(d => d.status === 'completed').length,
    revenue: deals.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.price, 0),
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Overview of your Mate Dealer activity</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={styles.statValue}>{stats.totalDeals}</Text>
          <Text style={styles.statLabel}>Total Deals</Text>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>📊</Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <Text style={styles.statValue}>{stats.activeDeals}</Text>
          <Text style={styles.statLabel}>Active</Text>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>✅</Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.warningCard]}>
          <Text style={styles.statValue}>{stats.completedDeals}</Text>
          <Text style={styles.statLabel}>Completed</Text>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>🏆</Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.infoCard]}>
          <Text style={styles.statValue}>${stats.revenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>💰</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>New Deal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Chart</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>📈 Chart will be displayed here</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: (width - 30) / 2,
    margin: 5,
    padding: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  primaryCard: {
    backgroundColor: '#6366f1',
  },
  successCard: {
    backgroundColor: '#10b981',
  },
  warningCard: {
    backgroundColor: '#f59e0b',
  },
  infoCard: {
    backgroundColor: '#06b6d4',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statIcon: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    opacity: 0.3,
  },
  iconText: {
    fontSize: 40,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  actionButton: {
    width: (width - 50) / 4,
    margin: 5,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default DashboardScreen;