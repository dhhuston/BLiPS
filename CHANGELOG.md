# Changelog

All notable changes to BLiPS (Balloon Launch Prediction Software) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Core flight prediction algorithms
- Weather integration service
- Multiple visualization options (Globe, Leaflet, Google Maps)
- Mission planning interface
- Safety analysis and ATC zone identification
- Configuration management (save/load)
- Unit system support (Metric/Imperial)
- Real-time weather data integration
- Altitude charts and trajectory visualization

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.0] - 2024-12-19

### Added
- Initial release of BLiPS
- React 19 with TypeScript setup
- Vite build configuration
- Tailwind CSS styling
- Core application structure
- Flight prediction service
- Weather service integration
- ATC service for air traffic control zones
- Mission planner component
- Visualization components
- Safety information display
- Header with configuration management
- Type definitions for all interfaces
- Custom hooks for prediction logic
- Icon components
- Responsive design implementation

### Technical Details
- React 19.1.0
- TypeScript 5.7.2
- Vite 6.2.0
- Leaflet 1.9.4
- Recharts 2.12.7
- Tailwind CSS for styling

---

## Version History

- **0.1.0** - Initial release with core functionality
- **Unreleased** - Development version with ongoing improvements

## Release Notes

### v0.1.0 - Initial Release
This is the initial release of BLiPS, featuring:

- **Flight Prediction**: Advanced algorithms for predicting balloon trajectories
- **Weather Integration**: Real-time weather data for launch planning
- **Multiple Visualizations**: Globe, Leaflet, and Google Maps support
- **Safety Analysis**: Comprehensive safety assessments including ATC zones
- **Mission Planning**: Complete interface for configuring launch parameters
- **Configuration Management**: Save and load mission configurations
- **Unit Support**: Metric and Imperial unit systems

This release is designed for educational and simulation purposes. Please refer to the disclaimer in the README for important safety information.

---

For more information about BLiPS, visit the [GitHub repository](https://github.com/dhhuston/blips).

## [0.9.0] - 2024-12-19

### Added
- **Cesium Ion Access Token Settings**: Added UI field in Settings tab for Tauri users to configure Cesium Ion access tokens
- **Enhanced Settings Management**: Improved settings panel with better organization and documentation
- **Comprehensive Documentation**: Updated README with detailed API key management instructions
- **Tauri Desktop App Support**: Added documentation for building and installing the desktop application
- **APRS Real-Time Tracking**: Integrated APRS.fi API for real-time balloon position tracking
- **3D Globe Visualization**: Implemented CesiumJS-based 3D globe view with satellite imagery
- **GitHub Actions Workflow**: Automated CI/CD pipeline for building and releasing Tauri desktop apps
- **Project Templates**: Added GitHub issue templates, PR template, and contribution guidelines
- **License and Legal**: Added MIT license and liability disclaimers
- **Code Quality**: Added ESLint configuration and TypeScript strict mode

### Changed
- **Settings UI**: Redesigned settings panel with better UX and security warnings
- **Documentation**: Completely rewrote README with comprehensive feature descriptions
- **API Key Management**: Multiple methods for API key configuration (UI settings + file-based)
- **3D Visualization**: Replaced Three.js with CesiumJS for better globe visualization
- **Map Integration**: Enhanced Leaflet integration with improved trajectory fitting
- **Error Handling**: Improved error messages and user feedback throughout the application

### Fixed
- **React Hook Errors**: Resolved invalid hook call errors and component lifecycle issues
- **Map Fitting**: Fixed trajectory not fitting properly on tab switch and first load
- **CORS Issues**: Resolved APRS API CORS problems using Vite proxy
- **NaN Values**: Fixed trajectory details showing NaN values in calculations
- **Linter Errors**: Resolved TypeScript and ESLint configuration issues
- **Security**: Removed hardcoded API keys and implemented secure token management

### Technical Improvements
- **TypeScript**: Enhanced type safety throughout the application
- **Build System**: Optimized Vite configuration for production builds
- **Tauri Integration**: Proper desktop app configuration with version management
- **Dependencies**: Updated to latest stable versions of all packages
- **Code Organization**: Improved file structure and component organization

### Security
- **API Key Security**: Implemented secure localStorage-based token management
- **Environment Variables**: Proper handling of sensitive configuration data
- **Git Ignore**: Updated to exclude sensitive files from version control

## [0.8.0] - 2024-12-18

### Added
- Initial release with basic balloon launch prediction functionality
- Weather integration and safety analysis features
- Multiple visualization options (2D maps, charts)
- Mission planning interface
- Configuration save/load functionality

---

## Contributing

When adding new features or making significant changes, please update this changelog following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Categories
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Features that will be removed in upcoming releases
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes 