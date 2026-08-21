# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor bridge + plugins use reflection (JS <-> native calls, JSON
# serialization of plugin results). Without these, R8 strips/renames methods
# the bridge looks up by name/annotation at runtime -> release-only crash.
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class org.apache.cordova.** { *; }

# Gson field-name reflection (Capacitor plugin result serialization).
-keepattributes Signature,*Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
