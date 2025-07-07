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

## [0.9.10] - 2024-12-19

### Added
- **Elevation Caching System:** Comprehensive localStorage-based caching for elevation data to reduce API calls and improve performance
- **Cache Statistics Display:** Added cache performance metrics to Settings tab showing cached points, grids, and total size
- **Automatic Cache Management:** 24-hour cache expiration with automatic cleanup on startup and hourly intervals
- **Coordinate Precision Matching:** Smart coordinate rounding to prevent excessive cache entries for nearby locations
- **Cache Initialization:** Automatic cache system startup with periodic cleanup intervals
- **Performance Monitoring:** Cache statistics tracking for debugging and user awareness

### Changed
- **Elevation Service:** Enhanced with caching layer for both single point and grid elevation requests
- **Settings Interface:** Added cache statistics section with visual metrics and performance information
- **App Initialization:** Integrated elevation cache system startup in main App component

### Technical Improvements
- **API Call Reduction:** Significant reduction in elevation API calls through intelligent caching
- **Performance Optimization:** Faster prediction calculations using cached elevation data
- **Storage Management:** Automatic cleanup prevents localStorage bloat from expired cache entries
- **Error Handling:** Graceful fallback when cache operations fail

### Fixed
- **Prediction Performance:** Improved response times for repeated predictions in same geographic areas
- **API Rate Limiting:** Reduced load on elevation APIs through effective caching strategy

## [0.9.9] - 2024-07-07

### Added
- **Tab Relabeling:** 'Safety Analysis' tab renamed to 'Prelaunch Communication' for clarity
- **Ground Altitude Accuracy:** Default launch altitude now matches real elevation for default coordinates
- **Centralized Constants/Types:** All constants and types/interfaces are now centralized for maintainability
- **Service Layer Refactor:** All API/data logic moved to dedicated service files; no direct API calls in components
- **Documentation:** Updated README, improved inline comments, and added/updated TODO.md in markdown format
- **Project Structure:** Cleaned up and organized project directory for clarity

### Changed
- **Settings and UI:** Improved tab labels and default values for better user experience
- **Changelog:** Corrected previous versioning and dates

### Fixed
- **Import Paths:** Fixed all import path issues after refactor
- **Linter/Type Errors:** Resolved all outstanding linter and TypeScript errors

### Removed
- **Unused Files:** Deleted obsolete components and files (e.g., CalculatorTab)

---

## [0.9.0] - 2024-07-05

### Added
- **Cesium Ion Access Token Settings:** Added UI field in Settings tab for Tauri users to configure Cesium Ion access tokens
- **Enhanced Settings Management:** Improved settings panel with better organization and documentation
- **Comprehensive Documentation:** Updated README with detailed API key management instructions
- **Tauri Desktop App Support:** Added documentation for building and installing the desktop application
- **APRS Real-Time Tracking:** Integrated APRS.fi API for real-time balloon position tracking
- **3D Globe Visualization:** Implemented CesiumJS-based 3D globe view with satellite imagery
- **GitHub Actions Workflow:** Automated CI/CD pipeline for building and releasing Tauri desktop apps
- **Project Templates:** Added GitHub issue templates, PR template, and contribution guidelines
- **License and Legal:** Added MIT license and liability disclaimers
- **Code Quality:** Added ESLint configuration and TypeScript strict mode

### Changed
- **Settings UI:** Redesigned settings panel with better UX and security warnings
- **Documentation:** Completely rewrote README with comprehensive feature descriptions
- **API Key Management:** Multiple methods for API key configuration (UI settings + file-based)
- **3D Visualization:** Replaced Three.js with CesiumJS for better globe visualization
- **Map Integration:** Enhanced Leaflet integration with improved trajectory fitting
- **Error Handling:** Improved error messages and user feedback throughout the application

### Fixed
- **React Hook Errors:** Resolved invalid hook call errors and component lifecycle issues
- **Map Fitting:** Fixed trajectory not fitting properly on tab switch and first load
- **CORS Issues:** Resolved APRS API CORS problems using Vite proxy
- **NaN Values:** Fixed trajectory details showing NaN values in calculations
- **Linter Errors:** Resolved TypeScript and ESLint configuration issues
- **Security:** Removed hardcoded API keys and implemented secure token management

### Technical Improvements
- **TypeScript:** Enhanced type safety throughout the application
- **Build System:** Optimized Vite configuration for production builds
- **Tauri Integration:** Proper desktop app configuration with version management
- **Dependencies:** Updated to latest stable versions of all packages
- **Code Organization:** Improved file structure and component organization

### Security
- **API Key Security:** Implemented secure localStorage-based token management
- **Environment Variables:** Proper handling of sensitive configuration data
- **Git Ignore:** Updated to exclude sensitive files from version control

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