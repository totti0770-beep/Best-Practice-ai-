cmake_minimum_required(VERSION 3.22.1)
project(NursingAiAssistant)

# ── llama.rn native bridge ─────────────────────────────────────────────────
# llama.rn ships its own CMakeLists at node_modules/llama.rn/android/
# We include it here so the React Native Gradle plugin finds it.
#
# This requires:
#   - NDK 26.1.10909125 (declared in android/build.gradle)
#   - npm install has been run (so node_modules/llama.rn exists)

set(LLAMA_RN_DIR "${CMAKE_SOURCE_DIR}/../../../../../node_modules/llama.rn/android")

if(EXISTS "${LLAMA_RN_DIR}/CMakeLists.txt")
    add_subdirectory(${LLAMA_RN_DIR} llama.rn)
else()
    message(WARNING
        "llama.rn CMakeLists not found at ${LLAMA_RN_DIR}. "
        "Run: npm install  then rebuild."
    )
endif()

# ── JNI bridge target ──────────────────────────────────────────────────────
find_library(log-lib log)

add_library(
    nursing-ai-bridge
    SHARED
    nursing_bridge.cpp
)

target_link_libraries(
    nursing-ai-bridge
    ${log-lib}
)
