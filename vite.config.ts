import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-konva': ['konva', 'react-konva'],
          'vendor-wavesurfer': ['wavesurfer.js'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
          ],
          'vendor-auth': ['oidc-client-ts'],
          'vendor-icons': ['lucide-react'],
          'vendor-http': ['axios'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['yuppadx.janya.video', 'producer.janya.video']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        // studio — only files with tests (broad glob would pull in untested components)
        'src/features/studio/DestinationModal.tsx',
        'src/features/studio/GfxMultiSelect.tsx',
        'src/features/studio/GfxPanel.tsx',
        'src/features/studio/MeetingUrlPanel.tsx',
        'src/features/studio/MessageLog.tsx',
        'src/features/studio/MonitorArea.tsx',
        'src/features/studio/VideoPlayerPopup.tsx',
        'src/features/studio/QButtonRow.tsx',
        'src/features/studio/QButtonTable.tsx',
        'src/features/studio/SourceSlotRow.tsx',
        'src/features/studio/SourcesSidebar.tsx',
        // events — only files with tests
        'src/features/events/eventUtils.ts',
        'src/features/events/EventDetail.tsx',
        'src/features/events/EventForm.tsx',
        // lib
        'src/lib/storage.ts',
        'src/lib/authService.ts',
        'src/lib/s3Service.ts',
        'src/lib/http.ts',
        'src/lib/studioConfig.ts',
        'src/lib/publishHistoryService.ts',
        'src/lib/utils.ts',
        // pages
        'src/pages/GfxPage.tsx',
      ],
      thresholds: {
        // Applied only to lib files — component thresholds deferred until test coverage improves
        'src/lib/storage.ts':              { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/lib/authService.ts':          { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/lib/s3Service.ts':            { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/lib/http.ts':                 { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/lib/studioConfig.ts':         { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/lib/utils.ts':                { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/features/events/eventUtils.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
      },
    },
  },
})
