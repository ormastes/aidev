/**
 * Card Component
 * Container with shadows, sections, and press handlers
 */

import React, { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../styles/ThemeContext';

export interface CardProps {
  children: ReactNode;
  variant?: "elevated" | "outlined" | 'filled';
  onPress?: () => void;
  style?: ViewStyle;
  padding?: boolean;
}

interface CardSubComponentProps {
  children: ReactNode;
  style?: ViewStyle;
}

const CardHeader: React.FC<CardSubComponentProps> = ({ children, style }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          padding: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const CardBody: React.FC<CardSubComponentProps> = ({ children, style }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.body,
        {
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const CardFooter: React.FC<CardSubComponentProps> = ({ children, style }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.footer,
        {
          padding: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
} = ({ children, variant = "elevated", onPress, style, padding = true }) => {
  const theme = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "outlined":
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'filled':
        return {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        };
      default: // elevated
        return {
          backgroundColor: theme.colors.surface,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
          }),
        };
    }
  };

  const cardStyles: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...getVariantStyles(),
    ...(padding && { padding: theme.spacing.md }),
    ...style,
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={cardStyles}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Container>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

const styles = StyleSheet.create({
  header: {},
  body: {},
  footer: {},
});

export default Card;