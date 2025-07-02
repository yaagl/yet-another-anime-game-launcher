# Yet another anime game launcher (Yaagl)

## Current Supported Game Version:
### GI: 5.3.0+ OS/CN **
### HSR: 3.4.0 OS/CN
### ZZZ: 2.0.0 OS/CN

#### **: For Apple Silicon users: Sonoma 14.4 is required. Version 5.6 and up requires an external tool(Crossover, Whisky, Kegworks etc.,) to update the game for now.

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
