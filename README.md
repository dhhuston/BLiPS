# BLiPS - Balloon Launch Prediction Software

BLiPS is a sophisticated balloon launch prediction and flight planning software designed for high-altitude balloon missions. It provides accurate trajectory predictions, weather analysis, and safety assessments for balloon launches.

## 🚀 Features

- **Flight Trajectory Prediction**: Advanced algorithms for predicting balloon flight paths
- **Weather Integration**: Real-time weather data integration for launch planning
- **Multiple Visualization Options**: 
  - Interactive 3D Globe visualization (CesiumJS)
  - Leaflet map integration
  - Google Maps support (no API key required)
  - Altitude charts and graphs
- **Safety Analysis**: Comprehensive safety assessments including:
  - ATC (Air Traffic Control) zone identification
  - Landing point analysis
  - Flight duration calculations
- **Mission Planning**: Complete mission planning interface with:
  - Launch parameter configuration
  - Payload and balloon specifications
  - Gas type selection (Helium/Hydrogen)
- **Configuration Management**: Save and load mission configurations
- **Unit System Support**: Metric and Imperial unit systems
- **APRS Real-Time Tracking**: Track balloon positions via APRS.fi
- **Settings Management**: Secure API key management for Tauri users

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Maps**: Leaflet, Google Maps (no API key required)
- **3D Visualization**: CesiumJS
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Desktop App**: Tauri

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dhhuston/blips.git
   cd blips
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### Desktop App (Tauri)

For desktop users, BLiPS is also available as a native desktop application:

1. **Build the desktop app**:
   ```bash
   npm run tauri build
   ```

2. **Install the desktop app** from the generated installer in `src-tauri/target/release/`

## 🎯 Usage

### Basic Mission Planning

1. **Set Launch Parameters**:
   - Enter launch coordinates (latitude/longitude)
   - Set launch time and altitude
   - Configure ascent and descent rates
   - Set burst altitude

2. **Configure Payload**:
   - Enter payload weight
   - Set balloon and parachute specifications
   - Choose gas type (Helium or Hydrogen)

3. **Run Prediction**:
   - Click "Run Prediction" to calculate flight trajectory
   - View results in the visualization panel

4. **Analyze Results**:
   - Review safety information
   - Check ATC zones
   - Examine landing predictions

### Advanced Features

- **Configuration Management**: Save and load mission configurations
- **Weather Analysis**: View weather conditions at launch and during flight
- **Multiple Visualizations**: Switch between different map and chart views
- **Unit Conversion**: Toggle between metric and imperial units
- **APRS Tracking**: Real-time balloon position tracking
- **3D Globe View**: Interactive 3D visualization with CesiumJS

### Settings Configuration

BLiPS includes a settings panel for managing API keys and configuration:

1. **Navigate to Settings**: Click the "Settings" tab in the main interface
2. **APRS.fi API Key**: Enter your APRS.fi API key for real-time tracking
3. **Cesium Ion Access Token**: Enter your Cesium Ion token for 3D globe visualization
4. **Save Settings**: Click "Save Settings" to store your configuration

**For Tauri Desktop Users**: Settings are automatically saved and persist between app launches.

## 📁 Project Structure

```
blips/
├── src/
│   ├── components/          # React components (UI, visualization, panels)
│   ├── services/            # API/data logic (all API calls centralized here)
│   ├── hooks/               # Custom React hooks
│   ├── constants/           # Application-wide constants (index.ts)
│   ├── types/               # TypeScript type definitions (index.ts)
│   └── assets/              # Static assets (images, icons, etc.)
├── src-tauri/               # Tauri desktop app configuration
├── public/                  # Static public files
├── package.json             # Project metadata and scripts
├── README.md                # Project documentation
└── ...
```

### Centralized Constants & Types
- **All constants** are in `src/constants/index.ts` (physics, conversion, simulation, etc.)
- **All types/interfaces** are in `src/types/index.ts` (data models, API responses, etc.)
- **All API/data logic** is in `src/services/` (no direct API calls in components)

### Service Layer Pattern
- Use the service classes in `src/services/` for all data fetching, prediction, and business logic.
- Components should only import from `services/`, `constants/`, and `types/`.

### Code Documentation & Comments
- **Complex logic** (e.g., flight simulation, weather analysis) is thoroughly commented in the relevant service files.
- Look for `/** ... */` JSDoc comments and inline explanations in:
  - `src/services/predictionService.ts`
  - `src/services/dummyFlightSimulator.ts`
  - `src/services/liveAnalysisService.ts`
- All exported functions and classes are documented for clarity.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run tauri dev` - Start Tauri development
- `npm run tauri build` - Build Tauri desktop app
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

- TypeScript for type safety
- React functional components with hooks
- Tailwind CSS for styling
- ESLint for code quality
- Centralized constants/types/services

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request`

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Add comments to complex logic and new algorithms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**For Simulation Purposes Only**: BLiPS is designed for educational and simulation purposes. It should not be used for operational balloon launches without proper validation and certification. Always consult with aviation authorities and follow local regulations for actual balloon operations.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/dhhuston/blips/issues) page
2. Create a new issue with detailed information
3. Include system information and error logs

## 📈 Roadmap

- [ ] Enhanced weather modeling
- [ ] Real-time flight tracking
- [ ] Mobile application

## API Keys

BLiPS supports multiple methods for API key configuration:

### Method 1: Settings UI (Recommended for Tauri Users)

1. Open the app and navigate to the "Settings" tab
2. Enter your API keys in the provided fields:
   - **APRS.fi API Key**: For real-time balloon tracking
   - **Cesium Ion Access Token**: For 3D globe visualization
3. Click "Save Settings" to store your configuration

### Method 2: Configuration File (For Development)

Create a file named `api.keys` in the project root with your API keys:

```
APRS_FI_API_KEY=get_your_key_from_aprs.fi
CESIUM_ION_ACCESS_TOKEN=get_your_token_from_cesium.com
```

Replace the placeholder values with your actual API keys obtained from the respective services.

**Important**: Do not commit `api.keys` to version control. This file is automatically ignored by git.

### Getting API Keys

#### APRS.fi API Key
1. Go to [aprs.fi API page](https://aprs.fi/page/api)
2. Sign in or create a free account
3. Request a new API key for your application
4. Copy the API key and paste it in the settings

#### Cesium Ion Access Token
1. Go to [Cesium Ion Tokens page](https://cesium.com/ion/tokens)
2. Sign in or create a free account
3. Create a new access token for your application
4. Copy the token and paste it in the settings

**Security Note**: Never share your API keys publicly or commit them to version control.

---

**BLiPS** - Making balloon launch planning accessible and accurate.
