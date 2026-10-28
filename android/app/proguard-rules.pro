# Preserve JavascriptInterface methods from being stripped or renamed
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve AndroidX WebKit
-keep class androidx.webkit.** { *; }
