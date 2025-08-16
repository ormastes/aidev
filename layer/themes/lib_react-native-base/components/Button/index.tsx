/**
 * Button Component
 * Versatile button with multiple variants, sizes, and states
 */

import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../styles/ThemeContext';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | "secondary" | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  style,
  textStyle,
  ...props
}) => {
  const theme = useTheme();
  
  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
          minHeight: 32,
        };
      case 'large':
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          minHeight: 44,
        };
    }
  };

  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    const colors = theme.colors;
    
    switch (variant) {
      case "secondary":
        return {
          button: {
            backgroundColor: colors.secondary,
          },
          text: {
            color: colors.surface,
          },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.primary,
          },
          text: {
            color: colors.primary,
          },
        };
      case 'ghost':
        return {
          button: {
            backgroundColor: "transparent",
          },
          text: {
            color: colors.primary,
          },
        };
      case 'danger':
        return {
          button: {
            backgroundColor: colors.error,
          },
          text: {
            color: colors.surface,
          },
        };
      default:
        return {
          button: {
            backgroundColor: colors.primary,
          },
          text: {
            color: colors.surface,
          },
        };
    }
  };

  const getTextSize = (): TextStyle => {
    switch (size) {
      case 'small':
        return {
          fontSize: theme.typography.fontSize.sm,
        };
      case 'large':
        return {
          fontSize: theme.typography.fontSize.lg,
        };
      default:
        return {
          fontSize: theme.typography.fontSize.md,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const textSizeStyles = getTextSize();

  const buttonStyles: ViewStyle = {
    ...sizeStyles,
    ...variantStyles.button,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
    ...style,
  };

  const buttonTextStyles: TextStyle = {
    ...variantStyles.text,
    ...textSizeStyles,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={variantStyles.text.color}
        />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={buttonTextStyles}>{children}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;