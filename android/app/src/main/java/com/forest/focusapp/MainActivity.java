package com.forest.focusapp;

import android.annotation.SuppressLint;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

/**
 * MainActivity for Forest Focus App.
 * Implements Google's secure WebViewAssetLoader to avoid file:// scheme vulnerabilities
 * and provides robust exception handling across native bridges.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "ForestMainActivity";
    private static final String ASSET_DOMAIN = "appassets.androidplatform.net";
    private static final String ENTRY_URL = "https://" + ASSET_DOMAIN + "/assets/index.html";

    private WebView webView;
    private Vibrator vibrator;
    private WebViewAssetLoader assetLoader;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Customize system navigation and status bars
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFF1B4332);
            window.setNavigationBarColor(0xFF0B1B13);

            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

            // Configure secure AndroidX WebViewAssetLoader
            assetLoader = new WebViewAssetLoader.Builder()
                    .setDomain(ASSET_DOMAIN)
                    .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                    .build();

            setupWebView();
            setupBackNavigation();

            // Load application via secure virtual domain
            webView.loadUrl(ENTRY_URL);

        } catch (Exception e) {
            Log.e(TAG, "Critical failure during activity creation", e);
        }
    }

    private void setupWebView() {
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        // Security best practice: Prevent unauthorized file access
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setBackgroundColor(0xFF0B1B13);

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidNative");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new SecureWebViewClient());
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                try {
                    if (webView != null) {
                        webView.evaluateJavascript(
                                "if (typeof window.handleAndroidBack === 'function') { window.handleAndroidBack(); } else { false; }",
                                value -> {
                                    if (value == null || "null".equals(value) || "false".equals(value)) {
                                        finish();
                                    }
                                }
                        );
                    } else {
                        finish();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Error handling back navigation, executing default finish", e);
                    finish();
                }
            }
        });
    }

    /**
     * Custom WebViewClient intercepting requests via WebViewAssetLoader
     * with graceful crash handling if the render process terminates.
     */
    private class SecureWebViewClient extends WebViewClient {

        @Nullable
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            try {
                if (assetLoader != null) {
                    return assetLoader.shouldInterceptRequest(request.getUrl());
                }
            } catch (Exception e) {
                Log.e(TAG, "Error intercepting asset request", e);
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            return !ASSET_DOMAIN.equals(url.getHost());
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            Log.w(TAG, "WebView render process gone. Re-initializing WebView...");
            try {
                if (webView != null) {
                    webView.destroy();
                }
                setupWebView();
                webView.loadUrl(ENTRY_URL);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to recover from lost render process", e);
                return false;
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            Log.e(TAG, "Web resource error: " + error.getDescription() + " on " + request.getUrl());
        }
    }

    /**
     * Native bridge interface with input sanitization and exception guards.
     */
    public class WebAppInterface {
        private final Context mContext;

        WebAppInterface(Context context) {
            this.mContext = context;
        }

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            try {
                int safeDuration = Math.max(1, Math.min(milliseconds, 3000));
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(safeDuration, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(safeDuration);
                    }
                }
            } catch (SecurityException se) {
                Log.w(TAG, "Vibrate permission not granted or restricted", se);
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error in native vibrate bridge", e);
            }
        }

        @JavascriptInterface
        public void showToast(final String message) {
            try {
                if (message == null || message.trim().isEmpty()) return;
                final String safeMessage = message.length() > 120 ? message.substring(0, 120) : message;

                runOnUiThread(() -> {
                    try {
                        Toast.makeText(mContext, safeMessage, Toast.LENGTH_SHORT).show();
                    } catch (Exception te) {
                        Log.e(TAG, "Failed to display toast", te);
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "Error in native showToast bridge", e);
            }
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean keepOn) {
            try {
                runOnUiThread(() -> {
                    try {
                        Window window = getWindow();
                        if (window != null) {
                            if (keepOn) {
                                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                            } else {
                                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                            }
                        }
                    } catch (Exception we) {
                        Log.e(TAG, "Failed modifying FLAG_KEEP_SCREEN_ON", we);
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "Error in native keepScreenOn bridge", e);
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            if (webView != null) webView.onResume();
        } catch (Exception e) {
            Log.e(TAG, "Error during webView onResume", e);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        try {
            if (webView != null) webView.onPause();
        } catch (Exception e) {
            Log.e(TAG, "Error during webView onPause", e);
        }
    }

    @Override
    protected void onDestroy() {
        try {
            if (webView != null) {
                webView.destroy();
                webView = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error destroying webView", e);
        }
        super.onDestroy();
    }
}
