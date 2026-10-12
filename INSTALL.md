# 安装鹈鹕骑车

显示名是「鹈鹕骑车」，包名 / Bundle ID 是 `com.junjieduan.pelicanrides`，打开后是横屏。应用内版本号是 1.0。

这些包**不是 App Store 应用，也不是 TestFlight**。安卓是调试 APK。iOS 是未签名 IPA，要靠 SideStore 或 AltStore 用你自己的免费 Apple ID 重签。仓库里没有 Apple 证书、描述文件或密钥，默认构建也不需要这些密钥。

请下载标签 **pelican-rides-v0.1.0** 里的两个文件。更早的 Release `v1.0.0` 只有安卓包。文件名里带 `simulator` 的压缩包是模拟器产物，不能装进 iPhone。

## 下载

打开 GitHub Release：

https://github.com/JunjieDuan/dj-claw/releases

| 文件 | 装到哪里 |
| --- | --- |
| `pelican-rides-debug.apk` | 安卓手机 |
| `pelican-rides.ipa` | iPhone / iPad，经由 SideStore 或 AltStore |

发布由标签触发。把 `pelican-rides-v*` 推到 GitHub（例如 `pelican-rides-v0.1.0`）后，Actions 会在 Ubuntu 上打 APK、在 macOS 上打未签名 IPA，并挂到同名 Release。普通代码推送只把包留在 Actions 的 artifact 里，不会发 Release。

## 安卓

系统需要 Android 7（API 24）或更高。APK 用调试证书签名，可以直接装，不必用应用商店。

1. 用手机浏览器或电脑把 `pelican-rides-debug.apk` 放到手机上。
2. 打开系统设置，进入应用的特殊权限，找到「安装未知应用」（有的系统写在安全或隐私里）。
3. 允许你用来打开这个文件的浏览器或文件管理器安装未知应用。只给这一次用到的应用开权限即可。
4. 点开 APK，按提示安装。装好后主屏幕上的名字是「鹈鹕骑车」。
5. 如果手机提示风险，确认文件就是上面这个 Release 里的调试包再继续。

已经开了 USB 调试时，也可以在电脑上执行：

```bash
adb install -r pelican-rides-debug.apk
```

同一套官方调试证书可以覆盖安装。换了正式签名以后，需要先卸载再装。

## iPhone：先选一个侧载工具

IPA 在 GitHub 的 macOS 运行器上编译，Release 配置写了 `CODE_SIGNING_ALLOWED=NO`，里面没有付费开发者证书。SideStore 和 AltStore 会用你的免费 Apple ID 把它重签，然后装进手机。

免费 Apple ID 的限制：

- 签名大约 **7 天**后失效。到期前要刷新，否则图标还在，但打开会提示未信任或已过期。
- 同时安装的侧载应用最多 **3 个**，SideStore 或 AltStore 自己占一个名额。
- 大约每 7 天最多注册 **10 个**不同的 App ID。刷新已经装过的应用不算新的 App ID。
- 设备需要 iOS 15 或更高，并且设置了锁屏密码。安装和刷新时要连 Wi-Fi。

不要把 Apple ID 交给来路不明的签名网站或企业证书。只用你自己设备上的 SideStore 或 AltStore。

### SideStore

官方说明：https://docs.sidestore.io/

适合装好之后尽量在手机上刷新、不想每次都开电脑的情况。第一次安装 SideStore 通常仍要一台电脑（Windows、Linux 或 Mac 都可以，不需要 Mac）。请按官方文档安装，不要用第三方镜像。

1. 按官方前提准备：iOS 15 或更高、Wi-Fi、Apple ID，以及电脑上的 [iloader](https://github.com/nab138/iloader)。
2. 从 App Store 安装 LocalDevVPN，并在安装或刷新应用时保持连接。
3. 用数据线把手机连到电脑，在 iloader 里登录 Apple ID，安装 SideStore。
4. 打开 SideStore，登录同一个 Apple ID。如果提示信任开发者，到「设置 → 通用 → VPN 与设备管理」里信任你的 Apple ID。
5. 先在「我的应用」里刷新 SideStore 自己，等它显示剩余天数。
6. 点加号，选中下载好的 `pelican-rides.ipa`，等待签名和安装。
7. 回到主屏幕，横屏打开「鹈鹕骑车」。

刷新：在过期前打开 SideStore，连上 Wi-Fi 和 LocalDevVPN，点该应用旁边的剩余天数。配对文件在系统大版本更新或抹掉设备后可能失效，那时需要再连一次电脑。

### AltStore

官方说明：https://altstore.io/

没有 Mac 时，在 Windows 上安装 AltServer 即可。按 AltStore 的说明安装 Apple 提供的 iTunes 和 iCloud（优先用 Apple 官网安装包；只装微软商店版本时，AltServer 经常找不到设备）。

1. 电脑安装 AltServer，手机用数据线连接，并在手机上点「信任」。
2. 用 AltServer 把 AltStore 装到手机，在「设置 → 通用 → VPN 与设备管理」里信任开发者。
3. 打开 AltStore，登录免费 Apple ID。
4. 打开「我的应用」，点加号，选择 `pelican-rides.ipa`。
5. 安装完成后从主屏幕打开。

刷新：大约每 7 天内，让手机和运行 AltServer 的电脑处在同一个 Wi-Fi，在 AltStore 里刷新。电脑不在线时，AltStore 不能替你续期。

## 付费开发者账号

默认路径不使用付费 Apple Developer 账号，工作流里也没有证书密钥。如果以后你自己有付费账号，在自己的 Mac 上用 Xcode 打开 `ios/App/App.xcodeproj` 再签名即可。

不要把 `.p12`、描述文件、App Store Connect API 密钥或 Apple ID 密码提交到这个仓库。付费签名可以装到 TestFlight 或 App Store，那是另一条路，和这里的未签名 IPA 无关。
