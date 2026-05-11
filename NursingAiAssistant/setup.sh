#!/usr/bin/env bash
# =============================================================================
# setup.sh — Automated setup script for Ai Nursing Assistance (Unix/Mac)
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
# Safe to re-run — each step is idempotent.
# =============================================================================

set -euo pipefail

# ── Colour codes ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No colour

ok()   { echo -e "${GREEN}  ✓ ${1}${NC}"; }
fail() { echo -e "${RED}  ✗ ${1}${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ ${1}${NC}"; }
info() { echo -e "${CYAN}  → ${1}${NC}"; }
header() { echo -e "\n${BOLD}${CYAN}══ ${1} ══${NC}"; }

# ── Track overall result ──────────────────────────────────────────────────────
ERRORS=0
WARNINGS=0

# Make sure we run from the NursingAiAssistant directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Ai Nursing Assistance — Setup Script     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"

# =============================================================================
# STEP 1 — Prerequisite checks
# =============================================================================
header "Step 1: Checking Prerequisites"

# Node.js ≥ 18
if command -v node &>/dev/null; then
    NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
    NODE_MAJOR="${NODE_VER%%.*}"
    if [ "$NODE_MAJOR" -ge 18 ]; then
        ok "Node.js v${NODE_VER}"
    else
        fail "Node.js v${NODE_VER} detected — v18 or higher required"
        info "Download from: https://nodejs.org"
        ERRORS=$((ERRORS + 1))
    fi
else
    fail "Node.js not found"
    info "Download from: https://nodejs.org"
    ERRORS=$((ERRORS + 1))
fi

# npm
if command -v npm &>/dev/null; then
    ok "npm $(npm --version)"
else
    fail "npm not found (should be bundled with Node.js)"
    ERRORS=$((ERRORS + 1))
fi

# Java (JDK 11+)
if command -v java &>/dev/null; then
    JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    JAVA_MAJOR="${JAVA_VER%%.*}"
    # Handle "1.x" old-style versioning
    [ "$JAVA_MAJOR" = "1" ] && JAVA_MAJOR=$(echo "$JAVA_VER" | cut -d. -f2)
    if [ "$JAVA_MAJOR" -ge 11 ] 2>/dev/null; then
        ok "Java ${JAVA_VER}"
    else
        fail "Java ${JAVA_VER} detected — JDK 11 or higher required"
        info "Install Microsoft OpenJDK 11: https://www.microsoft.com/openjdk"
        ERRORS=$((ERRORS + 1))
    fi
else
    fail "Java not found"
    info "Install Microsoft OpenJDK 11: https://www.microsoft.com/openjdk"
    ERRORS=$((ERRORS + 1))
fi

# ANDROID_HOME
if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
    ok "ANDROID_HOME = $ANDROID_HOME"
else
    fail "ANDROID_HOME is not set or does not exist"
    info "Install Android Studio and set ANDROID_HOME in ~/.zshrc or ~/.bashrc:"
    info "  export ANDROID_HOME=\$HOME/Library/Android/sdk  # Mac"
    info "  export ANDROID_HOME=\$HOME/Android/Sdk          # Linux"
    info "  export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    ERRORS=$((ERRORS + 1))
fi

# react-native CLI (optional — npx can use it without global install)
if command -v react-native &>/dev/null; then
    ok "react-native CLI $(react-native --version 2>/dev/null | head -1)"
else
    warn "react-native CLI not installed globally (will use npx)"
    WARNINGS=$((WARNINGS + 1))
fi

# Stop if hard prerequisites are missing
if [ "$ERRORS" -gt 0 ]; then
    echo ""
    fail "Fix the ${ERRORS} error(s) above, then re-run ./setup.sh"
    exit 1
fi

# =============================================================================
# STEP 2 — npm install
# =============================================================================
header "Step 2: Installing JavaScript Dependencies"

if [ -d "node_modules" ]; then
    info "node_modules already exists — running npm install to update"
fi

npm install
ok "npm install complete"

# =============================================================================
# STEP 3 — Generate gradle-wrapper.jar
# =============================================================================
header "Step 3: Generating Gradle Wrapper Binary"

JAR_PATH="android/gradle/wrapper/gradle-wrapper.jar"

if [ -f "$JAR_PATH" ]; then
    ok "gradle-wrapper.jar already present"
else
    if command -v gradle &>/dev/null; then
        info "Running: cd android && gradle wrapper"
        (cd android && gradle wrapper --gradle-version 8.3 --distribution-type all)
        ok "gradle-wrapper.jar generated"
    else
        fail "gradle command not found — cannot generate wrapper binary"
        info "Install Gradle via your package manager:"
        info "  Mac:   brew install gradle"
        info "  Linux: sdk install gradle  (via SDKMAN)"
        info "Then re-run ./setup.sh"
        ERRORS=$((ERRORS + 1))
    fi
fi

# =============================================================================
# STEP 4 — Make gradlew executable
# =============================================================================
header "Step 4: Setting gradlew Permissions"

chmod +x android/gradlew
ok "android/gradlew is executable"

# =============================================================================
# STEP 5 — Font installation check & asset linking
# =============================================================================
header "Step 5: Font Assets"

TAJAWAL_COUNT=$(find src/assets/fonts/Tajawal -name "*.ttf" 2>/dev/null | wc -l | tr -d ' ')
INTER_COUNT=$(find src/assets/fonts/Inter -name "*.ttf" 2>/dev/null | wc -l | tr -d ' ')
FONTS_READY=true

if [ "$TAJAWAL_COUNT" -eq 0 ]; then
    warn "Tajawal font files not found"
    info "Download Tajawal-Regular.ttf and Tajawal-Bold.ttf from:"
    info "  https://fonts.google.com/specimen/Tajawal"
    info "Place them in: src/assets/fonts/Tajawal/"
    FONTS_READY=false
    WARNINGS=$((WARNINGS + 1))
else
    ok "Tajawal fonts found (${TAJAWAL_COUNT} files)"
fi

if [ "$INTER_COUNT" -eq 0 ]; then
    warn "Inter font files not found"
    info "Download Inter-Regular.ttf and Inter-Bold.ttf from:"
    info "  https://fonts.google.com/specimen/Inter"
    info "Place them in: src/assets/fonts/Inter/"
    FONTS_READY=false
    WARNINGS=$((WARNINGS + 1))
else
    ok "Inter fonts found (${INTER_COUNT} files)"
fi

if $FONTS_READY; then
    info "Linking font assets..."
    npx react-native-asset
    ok "Font assets linked"
else
    warn "Skipping font linking — add font files and re-run ./setup.sh"
fi

# =============================================================================
# STEP 6 — GGUF model check (non-blocking)
# =============================================================================
header "Step 6: AI Model File"

GGUF_COUNT=$(find android/app/src/main/assets/models -name "*.gguf" 2>/dev/null | wc -l | tr -d ' ')

if [ "$GGUF_COUNT" -gt 0 ]; then
    ok "GGUF model file found"
else
    warn "No .gguf model file found in android/app/src/main/assets/models/"
    info "The app will run, but the AI engine will not respond until a model is added."
    info "Recommended model (≈2.2 GB):"
    info "  Phi-3-mini-4k-instruct-q4_k_m.gguf"
    info "  Download: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf"
    info "Place it at: android/app/src/main/assets/models/nursing_model.gguf"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# STEP 7 — Final summary
# =============================================================================
header "Setup Summary"

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  All checks passed!${NC}"
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}  Setup complete with ${WARNINGS} warning(s) — see above.${NC}"
else
    echo -e "${RED}${BOLD}  Setup failed with ${ERRORS} error(s) — fix them and re-run.${NC}"
    exit 1
fi

echo ""
echo -e "${BOLD}To run the app on a connected Android device or emulator:${NC}"
echo -e "${CYAN}  npx react-native run-android${NC}"
echo ""
echo -e "${BOLD}To start the Metro bundler separately:${NC}"
echo -e "${CYAN}  npx react-native start${NC}"
echo ""
