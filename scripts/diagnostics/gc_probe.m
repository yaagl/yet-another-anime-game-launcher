#import <AppKit/AppKit.h>
#import <GameController/GameController.h>
#include <stdio.h>

int main(void) {
    @autoreleasepool {
        [NSApplication sharedApplication];
        [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        GCController.shouldMonitorBackgroundEvents = YES;
        __block unsigned changes = 0, connected = 0;
        NSMutableSet<GCController *> *seen = [NSMutableSet set];
        NSDate *end = [NSDate dateWithTimeIntervalSinceNow:60];
        while ([end timeIntervalSinceNow] > 0) {
            for (GCController *controller in GCController.controllers) {
                if (![controller.extendedGamepad isKindOfClass:GCDualShockGamepad.class]) continue;
                if ([seen containsObject:controller]) continue;
                [seen addObject:controller];
                ++connected;
                printf("GC name=%s profile=%s remapped=%d\n",
                       controller.vendorName.UTF8String,
                       NSStringFromClass(controller.extendedGamepad.class).UTF8String,
                       controller.physicalInputProfile.hasRemappedElements);
                controller.extendedGamepad.valueChangedHandler =
                    ^(GCExtendedGamepad *pad, GCControllerElement *element) {
                        (void)element;
                        ++changes;
                        printf("time=%.3f GC change=%u L=(%.2f,%.2f) R=(%.2f,%.2f) AXBY=%d%d%d%d LT=%.2f RT=%.2f D=(%.2f,%.2f) L1R1=%d%d L3R3=%d%d menu=%d options=%d touch=%d\n",
                                   NSDate.date.timeIntervalSince1970, changes, pad.leftThumbstick.xAxis.value, pad.leftThumbstick.yAxis.value,
                                   pad.rightThumbstick.xAxis.value, pad.rightThumbstick.yAxis.value,
                                   pad.buttonA.pressed, pad.buttonX.pressed, pad.buttonB.pressed,
                                   pad.buttonY.pressed, pad.leftTrigger.value, pad.rightTrigger.value,
                                   pad.dpad.xAxis.value, pad.dpad.yAxis.value,
                                   pad.leftShoulder.pressed, pad.rightShoulder.pressed,
                                   pad.leftThumbstickButton.pressed, pad.rightThumbstickButton.pressed,
                                   pad.buttonMenu.pressed, pad.buttonOptions.pressed,
                                   ((GCDualShockGamepad *)pad).touchpadButton.pressed);
                        fflush(stdout);
                    };
                fflush(stdout);
            }
            [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.01]];
        }
        printf("GC connected=%u changes=%u\n", connected, changes);
        return connected ? 0 : 2;
    }
}
