import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false, // No abrir automáticamente cuando termine el build
      filename: 'dist/stats.html', // Guardar el informe en dist
      gzipSize: true, // Mostrar tamaño gzipped
      brotliSize: true, // Mostrar tamaño brotli
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'], // Pre-bundle dependencias comunes
  },
  build: {
    // Habilitar source maps para facilitar la depuración en producción
    sourcemap: true,
    // Optimizaciones para reducir el tamaño del bundle y mejorar el rendimiento
    rollupOptions: {
      output: {
        // Dividir el código en chunks más pequeños basados en módulos
        manualChunks: (id) => {
          // Estrategia mejorada de chunking
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler') || id.includes('prop-types')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('react-split')) {
              return 'vendor-ui';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('papaparse')) {
              return 'vendor-papaparse';
            }
            // Todo lo demás en node_modules va en vendor-common
            return 'vendor-common';
          }
          // Código de la aplicación dividido por carpetas
          if (id.includes('/components/')) {
            return 'components';
          }
          if (id.includes('/services/')) {
            return 'services';
          }
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
        },
      },
    },
    // Comprimir CSS
    cssCodeSplit: true,
    // Minificación agresiva
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar todos los console.log en producción
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Eliminar funciones específicas
      },
      mangle: {
        safari10: true, // Compatibilidad con Safari 10
      },
      format: {
        comments: false, // Eliminar comentarios
      },
    },
    // Límite para advertencias de tamaño
    chunkSizeWarningLimit: 1000, // en kBs
  },
  // Optimizaciones para mejorar el tiempo de carga y rendimiento
  server: {
    // Evitar problemas de CORS durante el desarrollo
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
