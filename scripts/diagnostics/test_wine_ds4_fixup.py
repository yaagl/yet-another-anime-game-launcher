"""Compile the candidate's actual policy and report transformation with sanitizers.

Run: python3 scripts/diagnostics/test_wine_ds4_fixup.py /path/to/patched/wine
This checks source behavior, not Wine integration or gameplay.
"""

from pathlib import Path
import re
import subprocess
import sys
import tempfile


def function(source, signature):
    start = source.index(signature)
    opening = source.index("{", start)
    depth = 1
    end = opening + 1
    while depth:
        depth += (source[end] == "{") - (source[end] == "}")
        end += 1
    return source[start:end]


def check(source_dir):
    source = (source_dir / "dlls/winebus.sys/main.c").read_text()
    policy = function(source, "static void hidraw_disable_report_fixups(")
    target = function(source, "static BOOL is_ds4_trace_device(")
    process = function(source, "static void process_hid_report(")
    # Exercise the real transformation before queue/device lifecycle handling.
    process = process[:process.index("    RtlEnterCriticalSection(&ext->cs);")]
    process += """
    observed_length = report->length;
    memcpy(observed, report->buffer, report->length);
    free(report);
}
"""
    initialization = re.search(
        r"keep_ds4_bluetooth_report_fixup = [^;]+;", source
    ).group()
    harness = r"""
#include <assert.h>
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
typedef int BOOL;
typedef uint8_t BYTE;
typedef uint32_t DWORD, ULONG;
typedef void IRP;
#define BUS_TYPE_BLUETOOTH 2
#define HIDRAW_FIXUP_DUALSHOCK_BT 1
#define HIDRAW_FIXUP_DUALSENSE_BT 2
#define TRACE(...) ((void)0)
#define TRACE_(channel) TRACE
#define RtlAllocateHeap(heap, flags, size) malloc(size)
struct device_desc { int is_hidraw, bus_type; unsigned vid, pid; };
struct device_extension { struct device_desc desc; unsigned report_fixups; };
typedef struct { struct device_extension *DeviceExtension; } DEVICE_OBJECT;
struct hid_report { ULONG length; BYTE buffer[1]; };
static BOOL keep_ds4_bluetooth_report_fixup;
static DWORD registry_option;
static unsigned observed_length;
static BYTE observed[128];
static DWORD check_bus_option(const wchar_t *name, DWORD fallback)
{
    assert(!wcscmp(name, L"KeepDS4BluetoothReportFixup"));
    assert(fallback == 0);
    return registry_option;
}
"""
    harness += target + "\n" + policy + "\n" + process
    harness += "\nstatic void initialize(void) { " + initialization + " }\n"
    harness += r"""
int main(void)
{
    const struct device_desc devices[] = {
        {1, 2, 0x054c, 0x09cc}, {1, 1, 0x054c, 0x09cc},
        {0, 2, 0x054c, 0x09cc}, {1, 2, 0x054c, 0x05c4},
        {1, 2, 0x054c, 0x0ce6}, {1, 2, 0x045e, 0x09cc},
        {1, 0, 0x054c, 0x09cc}
    };
    const DWORD settings[] = {0, 1, 2, UINT32_MAX};
    struct device_extension ext;
    DEVICE_OBJECT device = {&ext};
    unsigned i, j, flags, len, id, enabled, checks = 0;
    for (i = 0; i < sizeof(settings) / sizeof(settings[0]); ++i)
    {
        registry_option = settings[i];
        initialize();
        for (j = 0; j < sizeof(devices) / sizeof(devices[0]); ++j)
        for (flags = 0; flags < 8; ++flags)
        {
            ext.desc = devices[j];
            ext.report_fixups = flags;
            hidraw_disable_report_fixups(&device);
            assert(ext.report_fixups == ((flags & ~3u) |
                   ((settings[i] == 1 && j == 0) ? flags & 1u : 0)));
            checks++;
        }
    }
    ext.desc = devices[0];
    for (enabled = 0; enabled < 2; ++enabled)
    for (id = 0; id < 256; ++id)
    for (len = 0; len <= 80; ++len)
    {
        BYTE *raw = len ? malloc(len) : NULL;
        for (i = 0; i < len; ++i) raw[i] = (BYTE)(i * 17);
        if (len) raw[0] = id;
        ext.report_fixups = enabled;
        observed_length = UINT32_MAX;
        process_hid_report(&device, raw, len);
        if (!len) assert(observed_length == UINT32_MAX);
        else if (enabled && id == 0x11 && len >= 12)
        {
            assert(observed_length == 10 && observed[0] == 1);
            assert(!memcmp(observed + 1, raw + 3, 9));
        }
        else assert(observed_length == len && !memcmp(observed, raw, len));
        free(raw);
        checks++;
    }
    assert(checks == 41696);
    return 0;
}
"""
    with tempfile.TemporaryDirectory(prefix="yaagl-ds4-check-") as tmp:
        path = Path(tmp) / "fixup.c"
        path.write_text(harness)
        binary = Path(tmp) / "fixup"
        subprocess.run(
            ["clang", "-std=c11", "-Wall", "-Wextra", "-Werror",
             "-Wno-unused-variable", "-fsanitize=address,undefined",
             "-g", str(path), "-o", str(binary)],
            check=True,
        )
        subprocess.run([str(binary)], check=True)
    print("41,696 policy/report checks passed under ASan/UBSan (source only).")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: test_wine_ds4_fixup.py /path/to/patched/wine")
    check(Path(sys.argv[1]))
