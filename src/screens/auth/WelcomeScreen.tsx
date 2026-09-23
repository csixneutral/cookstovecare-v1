import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.WELCOME>;

const { width } = Dimensions.get('window');

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Top illustration area with horizontal gradient & scattered aesthetic shapes */}
      <View style={styles.topIllustrationContainer}>
        <LinearGradient
          colors={[
            Colors.welcomeGradientStart,
            Colors.welcomeGradientMid1,
            Colors.welcomeGradientMid2,
            Colors.welcomeGradientEnd,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          {/* Translucent floating decorative circles */}
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
          <View style={[styles.dot, styles.dot4]} />
          <View style={[styles.dot, styles.dot5]} />

          {/* Central floating icons showcase */}
          <View style={styles.floatingIconsCenter}>
            <View style={[styles.iconPill, { backgroundColor: '#E0F2FE' }]}>
              <MaterialIcons name="build" size={28} color="#0284C7" />
            </View>
            <View style={[styles.iconPill, { backgroundColor: '#FEE2E2', marginTop: -15 }]}>
              <MaterialIcons name="local-fire-department" size={32} color="#DC2626" />
            </View>
            <View style={[styles.iconPill, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="assignment" size={28} color="#D97706" />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Bottom Content Area */}
      <View style={styles.contentContainer}>
        <View style={styles.brandBadge}>
          <MaterialIcons name="verified" size={16} color={Colors.primary} />
          <Text style={styles.brandBadgeText}>Service & Lifecycle Management</Text>
        </View>

        <Text style={styles.title}>CookstoveCare</Text>
        <Text style={styles.description}>
          End-to-end operational platform for tracking cookstove collection, repair, replacement,
          and final customer distribution.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureCheck}>
              <MaterialIcons name="check" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>Role-based workflow for Field & Supervisors</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureCheck}>
              <MaterialIcons name="check" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>Customer signature capture & photo records</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureCheck}>
              <MaterialIcons name="check" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>Live synchronization with central server</Text>
          </View>
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.letsStartButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(Routes.LOGIN)}
          >
            <Text style={styles.letsStartButtonText}>Let's Start</Text>
            <MaterialIcons name="arrow-forward" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topIllustrationContainer: {
    width: '100%',
    height: '42%',
    overflow: 'hidden',
  },
  gradientHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
  },
  dot1: {
    width: 80,
    height: 80,
    backgroundColor: Colors.welcomeDots.pink,
    top: 20,
    left: 20,
  },
  dot2: {
    width: 60,
    height: 60,
    backgroundColor: Colors.welcomeDots.blue,
    bottom: 40,
    left: 40,
  },
  dot3: {
    width: 70,
    height: 70,
    backgroundColor: Colors.welcomeDots.yellow,
    top: 30,
    right: 30,
  },
  dot4: {
    width: 90,
    height: 90,
    backgroundColor: Colors.welcomeDots.purple,
    bottom: 20,
    right: 20,
  },
  dot5: {
    width: 50,
    height: 50,
    backgroundColor: Colors.welcomeDots.green,
    top: 100,
    right: width / 2 - 25,
  },
  floatingIconsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  iconPill: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  featuresList: {
    marginTop: 20,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  bottomButtonContainer: {
    paddingBottom: 24,
  },
  letsStartButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  letsStartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textWhite,
    marginRight: 8,
  },
});
