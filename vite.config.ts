import path from 'path';
import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig(() => {
    return {
      plugins: [cesium()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/aprs': {
            target: 'https://api.aprs.fi',
            changeOrigin: true,
            rewrite: path => path.replace(/^\/aprs/, '/api'),
            secure: false,
          }
        }
      }
    };
});
