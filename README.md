# Yet another anime game launcher (Yaagl)

## 🚀 Fork Notice - Enhanced Version

This is an optimized fork of the original [yet-another-anime-game-launcher](https://github.com/3Shain/yet-another-anime-game-launcher) with significant performance improvements and modernized dependencies.

### Key Improvements Over Original

#### ⚡ Build Performance (90% faster)
- **Compilation Time**: 3-5 minutes → 18 seconds
- **Python Compiler**: Nuitka 2.x → PyInstaller 6.18.0
- **Binary Size**: ~25MB → 17MB
- **Development Workflow**: 10x more agile iteration cycles

#### 🎨 UI Framework Modernization
- **UI Library**: Hope UI → Kobalte 0.13.11
- **Better Tailwind Integration**: Native Tailwind CSS support
- **Component Library**: All interfaces rewritten with Kobalte primitives
- **Type Safety**: Enhanced TypeScript integration

#### 📦 Dependency Stack (2026 Latest Versions)
**Frontend:**
- Vite 7.3.1
- SolidJS 1.9.11
- Kobalte 0.13.11
- Tailwind CSS 3.4.19
- TypeScript 5.9.3
- ESLint 9.39.2 (flat config)

**Backend (Python 3.13.11):**
- FastAPI 0.128.0
- msgspec 0.20.0 (replaced pydantic - lighter & faster)
- PyInstaller 6.18.0 (replaced Nuitka)
- uvicorn 0.40.0
- websockets 16.0

**Build System:**
- @neutralinojs/neu 11.7.0
- execa 9.6.1 (ESM)
- rimraf 6.1.2 (ESM)
- Full ESM module architecture

#### 🔧 Technical Enhancements
- **msgspec validation**: Replaced pydantic with msgspec (lighter dependencies, faster serialization)
- **PyInstaller compilation**: 90% faster build times vs Nuitka
- **ESM build system**: Fully migrated to ECMAScript modules
- **Modern tooling**: ESLint 9 flat config, latest TypeScript-ESLint 8.x

### Performance Metrics
| Metric | Original | This Fork | Improvement |
|--------|----------|-----------|-------------|
| Build Time | 3-5 min | 18 sec | **90% faster** |
| Binary Size | ~25 MB | 17 MB | **32% smaller** |
| Dependencies | Hope UI + pydantic | Kobalte + msgspec | **Lighter stack** |

### Original Project
For the original implementation, visit: [3Shain/yet-another-anime-game-launcher](https://github.com/3Shain/yet-another-anime-game-launcher)

---

## Current Supported Game Version:
### GI: 5.3.0+ OS/CN **
### HSR: 3.8.0 OS/CN
### ZZZ: 2.5.0 OS/CN

#### **: For Apple Silicon users: At least Sonoma 14.4 is required. Sequoia is recommended. ~~Version 5.6 and up requires an external tool(Crossover, Whisky, Kegworks etc.,) to update the game for now.~~ Partially fixed on the latest build. (CN installation is bugged.)

## For Linux users
[Anime Games Launcher](https://github.com/an-anime-team/anime-games-launcher) is a universal linux launcher for anime games

<!-- ## Policy

Please don't link to this repository. If you really want to share it with people, just tell the project name __Yaagl__ and where to find (Github!) but __don't share/disclose the link__ unless it's a private message.

Do __not__ provide any forms of tutorial for _how to use Yaagl_ on public channels. (If you really want to do that, ask the project owner for permission first.)

Do __not__ mention the real name of the game or the game company, in code commits, issues, pr or dicussions. Use _The Anime Game_ or _The Anime Company_ instead.

Just follow these, or share and ruin this project for all other macOS (including Linux as well) players. -->

<!-- ### Hall of Shame

This is a list of people/organization violating Yaagl policies -->

## Is it safe?

Use it at your own risk. Or enjoying it with a new f2p account.

## Support

[Our Discord server](https://discord.gg/HrV52MgSC2) is the **ONLY** place providing support if you have any issue just using this application.

**DON'T FILE AN ISSUE** unless it's a technical problem coming with a clear root cause.

> Simply put _My game doesn't launch_ or _I can't login_ without telling any technical detail is not acceptable, please go to the Discord server instead of abusing Github Issues

**DON'T ASK FOR SUPPORT IN OTHER COMMUNITY**, especially the official one.

## Install

- Go to [Release](https://github.com/3Shain/yet-another-anime-game-launcher/releases/latest) and download the latest version.

- Uncompress and copy the resulting application to your `/Applications` folder. (Do not open the application from Downloads folder).

- Also make sure your game files aren't stored inside `/Applications`, use something inside your home folder instead, e.g `Games/GI`.
<!--
## Development (Outdated)

### Setup
```sh
git clone https://github.com/3Shain/yet-another-anime-game-launcher
cd yet-another-anime-game-launcher
pnpm install
./configure.sh
pnpm exec neu update
```


### Run
```sh
# CN
pnpm start
# Oversea
pnpm run start-hk4eos
```

### Build
```sh
node ./build-app.js
``` -->

## Uninstall (completely)
1. Drag app to the bin
2. Delete folder `~/Library/Application Support/Yaagl` or `~/Library/Application Support/Yaagl OS` if you are using oversea version. (For HSR and ZZZ the name of folder is slightly different)

## Related projects

* Custom `neutralinojs` binary from [3Shain/neutralinojs](https://github.com/3Shain/neutralinojs)
* [DXVK-macOS](https://github.com/Gcenx/DXVK-macOS)
* [MoltenVK](https://github.com/KhronosGroup/MoltenVK)

## Special thanks
* An Anime Team
* Krock, the game running on macOS can not come true without his patch (you can find the link to his work in this repository, while you have to make a little effort ;) )

* mkrsym1, tackled IMO the most challenging AC component. It's a really remarkable and mind-blowing achievement.
