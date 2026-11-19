#import <Cocoa/Cocoa.h>
#import <Sparkle/Sparkle.h>
#include <errno.h>
#include <signal.h>

static void emit(NSDictionary *message) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:message options:0 error:nil];
    fwrite(data.bytes, 1, data.length, stdout);
    fputc('\n', stdout);
    fflush(stdout);
}

@interface UpdateBridge : NSObject <SPUUpdaterDelegate, NSApplicationDelegate>
@property(strong) SPUUpdater *updater;
@property(strong) NSSet<NSString *> *channels;
@property(copy) void (^installHandler)(void);
@property(strong) NSMutableString *input;
@property pid_t parentPID;
@property BOOL installing;
@end

@implementation UpdateBridge
- (void)handleCommand:(NSDictionary *)command {
    if (![command isKindOfClass:NSDictionary.class]) return;
    NSString *action = command[@"command"];
    if (![@[@"check", @"background", @"configure"] containsObject:action]) return;
    NSMutableSet *channels = [NSMutableSet set];
    for (NSString *channel in @[@"rc", @"beta", @"alpha", @"prerelease"]) {
        if ([command[@"channels"] isKindOfClass:NSArray.class] &&
            [command[@"channels"] containsObject:channel]) [channels addObject:channel];
    }
    self.channels = channels;
    if ([action isEqual:@"configure"]) return;
    if (self.updater.sessionInProgress) {
        if ([action isEqual:@"check"]) [self.updater checkForUpdates];
        return;
    }
    if (!self.updater) {
        NSBundle *bundle = NSBundle.mainBundle;
        SPUStandardUserDriver *driver = [[SPUStandardUserDriver alloc] initWithHostBundle:bundle delegate:nil];
        self.updater = [[SPUUpdater alloc] initWithHostBundle:bundle applicationBundle:bundle userDriver:driver delegate:self];
        NSError *error;
        if (![self.updater startUpdater:&error]) {
            emit(@{@"event": @"error", @"message": error.localizedDescription});
            exit(EXIT_FAILURE);
        }
    }
    if ([action isEqual:@"check"]) [self.updater checkForUpdates];
    else [self.updater checkForUpdatesInBackground];
}

- (NSSet<NSString *> *)allowedChannelsForUpdater:(SPUUpdater *)updater {
    return self.channels;
}

- (BOOL)updater:(SPUUpdater *)updater shouldPostponeRelaunchForUpdate:(SUAppcastItem *)item
        untilInvokingBlock:(void (^)(void))installHandler {
    self.installHandler = installHandler;
    self.installing = YES;
    emit(@{@"event": @"quit"});
    return YES;
}

// Sparkle can skip the postponement callback when resuming an installation.
- (void)updaterWillRelaunchApplication:(SPUUpdater *)updater {
    if (!self.installing) {
        self.installing = YES;
        emit(@{@"event": @"quit"});
    }
}

- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication *)sender {
    return self.installing && kill(self.parentPID, 0) == 0 ? NSTerminateLater : NSTerminateNow;
}
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 2 || ![NSBundle.mainBundle.bundlePath hasSuffix:@".app"]) return EXIT_FAILURE;
        pid_t parentPID = (pid_t)strtol(argv[1], NULL, 10);
        if (parentPID <= 1 || kill(parentPID, 0) != 0) return EXIT_FAILURE;
        [NSApplication sharedApplication];
        [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        static UpdateBridge *bridge;
        bridge = [UpdateBridge new];
        bridge.parentPID = parentPID;
        NSApp.delegate = bridge;
        bridge.channels = [NSSet set];
        bridge.input = [NSMutableString string];
        NSFileHandle.fileHandleWithStandardInput.readabilityHandler = ^(NSFileHandle *handle) {
            NSData *data = handle.availableData;
            dispatch_async(dispatch_get_main_queue(), ^{
                if (!data.length) {
                    handle.readabilityHandler = nil;
                    // The launcher can close its pipe before its process exits.
                    // Keep waiting for that process before resuming installation.
                    if (!bridge.installing) [NSApp terminate:nil];
                    return;
                }
                NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                if (!text) return;
                [bridge.input appendString:text];
                NSRange newline;
                while ((newline = [bridge.input rangeOfString:@"\n"]).location != NSNotFound) {
                    NSString *line = [bridge.input substringToIndex:newline.location];
                    [bridge.input deleteCharactersInRange:NSMakeRange(0, newline.location + 1)];
                    NSDictionary *command = [NSJSONSerialization JSONObjectWithData:[line dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                    [bridge handleCommand:command];
                }
            });
        };
        [NSTimer scheduledTimerWithTimeInterval:0.2 repeats:YES block:^(NSTimer *timer) {
            if (kill(bridge.parentPID, 0) != 0 && errno == ESRCH) {
                [timer invalidate];
                if (bridge.installHandler) {
                    void (^install)(void) = bridge.installHandler;
                    bridge.installHandler = nil;
                    install();
                } else if (bridge.installing) [NSApp replyToApplicationShouldTerminate:YES];
                else [NSApp terminate:nil];
            }
        }];
        [NSApp run];
    }
    return EXIT_SUCCESS;
}
