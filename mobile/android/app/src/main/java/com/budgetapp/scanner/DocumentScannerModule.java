package com.budgetapp.scanner;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Point;
import android.media.ExifInterface;
import android.net.Uri;
import android.util.Base64;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class DocumentScannerModule extends ReactContextBaseJavaModule {
    
    private final ReactApplicationContext reactContext;
    private TextRecognizer textRecognizer;
    private long lastDetectionTime = 0;
    private List<Point[]> lastCorners = null;
    private long stabilityStartTime = 0;
    
    public DocumentScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.textRecognizer = TextRecognition.getClient();
    }
    
    @NonNull
    @Override
    public String getName() {
        return "DocumentScanner";
    }
    
    @ReactMethod
    public void detectDocument(String frameBase64, Promise promise) {
        try {
            byte[] decodedBytes = Base64.decode(frameBase64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            
            if (bitmap == null) {
                promise.reject("INVALID_IMAGE", "Could not decode image");
                return;
            }
            
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            
            textRecognizer.process(image)
                .addOnSuccessListener(text -> {
                    WritableMap result = detectDocumentEdges(bitmap, text);
                    promise.resolve(result);
                })
                .addOnFailureListener(e -> {
                    promise.reject("DETECTION_FAILED", e.getMessage());
                });
                
        } catch (Exception e) {
            promise.reject("PROCESSING_ERROR", e.getMessage());
        }
    }
    
    private WritableMap detectDocumentEdges(Bitmap bitmap, Text text) {
        WritableMap result = Arguments.createMap();
        
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        
        List<Text.TextBlock> blocks = text.getTextBlocks();
        
        if (blocks.isEmpty()) {
            result.putBoolean("detected", false);
            result.putDouble("confidence", 0);
            result.putBoolean("isStable", false);
            result.putDouble("stabilityDuration", 0);
            return result;
        }
        
        int minX = width, maxX = 0, minY = height, maxY = 0;
        int blockCount = 0;
        
        for (Text.TextBlock block : blocks) {
            android.graphics.Rect boundingBox = block.getBoundingBox();
            if (boundingBox != null) {
                minX = Math.min(minX, boundingBox.left);
                maxX = Math.max(maxX, boundingBox.right);
                minY = Math.min(minY, boundingBox.top);
                maxY = Math.max(maxY, boundingBox.bottom);
                blockCount++;
            }
        }
        
        if (blockCount < 3) {
            result.putBoolean("detected", false);
            result.putDouble("confidence", 0);
            result.putBoolean("isStable", false);
            result.putDouble("stabilityDuration", 0);
            return result;
        }
        
        int padding = 20;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width, maxX + padding);
        maxY = Math.min(height, maxY + padding);
        
        WritableArray corners = Arguments.createArray();
        
        WritableMap topLeft = Arguments.createMap();
        topLeft.putDouble("x", minX);
        topLeft.putDouble("y", minY);
        corners.pushMap(topLeft);
        
        WritableMap topRight = Arguments.createMap();
        topRight.putDouble("x", maxX);
        topRight.putDouble("y", minY);
        corners.pushMap(topRight);
        
        WritableMap bottomRight = Arguments.createMap();
        bottomRight.putDouble("x", maxX);
        bottomRight.putDouble("y", maxY);
        corners.pushMap(bottomRight);
        
        WritableMap bottomLeft = Arguments.createMap();
        bottomLeft.putDouble("x", minX);
        bottomLeft.putDouble("y", maxY);
        corners.pushMap(bottomLeft);
        
        boolean isStable = checkStability(minX, minY, maxX, maxY);
        long stabilityDuration = getStabilityDuration(isStable);
        
        double confidence = Math.min(0.95, 0.5 + (blockCount * 0.05));
        
        result.putBoolean("detected", true);
        result.putArray("corners", corners);
        result.putDouble("confidence", confidence);
        result.putBoolean("isStable", isStable);
        result.putDouble("stabilityDuration", stabilityDuration);
        
        return result;
    }
    
    private boolean checkStability(int minX, int minY, int maxX, int maxY) {
        final int THRESHOLD = 25;
        
        if (lastCorners != null) {
            Point[] current = {
                new Point(minX, minY),
                new Point(maxX, minY),
                new Point(maxX, maxY),
                new Point(minX, maxY)
            };
            
            double totalMovement = 0;
            for (int i = 0; i < 4; i++) {
                double dx = current[i].x - lastCorners.get(0)[i].x;
                double dy = current[i].y - lastCorners.get(0)[i].y;
                totalMovement += Math.sqrt(dx * dx + dy * dy);
            }
            
            double avgMovement = totalMovement / 4;
            
            lastCorners.set(0, current);
            
            if (avgMovement < THRESHOLD) {
                if (stabilityStartTime == 0) {
                    stabilityStartTime = System.currentTimeMillis();
                }
                return true;
            } else {
                stabilityStartTime = 0;
                return false;
            }
        }
        
        Point[] corners = {
            new Point(minX, minY),
            new Point(maxX, minY),
            new Point(maxX, maxY),
            new Point(minX, maxY)
        };
        lastCorners = new ArrayList<>();
        lastCorners.add(corners);
        
        return false;
    }
    
    private long getStabilityDuration(boolean isStable) {
        if (!isStable || stabilityStartTime == 0) {
            stabilityStartTime = 0;
            return 0;
        }
        return System.currentTimeMillis() - stabilityStartTime;
    }
    
    @ReactMethod
    public void perspectiveTransform(String imageUri, String cornersJson, Promise promise) {
        try {
            JSONObject cornersObj = new JSONObject(cornersJson);
            JSONArray cornersArray = cornersObj.optJSONArray("corners");
            
            if (cornersArray == null || cornersArray.length() != 4) {
                promise.reject("INVALID_CORNERS", "Need exactly 4 corners");
                return;
            }
            
            Bitmap sourceBitmap = loadBitmapFromUri(imageUri);
            if (sourceBitmap == null) {
                promise.reject("LOAD_FAILED", "Could not load image");
                return;
            }
            
            float[] srcPoints = new float[8];
            for (int i = 0; i < 4; i++) {
                JSONObject corner = cornersArray.getJSONObject(i);
                srcPoints[i * 2] = (float) corner.getDouble("x");
                srcPoints[i * 2 + 1] = (float) corner.getDouble("y");
            }
            
            int outputWidth = Math.max(
                Math.abs((int)srcPoints[0] - (int)srcPoints[2]),
                Math.abs((int)srcPoints[4] - (int)srcPoints[6])
            );
            int outputHeight = Math.max(
                Math.abs((int)srcPoints[1] - (int)srcPoints[5]),
                Math.abs((int)srcPoints[3] - (int)srcPoints[7])
            );
            
            float[] dstPoints = new float[] {
                0, 0,
                outputWidth, 0,
                outputWidth, outputHeight,
                0, outputHeight
            };
            
            Matrix transformMatrix = computePerspectiveTransform(srcPoints, dstPoints);
            
            Bitmap outputBitmap = Bitmap.createBitmap(outputWidth, outputHeight, Bitmap.Config.ARGB_8888);
            android.graphics.Canvas canvas = new android.graphics.Canvas(outputBitmap);
            canvas.drawBitmap(sourceBitmap, transformMatrix, null);
            
            String outputPath = saveBitmap(outputBitmap);
            
            WritableMap result = Arguments.createMap();
            result.putString("uri", outputPath);
            result.putInt("width", outputWidth);
            result.putInt("height", outputHeight);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("TRANSFORM_ERROR", e.getMessage());
        }
    }
    
    private Matrix computePerspectiveTransform(float[] src, float[] dst) {
        Matrix matrix = new Matrix();
        matrix.setPolyToPoly(src, 0, dst, 0, 4);
        return matrix;
    }
    
    private Bitmap loadBitmapFromUri(String uri) {
        try {
            if (uri.startsWith("file://")) {
                String path = uri.substring(7);
                return BitmapFactory.decodeFile(path);
            } else if (uri.startsWith("content://")) {
                InputStream inputStream = reactContext.getContentResolver().openInputStream(Uri.parse(uri));
                return BitmapFactory.decodeStream(inputStream);
            } else if (uri.startsWith("data:")) {
                String base64 = uri.split(",")[1];
                byte[] decoded = Base64.decode(base64, Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
            }
            return BitmapFactory.decodeFile(uri);
        } catch (Exception e) {
            return null;
        }
    }
    
    private String saveBitmap(Bitmap bitmap) {
        File outputDir = reactContext.getExternalFilesDir(null);
        File outputFile = new File(outputDir, "scanned_" + System.currentTimeMillis() + ".jpg");
        
        try (FileOutputStream fos = new FileOutputStream(outputFile)) {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 92, fos);
        } catch (Exception e) {
            return null;
        }
        
        return "file://" + outputFile.getAbsolutePath();
    }
    
    @ReactMethod
    public void getSupportedResolutions(Promise promise) {
        WritableArray resolutions = Arguments.createArray();
        resolutions.pushString("3840x2160");
        resolutions.pushString("1920x1080");
        resolutions.pushString("1280x720");
        promise.resolve(resolutions);
    }
}
