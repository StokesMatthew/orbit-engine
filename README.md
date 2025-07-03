# 🌌 Orbit Engine - Interactive Physics Sandbox

A real-time orbital mechanics simulator built with React and Matter.js that allows you to explore gravitational physics through an interactive celestial body system.

![React](https://img.shields.io/badge/React-19.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Matter.js](https://img.shields.io/badge/Matter.js-0.20.0-orange)

## 🚀 Features

### Interactive Celestial System
- **Central Sun**: Massive gravitational body at the center of the simulation
- **Dynamic Planets**: Multiple planets with realistic orbital mechanics
- **Real-time Physics**: Accurate gravitational force calculations using Newton's law of universal gravitation
- **Visual Feedback**: Color-coded planets with selection highlighting

### Planet Management
- **Add Planets**: Create new planets with randomized properties
- **Edit Properties**: Modify planet names, colors, sizes, and masses
- **Lock Planets**: Freeze planets in place for experimentation
- **Delete Planets**: Remove unwanted celestial bodies
- **Planet List**: Overview of all planets in the system

### Physics Simulation
- **Gravitational Forces**: Realistic F = G×M×m/r² calculations
- **Orbital Velocities**: Radial and tangential velocity components
- **Collision Detection**: Planets are destroyed when colliding with the sun
- **Distance Tracking**: Real-time distance and angle measurements from the sun
- **Escape Velocity**: Planets too far from the sun are automatically removed

### User Interface
- **Interactive Canvas**: Click and drag planets to manipulate them
- **Property Panel**: Real-time display of celestial body properties
- **Visual Selection**: Glowing outlines for selected planets
- **Responsive Design**: Clean, modern interface with Tailwind CSS

## 🛠️ Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Setup
1. Clone the repository:
```bash
git clone https://github.com/yourusername/physics-sandbox.git
cd physics-sandbox
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 How to Use

### Basic Controls
- **Click a planet** to select it and view its properties
- **Drag planets** to move them around the simulation
- **Add Planet button** creates new planets with random properties
- **Edit button** allows you to modify planet properties
- **Delete button** removes the selected planet (not available for the sun)

### Planet Properties
When a planet is selected, you can view and edit:
- **Name**: Custom name for the planet
- **Type**: Sun or Planet
- **Mass**: Mass of the celestial body (affects gravitational force)
- **Size**: Visual size of the planet
- **Color**: Visual color of the planet
- **Radial Velocity**: Velocity toward/away from the sun
- **Tangential Velocity**: Orbital velocity around the sun
- **Distance from Sun**: Current distance in pixels
- **Angle from Sun**: Position angle in degrees
- **Gravitational Force**: Current force exerted by the sun

### Advanced Features
- **Lock Planets**: Check the "Locked" checkbox to freeze a planet in place
- **Real-time Updates**: All properties update in real-time as planets move
- **Collision Physics**: Planets are destroyed when they hit the sun
- **Escape Detection**: Planets too far from the sun are automatically removed

## 🔧 Technical Details

### Physics Engine
- **Matter.js**: 2D physics engine for collision detection and body management
- **Gravitational Constant**: Customizable G value for force calculations
- **Time Scale**: Simulation runs at 50% speed for better observation
- **Air Resistance**: Disabled for realistic space simulation

### Architecture
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with custom interfaces
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Custom Hooks**: Reusable logic for physics calculations and state management

### Key Components
- `PhysicsSimulator.tsx`: Main simulation component
- `ExtendedBody`: Custom interface extending Matter.js Body
- `CelestialBodyProperties`: TypeScript interface for planet data
- Real-time physics calculations and event handling

## 🎯 Educational Value

This simulator is perfect for:
- **Physics Students**: Understanding orbital mechanics and gravitational forces
- **Astronomy Enthusiasts**: Visualizing celestial body interactions
- **Game Developers**: Learning physics simulation techniques
- **Educators**: Demonstrating Newtonian physics concepts

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you have any questions or need help with the project:
- Open an issue on GitHub
- Check the existing issues for similar problems
- Review the code comments for implementation details

---
