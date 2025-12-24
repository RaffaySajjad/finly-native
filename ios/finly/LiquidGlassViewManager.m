//
//  LiquidGlassViewManager.m
//  finly
//
//  React Native ViewManager Implementation for LiquidGlassView
//  Exposes native iOS 26 Liquid Glass component to React Native
//

#import "LiquidGlassViewManager.h"
#import "LiquidGlassView.h"
#import <React/RCTUIManager.h>

@implementation LiquidGlassViewManager

RCT_EXPORT_MODULE(LiquidGlassView)

- (UIView *)view {
    return [[LiquidGlassView alloc] init];
}

// Export properties
RCT_EXPORT_VIEW_PROPERTY(blurRadius, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(glassStyle, NSString)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(tintColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(onGlassEffectApplied, RCTDirectEventBlock)

// Export view manager methods
RCT_EXPORT_METHOD(applyGlassEffect:(nonnull NSNumber *)reactTag) {
    [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        UIView *view = viewRegistry[reactTag];
        if ([view isKindOfClass:[LiquidGlassView class]]) {
            LiquidGlassView *glassView = (LiquidGlassView *)view;
            [glassView setupLiquidGlassEffect];
        }
    }];
}

@end

