package sk.volleysound.app;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Color;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;


public class MainActivity extends Activity {
    private static final int PICK_FILES = 916;
    private WebView browser;
    private ValueCallback<android.net.Uri[]> uploadCallback;
    private static final String HOME = "https://appassets.androidplatform.net/assets/index.html";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(8,17,31));
        getWindow().setNavigationBarColor(Color.rgb(8,17,31));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        browser = new WebView(this);
        setContentView(browser);
        final WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " VolleySoundAndroid");
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        browser.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if ("appassets.androidplatform.net".equals(request.getUrl().getHost())) return false;
                Intent external = new Intent(Intent.ACTION_VIEW, request.getUrl());
                try { startActivity(external); } catch (ActivityNotFoundException ignored) {}
                return true;
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<android.net.Uri[]> callback, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"audio/mpeg","audio/mp4","audio/wav","audio/ogg","application/json"});
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(pick, PICK_FILES); return true; }
                catch (Exception e) { uploadCallback=null; return false; }
            }
        });
        browser.loadUrl(HOME);
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode != PICK_FILES || uploadCallback == null) return;
        android.net.Uri[] result = null;
        if(resultCode == RESULT_OK && data != null) {
            if(data.getClipData()!=null) {
                int n=data.getClipData().getItemCount();
                result=new android.net.Uri[n];
                for(int i=0;i<n;i++) result[i]=data.getClipData().getItemAt(i).getUri();
            } else if(data.getData()!=null) {result=new android.net.Uri[]{data.getData()};}
        }
        uploadCallback.onReceiveValue(result);uploadCallback=null;
    }
    @Override public void onBackPressed() {
        if(browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if(uploadCallback!=null) {uploadCallback.onReceiveValue(null);uploadCallback=null;}
        if(browser!=null) {browser.destroy();browser=null;}
        super.onDestroy();
    }
}
