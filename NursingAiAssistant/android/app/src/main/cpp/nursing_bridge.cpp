/**
 * nursing_bridge.cpp
 *
 * Minimal JNI bridge stub for NursingAiAssistant.
 * llama.rn provides the actual inference JNI — this file exists so that
 * CMake compiles a shared library even before llama.rn is fully wired.
 *
 * Once llama.rn is linked via add_subdirectory in CMakeLists.txt, the
 * real JNI symbols from llama.rn will be available to JavaScript.
 */

#include <jni.h>
#include <android/log.h>

#define TAG "NursingAI"

extern "C" JNIEXPORT jstring JNICALL
Java_com_nursingaiassistant_NursingBridge_getVersion(JNIEnv *env, jobject /* this */) {
    __android_log_print(ANDROID_LOG_INFO, TAG, "NursingAI Bridge v1.0");
    return env->NewStringUTF("NursingAI-Bridge/1.0");
}
