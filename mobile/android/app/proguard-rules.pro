# Add project specific ProGuard rules here.

-keep class com.budgetapp.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.google.mlkit.** { *; }

-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
