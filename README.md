# BLiPS - Balloon Launch Prediction Software

BLiPS is a sophisticated balloon launch prediction and flight planning software designed for high-altitude balloon missions. It provides accurate trajectory predictions, weather analysis, and safety assessments for balloon launches.

## 🚀 Features

- **Flight Trajectory Prediction**: Advanced algorithms for predicting balloon flight paths
- **Weather Integration**: Real-time weather data integration for launch planning
- **Multiple Visualization Options**: 
  - Interactive 3D Globe visualization
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

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Maps**: Leaflet, Google Maps (no API key required)
- **Charts**: Recharts
- **Styling**: Tailwind CSS

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/blips.git
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

## 📁 Project Structure

```
blips/
├── components/          # React components
│   ├── Header.tsx      # Application header
│   ├── MissionPlanner.tsx # Mission planning interface
│   ├── Visualization.tsx  # Main visualization component
│   ├── SafetyInfo.tsx     # Safety analysis display
│   └── icons/          # Icon components
├── services/           # API and service layer
│   ├── predictionService.ts # Flight prediction logic
│   ├── weatherService.ts    # Weather data integration
│   └── atcService.ts        # ATC zone identification
├── hooks/              # Custom React hooks
│   └── usePrediction.ts     # Prediction hook
├── types.ts            # TypeScript type definitions
├── constants.ts        # Application constants
└── App.tsx            # Main application component
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Style

- TypeScript for type safety
- React functional components with hooks
- Tailwind CSS for styling
- ESLint for code quality

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**For Simulation Purposes Only**: BLiPS is designed for educational and simulation purposes. It should not be used for operational balloon launches without proper validation and certification. Always consult with aviation authorities and follow local regulations for actual balloon operations.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/blips/issues) page
2. Create a new issue with detailed information
3. Include system information and error logs

## 📈 Roadmap

- [ ] Enhanced weather modeling
- [ ] Real-time flight tracking
- [ ] Mobile application
- [ ] Advanced safety algorithms
- [ ] Integration with aviation databases

## API Keys

To use APRS.fi or other API services, create a file named `api.keys` in the project root. This file should contain your API keys in the following format:

```
APRS_FI_API_KEY=your_aprs_fi_api_key_here
```

**Do not commit `api.keys` to version control.**

The app will automatically load API keys from this file for local development. If you are deploying or sharing the project, each user should create their own `api.keys` file.

To use CesiumJS for 3D globe visualization, you must also add your Cesium Ion access token to `api.keys`:

```
CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_access_token_here
```

**Do not commit `api.keys` to version control.**

---

**BLiPS** - Making balloon launch planning accessible and accurate.
