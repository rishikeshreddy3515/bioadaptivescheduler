import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';

export type NavTab = 'Today' | 'Tasks' | 'Energy' | 'Profile';

interface CadenceTabBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLongPressAi?: () => void;
}

export const CadenceTabBar: React.FC<CadenceTabBarProps> = ({
  activeTab,
  onSelectTab,
  onLongPressAi,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.floatingTabBar,
        {
          backgroundColor: isDark
            ? 'rgba(29, 36, 26, 0.94)'
            : 'rgba(252, 251, 247, 0.95)',
          borderColor: theme.border,
        },
      ]}
    >
      {/* Today Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'Today' && [
            styles.activeTabPill,
            { backgroundColor: theme.text },
          ],
        ]}
        onPress={() => onSelectTab('Today')}
        onLongPress={onLongPressAi}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 16 }}>📅</Text>
        {activeTab === 'Today' && (
          <Text
            style={[
              styles.activeTabText,
              { color: theme.background, fontFamily: FONTS.urbanistBold },
            ]}
          >
            Today
          </Text>
        )}
      </TouchableOpacity>

      {/* Tasks Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'Tasks' && [
            styles.activeTabPill,
            { backgroundColor: theme.text },
          ],
        ]}
        onPress={() => onSelectTab('Tasks')}
        onLongPress={onLongPressAi}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 16 }}>☑️</Text>
        {activeTab === 'Tasks' && (
          <Text
            style={[
              styles.activeTabText,
              { color: theme.background, fontFamily: FONTS.urbanistBold },
            ]}
          >
            Tasks
          </Text>
        )}
      </TouchableOpacity>

      {/* Energy Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'Energy' && [
            styles.activeTabPill,
            { backgroundColor: theme.text },
          ],
        ]}
        onPress={() => onSelectTab('Energy')}
        onLongPress={onLongPressAi}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 16 }}>⚡</Text>
        {activeTab === 'Energy' && (
          <Text
            style={[
              styles.activeTabText,
              { color: theme.background, fontFamily: FONTS.urbanistBold },
            ]}
          >
            Energy
          </Text>
        )}
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'Profile' && [
            styles.activeTabPill,
            { backgroundColor: theme.text },
          ],
        ]}
        onPress={() => onSelectTab('Profile')}
        onLongPress={onLongPressAi}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 16 }}>👤</Text>
        {activeTab === 'Profile' && (
          <Text
            style={[
              styles.activeTabText,
              { color: theme.background, fontFamily: FONTS.urbanistBold },
            ]}
          >
            Profile
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingTabBar: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeTabPill: {
    paddingHorizontal: 18,
  },
  activeTabText: {
    fontSize: 14,
  },
});

