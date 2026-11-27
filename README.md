# FlagOra

FlagOra is a cross-platform flag quiz built with Expo and React Native. It presents a 10-question country challenge, loads flag and country data from a remote JSON source, and includes a browseable country directory with search.

## What the app does

- Starts a randomized 10-question quiz from a live country dataset
- Offers **Easy mode** with four multiple-choice countries
- Offers **Hard mode** where players type the country name
- Shows immediate correct/incorrect feedback and the right answer
- Tracks the current score and quiz progress
- Displays a final score with a pass-and-play-style result summary
- Lets users explore countries in alphabetical order
- Searches countries by name or country code
- Handles loading, network errors, invalid data, retries, empty search results, and missing flag images
- Uses safe-area layouts, responsive widths, and Expo file-based routing for mobile and web

## Screens

### Home

The home screen introduces the app, rotates an animated globe of example flags, links to the country directory, and lets the player choose Easy or Hard mode.

### Country quiz

Each quiz round contains 10 randomized questions. Easy mode provides four choices; Hard mode requires a typed answer. The app normalizes typed answers for case and surrounding whitespace, displays feedback after submission, and advances to the next question.

### Countries directory

The countries screen fetches the same live dataset and provides an alphabetically sorted `FlatList`. Each row shows the flag, country name, and country code. Search supports both country names and codes.

### Results

After the final question, FlagOra displays the score out of 10, a result rank, the selected mode, and options to replay or choose another level.

## Tech stack

- Expo 58
- React Native 0.88
- React 19
- Expo Router with typed routes
- Expo Image for cached flag rendering
- Expo Linear Gradient for screen and card gradients
- React Native Safe Area Context
- TypeScript
- Expo React Compiler

## Country data

Country names, country codes, and Twemoji SVG flag URLs are loaded at runtime from:

https://raw.githubusercontent.com/gedhiraj/Country/refs/heads/main/countries.json

The app validates the response before starting a quiz. It requires at least 10 entries and rejects missing fields, invalid flag URLs, and duplicate country codes.

## Project structure

```text
src/app/_layout.tsx       # Root Expo Router stack
src/app/index.tsx         # Home, quiz, feedback, and results screens
src/app/countries.tsx     # Country directory and search
 data/countries.ts         # Country types, remote data fetching, and validation
assets/                   # Icons and splash assets
app.json                  # Expo app configuration
```

> The README's `data/countries.ts` path is from the repository root; route code lives under `src/app/`.

## Getting started

### Prerequisites

- Node.js
- npm
- An Expo-compatible development environment

### Install

```bash
npm install
```

### Run locally

```bash
npx expo start
```

Use the terminal prompt to open the app in:

- Expo Go or a development build on Android
- Expo Go or a development build on iOS
- A browser for the web build

### Platform scripts

```bash
npm run android
npm run ios
npm run web
```

## Development checks

```bash
npx expo lint
npx tsc --noEmit
```

## Build and deployment

The repository includes `eas.json` and an EAS project ID in `app.json`. Build profiles can be used through Expo Application Services:

```bash
npx eas-cli@latest build --platform android
npx eas-cli@latest build --platform ios
```

Use the platform and profile that match your intended release workflow.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
