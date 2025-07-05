BLiPS v0.9.0

#### Added
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

#### Changed
- **Settings UI**: Redesigned settings panel with better UX and security warnings
- **Documentation**: Completely rewrote README with comprehensive feature descriptions
- **API Key Management**: Multiple methods for API key configuration (UI settings + file-based)
- **3D Visualization**: Replaced Three.js with CesiumJS for better globe visualization
- **Map Integration**: Enhanced Leaflet integration with improved trajectory fitting
- **Error Handling**: Improved error messages and user feedback throughout the application

#### Fixed
- **React Hook Errors**: Resolved invalid hook call errors and component lifecycle issues
- **Map Fitting**: Fixed trajectory not fitting properly on tab switch and first load
- **CORS Issues**: Resolved APRS API CORS problems using Vite proxy
- **NaN Values**: Fixed trajectory details showing NaN values in calculations
- **Linter Errors**: Resolved TypeScript and ESLint configuration issues
- **Security**: Removed hardcoded API keys and implemented secure token management

#### Technical Improvements
- **TypeScript**: Enhanced type safety throughout the application
- **Build System**: Optimized Vite configuration for production builds
- **Tauri Integration**: Proper desktop app configuration with version management
- **Dependencies**: Updated to latest stable versions of all packages
- **Code Organization**: Improved file structure and component organization

#### Security
- **API Key Security**: Implemented secure localStorage-based token management
- **Environment Variables**: Proper handling of sensitive configuration data
- **Git Ignore**: Updated to exclude sensitive files from version control 