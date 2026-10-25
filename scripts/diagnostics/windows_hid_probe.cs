// Reads the native DS4 descriptor and optionally parses saved reports in memory; never injects input.
using System;
using System.ComponentModel;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

class WindowsHidProbe
{
    [StructLayout(LayoutKind.Sequential)] struct RawDevice { public IntPtr handle; public uint type; }
    [StructLayout(LayoutKind.Sequential)] struct HidData { public ushort index, reserved; public uint value; }
    [DllImport("user32.dll", SetLastError=true)] static extern uint GetRawInputDeviceList([Out] RawDevice[] devices, ref uint count, uint size);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern uint GetRawInputDeviceInfo(IntPtr device, uint command, StringBuilder data, ref uint size);
    [DllImport("user32.dll", EntryPoint="GetRawInputDeviceInfoW", SetLastError=true)] static extern uint GetRawInputDeviceInfoBytes(IntPtr device, uint command, [Out] byte[] data, ref uint size);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFile(string path, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
    [DllImport("hid.dll", SetLastError=true)] static extern bool HidD_GetPreparsedData(SafeFileHandle device, out IntPtr data);
    [DllImport("hid.dll")] static extern bool HidD_FreePreparsedData(IntPtr data);
    [DllImport("hid.dll")] static extern int HidP_GetCaps(IntPtr data, [Out] byte[] caps);
    [DllImport("hid.dll")] static extern uint HidP_MaxDataListLength(int type, IntPtr data);
    [DllImport("hid.dll")] static extern int HidP_GetData(int type, [Out] HidData[] values, ref uint count, IntPtr data, byte[] report, uint length);
    [DllImport("hid.dll")] static extern int HidP_GetUsageValue(int type, ushort page, ushort collection, ushort usage, out uint value, IntPtr data, byte[] report, uint length);

    static void Check(bool ok, string step) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error(), step); }
    static void Assert(bool ok, string step) { if (!ok) throw new Exception(step); }
    static uint Fingerprint(byte[] bytes)
    {
        uint hash = 2166136261;
        foreach (byte value in bytes) hash = unchecked((hash ^ value) * 16777619);
        return hash;
    }
    static byte[] Normalize(byte[] raw, int offset, int length)
    {
        Assert(length >= 78 && offset >= 0 && offset + 78 <= raw.Length && raw[offset] == 0x11, "Expected DS4 Bluetooth report 0x11, 78 bytes");
        var result = new byte[length];
        Array.Copy(raw, offset + 2, result, 0, 10);
        result[0] = 1;
        return result;
    }
    static void Replay(IntPtr preparsed, int length, string path)
    {
        Assert(length == 547, "Replay requires the DS4 Bluetooth descriptor with input length 547");
        var info = new FileInfo(path);
        Assert(info.Length > 0 && info.Length <= 1024 * 1024 && info.Length % 78 == 0, "Expected bounded file of complete 78-byte reports");
        byte[] recording = File.ReadAllBytes(path);
        uint capacity = HidP_MaxDataListLength(0, preparsed);
        Assert(capacity >= 21 && capacity <= 256, "Unexpected data index capacity");
        var values = new HidData[capacity];
        ushort[] usages = {0x30, 0x31, 0x32, 0x35, 0x33, 0x34, 0x39};
        int rawEmpty = 0, rawErrors = 0, fixedMatches = 0;
        for (int offset = 0; offset < recording.Length; offset += 78) {
            var raw = new byte[length];
            Array.Copy(recording, offset, raw, 0, 78);
            byte[] normal = Normalize(recording, offset, length);
            uint count = capacity;
            int status = HidP_GetData(0, values, ref count, preparsed, raw, (uint)length);
            if (status != 0x110000) rawErrors++;
            else if (count == 0) rawEmpty++;
            count = capacity;
            Assert(HidP_GetData(0, values, ref count, preparsed, normal, (uint)length) == 0x110000, "Normalized HidP_GetData failed");
            int buttons = (raw[7] >> 4) | (raw[8] << 4) | ((raw[9] & 3) << 12);
            int pressed = 0;
            for (int bits = buttons; bits != 0; bits >>= 1) pressed += bits & 1;
            Assert(count == 7 + pressed, "Normalized data count differs from recorded controls");
            int[] expected = {raw[3], raw[4], raw[5], raw[6], raw[10], raw[11], raw[7] & 15};
            for (int i = 0; i < usages.Length; i++) {
                uint value;
                Assert(HidP_GetUsageValue(0, 1, 0, usages[i], out value, preparsed, normal, (uint)length) == 0x110000 && value == expected[i], "Normalized axis/hat differs from recorded control");
            }
            for (int i = 0; i < count; i++)
                if (values[i].index >= 5 && values[i].index <= 18)
                    Assert((buttons & (1 << (values[i].index - 5))) != 0 && (values[i].value & 255) == 1, "Normalized button differs from recorded control");
            fixedMatches++;
        }
        Console.WriteLine("offline_reports={0} raw_getdata_empty={1} raw_getdata_errors={2} normalized_controls_match={3}",
            recording.Length / 78, rawEmpty, rawErrors, fixedMatches);
        Assert(rawErrors == 0 && rawEmpty == recording.Length / 78,
            "Runtime does not reproduce the recorded raw/normalized parser difference");
    }
    static int Main(string[] args)
    {
        try {
            Assert(IntPtr.Size == 8 && Marshal.SizeOf(typeof(RawDevice)) == 16 && Marshal.SizeOf(typeof(HidData)) == 8, "Expected x64 HID ABI");
            if (args.Length == 1 && args[0] == "--self-test") {
                byte[] raw = new byte[78]; raw[0] = 0x11; raw[3] = 27; raw[7] = 0x28; raw[10] = 255;
                byte[] normal = Normalize(raw, 0, 547);
                Assert(normal[0] == 1 && normal[1] == 27 && normal[5] == 0x28 && normal[8] == 255 && normal[10] == 0, "Normalization check failed");
                bool rejected = false;
                try { Normalize(new byte[78], 0, 547); } catch (Exception) { rejected = true; }
                Assert(rejected, "Invalid report was accepted");
                Assert(Fingerprint(Encoding.ASCII.GetBytes("hello")) == 0x4f9f2cab, "Descriptor fingerprint check failed");
                Console.WriteLine("x64 ABI and normalization checks passed"); return 0;
            }
            bool replay = args.Length == 2 && args[0] == "--replay";
            if (args.Length > 0 && !replay) throw new Exception("Use no arguments to inspect, --self-test, or --replay FILE of previously recorded reports");
            uint count=0, size=(uint)Marshal.SizeOf(typeof(RawDevice));
            Check(GetRawInputDeviceList(null,ref count,size)!=uint.MaxValue,"List device count");
            var devices=new RawDevice[count];
            uint returned=GetRawInputDeviceList(devices,ref count,size);
            Check(returned!=uint.MaxValue,"List devices");
            var paths=new List<string>();
            IntPtr nativeDevice = IntPtr.Zero;
            for (int i=0;i<returned;i++) {
                if (devices[i].type!=2) continue;
                uint chars=0;
                Check(GetRawInputDeviceInfo(devices[i].handle,0x20000007,null,ref chars)!=uint.MaxValue,"Device name size");
                var path=new StringBuilder((int)chars+1);
                Check(GetRawInputDeviceInfo(devices[i].handle,0x20000007,path,ref chars)!=uint.MaxValue,"Device name");
                string name=path.ToString().ToLowerInvariant();
                if (name.Contains("vid_054c&pid_09cc") && !name.Contains("&ig_") && !name.Contains("&xi_")) {
                    paths.Add(path.ToString());
                    nativeDevice = devices[i].handle;
                }
            }
            Console.WriteLine("native_ds4_count="+paths.Count);
            if (paths.Count!=1) return 2;
            uint descriptorSize = 0;
            Check(GetRawInputDeviceInfoBytes(nativeDevice, 0x20000005, null, ref descriptorSize) != uint.MaxValue, "Descriptor size");
            Assert(descriptorSize >= 44 && descriptorSize <= 65536, "Unexpected descriptor size");
            var descriptor = new byte[descriptorSize];
            Check(GetRawInputDeviceInfoBytes(nativeDevice, 0x20000005, descriptor, ref descriptorSize) == descriptor.Length, "Read descriptor");
            Console.WriteLine("native_ds4_preparsed_fnv1a={0:x8} bytes={1}", Fingerprint(descriptor), descriptor.Length);
            using (var handle=CreateFile(paths[0],0x80000000,3,IntPtr.Zero,3,0x40000000,IntPtr.Zero)) {
                Check(!handle.IsInvalid,"Open native DS4 with shared read access");
                IntPtr preparsed;
                Check(HidD_GetPreparsedData(handle,out preparsed),"Get preparsed descriptor");
                byte[] caps=new byte[64];
                try {
                    Assert(HidP_GetCaps(preparsed,caps)==0x110000, "HidP_GetCaps failed");
                    int length=BitConverter.ToUInt16(caps,4);
                    Console.WriteLine("usage={0:x4}:{1:x4} input_length={2} output_length={3} feature_length={4}",BitConverter.ToUInt16(caps,2),BitConverter.ToUInt16(caps,0),length,BitConverter.ToUInt16(caps,6),BitConverter.ToUInt16(caps,8));
                    Assert(length >= 10 && length <= 4096, "Unexpected report buffer length");
                    if (replay) Replay(preparsed, length, args[1]);
                } finally { HidD_FreePreparsedData(preparsed); }
            }
            return 0;
        } catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
    }
}
