/**
 * src/styles/colors.js
 *
 * Central dark-mode colour palette for NursingAiAssistant.
 * Import COLORS wherever you need a colour value to keep the
 * design consistent across all screens and components.
 */

export const COLORS = {
  // Backgrounds
  background: '#0F172A',  // Deep navy — main screen background
  surface:    '#1E293B',  // Slightly lighter — cards, bubbles, inputs

  // Borders & dividers
  border:     '#334155',

  // Accent colours (one per knowledge domain)
  accentBlue:   '#4CC9F0',  // Pharmacy
  accentIndigo: '#4361EE',  // Policies
  accentDeep:   '#3F37C9',  // Quality

  // Primary interactive colour
  primary: '#3B82F6',

  // Text
  textWhite: '#F8FAFC',  // Primary text
  textMuted: '#94A3B8',  // Secondary / placeholder text
  textDim:   '#475569',  // Timestamps, tertiary labels

  // Semantic
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
};
