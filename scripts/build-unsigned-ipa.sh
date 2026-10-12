#!/usr/bin/env bash
# 在 macOS 上打未签名的 iPhone 设备 IPA，供 AltStore / SideStore 用免费 Apple ID 重签。
# 不读取 Apple 证书、描述文件或密钥。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED="${DERIVED_DATA_PATH:-$ROOT/ios/DerivedData}"
APP="$DERIVED/Build/Products/Release-iphoneos/App.app"
OUT="${1:-$ROOT/pelican-rides.ipa}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "未签名 IPA 需要在 macOS 的 Xcode 里编译。GitHub Actions 的 macos 运行器会执行这个脚本。" >&2
  exit 1
fi

xcodebuild \
  -project "$ROOT/ios/App/App.xcodeproj" \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  -derivedDataPath "$DERIVED" \
  build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  CODE_SIGN_STYLE=Manual \
  PROVISIONING_PROFILE_SPECIFIER="" \
  VALIDATE_PRODUCT=NO

if [[ ! -d "$APP" ]]; then
  echo "未找到 $APP" >&2
  find "$DERIVED/Build/Products" -name '*.app' -maxdepth 3 >&2 || true
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/Payload"
cp -R "$APP" "$STAGE/Payload/App.app"

test -f "$STAGE/Payload/App.app/App"
file_out="$(file "$STAGE/Payload/App.app/App")"
echo "$file_out"
echo "$file_out" | grep -q 'Mach-O'
echo "$file_out" | grep -q 'arm64'

bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$STAGE/Payload/App.app/Info.plist")"
display_name="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$STAGE/Payload/App.app/Info.plist")"
echo "CFBundleIdentifier=$bundle_id"
echo "CFBundleDisplayName=$display_name"
test "$bundle_id" = "com.junjieduan.pelicanrides"
test "$display_name" = "鹈鹕骑车"

orientations="$(/usr/libexec/PlistBuddy -c 'Print :UISupportedInterfaceOrientations' "$STAGE/Payload/App.app/Info.plist")"
echo "$orientations"
echo "$orientations" | grep -q 'LandscapeLeft'
echo "$orientations" | grep -q 'LandscapeRight'
if echo "$orientations" | grep -q 'Portrait'; then
  echo "IPA 仍包含竖屏方向" >&2
  exit 1
fi

sign_info="$(codesign -dv "$STAGE/Payload/App.app" 2>&1 || true)"
echo "$sign_info"
if echo "$sign_info" | grep -E 'Authority=|TeamIdentifier=[A-Z0-9]'; then
  echo "IPA 带有开发者证书，这不是未签名侧载包" >&2
  exit 1
fi

rm -f "$OUT"
(
  cd "$STAGE"
  ditto -c -k --sequesterRsrc --keepParent Payload "$OUT"
)

unzip -Z1 "$OUT" | grep -qx 'Payload/App.app/Info.plist'
unzip -Z1 "$OUT" | grep -qx 'Payload/App.app/App'
echo "已写出未签名 IPA: $OUT"
