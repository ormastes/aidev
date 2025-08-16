import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearCart } from '../store/slices/cartSlice';
import {
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  addDeliveryAddress,
} from '../store/slices/ordersSlice';
import {
  processPaymentStart,
  processPaymentSuccess,
  processPaymentFailure,
} from '../store/slices/paymentsSlice';
import { ApiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { items, totalAmount } = useAppSelector(state => state.cart);
  const { user } = useAppSelector(state => state.auth);
  const { deliveryAddresses } = useAppSelector(state => state.orders);
  const { processing } = useAppSelector(state => state.payments);
  
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [notes, setNotes] = useState<string>('');
  
  // Address form state
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    instructions: '',
  });

  const deliveryFee = 5.99;
  const tax = totalAmount * 0.08;
  const finalTotal = totalAmount + deliveryFee + tax;

  useEffect(() => {
    // Set default address if available
    const defaultAddress = deliveryAddresses.find(addr => addr.isDefault);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [deliveryAddresses]);

  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      Alert.alert('Error', 'Please fill in all required address fields.');
      return;
    }

    const addressId = `addr-${Date.now()}`;
    const address = {
      id: addressId,
      ...newAddress,
      isDefault: deliveryAddresses.length === 0, // First address is default
    };

    dispatch(addDeliveryAddress(address));
    setSelectedAddressId(addressId);
    setShowAddressForm(false);
    
    // Clear form
    setNewAddress({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      instructions: '',
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Error', 'Please select a delivery address.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please log in to place an order.');
      return;
    }

    try {
      dispatch(createOrderStart());
      dispatch(processPaymentStart());

      const selectedAddress = deliveryAddresses.find(addr => addr.id === selectedAddressId);
      
      const orderData = {
        userId: user.id,
        items: items.map(item => ({
          ...item,
          subtotal: item.price * item.quantity,
        })),
        subtotal: totalAmount,
        tax,
        deliveryFee,
        discount: 0,
        totalAmount: finalTotal,
        paymentMethod,
        deliveryAddress: selectedAddress,
        notes,
      };

      // Create order
      const order = await ApiService.createOrder(orderData);
      dispatch(createOrderSuccess(order));

      // Process payment
      const paymentTransaction = await ApiService.processPayment({
        orderId: order.id,
        amount: finalTotal,
        paymentMethodId: 'pm-demo',
      });
      dispatch(processPaymentSuccess(paymentTransaction));

      // Clear cart
      dispatch(clearCart());

      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${order.orderNumber} has been placed and payment processed.`,
        [
          {
            text: 'View Order',
            onPress: () => navigation.navigate('Orders' as never),
          },
        ]
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      dispatch(createOrderFailure(errorMessage));
      dispatch(processPaymentFailure(errorMessage));
      Alert.alert('Error', errorMessage);
    }
  };

  const renderCartSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.summaryItem}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
          <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
        </View>
      ))}
      
      <View style={styles.summaryTotals}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderAddressSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Address</Text>
      
      {deliveryAddresses.map((address) => (
        <TouchableOpacity
          key={address.id}
          style={[
            styles.addressCard,
            selectedAddressId === address.id && styles.selectedAddress
          ]}
          onPress={() => setSelectedAddressId(address.id)}
        >
          <View style={styles.radioButton}>
            {selectedAddressId === address.id && <View style={styles.radioSelected} />}
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressText}>
              {address.street}
            </Text>
            <Text style={styles.addressText}>
              {address.city}, {address.state} {address.zipCode}
            </Text>
            {address.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.addAddressButton}
        onPress={() => setShowAddressForm(!showAddressForm)}
      >
        <Text style={styles.addAddressText}>+ Add New Address</Text>
      </TouchableOpacity>

      {showAddressForm && (
        <View style={styles.addressForm}>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            value={newAddress.street}
            onChangeText={(text) => setNewAddress(prev => ({ ...prev, street: text }))}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="City"
              value={newAddress.city}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="State"
              value={newAddress.state}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, state: text }))}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="ZIP Code"
            value={newAddress.zipCode}
            onChangeText={(text) => setNewAddress(prev => ({ ...prev, zipCode: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Delivery Instructions (Optional)"
            value={newAddress.instructions}
            onChangeText={(text) => setNewAddress(prev => ({ ...prev, instructions: text }))}
            multiline
          />
          <TouchableOpacity style={styles.saveAddressButton} onPress={handleAddAddress}>
            <Text style={styles.saveAddressText}>Save Address</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPaymentMethod = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      <TouchableOpacity
        style={[styles.paymentCard, paymentMethod === 'card' && styles.selectedPayment]}
        onPress={() => setPaymentMethod('card')}
      >
        <View style={styles.radioButton}>
          {paymentMethod === 'card' && <View style={styles.radioSelected} />}
        </View>
        <Text style={styles.paymentText}>💳 Credit/Debit Card</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.paymentCard, paymentMethod === 'paypal' && styles.selectedPayment]}
        onPress={() => setPaymentMethod('paypal')}
      >
        <View style={styles.radioButton}>
          {paymentMethod === 'paypal' && <View style={styles.radioSelected} />}
        </View>
        <Text style={styles.paymentText}>🏦 PayPal</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCartSummary()}
        {renderAddressSelection()}
        {renderPaymentMethod()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any special instructions for your order..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, processing && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.placeOrderText}>
              Place Order - ${finalTotal.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginHorizontal: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryTotals: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedAddress: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  defaultBadge: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4,
  },
  addAddressButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addAddressText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  addressForm: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveAddressButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveAddressText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPayment: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  paymentText: {
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  placeOrderButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  placeOrderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;