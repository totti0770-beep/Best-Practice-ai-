# ProGuard rules for NursingAiAssistant

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# SQLCipher
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }

# Biometrics
-keep class androidx.biometric.** { *; }

# llama.rn JNI bridge
-keep class com.llama.** { *; }
-keep class ai.ggml.** { *; }

# Crypto
-keep class org.bouncycastle.** { *; }
