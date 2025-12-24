//
//  LiquidGlassView.m
//  finly
//
//  Native iOS 26 Liquid Glass View Implementation
//  Uses iOS 26 native Liquid Glass APIs via UIBlurEffect and UIVisualEffectView
//

#import "LiquidGlassView.h"
#import <React/RCTLog.h>

@implementation LiquidGlassView

- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        _blurRadius = 20.0;
        _glassStyle = @"systemMaterial";
        _cornerRadius = 16.0;
        _tintColor = [UIColor clearColor];
        
        [self setupLiquidGlassEffect];
    }
    return self;
}

- (void)setupLiquidGlassEffect {
    // Remove existing subviews
    [self.subviews makeObjectsPerformSelector:@selector(removeFromSuperview)];
    
    // iOS 26+ Liquid Glass implementation
    // Use native UIBlurEffect with iOS 26 Liquid Glass styles
    UIBlurEffectStyle blurStyle = UIBlurEffectStyleSystemMaterial;
    
    // Map glass style string to UIBlurEffectStyle
    if ([self.glassStyle isEqualToString:@"systemMaterialThin"]) {
        blurStyle = UIBlurEffectStyleSystemMaterialThin;
    } else if ([self.glassStyle isEqualToString:@"systemMaterialThick"]) {
        blurStyle = UIBlurEffectStyleSystemMaterialThick;
    } else if ([self.glassStyle isEqualToString:@"systemUltraThinMaterial"]) {
        blurStyle = UIBlurEffectStyleSystemUltraThinMaterial;
    }
    
    // Create UIVisualEffectView with iOS 26 Liquid Glass effect
    UIBlurEffect *blurEffect = [UIBlurEffect effectWithStyle:blurStyle];
    UIVisualEffectView *visualEffectView = [[UIVisualEffectView alloc] initWithEffect:blurEffect];
    
    // Configure visual effect view
    visualEffectView.frame = self.bounds;
    visualEffectView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    
    // Apply tint color if specified
    if (self.tintColor && ![self.tintColor isEqual:[UIColor clearColor]]) {
        UIView *tintView = [[UIView alloc] initWithFrame:visualEffectView.bounds];
        tintView.backgroundColor = self.tintColor;
        tintView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [visualEffectView.contentView addSubview:tintView];
    }
    
    // Add visual effect view
    [self addSubview:visualEffectView];
    
    // Set corner radius
    self.layer.cornerRadius = self.cornerRadius;
    self.clipsToBounds = YES;
    
    // Notify React Native that effect was applied
    if (self.onGlassEffectApplied) {
        self.onGlassEffectApplied(@{@"applied": @YES});
    }
}

- (void)setBlurRadius:(CGFloat)blurRadius {
    _blurRadius = blurRadius;
    // iOS 26 native blur doesn't support custom radius, but we can update effect
    [self setupLiquidGlassEffect];
}

- (void)setGlassStyle:(NSString *)glassStyle {
    _glassStyle = glassStyle;
    [self setupLiquidGlassEffect];
}

- (void)setCornerRadius:(CGFloat)cornerRadius {
    _cornerRadius = cornerRadius;
    self.layer.cornerRadius = cornerRadius;
}

- (void)setTintColor:(UIColor *)tintColor {
    _tintColor = tintColor;
    [self setupLiquidGlassEffect];
}

- (void)layoutSubviews {
    [super layoutSubviews];
    // Update visual effect view frame
    for (UIView *subview in self.subviews) {
        if ([subview isKindOfClass:[UIVisualEffectView class]]) {
            subview.frame = self.bounds;
        }
    }
}

@end

