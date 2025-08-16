import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchProductsStart,
  fetchProductsSuccess,
  fetchProductsFailure,
  updateFilters,
  toggleFavorite,
  setCurrentProduct,
} from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { ApiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const CatalogScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { products, filters, loading, error } = useAppSelector(state => state.products);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Products', icon: '🧉' },
    { id: 'yerba_mate', name: 'Yerba Mate', icon: '🌿' },
    { id: 'bombillas', name: 'Bombillas', icon: '🥄' },
    { id: 'gourds', name: 'Gourds', icon: '🥥' },
    { id: 'accessories', name: 'Accessories', icon: '🔧' },
    { id: 'sets', name: 'Sets', icon: '📦' },
  ];

  const fetchProducts = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        dispatch(fetchProductsStart());
      }

      const fetchedProducts = await ApiService.getProducts({
        category: selectedCategory === 'all' ? null : selectedCategory,
        searchQuery: filters.searchQuery,
        inStock: filters.inStock,
        onSale: filters.onSale,
      });

      dispatch(fetchProductsSuccess(fetchedProducts));
    } catch (err) {
      dispatch(fetchProductsFailure(err instanceof Error ? err.message : 'Failed to fetch products'));
    } finally {
      if (refresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, filters.searchQuery, filters.inStock, filters.onSale]);

  const handleAddToCart = (product: any) => {
    dispatch(addToCart({
      id: `cart-${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      description: product.description,
    }));
    
    Alert.alert('Added to Cart', `${product.name} has been added to your cart!`);
  };

  const handleProductPress = (product: any) => {
    dispatch(setCurrentProduct(product));
    navigation.navigate('ProductDetail' as never, { productId: product.id } as never);
  };

  const handleFavoriteToggle = (productId: string) => {
    dispatch(toggleFavorite(productId));
  };

  const handleSearch = (query: string) => {
    dispatch(updateFilters({ searchQuery: query }));
  };

  const onRefresh = () => {
    fetchProducts(true);
  };

  const renderProduct = (product: any) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => handleProductPress(product)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: product.images[0] }} style={styles.productImage} />
      
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => handleFavoriteToggle(product.id)}
      >
        <Text style={styles.favoriteIcon}>
          {product.isFavorite ? '❤️' : '🤍'}
        </Text>
      </TouchableOpacity>

      {product.isOnSale && (
        <View style={styles.saleTag}>
          <Text style={styles.saleText}>SALE</Text>
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productBrand}>{product.brand}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {product.rating}</Text>
          <Text style={styles.reviewCount}>({product.reviewCount} reviews)</Text>
        </View>

        <View style={styles.priceContainer}>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
          )}
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.addToCartButton, !product.inStock && styles.outOfStockButton]}
          onPress={() => handleAddToCart(product)}
          disabled={!product.inStock}
        >
          <Text style={[styles.addToCartText, !product.inStock && styles.outOfStockText]}>
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search mate products..."
          value={filters.searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.activeCategoryButton
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.activeCategoryText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products List */}
      <ScrollView
        style={styles.productsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map(renderProduct)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  categoryContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeCategoryButton: {
    backgroundColor: '#6366f1',
  },
  categoryIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  productsContainer: {
    flex: 1,
  },
  productsGrid: {
    padding: 16,
    gap: 16,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 18,
  },
  saleTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  addToCartButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  outOfStockButton: {
    backgroundColor: '#d1d5db',
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  outOfStockText: {
    color: '#9ca3af',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CatalogScreen;