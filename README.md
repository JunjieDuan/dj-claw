# 鹈鹕骑车

一个用 Three.js 做的小品：一只鹈鹕骑着自行车，沿着循环的海边公路一直向前。长扁嘴、喉囊、S 形脖子和蹼足都在，车轮、脚踏和腿同步转动，脖子会跟着踏频轻轻点。

## 环境

网页调试需要 Node.js 18 及以上。打安卓包还需要 JDK 21，以及 Android SDK：`platforms;android-36` 和 `build-tools;36.0.0`。把 SDK 目录设为 `ANDROID_HOME`（或 `ANDROID_SDK_ROOT`）。

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

推送到 GitHub 时，Actions 工作流 `.github/workflows/android-debug.yml` 会构建同一份 debug APK，并上传为名为 `pelican-rides-debug` 的 artifact。

## 操作

- 单指拖拽，或鼠标拖拽：旋转相机
- 双指或滚轮：缩放
- 速度滑杆：改变骑行速度，车轮、脚踏和腿保持同步
- 暂停 / 继续，或按空格键

## 实现简记

场景用 Vite + TypeScript + Three.js 搭成，再由 Capacitor 放进安卓 WebView。自行车和鹈鹕都由基础几何体拼出来。翅膀和腿用双骨 IK，分别够到握把和脚踏，所以踏频变了，蹼足还是踩在踏板上。海边的路、沙滩、海面、栈桥和海鸥分成几层往后滚动，走出画面后接到队列末尾，骑行可以一直循环。
