import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { useTaskStore } from '../store/useTaskStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { aiScheduler, AiCommandResult } from '../services/aiScheduler';

interface CadenceAISheetProps {
  visible: boolean;
  onClose: () => void;
  onReplanRequested?: (reason?: string) => void;
}

export const CadenceAISheet: React.FC<CadenceAISheetProps> = ({
  visible,
  onClose,
  onReplanRequested,
}) => {
  const { theme, isDark } = useTheme();
  const { tasks, createTask, scheduleTaskToTimeline } = useTaskStore();
  const { activeRoutineAtom, dailyBiometrics } = useEnergyStore();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiCommandResult | null>(null);

  const quickPrompts = [
    { label: '⚡ Protect deep work', text: 'Schedule a 45m deep work block for my product spec' },
    { label: '🔄 Buffer slump', text: 'Push my afternoon admin tasks back by 30 minutes' },
    { label: '☕ Caffeine cutoff', text: 'When is my caffeine cutoff today?' },
  ];

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setAiResult(null);

    try {
      const result = await aiScheduler.executeNaturalLanguageCommand(q, {
        routine: activeRoutineAtom,
        tasks,
        readinessScore: dailyBiometrics?.readinessScore,
      });

      setAiResult(result);

      // Execute actions automatically based on Gemini's structured response
      if (result.actionType === 'CREATE_TASK' && result.createTaskData) {
        const newTask = await createTask({
          title: result.createTaskData.title,
          taskCategory: result.createTaskData.category,
          estimatedDurationMinutes: result.createTaskData.durationMinutes,
          priority: result.createTaskData.priority || 'high',
          requiredEnergy: result.createTaskData.category === 'deep_work' ? 'high' : 'medium',
        });
        const today = new Date().toISOString().split('T')[0];
        const timeSlot = result.createTaskData.suggestedStartTime || '09:10';
        await scheduleTaskToTimeline(newTask.id, `${today}T${timeSlot}:00`);
      } else if (result.actionType === 'RESCHEDULE_TASK' && result.rescheduleData) {
        const queryTerm = result.rescheduleData.taskQuery.toLowerCase();
        const targets = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(queryTerm) ||
            (t.taskCategory && t.taskCategory.includes(queryTerm))
        );
        const today = new Date().toISOString().split('T')[0];

        for (const t of targets) {
          if (t.scheduledStartTime) {
            try {
              const timePart = t.scheduledStartTime.includes('T')
                ? t.scheduledStartTime.split('T')[1]
                : t.scheduledStartTime;
              const [h, m] = timePart.split(':').map(Number);
              const totalMins = (h || 13) * 60 + (m || 0) + (result.rescheduleData.shiftMinutes || 30);
              const newH = Math.min(23, Math.floor(totalMins / 60));
              const newM = totalMins % 60;
              const newTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
              await scheduleTaskToTimeline(t.id, `${today}T${newTime}:00`);
            } catch (err) {
              console.warn('Error shifting task time:', err);
            }
          }
        }
      } else if (result.actionType === 'REPLAN') {
        setTimeout(() => {
          onClose();
          onReplanRequested?.(result.replanReason || 'Schedule overrun');
        }, 1200);
      }
    } catch (e) {
      console.warn('[CadenceAISheet] Command execution error:', e);
      setAiResult({
        actionType: 'GENERAL_ADVICE',
        message: 'Understood. Keeping your circadian peak aligned until 11:00.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipPress = (promptText: string) => {
    setQuery(promptText);
    handleSend(promptText);
  };

  const handleClose = () => {
    setQuery('');
    setAiResult(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoid}
            >
              <View
                style={[
                  styles.sheetContainer,
                  {
                    backgroundColor: isDark ? '#1C2319' : theme.tints.oliveTint.bg,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : theme.border,
                  },
                ]}
              >
                {/* Drag Handle */}
                <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

                {/* Header */}
                <View style={styles.headerRow}>
                  <View
                    style={[
                      styles.aiBadge,
                      {
                        backgroundColor: isDark ? 'rgba(56, 225, 176, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                        borderColor: isDark ? 'rgba(56, 225, 176, 0.4)' : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiBadgeText,
                        {
                          color: isDark ? '#7FE4D1' : theme.primaryOlive,
                          fontFamily: FONTS.urbanistBold,
                        },
                      ]}
                    >
                      ✨ Cadence AI (Gemini 2.5)
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.closeBtn,
                      { backgroundColor: theme.primarySurface, borderColor: theme.border },
                    ]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.closeIcon, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={[styles.modalTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  How can I shape your rhythm?
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                  Schedule tasks, buffer meeting slips, or optimize around biological energy dips.
                </Text>

                {/* Loading indicator */}
                {isLoading && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.primaryOlive} />
                    <Text style={[styles.loadingText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                      Consulting Gemini chronobiology model...
                    </Text>
                  </View>
                )}

                {/* AI Response Preview (if generated) */}
                {aiResult && !isLoading && (
                  <View
                    style={[
                      styles.responseCard,
                      {
                        backgroundColor: isDark ? 'rgba(32, 40, 29, 0.85)' : theme.primarySurface,
                        borderColor: isDark ? '#38E1B0' : theme.primaryOlive,
                      },
                    ]}
                  >
                    <View style={styles.responseHeaderRow}>
                      <Text style={[styles.responseBadge, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                        {aiResult.actionType.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={[styles.responseText, { color: theme.text, fontFamily: FONTS.urbanistMedium }]}>
                      {aiResult.message}
                    </Text>
                  </View>
                )}

                {/* Quick Prompts */}
                <View style={styles.quickPromptsRow}>
                  {quickPrompts.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.promptChip,
                        {
                          backgroundColor: theme.primarySurface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => handleChipPress(p.text)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.promptChipText, { color: theme.text, fontFamily: FONTS.urbanistMedium }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Input Field with Send Button */}
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.primarySurface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: theme.text,
                        fontFamily: FONTS.urbanistRegular,
                      },
                    ]}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="e.g. Schedule a 45m deep work block..."
                    placeholderTextColor={theme.secondaryText}
                    returnKeyType="send"
                    onSubmitEditing={() => handleSend()}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      { backgroundColor: theme.primaryOlive },
                    ]}
                    onPress={() => handleSend()}
                    disabled={isLoading || !query.trim()}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sendIcon}>↑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 12,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
  },
  responseCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    marginBottom: 16,
  },
  responseHeaderRow: {
    marginBottom: 4,
  },
  responseBadge: {
    fontSize: 10.5,
    letterSpacing: 1,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: '#0A0B0D',
    fontWeight: '700',
  },
});

