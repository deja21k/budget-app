import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  detectDocument(frameBase64: string): Promise<string>;
  perspectiveTransform(imageUri: string, cornersJson: string): Promise<string>;
  getSupportedResolutions(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DocumentScanner');
