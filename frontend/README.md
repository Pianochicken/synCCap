# synCCap Frontend

This directory contains the **React SPA** for the synCCap Canton Network project, built with Vite, TypeScript, and Tailwind CSS.

## ⚡ Tech Stack

- **Framework:** [React 18](https://react.dev/) via [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/) + CSS Custom Properties for Theming
- **Icons:** [Lucide React](https://lucide.dev/)
- **HTTP Client:** [Axios](https://axios-http.com/)

## ✨ Features

- **Multi-Party Dashboard**: Simulates three different network participants (Manufacturer, PrimaryBuyer, SecondaryBuyer) in a single UI.
- **Privacy Audit Panel**: Real-time visibility matrix showing exactly what Canton allows each party to see.
- **Light & Dark Mode**: Dynamic CSS-variable based design system that adapts perfectly to system preferences.
- **Responsive Design**: Modern, glassmorphism-inspired UI components.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.20.0 or higher
- [Backend API](../backend/README.md) running on port 3000

### Installation

```bash
# Install dependencies
npm install
```

### Running the App

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🏗 Directory Structure

```text
src/
├── api/                   # Axios client and API wrappers
├── components/            # Reusable UI components
│   ├── views/             # Role-specific dashboard views
│   │   ├── ManufacturerView.tsx
│   │   ├── PrimaryBuyerView.tsx
│   │   ├── SecondaryBuyerView.tsx
│   │   └── PrivacyAuditPanel.tsx
│   ├── LandingPage.tsx    # Marketing landing page
│   └── PartySwitcher.tsx  # Auth role switcher
├── context/               # React Context (e.g., ThemeContext)
├── App.tsx                # Main router and state container
├── main.tsx               # React root
└── index.css              # Global styles and Tailwind imports
```
