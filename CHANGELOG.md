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

## [0.9.10] - 2025-07-07

### Added
- **Error Boundary Component:** Added a reusable React ErrorBoundary for improved error handling and user feedback in the UI.
- **Tracking Callsign Field:** Added tracking callsign field to LaunchParams and MissionPlanner interface for APRS tracking integration.
- **Enhanced Landing Point Information:** Added detailed popups for launch, burst, and landing points with terrain analysis and flight metrics.
- **Improved Landing Time Calculation:** Fixed landing time calculation to properly use launch time + flight duration for weather queries.
- **Enhanced Simulation System:** Added advanced enhanced flight simulator with realistic physics, scenario management, and weather integration.
- **TODO Planning:** Updated TODO.md with comprehensive checklist items for tracking callsign field, landing time/weather accuracy, and landing terrain/road markers.

### Changed
- **Null Safety:** Improved null checks throughout the codebase to prevent runtime errors when prediction data is missing or incomplete.
- **Error Handling:** Wrapped main app and visualization components with ErrorBoundary for graceful error recovery.
- **Code Quality:** Massive linter cleanup across the entire codebase with professional-grade improvements.

### Fixed
- **TypeScript Errors:** Resolved all outstanding TypeScript and linter errors, including async/await issues and unused imports.
- **Runtime Crashes:** Fixed crashes related to accessing properties of undefined/null objects in prediction and visualization components.
- **Landing Time Calculation:** Fixed landing time calculation in weather service to properly use launch time + flight duration instead of raw prediction timestamps.
- **Map Rendering:** Fixed invalid LatLng objects causing map crashes by ensuring proper longitude/latitude mappings throughout the codebase.
- **Linter Warnings:** Comprehensive cleanup reducing codebase from ~100+ warnings to ~38 warnings:
  - Replaced 'any' types with proper TypeScript interfaces across 8+ files
  - Removed unused variables and imports throughout the codebase
  - Fixed React hook dependencies (useEffect, useCallback) in multiple components
  - Replaced forbidden require() imports with ES modules
  - Eliminated empty catch blocks with unused error parameters
  - Improved test mocks with proper React.ReactNode types
  - Added missing type imports and proper error handling
  - Enhanced Three.js dynamic imports with better type safety

### Technical Improvements
- **Code Maintainability:** Significantly improved TypeScript practices and code organization
- **Test Quality:** Enhanced test files with proper typing and mock implementations
- **Type Safety:** Strengthened type definitions across flight simulators and UI components
- **Import Standards:** Standardized ES module imports throughout the application
- **Error Handling:** Improved exception handling patterns across services and components

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