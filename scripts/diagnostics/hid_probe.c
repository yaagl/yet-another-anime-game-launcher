#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/hid/IOHIDManager.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static unsigned packets, changes;
static unsigned char previous[1024];
static CFIndex previous_length;
static unsigned char report_buffer[2048];

static void report(void *ctx, IOReturn result, void *sender, IOHIDReportType type,
                   uint32_t report_id, uint8_t *bytes, CFIndex length) {
    (void)ctx; (void)sender; (void)type;
    if (result != kIOReturnSuccess || length < 1) return;
    ++packets;
    CFIndex n = length < (CFIndex)sizeof(previous) ? length : (CFIndex)sizeof(previous);
    if (n != previous_length || memcmp(previous, bytes, n)) {
        ++changes;
        memcpy(previous, bytes, n);
        previous_length = n;
        printf("time=%.3f report id=%u length=%ld bytes=",
               CFAbsoluteTimeGetCurrent() + 978307200.0, report_id, (long)length);
        for (CFIndex i = 0; i < length; ++i) printf("%02x ", bytes[i]);
        putchar('\n');
        fflush(stdout);
    }
}

int main(void) {
    IOHIDManagerRef manager = IOHIDManagerCreate(kCFAllocatorDefault, 0);
    int vendor = 0x054c, product = 0x09cc;
    CFNumberRef v = CFNumberCreate(NULL, kCFNumberIntType, &vendor);
    CFNumberRef p = CFNumberCreate(NULL, kCFNumberIntType, &product);
    const void *keys[] = {CFSTR(kIOHIDVendorIDKey), CFSTR(kIOHIDProductIDKey)};
    const void *values[] = {v, p};
    CFDictionaryRef match = CFDictionaryCreate(NULL, keys, values, 2,
        &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    IOHIDManagerSetDeviceMatching(manager, match);
    IOReturn result = IOHIDManagerOpen(manager, 0);
    printf("manager_open=0x%08x\n", result);
    CFSetRef devices = IOHIDManagerCopyDevices(manager);
    if (!devices || !CFSetGetCount(devices)) {
        puts("No matching DualShock 4 connected.");
        return 2;
    }
    CFIndex count = CFSetGetCount(devices);
    if (count != 1) { puts("Expected exactly one DS4 v2."); return 6; }
    IOHIDDeviceRef *found = calloc((size_t)count, sizeof(*found));
    if (!found) return 5;
    CFSetGetValues(devices, (const void **)found);
    IOHIDDeviceRef device = found[0];
    free(found);
    result = IOHIDDeviceOpen(device, 0);
    printf("device_open=0x%08x\n", result);
    if (result != kIOReturnSuccess) return 3;
    IOHIDDeviceRegisterInputReportCallback(device, report_buffer, sizeof(report_buffer), report, NULL);
    IOHIDDeviceScheduleWithRunLoop(device, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);
    fflush(stdout);
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 60, false);
    printf("packets=%u changed_packets=%u\n", packets, changes);
    IOHIDDeviceUnscheduleFromRunLoop(device, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);
    IOHIDDeviceClose(device, 0);
    CFRelease(devices);
    IOHIDManagerClose(manager, 0);
    CFRelease(manager); CFRelease(match); CFRelease(v); CFRelease(p);
    return packets ? 0 : 4;
}
