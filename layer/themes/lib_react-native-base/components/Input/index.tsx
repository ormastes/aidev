/**
 * Input Component
 * Text input with validation, icons, and various styles
 */

import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../styles/ThemeContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outlined' | 'filled' | 'underlined';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'outlined',
      leftIcon,
      rightIcon,
      containerStyle,
      inputStyle,
      labelStyle,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const getVariantStyles = (): {
      container: ViewStyle;
      input: TextStyle;
    } => {
      const colors = theme.colors;
      const borderColor = error
        ? colors.error
        : isFocused
        ? colors.primary
        : '#E0E0E0';

      switch (variant) {
        case 'filled':
          return {
            container: {
              backgroundColor: colors.surface,
              borderBottomWidth: 2,
              borderBottomColor: borderColor,
            },
            input: {
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
            },
          };
        case 'underlined':
          return {
            container: {
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            },
            input: {
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: 0,
            },
          };
        default: // outlined
          return {
            container: {
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: theme.borderRadius.md,
            },
            input: {
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
            },
          };
      }
    };

    const variantStyles = getVariantStyles();

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && (
          <Text
            style={[
              styles.label,
              {
                color: error ? theme.colors.error : theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                fontFamily: theme.typography.fontFamily.medium,
                marginBottom: theme.spacing.xs,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        )}
        
        <View
          style={[
            styles.container,
            variantStyles.container,
            {
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          {leftIcon && (
            <View style={{ marginLeft: theme.spacing.sm }}>{leftIcon}</View>
          )}
          
          <TextInput
            ref={ref}
            style={[
              styles.input,
              variantStyles.input,
              {
                flex: 1,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.md,
                fontFamily: theme.typography.fontFamily.regular,
              },
              inputStyle,
            ]}
            placeholderTextColor="#999"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {rightIcon && (
            <View style={{ marginRight: theme.spacing.sm }}>{rightIcon}</View>
          )}
        </View>
        
        {(error || helperText) && (
          <Text
            style={[
              styles.helperText,
              {
                color: error ? theme.colors.error : '#666',
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.regular,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 4,
  },
  container: {
    minHeight: 48,
  },
  input: {
    flex: 1,
  },
  helperText: {
    marginTop: 4,
  },
});

export default Input;