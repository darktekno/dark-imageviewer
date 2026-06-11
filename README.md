# Dark Image Viewer

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat&logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite)
![Sharp](https://img.shields.io/badge/Sharp-0.35-99CC00?style=flat)

A cyberpunk-themed image browser with SQLite backend, built with Next.js 15 and Tailwind CSS.

## Features

- **Image Browser** — Grid, compact, and detail layouts
- **Zoom & Pan** — Mouse wheel zoom, drag to pan, pinch-to-zoom on touch
- **Fullscreen** — Immersive viewing with keyboard shortcuts
- **Slideshow** — Auto-play through images at configurable intervals
- **Favorites** — Star images and filter by favorites
- **Search** — Filter by filename
- **Sort** — By name, date, size, or random
- **Batch Operations** — Multi-select and bulk delete
- **Folder Management** — Browse multiple scanned directories
- **Responsive** — Works on desktop and mobile
- **Ambient Glow** — Dynamic background color extracted from image

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS 3](https://tailwindcss.com/) | Styling |
| [SQLite](https://www.sqlite.org/) (via `node:sqlite`) | Database |
| [Sharp](https://sharp.pixelplumbing.com/) | Image thumbnails |
| [Better Auth](https://better-auth.com/) | Authentication |
| [UUID](https://github.com/uuidjs/uuid) | Unique IDs |

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
git clone https://github.com/darktekno/dark-imageviewer.git
cd dark-imageviewer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

## Usage

1. Create an account on the login page
2. Click **SCAN DIRECTORY** to scan a folder of images
3. Browse images in grid, compact, or detail view
4. Click an image to open the viewer with zoom/pan
5. Star favorites and filter by them

### Keyboard Shortcuts (Viewer)

| Key | Action |
|---|---|
| `←` / `→` | Previous / Next image |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| `F` | Toggle fullscreen |
| `R` | Rotate 90° |
| `I` | Toggle image info |
| `Esc` | Close viewer |

## License

MIT
