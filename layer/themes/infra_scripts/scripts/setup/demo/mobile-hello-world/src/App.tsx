import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemeProvider } from './providers/ThemeProvider';
import { DatabaseProvider } from './providers/DatabaseProvider';
import { useTheme } from './hooks/useTheme';
import { useDatabase } from './hooks/useDatabase';
import { useSocket } from './hooks/useSocket';

const HelloWorldApp: React.FC = () => {
  const { theme, updateTheme } = useTheme();
  const { saveText, getText, messages } = useDatabase();
  const { connected, sendMessage } = useSocket();
  
  const [inputText, setInputText] = useState('');
  const [savedTexts, setSavedTexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedTexts();
  }, []);

  const loadSavedTexts = async () => {
    try {
      const texts = await getText();
      setSavedTexts(texts);
    } catch (error) {
      console.error('Failed to load texts:', error);
    }
  };

  const handleSaveText = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    setLoading(true);
    try {
      await saveText(inputText);
      await loadSavedTexts();
      
      // Send to server via socket
      sendMessage('text_saved', { text: inputText, timestamp: new Date().toISOString() });
      
      setInputText('');
      Alert.alert('Success', 'Text saved successfully!');
    } catch (error) {
      console.error('Failed to save text:', error);
      Alert.alert('Error', 'Failed to save text');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSync = async () => {
    try {
      const response = await fetch('http://localhost:3456/api/themes?platform=react-native');
      const data = await response.json();
      
      if (data.success && data.themes.length > 0) {
        // Apply first available theme
        updateTheme(data.themes[0]);
        Alert.alert('Success', 'Theme synced from GUI Selector!');
      }
    } catch (error) {
      console.error('Theme sync failed:', error);
      Alert.alert('Error', 'Failed to sync theme');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerText, { color: '#fff' }]}>
          📱 Hello World Demo
        </Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: connected ? '#4CAF50' : '#f44336' }
          ]} />
          <Text style={[styles.statusText, { color: '#fff' }]}>
            {connected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            💬 Enter Your Message
          </Text>
          
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message here..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveText}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>💾 Save Text</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.secondary }]}
              onPress={handleThemeSync}
            >
              <Text style={styles.buttonText}>🎨 Sync Theme</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            📚 Saved Messages ({savedTexts.length})
          </Text>
          
          {savedTexts.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No messages saved yet
            </Text>
          ) : (
            savedTexts.map((text, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageItem,
                  { 
                    backgroundColor: theme.colors.background,
                    borderLeftColor: theme.colors.primary
                  }
                ]}
              >
                <Text style={[styles.messageText, { color: theme.colors.text }]}>
                  {text}
                </Text>
                <Text style={[styles.messageIndex, { color: theme.colors.textSecondary }]}>
                  #{index + 1}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            🔧 Debug Info
          </Text>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            Theme: {theme.name || 'Default'}
          </Text>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            Database: {messages.length} total messages
          </Text>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            Connection: {connected ? 'WebSocket Active' : 'Offline Mode'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <HelloWorldApp />
      </DatabaseProvider>  
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  messageItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  messageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  messageIndex: {
    fontSize: 12,
    textAlign: 'right',
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
  },
});

export default App;