# Open Source Lottie Editor

> [!CAUTION]
> **UNDER ACTIVE DEVELOPMENT**
> This project is currently in early development. Many core features are being implemented daily, and you will encounter bugs, performance issues, or breaking changes. It is NOT recommended for production use yet.

A powerful, web-based Lottie editor built with React, TypeScript, and Vite. This tool aims to provide an open-source alternative for creating, editing, and exporting Lottie animations directly in your browser.

## Live Demo

[**Try the Editor Live**](https://doctorjana.github.io/Open-Source-Lottie-Editor/)

## Features

### 🛠 Tools
- **Selection Tool (V)**: Move, scale, and rotate layers and shapes.
- **Pen Tool (P)**: Draw custom paths with bezier curves and edit vertices (Alt+Click to delete).
- **Type Tool (T)**: Add and edit text layers.
- **Shape Tools**:
  - **Rectangle Tool (R)**
  - **Ellipse Tool (O)**
  - **Star Tool**
  - **Polygon Tool**

### 🎨 Manipulation & Editing
- **Undo/Redo**: Full history support with `Ctrl+Z` / `Ctrl+Shift+Z`.
- **Auto-Key**: Automatically create keyframes when properties change.
- **Vertex Editing**: Precise control over path points and bezier handles.
- **Fill & Stroke**: Comprehensive control over shape colors and stroke properties.
- **Transform**: Edit Position, Scale, Rotation, and Opacity.

### 🎬 Animation & Timeline
- **Playback Controls**: Play, pause, and scrub through the timeline.
- **Animated Properties**: Most properties support keyframing for complex animations.

### 💾 Import & Export
- **Import**:
  - `.json` (Lottie JSON)
  - `.lottie` (DotLottie)
  - `.svg` (Import SVG paths as layers)
- **Export**:
  - **Lottie JSON**: Standard `.json` file.
  - **DotLottie**: Compressed `.lottie` file.
  - **Video**: High-quality export as `.mp4` or `.webm`.

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/doctorjana/Open-Source-Lottie-Editor.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## Built With

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lottie-Web](https://github.com/airbnb/lottie-web)
- [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)
- [Zustand](https://github.com/pmndrs/zustand)
