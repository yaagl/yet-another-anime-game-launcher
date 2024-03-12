# Yet another anime game launcher (Yaagl)


|  |  |
| --- | --- |
| ![](/docs/hk4e41.png) | ![](/docs/bh66.png) |
| ![](/docs/hsr105.png) |  |


## Current Supported Game Version: 
### GI: 4.5.0 OS/CN **
### ~~HI: 6.6.0 Global~~
### ~~HSR: 1.0.5 OS/CN (For Intel Mac Only)~~

### **: For Apple Silicon users: Sonoma 14.4 is required

## Policy

Please don't link to this repository. If you really want to share it with people, just tell the project name __Yaagl__ and where to find (Github!) but __don't share/disclose the link__ unless it's a private message.

Do __not__ provide any forms of tutorial for _how to use Yaagl_ on public channels. (If you really want to do that, ask the project owner for permission first.)

Do __not__ mention the real name of the game or the game company, in code commits, issues, pr or dicussions. Use _The Anime Game_ or _The Anime Company_ instead.

Just follow these, or share and ruin this project for all other macOS (including Linux as well) players.

<!-- ### Hall of Shame

This is a list of people/organization violating Yaagl policies -->

## Is it safe?

Use it at your own risk. Or enjoying it with a new f2p account.

## Download

Go to [Release](https://github.com/3Shain/yet-another-anime-game-launcher/releases/latest)

## Development

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
```

## Uninstall (completely)
1. Drag app to the bin
2. Delete folder `~/Library/Application Support/Yaagl` or `~/Library/Application Support/Yaagl OS` if you are using oversea version

## Related projects

* Yaagl is using custom `wine (crossover)` builds from [3Shain/winecx](https://github.com/3Shain/winecx)
* Custom `neutralinojs` binary from [3Shain/neutralinojs](https://github.com/3Shain/neutralinojs)
* [DXVK-macOS](https://github.com/Gcenx/DXVK-macOS)
* [MoltenVK](https://github.com/KhronosGroup/MoltenVK) and [its binary releases](https://github.com/The-Wineskin-Project/MoltenVK/releases)

## Special thanks
* An anime game launcher (you can find it on GitHub as I can't link to it) where the idea of this project comes from and provide so many details on launching process. (By the way, Yaagl is __not__ a fork of this project)

* Krock, the game running on macOS can not come true without his patch (you can find the link to his work in this repository, while you have to make a little effort ;) )

* mkrsym1, tackled IMO the most challenging AC component. It's a really remarkable and mind-blowing achievement.