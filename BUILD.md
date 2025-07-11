# Building Standalone Executables

This guide explains how to build cross-platform standalone executables for the Homelab Proxy Helper.

## Prerequisites

- Node.js 16 or higher
- npm (comes with Node.js)

## Building Executables

The project uses [pkg](https://github.com/vercel/pkg) to create standalone executables that don't require Node.js to be installed on the target system.

### Build All Platforms

```bash
npm run build
```

This creates executables for:
- Windows (x64): `dist/homelab-proxy-win.exe`
- Linux (x64): `dist/homelab-proxy-linux`
- macOS (x64): `dist/homelab-proxy-macos`

### Build Individual Platforms

```bash
# Windows only
npm run build:win

# Linux only
npm run build:linux

# macOS only
npm run build:macos
```

### Build All Platforms Sequentially

```bash
npm run build:all
```

## Executable Sizes

The executables are approximately 50-60 MB each, as they include:
- Node.js runtime
- All npm dependencies
- Application code

## Running the Executables

### Windows
```bash
# Run from command prompt or PowerShell
.\dist\homelab-proxy-win.exe --help
.\dist\homelab-proxy-win.exe
```

### Linux
```bash
# Make executable (if needed)
chmod +x dist/homelab-proxy-linux

# Run
./dist/homelab-proxy-linux --help
./dist/homelab-proxy-linux
```

### macOS
```bash
# Make executable (if needed)
chmod +x dist/homelab-proxy-macos

# Run
./dist/homelab-proxy-macos --help
./dist/homelab-proxy-macos
```

## Features

✅ **Cross-platform**: Works on Windows, Linux, and macOS
✅ **Standalone**: No Node.js installation required
✅ **Full functionality**: All CLI features work identically
✅ **Interactive menu**: Same user experience as the Node.js version
✅ **Configuration**: Uses the same config files and locations

## Distribution

The executables can be distributed without any additional dependencies. Users can:

1. Download the appropriate executable for their platform
2. Run it directly from the command line
3. Use all features without installing Node.js or npm

## Troubleshooting

### Permission Errors (Linux/macOS)
If you get permission errors, make the executable file executable:
```bash
chmod +x dist/homelab-proxy-linux
# or
chmod +x dist/homelab-proxy-macos
```

### Windows Security Warning
Windows may show a security warning for unsigned executables. This is normal for applications built with pkg. Users can:
1. Click "More info" when the warning appears
2. Click "Run anyway" to proceed

### Antivirus Software
Some antivirus software may flag the executables as suspicious due to the way pkg packages Node.js applications. This is a false positive. The executables are safe to use.

## Technical Details

- **Packaging tool**: pkg v5.8.1
- **Node.js runtime**: v18.5.0
- **Target architectures**: x64 (64-bit)
- **Supported platforms**: Windows, Linux, macOS

## Build Configuration

The build configuration is defined in `package.json`:

```json
{
  "pkg": {
    "scripts": ["src/**/*.js"],
    "assets": [
      "package.json",
      "node_modules/axios/dist/**/*"
    ],
    "targets": [
      "node18-win-x64",
      "node18-linux-x64",
      "node18-macos-x64"
    ],
    "outputPath": "dist"
  }
}
```

This configuration:
- Includes all JavaScript files from the `src` directory
- Bundles necessary assets (package.json and axios dependencies)
- Targets Node.js 18 for all platforms
- Outputs to the `dist` directory
