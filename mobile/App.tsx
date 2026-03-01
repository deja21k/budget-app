import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { InstaScanCamera, ReceiptData } from './src';

export const App: React.FC = () => {
  const handleCapture = useCallback((imageUri: string, data: ReceiptData | null) => {
    console.log('Captured image:', imageUri);
    console.log('Extracted data:', data);
    
    if (data) {
      Alert.alert(
        'Receipt Scanned',
        `Merchant: ${data.merchant}\nTotal: ${data.currency} ${data.total.toFixed(2)}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleError = useCallback((error: string) => {
    Alert.alert('Scan Error', error);
  }, []);

  const handleClose = useCallback(() => {
    console.log('Scanner closed');
  }, []);

  return (
    <View style={styles.container}>
      <InstaScanCamera
        config={{
          stabilityThreshold: 500,
          captureConfidence: 0.85,
          enableHapticFeedback: true,
          enableSkeletonPreview: true,
        }}
        onCapture={handleCapture}
        onError={handleError}
        onClose={handleClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
