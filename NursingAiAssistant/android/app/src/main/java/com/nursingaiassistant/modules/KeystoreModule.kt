package com.nursingaiassistant.modules

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.nursingaiassistant.KeystoreHelper

/**
 * KeystoreModule
 *
 * Exposes KeystoreHelper to JavaScript via the React Native bridge.
 * The JS database layer (db.js) calls NativeModules.KeystoreModule.getDatabaseKey()
 * to retrieve the Keystore-derived encryption key at runtime.
 *
 * Registration: add to MainApplication.getPackages() via KeystorePackage.
 */
class KeystoreModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KeystoreModule"

    @ReactMethod
    fun getDatabaseKey(promise: Promise) {
        try {
            val key = KeystoreHelper.getDatabaseKey(reactContext)
            promise.resolve(key)
        } catch (e: Exception) {
            promise.reject("KEYSTORE_ERROR", "Failed to retrieve database key: ${e.message}", e)
        }
    }
}
