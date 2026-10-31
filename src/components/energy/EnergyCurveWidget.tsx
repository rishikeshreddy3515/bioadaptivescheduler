import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useEnergyStore } from '../../store/useEnergyStore';
import { CircadianPhaseInterval, BoostOption } from '../../types/energy';

export const EnergyCurveWidget: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<CircadianPhaseInterval | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    selectedEnergyBoostOptionsAtom,
    idealMealsPlan,
    toggleBoostOption,
    circadianPhaseSelector,
    currentEnergyScoreSelector,
  } = useEnergyStore();

  const phases = circadianPhaseSelector();
  const currentEnergy = currentEnergyScoreSelector();

  const phaseList: CircadianPhaseInterval[] = [
    phases.cortisolAwakening,
    phases.morningPeakFocus,
    phases.postprandialDip,
    phases.afternoonPeak,
    phases.melatoninOnset,
  ];

  const activePhaseDetail = selectedPhase || phases.morningPeakFocus;

  return (
    <View style={styles.cardContainer}>
      {/* Top Header: Current Score & Active Phase */}
      <View style={styles.headerRow}>
        <View style={styles.scoreSection}>
          <View style={[styles.scoreBadge, { borderColor: currentEnergy.color }]}>
            <Text style={styles.scoreZap}>⚡</Text>
            <Text style={[styles.scoreText, { color: currentEnergy.color }]}>
              {currentEnergy.score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.phaseTitleBox}>
            <Text style={styles.phaseSublabel}>CURRENT CIRCADIAN STATE</Text>
            <Text style={styles.phaseTitleText} numberOfLines={1}>
              {currentEnergy.phaseName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {isExpanded ? 'Collapse ▴' : 'Details ▾'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Circadian Phase Horizontal Track */}
      <View style={styles.phasesSection}>
        <Text style={styles.sectionHeading}>CIRCADIAN HORIZON</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phasesScroll}
        >
          {phaseList.map((phase) => {
            const isSelected = activePhaseDetail.name === phase.name;
            return (
              <TouchableOpacity
                key={phase.name}
                style={[
                  styles.phaseChip,
                  { borderColor: phase.color },
                  isSelected && { backgroundColor: `${phase.color}2A`, borderWidth: 1.5 },
                ]}
                onPress={() => setSelectedPhase(phase)}
                activeOpacity={0.7}
              >
                <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
                <View>
                  <Text style={styles.phaseChipName}>{phase.name.split(' ')[0]}</Text>
                  <Text style={styles.phaseChipTime}>{phase.start} – {phase.end}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Phase Description Banner */}
      <View style={[styles.phaseDetailCard, { borderColor: `${activePhaseDetail.color}40` }]}>
        <View style={styles.phaseDetailHeader}>
          <Text style={[styles.phaseDetailTitle, { color: activePhaseDetail.color }]}>
            {activePhaseDetail.name} ({activePhaseDetail.start} – {activePhaseDetail.end})
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${activePhaseDetail.color}22` }]}>
            <Text style={[styles.categoryText, { color: activePhaseDetail.color }]}>
              {activePhaseDetail.category}
            </Text>
          </View>
        </View>
        <Text style={styles.phaseDetailDesc}>{activePhaseDetail.description}</Text>
      </View>

      {/* Energy Boost Option Chips (ARCHITECTURE.md Section 5.1 selectedEnergyBoostOptionsAtom) */}
      <View style={styles.boostsSection}>
        <View style={styles.boostsHeaderRow}>
          <Text style={styles.sectionHeading}>ENERGY PROTOCOLS & BOOSTS</Text>
          <Text style={styles.boostsSubHeading}>Tap to model impact</Text>
        </View>
        <View style={styles.boostChipsGrid}>
          {selectedEnergyBoostOptionsAtom.map((boost: BoostOption) => {
            return (
              <TouchableOpacity
                key={boost.id}
                style={[
                  styles.boostChip,
                  boost.isActive ? styles.boostChipActive : styles.boostChipInactive,
                ]}
                onPress={() => toggleBoostOption(boost.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.boostIcon}>{boost.icon}</Text>
                <View style={styles.boostTextBox}>
                  <Text
                    style={[
                      styles.boostLabel,
                      boost.isActive ? styles.boostLabelActive : styles.boostLabelInactive,
                    ]}
                  >
                    {boost.label}
                  </Text>
                  <Text style={styles.boostMeta}>
                    +{boost.energyDelta} pts • {boost.scheduledTime}
                  </Text>
                </View>
                <View
                  style={[
                    styles.boostToggleDot,
                    boost.isActive ? styles.toggleDotActive : styles.toggleDotInactive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Ideal Meal Timing Windows (Expandable Section) */}
      {isExpanded && idealMealsPlan && (
        <View style={styles.mealsSection}>
          <Text style={styles.sectionHeading}>IDEAL METABOLIC MEAL WINDOWS</Text>
          <View style={styles.mealsRow}>
            {/* Breakfast */}
            <View style={styles.mealCard}>
              <View style={styles.mealBadge}>
                <Text style={styles.mealName}>BREAKFAST</Text>
              </View>
              <Text style={styles.mealTime}>
                {idealMealsPlan.breakfast.start} – {idealMealsPlan.breakfast.end}
              </Text>
              <Text style={styles.mealDesc} numberOfLines={2}>
                {idealMealsPlan.breakfast.guidelines}
              </Text>
            </View>

            {/* Lunch */}
            <View style={styles.mealCard}>
              <View style={[styles.mealBadge, { borderColor: '#F59E0B' }]}>
                <Text style={[styles.mealName, { color: '#F59E0B' }]}>LUNCH</Text>
              </View>
              <Text style={styles.mealTime}>
                {idealMealsPlan.lunch.start} – {idealMealsPlan.lunch.end}
              </Text>
              <Text style={styles.mealDesc} numberOfLines={2}>
                {idealMealsPlan.lunch.guidelines}
              </Text>
            </View>

            {/* Dinner */}
            <View style={styles.mealCard}>
              <View style={[styles.mealBadge, { borderColor: '#818CF8' }]}>
                <Text style={[styles.mealName, { color: '#818CF8' }]}>DINNER</Text>
              </View>
              <Text style={styles.mealTime}>
                {idealMealsPlan.dinner.start} – {idealMealsPlan.dinner.end}
              </Text>
              <Text style={styles.mealDesc} numberOfLines={2}>
                {idealMealsPlan.dinner.guidelines}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginHorizontal: 12,
    marginVertical: 6,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  scoreZap: {
    fontSize: 14,
    marginRight: 2,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginLeft: 1,
  },
  phaseTitleBox: {
    flex: 1,
  },
  phaseSublabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  phaseTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  expandToggle: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  expandToggleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  phasesSection: {
    gap: 4,
  },
  phasesScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  phaseChipTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  phaseDetailCard: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  phaseDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseDetailTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  phaseDetailDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  boostsSection: {
    gap: 6,
  },
  boostsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boostsSubHeading: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  boostChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
    gap: 8,
  },
  boostChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
  },
  boostChipInactive: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    opacity: 0.65,
  },
  boostIcon: {
    fontSize: 18,
  },
  boostTextBox: {
    flex: 1,
  },
  boostLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  boostLabelActive: {
    color: '#F8FAFC',
  },
  boostLabelInactive: {
    color: '#94A3B8',
  },
  boostMeta: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  boostToggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleDotActive: {
    backgroundColor: '#38BDF8',
  },
  toggleDotInactive: {
    backgroundColor: '#475569',
  },
  mealsSection: {
    marginTop: 4,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  mealsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  mealBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mealName: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  mealTime: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  mealDesc: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 13,
  },
});

