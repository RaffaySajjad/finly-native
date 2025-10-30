//
//  LiquidGlassView.h
//  finly
//
//  Native iOS 26 Liquid Glass View Component
//  Bridges iOS 26 Liquid Glass APIs to React Native
//

#import <UIKit/UIKit.h>
#import <React/RCTView.h>
#import <React/RCTComponent.h>

NS_ASSUME_NONNULL_BEGIN

@interface LiquidGlassView : UIView

@property (nonatomic, assign) CGFloat blurRadius;
@property (nonatomic, copy) NSString *glassStyle; // iOS 26 Liquid Glass style
@property (nonatomic, assign) CGFloat cornerRadius;
@property (nonatomic, strong) UIColor *tintColor;
@property (nonatomic, copy) RCTDirectEventBlock onGlassEffectApplied;

@end

NS_ASSUME_NONNULL_END

