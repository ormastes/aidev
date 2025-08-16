import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@hooks/useAuth';
import { useTheme } from '@hooks/useTheme';
import { validateEmail } from '@utils/validation';
import { styles } from './LoginScreen.styles';
import type { AuthStackScreenProps } from '@types/navigation';

type Props = AuthStackScreenProps<'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading, error } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLogin = async () => {
    // Validate inputs
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError('');

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Login Failed', error || 'Please check your credentials');
    }
  };

  const dynamicStyles = styles(colors);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={dynamicStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={dynamicStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>Welcome Back</Text>
            <Text style={dynamicStyles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={dynamicStyles.form}>
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Email</Text>
              <TextInput
                style={[
                  dynamicStyles.input,
                  emailError ? dynamicStyles.inputError : null,
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {emailError ? (
                <Text style={dynamicStyles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.label}>Password</Text>
              <TextInput
                style={dynamicStyles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                dynamicStyles.button,
                isLoading && dynamicStyles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={dynamicStyles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.linkButton}
              onPress={() => navigation.navigate('ForgotPassword', { email })}
              disabled={isLoading}
            >
              <Text style={dynamicStyles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.footer}>
            <Text style={dynamicStyles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={dynamicStyles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};