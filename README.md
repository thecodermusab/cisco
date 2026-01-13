# NetAcad Solver

NetAcad Solver is a browser extension that helps you move faster in NetAcad lessons and quizzes.

## What it does

- Picks the correct answers in quizzes
- Shows answers when you hover + Ctrl
- Skips lesson videos automatically
- Adds a "Skip Lecture" button
- Lets you turn features on or off in the popup

## Install

### Store install

- Chrome Web Store (search for "NetAcad Solver")
- Firefox Add-ons (search for "NetAcad Solver")

### Manual install

<details>
  <summary>Chromium (click)</summary>

1. Open the latest release for this repo
2. Download `netacad-solver-0.x.x-manifest-v3.crx`
3. Open chrome://extensions/
4. Enable "Developer mode"
5. Drag and drop the .crx file into the extensions page

</details>

<details>
  <summary>Firefox (click)</summary>

1. Open the latest release for this repo
2. Download `netacad-solver-0.x.x-manifest-v2.xpi`
3. Open the file in Firefox and confirm the install

</details>

## How to use

1. Open your course on NetAcad.
2. Start a quiz or lesson.
3. Click a question to auto-select the right answer.
4. Or hold Ctrl and hover to preview.
5. Use the popup to turn features on or off.

## Development

```sh
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension.

For live rebuilds:

```sh
npm run start
```

## Supported browsers

- Firefox
- Chrome
- Opera
- Brave
- Vivaldi
- Most Chromium browsers

## Ideas to improve

- Per-course selector profiles editable in the popup
- MutationObserver-based detection to reduce polling and CPU usage
- Status panel customization (position, compact mode)
- Export/import settings for easy sharing
- Multi-language popup labels
- Per-question-type toggles for advanced control
