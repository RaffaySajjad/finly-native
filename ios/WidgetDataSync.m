/**
 * WidgetDataSync Bridge Implementation
 * Purpose: Bridge Swift module to React Native
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetDataSync, NSObject)

RCT_EXTERN_METHOD(syncWidgetData:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

