/**
 * Status Bar Component
 * Display system status and notifications
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';

interface Props {
  screen: string;
  notifications: string[];
  template?: string;
  theme?: string;
}

export const StatusBar: React.FC<Props> = ({ screen, notifications, template, theme }) => {
  const [time, setTime] = useState(new Date());
  const [notificationIndex, setNotificationIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setInterval(() => {
        setNotificationIndex((prev) => (prev + 1) % notifications.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [notifications]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getScreenIcon = () => {
    switch (screen) {
      case 'main': return figures.home;
      case 'templates': return figures.hamburger;
      case 'themes': return figures.heart;
      case 'projects': return figures.folder;
      case 'settings': return figures.gear;
      default: return figures.pointer;
    }
  };

  const currentNotification = notifications.length > 0 
    ? notifications[notificationIndex]
    : 'Ready';

  return (
    <Box justifyContent="space-between">
      <Box>
        <Text color="cyan">{getScreenIcon()} </Text>
        <Text color="gray">{screen.toUpperCase()}</Text>
        {template && (
          <Text color="gray"> | Template: {template}</Text>
        )}
        {theme && (
          <Text color="gray"> | Theme: {theme}</Text>
        )}
      </Box>

      <Box>
        <Text color="yellow">{figures.info} </Text>
        <Text color="gray">{currentNotification}</Text>
      </Box>

      <Box>
        <Text color="gray">{formatTime(time)}</Text>
      </Box>
    </Box>
  );
};