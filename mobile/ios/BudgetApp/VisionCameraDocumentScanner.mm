#import "VisionCameraDocumentScanner.h"
#import "BudgetApp-Swift.h"

@implementation VisionCameraDocumentScanner

- (instancetype)initWithOptions:(NSDictionary *)options {
  self = [super initWithOptions:options];
  return self;
}

- (id)callback:(Frame *)frame withArguments:(NSArray *)arguments {
  NSDictionary *result = [DocumentScannerPlugin callback:frame withArguments:arguments];
  return result;
}

+ (NSString *)name {
  return @"documentScanner";
}

@end
