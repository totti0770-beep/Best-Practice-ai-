package com.nursingaiassistant.modules

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File

/**
 * PdfExtractorModule
 *
 * Extracts text content page-by-page from a PDF file using Apache PDFBox
 * (Tom Roush's Android port). Runs entirely on-device — no network access —
 * preserving the air-gapped design.
 *
 * The JS layer (pdfService.js) calls
 *   NativeModules.PdfExtractorModule.extractPages(filePath)
 * which resolves with an array of { pageNumber, text } objects.
 *
 * Registration: add to MainApplication.getPackages() via PdfExtractorPackage.
 */
class PdfExtractorModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    init {
        // Initialise the PDFBox font/resource loader once for the process.
        PDFBoxResourceLoader.init(reactContext.applicationContext)
    }

    override fun getName(): String = "PdfExtractorModule"

    /**
     * Extracts text from every page of the PDF at [filePath].
     *
     * @param filePath Absolute path to the PDF (may be a file:// URI or plain path)
     * @param promise  Resolves with WritableArray of { pageNumber:Int, text:String }
     */
    @ReactMethod
    fun extractPages(filePath: String, promise: Promise) {
        var document: PDDocument? = null
        try {
            val path = filePath.removePrefix("file://")
            val file = File(path)
            if (!file.exists()) {
                promise.reject("PDF_NOT_FOUND", "PDF file does not exist: $path")
                return
            }

            document = PDDocument.load(file)
            val pageCount = document.numberOfPages
            val stripper = PDFTextStripper()
            val pages: WritableArray = Arguments.createArray()

            for (pageIndex in 1..pageCount) {
                stripper.startPage = pageIndex
                stripper.endPage = pageIndex
                val text = stripper.getText(document) ?: ""

                val page: WritableMap = Arguments.createMap()
                page.putInt("pageNumber", pageIndex)
                page.putString("text", text)
                pages.pushMap(page)
            }

            promise.resolve(pages)
        } catch (e: Exception) {
            promise.reject("PDF_EXTRACTION_ERROR", "Failed to extract PDF text: ${e.message}", e)
        } finally {
            try {
                document?.close()
            } catch (_: Exception) {
                // Ignore close errors — extraction result already resolved/rejected.
            }
        }
    }
}
