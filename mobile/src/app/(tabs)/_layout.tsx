/**
 * AAHAR Mobile - Tab Navigation Layout
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { THEME } from '../../constants/theme';
import { Icon } from '../../components/Icon';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.colors.accent,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        headerStyle: {
          backgroundColor: THEME.colors.background,
        },
        headerTintColor: THEME.colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home', 'Home'),
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={20} />,
          headerTitle: 'AAHAR Fleet & Farm',
        }}
      />
      <Tabs.Screen
        name="bunkers"
        options={{
          title: t('nav.bunkers', 'Bunkers'),
          tabBarIcon: ({ color }) => <Icon name="bunker" color={color} size={20} />,
          headerTitle: 'Silage Bunkers',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('nav.history', 'History'),
          tabBarIcon: ({ color }) => <Icon name="history" color={color} size={20} />,
          headerTitle: 'Test History',
        }}
      />
    </Tabs>
  );
}
