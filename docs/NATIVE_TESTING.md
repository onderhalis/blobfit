# Testing BLOB FIT on iPhone

The **web preview** (https://onderhalis.github.io/blobfit/) is the exported web build. It is useful for checking content and flows, but it is **not** the native app: on iOS the app uses the system tab bar, navigation bars, sheets, alerts, action sheets, segmented control and haptics, and none of these exist in the web build.

None of the native iOS paths below have been run by the engineering agent. Its build container has no macOS, no Xcode and no device. They are type-checked and bundle for iOS (`npx expo export --platform ios`), but only a run on a simulator or an iPhone verifies them.

## 1. Expo Go on your iPhone (free, about 5 minutes)

On a Mac or PC with Node 22:

```bash
git clone https://github.com/onderhalis/blobfit.git
cd blobfit
git checkout claude/zealous-cannon-9cvkob
npm ci
npx expo start            # the phone must be on the same Wi-Fi network
# or: npx expo start --tunnel   (when the phone is on another network)
```

1. Install **Expo Go** from the App Store. It must support Expo SDK 58.
2. Scan the QR code in the terminal with the iPhone Camera.

No Expo account or Apple account is needed.

## 2. iOS Simulator (Mac with Xcode)

```bash
npx expo start            # then press "i" to open the iOS Simulator
# or build the native project locally:
npx expo run:ios
```

## 3. Installable builds with EAS (needs a free Expo account)

`eas.json` defines three profiles:

| Profile | What you get | Needs |
|---|---|---|
| `simulator` | An `.app` for the iOS Simulator | A free Expo account |
| `preview` | An internal-distribution build for registered iPhones | An Expo account and an Apple Developer Program membership ($99/year) |
| `production` | An App Store / TestFlight build | Both accounts, plus App Store Connect setup |

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile simulator      # then drag the downloaded .app onto the Simulator
npx eas-cli build --platform ios --profile production     # TestFlight
npx eas-cli submit --platform ios --profile production
```

The bundle identifier is `com.onderhalis.blobfit` (`app.json`). Change it before the first App Store build if you want a different one. No credentials, certificates or provisioning profiles are stored in this repository. EAS asks for them interactively, and they belong to the founder's accounts.

## What to check on the device

| Area | Expected on iOS |
|---|---|
| Tabs | System tab bar (Liquid Glass on iOS 26) with SF Symbols; tapping the current tab scrolls to the top |
| Pushed screens (exercise, library, settings, safety, past sessions) | Native navigation bar with a back chevron; swiping from the left edge goes back |
| Workout | Opens as a sheet. Swiping down minimises it; the workout stays saved and Home shows "Resume workout" |
| Confirmations (discard workout, finish early, erase data) | System alert; the destructive button is red |
| Swap exercise | System action sheet |
| Weight units (More) | System segmented control |
| Haptics | A light tap on each completed set; a success haptic when finishing |
| Safe areas | Nothing under the status bar, Dynamic Island, tab bar or home indicator |
| VoiceOver | Headings are announced as headings; the muscle map reads its muscle list; every icon button has a label |
| Dynamic Type (Settings → Accessibility → Larger Text) | Text grows; headlines shrink to fit instead of breaking mid-word; quick links switch to 2×2 |

Please report anything that looks wrong in issue #1 or #4 with a screenshot.
