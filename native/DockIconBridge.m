#import <objc/message.h>
#import <objc/runtime.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/*
 * Squircle Dock icon for games started by YAAGL.
 *
 * YAAGL injects this dylib into the game's Wine process with DYLD_INSERT_LIBRARIES.
 * Wine later asks NSApplication to publish the icon it extracted from the game
 * executable. Intercepting that single public AppKit setter lets us clip the icon to a
 * rounded square on the macOS icon grid, without modifying Wine, its prefix, or the game.
 *
 * This file deliberately does not import or link AppKit/Foundation. Loading an AppKit-
 * linked injected dylib initializes AppKit before Wine has assigned
 * WINEPRELOADERAPPNAME, which makes the menu bar show Wine's name instead of the game's.
 * So we wait until Wine itself has loaded NSApplication and reach the few methods we need
 * through the Objective-C runtime. All AppKit object creation and drawing still happens
 * on Wine's own thread when it calls setApplicationIconImage:; the polling thread only
 * installs the hook.
 *
 * Build: xcrun clang -arch x86_64 -arch arm64 -mmacosx-version-min=11.0 -O2 \
 *          -dynamiclib -lobjc DockIconBridge.m -o DockIconBridge.dylib
 * Set YAAGL_DOCK_ICON_DEBUG=1 to log what happens to stderr (ends up in the game log).
 */

/* NSPoint, NSSize and NSRect are mirrored instead of importing AppKit. Their layouts are
 * pairs of doubles, which must match the objc_msgSend signatures below so struct
 * arguments and return values use the right ABI. */
typedef struct {
	double x;
	double y;
} AKPoint;

typedef struct {
	double width;
	double height;
} AKSize;

typedef struct {
	AKPoint origin;
	AKSize size;
} AKRect;

typedef void (*SetApplicationIconImageIMP)(id, SEL, id);
typedef id (*RoundedPathIMP)(id, SEL, AKRect, double, double);

/* A 412-point content square inside a 512-point canvas is the 80.5% macOS icon grid,
 * with a corner radius close to the system's app icon shape. The integer values mirror
 * NSCompositingOperationCopy and NSImageInterpolationHigh. */
static const double icon_canvas_dimension = 512.0;
static const double icon_content_dimension = 412.0;
static const double icon_corner_radius = 92.3;
static const long compositing_operation_copy = 1;
static const long image_interpolation_high = 3;

/* AppKit shows up very early in Wine startup. Polling every 50ms for at most ten seconds
 * keeps dyld's constructor non-blocking while still hooking before Wine publishes the
 * icon. objc_getClass only observes runtime state; it does not load AppKit. */
static const struct timespec appkit_poll_interval = { .tv_sec = 0, .tv_nsec = 50000000 };
static const int appkit_poll_limit = 200;

static SetApplicationIconImageIMP original_set_application_icon_image;
static pthread_mutex_t icon_setter_lock = PTHREAD_MUTEX_INITIALIZER;
static bool debug_enabled;

#define debug_log(...)                                                                      \
	do {                                                                                    \
		if (debug_enabled) {                                                                \
			fprintf(stderr, "yaagl-dock-icon: " __VA_ARGS__);                               \
			fputc('\n', stderr);                                                            \
		}                                                                                   \
	} while (0)

/* Typed objc_msgSend adapters: the runtime declares objc_msgSend without the concrete
 * ABI of each selector, so every call goes through a cast with the real signature. */
static id send_id(id receiver, SEL selector) {
	return ((id (*)(id, SEL))objc_msgSend)(receiver, selector);
}

static id send_id_with_size(id receiver, SEL selector, AKSize value) {
	return ((id (*)(id, SEL, AKSize))objc_msgSend)(receiver, selector, value);
}

static void send_void(id receiver, SEL selector) {
	((void (*)(id, SEL))objc_msgSend)(receiver, selector);
}

static void send_void_with_integer(id receiver, SEL selector, long value) {
	((void (*)(id, SEL, long))objc_msgSend)(receiver, selector, value);
}

static AKSize send_size(id receiver, SEL selector) {
	return ((AKSize (*)(id, SEL))objc_msgSend)(receiver, selector);
}

static void send_draw_message(
	id receiver, SEL selector, AKRect destination, AKRect source, long operation, double fraction) {
	((void (*)(id, SEL, AKRect, AKRect, long, double))objc_msgSend)(
		receiver, selector, destination, source, operation, fraction);
}

/* Draws Wine's full-bleed executable icon onto a transparent 512x512 canvas, clipped to
 * a rounded square. Any failure returns the original image, so the game always keeps a
 * Dock icon. */
static id squircle_icon(id source) {
	if (source == nil) return nil;

	Class image_class = objc_getClass("NSImage");
	Class graphics_context_class = objc_getClass("NSGraphicsContext");
	if (image_class == Nil || graphics_context_class == Nil) {
		debug_log("NSImage/NSGraphicsContext missing; icon left unchanged");
		return source;
	}

	AKSize canvas_size = { icon_canvas_dimension, icon_canvas_dimension };
	id result = send_id((id)image_class, sel_registerName("alloc"));
	result = send_id_with_size(result, sel_registerName("initWithSize:"), canvas_size);
	if (result == nil) {
		debug_log("could not create the canvas image; icon left unchanged");
		return source;
	}

	send_void(result, sel_registerName("lockFocus"));
	id context = send_id((id)graphics_context_class, sel_registerName("currentContext"));
	send_void_with_integer(
		context, sel_registerName("setImageInterpolation:"), image_interpolation_high);

	double inset = (icon_canvas_dimension - icon_content_dimension) / 2.0;
	AKRect destination = { { inset, inset }, { icon_content_dimension, icon_content_dimension } };

	/* The clip lives in the image's focus context and ends with unlockFocus. A missing
	 * NSBezierPath only costs the rounded corners. */
	Class path_class = objc_getClass("NSBezierPath");
	id path = path_class == Nil ? nil
								: ((RoundedPathIMP)objc_msgSend)(
									  (id)path_class,
									  sel_registerName("bezierPathWithRoundedRect:xRadius:yRadius:"),
									  destination,
									  icon_corner_radius,
									  icon_corner_radius);
	if (path != nil) {
		send_void(path, sel_registerName("addClip"));
	} else {
		debug_log("no NSBezierPath; icon drawn without rounded corners");
	}

	AKRect source_rect = { { 0.0, 0.0 }, send_size(source, sel_registerName("size")) };
	send_draw_message(
		source,
		sel_registerName("drawInRect:fromRect:operation:fraction:"),
		destination,
		source_rect,
		compositing_operation_copy,
		1.0);
	send_void(result, sel_registerName("unlockFocus"));
	debug_log("icon clipped");
	return result;
}

/* Replacement for NSApplication.setApplicationIconImage:. Calling the saved IMP keeps
 * AppKit's normal Dock side effects. The pool catches AppKit's autoreleased temporaries,
 * which no Wine-owned pool is guaranteed to cover on this thread; the new image is +1
 * and survives it. */
static void set_application_icon_image(id application, SEL selector, id image) {
	@autoreleasepool {
		SetApplicationIconImageIMP original;
		id resolved = squircle_icon(image);
		pthread_mutex_lock(&icon_setter_lock);
		original = original_set_application_icon_image;
		pthread_mutex_unlock(&icon_setter_lock);
		if (original != NULL) original(application, selector, resolved);
	}
}

/* Installs the hook once NSApplication exists. Holding the same mutex the replacement
 * uses while publishing it means no caller can run the hook before the original IMP is
 * stored. */
static bool install_icon_setter(void) {
	Class application_class = objc_getClass("NSApplication");
	SetApplicationIconImageIMP original;
	if (application_class == Nil) return false;

	SEL selector = sel_registerName("setApplicationIconImage:");
	Method method = class_getInstanceMethod(application_class, selector);
	if (method == NULL) return false;

	pthread_mutex_lock(&icon_setter_lock);
	original = (SetApplicationIconImageIMP)method_setImplementation(
		method, (IMP)set_application_icon_image);
	original_set_application_icon_image = original;
	pthread_mutex_unlock(&icon_setter_lock);
	return original != NULL;
}

/* Waits for AppKit and installs the hook. A timeout is harmless: the game keeps Wine's
 * unmodified icon. */
static void *wait_for_appkit(void *context) {
	(void)context;
	for (int attempt = 0; attempt < appkit_poll_limit; attempt++) {
		@autoreleasepool {
			if (install_icon_setter()) {
				debug_log("hook installed after %d polls", attempt);
				return NULL;
			}
		}
		nanosleep(&appkit_poll_interval, NULL);
	}
	debug_log("timed out waiting for AppKit in %s", getprogname());
	return NULL;
}

/* DYLD_INSERT_LIBRARIES reaches every process Wine starts. Only Wine's loader processes
 * (wine, wine64, their preloaders) show a Dock tile; wineserver never loads AppKit. */
static bool is_wine_client_process(void) {
	const char *name = getprogname();
	return name != NULL && strncmp(name, "wine", 4) == 0 && strncmp(name, "wineserver", 10) != 0;
}

/* Starts the observer thread and returns at once so dyld can continue Wine startup. */
__attribute__((constructor)) static void install_dock_icon_bridge(void) {
	if (!is_wine_client_process()) return;
	debug_enabled = getenv("YAAGL_DOCK_ICON_DEBUG") != NULL;
	debug_log("loaded in %s", getprogname());

	pthread_t thread;
	if (pthread_create(&thread, NULL, wait_for_appkit, NULL) == 0) {
		pthread_detach(thread);
	} else {
		debug_log("failed to start the observer thread");
	}
}
