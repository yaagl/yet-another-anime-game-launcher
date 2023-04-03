# Yet another anime game launcher (Yaagl)

You can now play _An Anime Game_ on macOS!

 <img src="docs/screenshot35.png">

## Current Supported Game Version: 3.5.0

## Policy

Please don't link to this repository. If you really want to share it with people, just tell the project name __Yaagl__ and where to find (Github!) but __don't share an one-click link__ unless it's a private message.

Do __not__ provide any forms of tutorial for _how to use Yaagl_ on public channels.

Do __not__ mention the real name of the game or the game company, in code commits, issues, pr or dicussions. Use _The Anime Game_ or _The Anime Company_ instead.

Just follow these, or share and ruin this project for all other macOS (including Linux as well) players.

### Hall of Shame

This is a list of people/organization violating Yaagl policies

* [bilibili: 别叫我萝卜仔](https://space.bilibili.com/1451107821)

## Is it safe?

Use it at your own risk. Or enjoying it with a new f2p account.

## Download

Go to [Release](https://github.com/3Shain/yet-another-anime-game-launcher/releases)

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
pnpm start
```
> Note by default it launches CN server. If you want to debug on OS server, set the enviroment variable YAAGL_OVERSEA=1. The same to build.

### Build
```sh
node ./build-app.js
```

## Uninstall (completely)
1. Drag app to the bin
2. Delete folder `~/Library/Application Support/Yaagl` or `~/Library/Application Support/Yaagl OS` if you are using oversea version

## Roadmap

* Localization
* Robust launching process
* More config flexibility

TBD

## Special thanks
* An anime game launcher (you can find it on GitHub as I can't link to it) where the idea of this project comes from and provide so many details on launching process. (By the way, Yaagl is __not__ a fork of this project)

* Krock, the game running on macOS can not come true without his patch (you can find the link to his work in this repository, while you have to make a little effort ;) )