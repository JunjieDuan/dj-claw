# 鹈鹕骑车

一个用 Three.js 做的小品：一只鹈鹕骑着自行车，沿着循环的海边公路一直向前。长扁嘴、喉囊、S 形脖子和蹼足都在，车轮、脚踏和腿同步转动，脖子会跟着踏频轻轻点。

手机不经过应用商店安装。安卓用调试 APK，iPhone 用 SideStore 或 AltStore 安装未签名 IPA。步骤在 [INSTALL.md](INSTALL.md)。

## 环境

网页调试需要 Node.js 18 及以上。打安卓包还需要 JDK 21，以及 Android SDK：`platforms;android-36` 和 `build-tools;36.0.0`。把 SDK 目录设为 `ANDROID_HOME`（或 `ANDROID_SDK_ROOT`）。未签名 IPA 在 macOS 的 Xcode 里编译；没有 Mac 时由 GitHub 的 macOS 运行器构建。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端里给出的本地地址（默认 `http://127.0.0.1:43123`）。

## 构建

```bash
npm run build
npm run preview
```

`npm run build` 会先做类型检查，再把页面打包到 `dist/`。

## 安卓应用

用 Capacitor 包成安卓应用，包名 `com.junjieduan.pelicanrides`，显示名「鹈鹕骑车」。活动锁定为横屏（可随设备左右翻转）。单指在画面上拖动可以旋转视角，双指缩放；底部的暂停按钮和速度滑杆有更大的点按区域，横屏时靠右，避免挡住鹈鹕。

```bash
npm install
npm run android:debug
```

`android:debug` 会先做网页构建和 `cap sync`，再执行 `./gradlew assembleDebug`。调试 APK 在：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

侧载安装：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

只同步网页资源、不编译时：

```bash
npm run cap:sync
```

推送代码时，Actions 会构建同一份 debug APK。手机安装步骤见 [INSTALL.md](INSTALL.md)。

## iOS 应用

同一个 Capacitor 工程也包含 iOS 端，包名 `com.junjieduan.pelicanrides`，主屏幕名称「鹈鹕骑车」。只允许横屏（可左右翻转）。WebView 关闭了原生滚动和捏合缩放，单指拖拽和双指缩放交给页面里的相机，暂停按钮和速度滑杆与安卓共用同一套更大的点按区域。

Release 配置关闭代码签名（`CODE_SIGNING_ALLOWED=NO`）。打出来的 `pelican-rides.ipa` 没有开发者证书，不是 App Store，也不是 TestFlight。装到 iPhone 时，用 SideStore、AltStore，或在 Mac 上用 Xcode 的 Debug 配置和你自己的免费 Apple ID 重签。免费 Apple ID 的签名大约 7 天后过期，需要刷新。

有 Mac 和 Xcode、只想自己打未签名包时：

```bash
npm install
npm run ios:unsigned
```

产物在仓库根目录的 `pelican-rides.ipa`。没有 Mac 时，用下面的 GitHub Release。

## 装到 iPhone

仓库不存放 Apple 证书。下载 Release 里的 `pelican-rides.ipa` 后，任选一条：

**SideStore 或 AltStore（不需要自己编译）**

1. 在电脑上按官方说明装好 [SideStore](https://docs.sidestore.io/) 或 [AltStore](https://altstore.io/)，并用你自己的免费 Apple ID 登录。不要把 Apple ID 交给来路不明的签名网站。
2. 在手机上打开 SideStore 或 AltStore，点加号，选中 `pelican-rides.ipa`。
3. 若提示不受信任，到「设置 → 通用 → VPN 与设备管理」里信任这个 Apple ID。
4. 主屏幕上的名字是「鹈鹕骑车」，横屏打开。大约每 7 天在同一个工具里刷新一次，否则会打不开。

**本地 Xcode（用数据线装到这台 iPhone）**

1. 用数据线连接 iPhone，在手机上点信任这台电脑。
2. 用 Xcode 打开 `ios/App/App.xcodeproj`。
3. 选中 App 目标的 Signing & Capabilities，勾选 Automatically manage signing，Team 选你登录的 Apple ID。
4. 运行目标选这台 iPhone，scheme 保持 Debug（Run 的默认配置），点 Run。Debug 会走自动签名。Release 固定为不签名，只给 GitHub 打未签名 IPA，不要用 Release 直接装到手机。
5. 第一次打开若被拦截，同样到「设置 → 通用 → VPN 与设备管理」里信任该 Apple ID。

更细的刷新限制和安卓安装步骤在 [INSTALL.md](INSTALL.md)。

## GitHub 上的安装包

工作流 `.github/workflows/pelican-rides.yml` 不读取 Apple 证书：

- 每次推送：Ubuntu 构建 `pelican-rides-debug.apk`，macOS 用 `CODE_SIGNING_ALLOWED=NO` 构建 `pelican-rides.ipa`，并作为 Actions artifact 上传。
- 推送到 `main` 或 `cursor/pelican-bike-3d-906c`：两个包都成功后，追加到 Release `v1.0.0`（已有的安卓 APK 会保留并更新；模拟器 zip 若还在该 Release 上也会留下）。如果 `v1.0.0` 不能再追加文件，就新建 `v1.0.1`，并带上 `v1.0.0` 里已有的文件。
- 标签 `pelican-rides-v*`：另外创建同名 Release。

```bash
git tag pelican-rides-v0.1.0
git push origin pelican-rides-v0.1.0
```

## 操作

- 单指拖拽，或鼠标拖拽：旋转相机
- 双指或滚轮：缩放
- 速度滑杆：改变骑行速度，车轮、脚踏和腿保持同步
- 暂停 / 继续，或按空格键

## 实现简记

场景用 Vite + TypeScript + Three.js 搭成，再由 Capacitor 放进安卓 WebView 和 iOS WKWebView。自行车和鹈鹕都由基础几何体拼出来。翅膀和腿用双骨 IK，分别够到握把和脚踏，所以踏频变了，蹼足还是踩在踏板上。海边的路、沙滩、海面、栈桥和海鸥分成几层往后滚动，走出画面后接到队列末尾，骑行可以一直循环。
