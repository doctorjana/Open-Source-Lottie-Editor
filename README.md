# Open Source Lottie Editor

> [!WARNING]
> This project is currently in active development. Many features are still being implemented, and you may encounter bugs or breaking changes.

A powerful, web-based Lottie editor built with React, TypeScript, and Vite. This tool allows you to create, edit, and export Lottie animations directly in your browser.

## Live Demo

[**Try the Editor Live**](https://doctorjana.github.io/Open-Source-Lottie-Editor/)

## Features

### 🛠 Tools
- **Selection Tool (V)**: Move, scale, and rotate layers and shapes.
- **Pen Tool (G)**: Draw custom paths with bezier curves.
- **Text Tool (T)**: Add and edit text layers.
- **Shape Tools**:
  - **Rectangle Tool (R)**
  - **Ellipse Tool (O)**
  - **Star Tool**
  - **Polygon Tool**

### 🎨 Manipulation & Editing
- **Transform**: Precise control over Position, Scale, and Rotation.
- **Vertex Editing**: Edit individual path points and bezier handles.
- **Grouping**: Organize shapes into groups.
- **Fill & Stroke**: Customize colors and stroke properties.

### 🎬 Animation & Timeline
- **Playback Controls**: Play, pause, and scrub through the timeline.
- **Keyframe Management**: (In progress) Add and manage keyframes for animations.

### 💾 Import & Export
- **Import**:
  - `.json` (Lottie JSON)
  - `.lottie` (DotLottie)
- **Export**:
  - **Lottie JSON**: Standard `.json` file.
  - **DotLottie**: Compressed `.lottie` file.
  - **Video**: Export as `.mp4` or `.webm`.

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
