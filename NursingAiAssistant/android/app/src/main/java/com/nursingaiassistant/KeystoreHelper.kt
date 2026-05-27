package com.nursingaiassistant

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.Cipher

/**
 * KeystoreHelper
 *
 * Derives and stores the SQLCipher database encryption key inside the
 * Android Keystore (TEE / Secure Enclave). The raw key material never
 * leaves secure hardware — even if the APK is reverse-engineered, the
 * key cannot be extracted.
 *
 * Usage (called once from MainApplication.onCreate, before DB open):
 *   val key = KeystoreHelper.getDatabaseKey(context)
 *   // pass `key` to react-native-sqlite-storage via a NativeModule
 *
 * Key lifecycle:
 *   - Created on first app launch (requireUserAuthentication = false for
 *     background access; set true to require biometrics per-session)
 *   - Persists across reboots inside the Keystore
 *   - Deleted only if the user performs a factory reset or uninstalls the app
 */
object KeystoreHelper {

    private const val KEYSTORE_PROVIDER  = "AndroidKeyStore"
    private const val KEY_ALIAS          = "nursing_ai_db_key"
    private const val TRANSFORMATION     = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH     = 128
    private const val PREFS_NAME         = "nursing_ai_prefs"
    private const val PREF_ENCRYPTED_KEY = "db_key_enc"
    private const val PREF_KEY_IV        = "db_key_iv"

    /**
     * Returns a stable hex string suitable for use as a SQLCipher PRAGMA key.
     * The actual AES key is wrapped (encrypted) by the Keystore master key.
     */
    fun getDatabaseKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (!prefs.contains(PREF_ENCRYPTED_KEY)) {
            // First launch: generate a fresh 256-bit key and wrap it
            generateAndStoreKey(context)
        }

        return unwrapKey(context)
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private fun getOrCreateKeystoreKey(): SecretKey {
        val ks = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

        if (ks.containsAlias(KEY_ALIAS)) {
            return (ks.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey
        }

        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false) // Allow background DB access
            .build()

        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
            .apply { init(spec) }
            .generateKey()
    }

    private fun generateAndStoreKey(context: Context) {
        // Generate a random 32-byte DB key
        val rawKey = ByteArray(32).also { java.security.SecureRandom().nextBytes(it) }

        // Encrypt it with the Keystore-backed master key
        val masterKey = getOrCreateKeystoreKey()
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.ENCRYPT_MODE, masterKey)
        }
        val encrypted = cipher.doFinal(rawKey)
        val iv        = cipher.iv

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_ENCRYPTED_KEY, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(PREF_KEY_IV,        Base64.encodeToString(iv,        Base64.NO_WRAP))
            .apply()
    }

    private fun unwrapKey(context: Context): String {
        val prefs     = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val encrypted = Base64.decode(prefs.getString(PREF_ENCRYPTED_KEY, "")!!, Base64.NO_WRAP)
        val iv        = Base64.decode(prefs.getString(PREF_KEY_IV,        "")!!, Base64.NO_WRAP)

        val masterKey = getOrCreateKeystoreKey()
        val cipher    = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, masterKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
        }
        val rawKey = cipher.doFinal(encrypted)

        // Return as hex string — SQLCipher accepts "x'<hex>'" format
        return rawKey.joinToString("") { "%02x".format(it) }
    }
}
